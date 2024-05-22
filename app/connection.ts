import net from "node:net";
import { EventEmitter } from "node:events";
import RespParser from "./resp/parser";
import RespEncoder from "./resp/encoder";
import type { RespValue } from "./resp/types";

export interface Message {
    value: RespValue,
    source: Buffer
}
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

    constructor(socket: net.Socket) {
        super();
        this.socket = socket; 
        this.buffer = Buffer.alloc(0);
        this.shouldTranslate = true;
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
        this.shouldTranslate = true;
    }

    public isRawMode() {
        return !this.shouldTranslate;
    }

    private wireSocket() {
        this.socket.on("data", (data) => {
            if (!this.shouldTranslate) {
                this.emit("rawMessage", Buffer.concat([this.buffer, data]));
                this.buffer = Buffer.alloc(0);
                return;
            };

            this.buffer = Buffer.concat([this.buffer, data]);
            const parser = new RespParser();
            
            try {
                const { value, source } = parser.parse(this.buffer);
               
                if (value !== undefined) {
                    this.emit("message", { value, source });
                }

                if (source.length === this.buffer.length) {
                    this.buffer = Buffer.alloc(0);
                } else {
                    this.buffer = this.buffer.subarray(this.buffer.length - source.length);
                }
            } catch (e) {
                this.emit("error", e);
                this.emit("close");
            }
        });

        this.socket.on("close", () => {
            this.emit("close");
        });

        this.socket.on("error", (e) => {
            this.emit("error", e);
        });
    }

    public cleanup() {
        this.socket.removeAllListeners();
    }
}