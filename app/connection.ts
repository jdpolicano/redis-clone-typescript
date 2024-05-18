import net from "node:net";
import { EventEmitter } from "node:events";
import RespParser from "./resp/parser";
import RespEncoder from "./resp/encoder";
import type { RespValue } from "./resp/types";

/**
 * A connection struct representing a wrapper on a tcp net socket.
 * 
 * Events: 
 * - message: emitted when a message is received from the client.
 * - close: emitted when the connection is closed.
 * - error: emitted when an error occurs.
 */

interface ConnectionEvents {
    message: (data: RespValue) => void;
    error: (error: Error) => void;
    close: () => void;
    // Add more events as needed
}

export default class Connection extends EventEmitter {
    private socket: net.Socket;
    private buffer: Buffer; 

    constructor(socket: net.Socket) {
        super();
        this.socket = socket; 
        this.buffer = Buffer.alloc(0);
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
        this.socket.write(RespEncoder.encodeSimpleString(data));
    }

    public writeError(data: string) {
        this.socket.write(RespEncoder.encodeSimpleError(data));
    }

    public writeResp(data: RespValue) {
        this.socket.write(RespEncoder.encodeResp(data));
    }

    private wireSocket() {
        this.socket.on("data", (data) => {
            this.buffer = Buffer.concat([this.buffer, data]);
            const parser = new RespParser();
            
            try {
                const message = parser.parse(this.buffer);

                if (message.value) {
                    this.emit("message", message.value);
                }

                if (message.source.length === 0) {
                    this.buffer = Buffer.alloc(0);
                } else {
                    this.buffer = this.buffer.subarray(this.buffer.length - message.source.length);
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
}