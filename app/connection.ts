import net from "node:net";
import { EventEmitter } from "node:events";
import RespParser from "./resp/parser";
import RespEncoder from "./resp/encoder";
import type { RespValue } from "./resp/types";

export interface Message {
    value: RespValue,
    source: Buffer
}

export type TranslationMode = "resp" | "rdb";
/**
 * A connection struct representing a wrapper on a tcp net socket.
 * 
 * Events: 
 * - message: emitted when a message is received from the client.
 * - close: emitted when the connection is closed.
 * - error: emitted when an error occurs.
 */
interface ConnectionEvents {
    message: (data: Message) => void;
    error: (error: Error) => void;
    rawMessage: (data: Buffer) => void;
    close: () => void;
    // Add more events as needed
}

export default class Connection extends EventEmitter {
    private socket: net.Socket;
    private buffer: Buffer;
    /**
     * A boolean indicating whether the connection should translate the incoming data to a RespValue.
     * If  `false`, the connection will emit the raw buffer data to a separate event "rawMessage"
     */
    private shouldTranslate: boolean;
    private mode: TranslationMode;

    constructor(socket: net.Socket) {
        super();
        this.socket = socket; 
        this.buffer = Buffer.alloc(0);
        this.shouldTranslate = true;
        this.mode = "resp";
        this.wireSocket(); // wire the sockets events to this instance. 
    }

    // Overload the `on` method
    on<K extends keyof ConnectionEvents>(event: K, listener: ConnectionEvents[K]): this {
        return super.on(event, listener);
    }

    // Overload the `emit` method
    emit<K extends keyof ConnectionEvents>(event: K, ...args: Parameters<ConnectionEvents[K]>): boolean {
        return super.emit(event, ...args);
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

    public setRawMode() {
        this.shouldTranslate = false;
        if (this.buffer.length > 0) {
            this.emit("rawMessage", this.buffer);
            this.buffer = Buffer.alloc(0);
        }
    }

    public setRespMode() {
        this.mode = "resp";
        this.shouldTranslate = true;
    }

    public setRDMode() {
        this.mode = "rdb";
        this.shouldTranslate = true;
    }

    public isRawMode() {
        return !this.shouldTranslate || this.mode === "rdb";
    }

    public isRespMode() {
        return this.mode === "resp";
    }

    public isRDBMode() {
        return this.mode === "rdb";
    }

    private wireSocket() {
        this.socket.on("data", (data) => {
            console.log(`data: ${data}\nMode: ${this.mode}`);
            this.buffer = Buffer.concat([this.buffer, data]);

            if (this.isRespMode()) {
                this.parseResp();
            } else if (this.isRDBMode()) {
                this.parseRDB();
            }
        });

        this.socket.on("close", () => {
            this.emit("close");
        });

        this.socket.on("error", (e) => {
            this.emit("error", e);
        });
    }

    private parseResp() {
        const parser = new RespParser(); 
        try {
            const { value, source } = parser.parse(this.buffer);
            if (value) {
                this.emit("message", { value, source });
                this.removeParsedSource(source);
            }
        } catch (e) {
            this.emitErrorAndClose(e);
        }
    }

    private parseRDB() {
        const parser = new RDBFileParser();
        try {
            const { value, source } = parser.parse(this.buffer);
            console.log("RECEIVED AND RDB FILE!!!", value);
            this.emit("rawMessage", value);
            this.removeParsedSource(source);
        } catch (e) {
            console.log(e);
            // ignore for now...
        }
    }

    private removeParsedSource(source: Buffer) {
        if (source.length === this.buffer.length) {
            this.buffer = Buffer.alloc(0);
        } else {
            this.buffer = this.buffer.subarray(this.buffer.length - source.length);
        }
    }
    
    private emitErrorAndClose(e: Error) {
        this.emit("error", e);
        this.emit("close");
    }

    public cleanup() {
        this.socket.removeAllListeners();
    }
}


class RDBFileParser {
    private parseIdx: number
    
    constructor() {
        this.parseIdx = 0;
    }

    // $<length_of_file>\r\n<contents_of_file>
    public parse(data: Buffer): { value: Buffer, source: Buffer } {
        this.expectByte(data, "$".charCodeAt(0));
        const length = this.readUntil(data, "\r\n");
        if (length === null) {
            throw new Error("Invalid RDB file");
        }
        console.log("LENGTH: ", length.toString("utf-8"))
        const lengthInt = parseInt(length.toString("utf-8"));
        if (isNaN(lengthInt) || data.length < this.parseIdx + lengthInt + 2) {
            console.log("data length: ", data.length, "parseIdx: ", this.parseIdx, "lengthInt: ", lengthInt);
            console.log("data: ", data);
        }
        const body = data.subarray(this.parseIdx, this.parseIdx + lengthInt);
        return {
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