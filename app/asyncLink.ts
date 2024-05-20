import type Connection from "./connection";
import type { RespValue } from "./resp/types";


export default class AsyncLink {
    private connection: Connection;
    private msgQueue: RespValue[];
    private rawMsgQueue: Buffer[];
    private isClosed: boolean;

    /**
     * Handles the resolution of messages in an async manner.
     */
    private msgResolver: (() => void) | null;
    private msgRejecter: ((e: Error) => void) | null;
    private rawMsgResolver: (() => void) | null;

    constructor(connection: Connection) {
        this.connection = connection;
        this.msgQueue = [];
        this.rawMsgQueue = [];
        this.isClosed = false;
        this.msgResolver = null;
        this.msgRejecter = null;
        this.rawMsgResolver = null;
        this.wireConnection();
    }

    private wireConnection() {
        this.connection.on("message", (data) => {
            this.msgQueue.push(data);
            
            if (this.msgResolver) {
                this.msgResolver();
                this.msgResolver = null;
            }
        });

        this.connection.on("rawMessage", (data) => {
            this.rawMsgQueue.push(data);

            if (this.rawMsgResolver) {
                this.rawMsgResolver();
                this.rawMsgResolver = null;
            }
        });

        this.connection.on("error", (e) => {
            if (this.msgRejecter) {
                this.msgRejecter(e);
                this.msgRejecter = null;
            }
        });

        this.connection.on("close", () => {
            if (this.msgRejecter) {
                this.msgRejecter(new Error('Connection closed'));
                this.msgRejecter = null;
            }
            this.isClosed = true;
        });
    }

    public writeString(data: string) {
        this.connection.writeString(data);
    }

    public writeError(data: string) {
        this.connection.writeError(data);
    }

    public writeResp(data: RespValue) {
        this.connection.writeResp(data);
    }

    public setRawMode() {
        this.connection.setRawMode();
    }

    public setRespMode() {
        this.connection.setRespMode();
    }

    public async* nextMsg(): AsyncGenerator<RespValue> {
        while (true) {
            if (this.isClosed) {
                return;
            }

            if (this.msgQueue.length > 0) {
                yield this.msgQueue.shift()!;
            } else {
                if (this.msgResolver !== null) {
                    throw new Error('Previous message has not been resolved yet. Please await the previous message before requesting the next one.');
                };

                await new Promise<void>((resolve, reject) => {
                    this.msgResolver = resolve;
                    this.msgRejecter = reject;
                });
            }
            
        }
    }

    public async readMessage(): Promise<RespValue> {
        const gen = this.nextMsg();
        const { value, done } = await gen.next();

        if (done) {
            throw new Error('Connection closed');
        }

        return value;
    }
}