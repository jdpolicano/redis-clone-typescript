import net from "node:net";
import RespParser from "./resp/parser";
import RespEncoder from "./resp/encoder";
import type { RespValue } from "./resp/types";
import type {
    ParseResult,
    ParseSuccess,
    Parser
} from "../interfaces/parser";

export enum ReadError {
    EREADDEAD = "ERR called read on a closed socket",
    EREADCLOSED = "ERR socket closed while attempting read",
    EMALFORMED = "ERR malformed data",
}

export default class Connection {
    private socket: net.Socket;
    private buffer: Buffer;
    private resolver: () => void;
    private rejecter: (e: Error) => void;
    private promise: Promise<unknown>;
    private is_closed: boolean;

    constructor(socket: net.Socket) {
        this.socket = socket; 
        this.buffer = Buffer.alloc(0);
        this.is_closed = false;

        const { promise, resolve, reject } = Promise.withResolvers();
        this.promise = promise;
        this.resolver = resolve;
        this.rejecter = reject;

        this.wireSocket(); // wire the sockets events to this instance. 
    }

    public writeString(data: string) {
        this.socket.write(RespEncoder.encodeSimpleString(data), "binary");
    }

    public writeError(data: string) {
        this.socket.write(RespEncoder.encodeSimpleError(data), "binary");
    }

    public writeResp(data: RespValue) {
        this.socket.write(RespEncoder.encodeResp(data), "binary");
    }

    public write(data: string | Uint8Array, encoding?: BufferEncoding) {
        this.socket.write(data, encoding);
    }

    public readResp(): Promise<ParseSuccess<RespValue>> {
        return this.read(new RespParser());
    }

    public readRdbFile(): Promise<ParseSuccess<Buffer>> {
        return this.read(new RDBFileParser());
    }

    private async read<T>(parser: Parser<T>): Promise<ParseSuccess<T>> {
        if (this.is_closed) {
            throw new Error(ReadError.EREADDEAD);
        }

        if (this.buffer.length === 0) {
            await this.promise;
        }

        let retries = 0;
        let maxRetries = 10; // arbitary number of retries for now...

        while (retries < maxRetries) {
            if (this.is_closed) {
                throw new Error(ReadError.EREADCLOSED);
            }

            let result: ParseResult<T>;
            try {
                result = parser.parse(this.buffer);
            } catch (e) {
                this.is_closed = true;
                throw new Error(ReadError.EMALFORMED);
            }

            if (result.ok) {
                this.buffer = this.buffer.subarray(result.source.length);
                return result;
            } else {
                await this.promise;
                retries++;
            }
        }

        throw new Error("ERR maximum retries reached");
    }

    private wireSocket() {
        this.socket.on("data", (data) => {
            this.buffer = Buffer.concat([this.buffer, data]);
            // free up any callers waiting for data...
            this.resolver();

            // reset the promise.
            const { promise, resolve, reject } = Promise.withResolvers();
            this.promise = promise;
            this.resolver = resolve;
            this.rejecter = reject;
        });

        this.socket.on("close", () => {
            this.is_closed = true;
            this.resolver();
        });

        this.socket.on("error", (e) => {
            this.rejecter(e);
        });
    }
}


/**
 * This is a temporary implementation that will be fleshed out later...
 */
class RDBFileParser implements Parser<Buffer> {
    private parseIdx: number
    
    constructor() {
        this.parseIdx = 0;
    }

    // $<length_of_file>\r\n<contents_of_file>
    public parse(data: Buffer): ParseResult<Buffer> {
        this.expectByte(data, "$".charCodeAt(0));

        const length = this.readUntil(data, "\r\n");
        if (length === null) {
            throw new Error("Invalid RDB file");
        }
     
        const lengthInt = parseInt(length.toString("utf-8"));

        // malformed data
        if (isNaN(lengthInt)) {
            throw new Error("Invalid RDB file length, couldn't parse as int...");
        }

        // buffer not long enough yet...
        if (data.length < this.parseIdx + lengthInt) { 
            return {
                ok: false
            }
        }

        const body = data.subarray(this.parseIdx, this.parseIdx + lengthInt);
        this.parseIdx += lengthInt;

        return {
            ok: true,
            value: body,
            source: data.subarray(0, this.parseIdx)
        }
    }

    private readUntil(data: Buffer, delimiter: string): Buffer | null {
        let targetIdx = data.indexOf(delimiter, this.parseIdx);

        if (targetIdx === -1) {
            return null;
        }

        const result = data.subarray(this.parseIdx, targetIdx);
        this.parseIdx = targetIdx + delimiter.length;
        return result;
    }

    private expectByte(data: Buffer, byte: number) {
        if (data[this.parseIdx++] !== byte) {
            throw new Error("Unexpected byte");
        };
    }
}