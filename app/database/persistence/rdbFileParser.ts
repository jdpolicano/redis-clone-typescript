import type Database from "../database";
import type { ParseResult } from "../../../interfaces/parser";
import RespBuilder from "../../resp/builder";
import Expiration from "../expiration";

/**
 * The opcodes for the rdb file format.
 */
enum OP_CODES {
    EOF = 0xFF,
    SELECTDB = 0xFE,
    EXPIRETIME = 0xFD,
    EXPIRETIMEMS = 0xFC,
    RESIZEDB = 0xFB,
    AUX = 0xFA,
}

/**
 * The values of the most significant bits of the first byte of the length field.
 */
enum LENGTH_BITS {
    LEN_6 = 0 << 6, // 00-000000, 6 bit length
    LEN_14 = 1 << 6, // 01-000000 14 bit length
    LEN_32 = 2 << 6, // 10-000000 32 bit length
    SPECIAL = 3 << 6, // 11-000000 special encoding
}

/**
 * The special encoding types for the length field. 
 */
enum STRING_ENCODING {
    INT8 = 0,
    INT16 = 1,
    INT32 = 2,
    // todo support other types i.e., compressed type.
};

/**
 * The special encoding types for db values.
 */
enum VALUE_ENCODING {
    STRING = 0,
    LIST = 1,
    SET = 2,
    SORTED_SET = 3,
    HASH = 4,
    ZIP_MAP = 9,
    ZIP_LIST = 10,
    INTSET = 11,
    SORTED_SET_ZIP = 12,
    HASH_ZIP = 13,
    LIST_QUICKSET = 14,
};

/**
 * A mask for getting the significant bits of the length field.
 * to get the length, you need to mask the first byte with this value.
 */
const UPPER_2 = 0xC0 // 11-000000

/**
 * the mask for getting the lower 6 bits of the length field.
 */
const LOWER_6 = 0x3F; // 00-111111

/**
 * This represents the redis string encoded type.
 * These are binary safe and depending on the structure can be used to represent
 * integers, strings, or raw bytes. 
 * 
 * Since this causes a number of issues is js land, i've opted to use a string or integer.
 * I am assuming this won't bite me in the ass later, but decoding buffers with type "binary" (latin1)
 * should be binary safe, I just won't know inside the runtime what type of string I'm actually working with.
 */
type StringEncoded = number | string;

/**
 * The magic string that starts every rdb file.
 */
const MAGIC_STRING = "REDIS";

/**
 * The length of the version string that follows the magic header.
 */
const VERSION_LEN = 4;


export default class RdbFileParser {
    // the db we're applying changes to. 
    private db: Database;

    // this is the original buffer...
    private readonly source: Buffer;

    // this is the readStream of the buffer we're reading through. It shrinks over time.
    private readStream: Buffer;

    // auxiallary data - arbitary key value pairs.
    private auxFields: Map<StringEncoded, StringEncoded>;

    constructor(rdbFile: Buffer, db: Database) {
        this.db = db;
        this.source = rdbFile;
        this.readStream = rdbFile.subarray();
        this.auxFields = new Map();
    }

    /**
     * Parse the rdb file and apply the changes to the database
     */
    public apply(): ParseResult<void> {
        this.parseMagicHeaders();
        // this is an optional header field.
        if (this.readStream[0] === OP_CODES.AUX) {
            this.parseAuxFields();
        }

        // this is the main loop that reads the rdb file and applies the changes to the database.
        return this.applyDatabase();
    }

    /**
     * This method parses the version number from the rdb file as well as the "magic" string 'REDIS'
     */
    private parseMagicHeaders() {
        try {
            const magicString = this.readExact(MAGIC_STRING.length).toString("utf-8");
            const asciiVersion = this.readExact(VERSION_LEN).toString("utf-8");
            const versionNum = parseInt(asciiVersion);

            if (magicString !== MAGIC_STRING) {
                throw new Error("Invalid magic string header...");
            }

            if (isNaN(versionNum)) {
                throw new Error("Invalid version number...");
            }

            console.log(`${magicString} ${versionNum}`);
        } catch (e) {
            console.log("Error parsing magic numbers...");
            throw e;
        }
        
    }

    /**
     * This method parses the aux fields from the rdb file.
     */
    private parseAuxFields() {
        while (this.readStream[0] === OP_CODES.AUX) {
            this.advance(1); // skip the opcode
            const key = this.readStringEncoded();
            const value = this.readStringEncoded();
            this.auxFields.set(key, value);
        }
    }

    /**
     * Parses the select db opcode from the rdb file.
     */
    private parseSelectDb() {
        this.advance(1); // skip the opcode
        const lengthByte = this.readNextByte();
        if ((lengthByte & UPPER_2) === LENGTH_BITS.SPECIAL) {
           throw new Error("special encoding found for db number");
        }
        const dbNum = this.getLength(lengthByte);
        console.log(`Selecting db number: ${dbNum}`);
        return;
    }

    /**
     * Parses the resize db opcode from the rdb file.
     */
    private parseResizeDb() {
        this.advance(1); // skip the opcode
        const dbSize = this.getLength(this.readNextByte());
        const expiresSize = this.getLength(this.readNextByte());
        console.log(`dbSize: ${dbSize} expireSize: ${expiresSize}`);
        return;
    }

    /**
     * Continues reading and applying a database from the rdb file. It will stop when it reaches the end of the file
     * or when it reaches another select db opcode. If it reaches a select db call, it will handle it and 
     * return to the main loop. 
     */
    private applyDatabase(): ParseResult<void> {
        while (this.readStream.length > 0) {
            const opcode = this.readStream[0];

            if (opcode === OP_CODES.SELECTDB) {
                this.parseSelectDb();
                continue;
            }

            if (opcode === OP_CODES.RESIZEDB) {
                this.parseResizeDb();
                continue;
            }

            if (opcode === OP_CODES.EXPIRETIME) {
                this.parseEntryWithExpirySecs();
                continue;
            }

            if (opcode === OP_CODES.EXPIRETIMEMS) {
                this.parseEntryWithExpiryMS();
                continue;
            }

            if (opcode === OP_CODES.EOF) {
                return {
                    ok: true,
                    value: void 0,
                    source: this.source
                };
            }

            this.parseEntry();
        }

        return {
            ok: true,
            value: undefined,
            source: this.source.subarray(0, this.source.length - this.readStream.length)
        };
    }


    /**
     * Parses an entry from the rdb file.
     */
    private parseEntry(expiry?: Expiration) {
        const valueType = this.readNextByte();
        const key = this.readStringEncoded();
;        if (valueType === VALUE_ENCODING.STRING) {
            const value = this.readStringEncoded();
            const asResp = RespBuilder.bulkString(value);
            this.db.setWithKey(key, asResp, expiry);
        } else {
            const valueTypeName = Object.keys(VALUE_ENCODING).find(key => VALUE_ENCODING[key] === valueType);
            console.log(`Unsupported value type...${valueTypeName} : ${valueType}`);
        }
    }

    /**
     * Parses an entry with an expiry time in seconds.
     */
    private parseEntryWithExpirySecs() {
        console.log("Parsing entry with expiry time in seconds...");
        this.advance(1) // skip the opcode
        /**
         * This is a 4 byte unsigned int.
         * Javascirpt numbers are represented as 64 bit floats.
         * This means that the largest integer that can be represented is 2^53 - 1.
         * My assumption is that because the largest unsigned 32 bit integer is 2^32 - 1,
         * we can safely represent this number in javascript without worrying about the sign bit being triggered.
         * I believe javascript just converts it to a 4 byte integer and then performs the bitshifts...
         */
        const expiryTimestamp = this.readInt(4) * 1000; // convert the seconds to milliseconds.
        console.log(`Expiry timestamp: ${expiryTimestamp}`);
        console.log(`Current Time: ${Date.now()}`);
        console.log(`Diff: ${expiryTimestamp - Date.now()}`);
        if (expiryTimestamp > Date.now()) {
            const expiry = new Expiration(expiryTimestamp - Date.now(), "ms");
            return this.parseEntry(expiry);
        }
    }

    /**
     * Parses an entry with an expiry time in milliseconds.
     */
    private parseEntryWithExpiryMS() {
        console.log("Parsing entry with expiry time in milliseconds...");
        this.advance(1) // skip the opcode
        const expiryTimestamp = this.readBigInt(8);
        console.log(`Expiry timestamp: ${expiryTimestamp}`);
        console.log(`Current Time: ${Date.now()}`);
        console.log(`Diff: ${expiryTimestamp - BigInt(Date.now())}`);
        if (expiryTimestamp > BigInt(Date.now())) {
            const expiry = new Expiration(Number(expiryTimestamp - BigInt(Date.now())), "ms");
            return this.parseEntry(expiry);
        }
    }

    /**
     * interprets a length byte as a length encoded value.
     * NOTE: This method cannot be used for special encoding types.
     * If you are unsure, you can check that the value is greater than 0,
     * But I recommend checking before you call this method.
     * @param lengthByte - the length byte for this encoded length.
     * @returns 
     */
    private getLength(lengthByte: number): number {
        const sigBits = lengthByte & UPPER_2;
        if (sigBits === LENGTH_BITS.LEN_6) {
            return lengthByte & LOWER_6;
        }

        if (sigBits === LENGTH_BITS.LEN_14) {
            const next = this.readInt(1);
            return ((lengthByte & LOWER_6) << 8) | next;
        }

        if (sigBits === LENGTH_BITS.LEN_32) {
            return this.readInt(4);
        }

        return -1; // this should never happen.
    }
    


    /**
     * Reads a string encoded value from the stream.
     */
    private readStringEncoded(): string {
        const lengthByte = this.readNextByte();
        const sigBits = lengthByte & UPPER_2;
        // some other encoding...
        if (sigBits === LENGTH_BITS.SPECIAL) {
            return this.parseSpecialStringEncoding(lengthByte);
        }
        // length prefixed string...
        const length = this.getLength(lengthByte);
        const body = this.readExact(length);
        return body.toString("binary");
    }

    /**
     * Parses a special encoding string. The first byte should be passed in
     * because it was already read from the stream.
     */
    private parseSpecialStringEncoding(firstByte: number): string {
        const encoding = firstByte & LOWER_6;

        if (encoding === STRING_ENCODING.INT8) {
            return this.readInt(1).toString();
        }

        if (encoding === STRING_ENCODING.INT16) {
            return this.readInt(2).toString();
        }

        if (encoding === STRING_ENCODING.INT32) {
            return this.readInt(4).toString();
        }

        console.log("Reached unknown string encoding...");
        return "";
    }

    /**
     * Reads in n bytes interpreting them as a single integer.
     */
    private readInt(n: number): number {
        const bytes = this.readExact(n);
        let result = 0;
        for (let i = 0; i < n; i++) {
            result = result << 8 | bytes[i];
        }
        return result;
    }

    /**
     * Reads in bytes as a big integer.
     */
    private readBigInt(n: number): bigint {
        const bytes = this.readExact(n);
        let shift = BigInt(0);
        let result = BigInt(0);
        for (let i = 0; i < n; i++) {
            result += BigInt(bytes[i]) << shift;
            shift += BigInt(8);
        }
        return result;
    }
    /**
     * Reads exactly n bytes from the buffer.
     */
    private readExact(n: number): Buffer {
        if (this.readStream.length < n) {
            throw new Error("buffer too small");
        }
        const result = this.readStream.subarray(0, n);
        this.readStream = this.readStream.subarray(n);
        return result;
    }

    /**
     * Reads the next byte and advances the stream;
     * @returns the next byte in the stream.
     */
    private readNextByte(): number {
        if (this.readStream.length === 0) {
            throw new Error("buffer too small");
        };
        const result = this.readStream[0];
        this.advance(1);
        return result;
    }

    /**
     * Advances the stream by n bytes.
     */
    private advance(n: number) {
        if (this.readStream.length < n) {
            throw new Error("buffer too small");
        }
        this.readStream = this.readStream.subarray(n);
    };
}