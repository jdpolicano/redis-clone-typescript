/**
 * The connection struct was deemed sufficent for our purposes.
 * @deprecated
 */
export default class AsyncLink {
    // private connection: Connection;
    // private msgQueue: Message[];
    // private rawMsgQueue: Buffer[];
    // private isClosed: boolean;

    // /**
    //  * Handles the resolution of messages in an async manner.
    //  */
    // private msgResolver: (() => void) | null;
    // private msgRejecter: ((e: Error) => void) | null;
    // private rawMsgResolver: (() => void) | null;
    // private rawMsgRejecter: ((e: Error) => void) | null;

    // /**
    //  * Creates an instance of AsyncLink.
    //  * @param connection The connection object.
    //  */
    // constructor(connection: Connection) {
    //     this.connection = connection;
    //     this.msgQueue = [];
    //     this.rawMsgQueue = [];
    //     this.isClosed = false;
    //     this.msgResolver = null;
    //     this.msgRejecter = null;
    //     this.rawMsgResolver = null;
    //     this.rawMsgRejecter = null;
    //     this.wireConnection();
    // }

    // /**
    //  * Wires up the connection event handlers.
    //  */
    // private wireConnection() {
    //     this.connection.on("message", (data) => {
    //         this.msgQueue.push(data);
            
    //         if (this.msgResolver) {
    //             this.msgResolver();
    //             this.msgResolver = null;
    //         }
    //     });

    //     this.connection.on("rawMessage", (data) => {
    //         this.rawMsgQueue.push(data);
    //         if (this.rawMsgResolver) {
    //             this.rawMsgResolver();
    //             this.rawMsgResolver = null;
    //         }
    //     });

    //     this.connection.on("error", (e) => {
    //         this.msgRejecter && this.msgRejecter(e);
    //         this.rawMsgRejecter && this.rawMsgRejecter(e);
    //         this.msgRejecter = null;
    //         this.rawMsgRejecter = null;
    //     });

    //     this.connection.on("close", () => {
    //         if (this.msgRejecter) {
    //             this.msgRejecter(new Error('Connection closed'));
    //             this.msgRejecter = null;
    //         }

    //         if (this.rawMsgRejecter) {
    //             this.rawMsgRejecter(new Error('Connection closed'));
    //             this.rawMsgRejecter = null;
    //         }
    //         this.isClosed = true;
    //     });
    // }

    // /**
    //  * Checks if there is a pending request.
    //  * @returns True if there is a pending request, false otherwise.
    //  */
    // private hasPendingRequest() {
    //     return this.msgResolver !== null
    //         || this.rawMsgResolver !== null;
    // }

    // /**
    //  * Writes a string to the connection.
    //  * @param data The string to write.
    //  */
    // public writeString(data: string) {
    //     this.connection.writeString(data);
    // }

    // /**
    //  * Writes an error to the connection.
    //  * @param data The error to write.
    //  */
    // public writeError(data: string) {
    //     this.connection.writeError(data);
    // }

    // /**
    //  * Writes a RespValue to the connection.
    //  * @param data The RespValue to write.
    //  */
    // public writeResp(data: RespValue) {
    //     this.connection.writeResp(data);
    // }

    // /**
    //  * Writes data to the connection.
    //  * @param data The data to write.
    //  */
    // public write(data: string | Uint8Array) {
    //     this.connection.write(data);
    // }

    // /**
    //  * Sets the connection to raw mode.
    //  */
    // public setRawMode() {
    //     this.connection.setRawMode();
    // }

    // /**
    //  * Sets the connection to RESP mode.
    //  */
    // public setRespMode() {
    //     this.connection.setRespMode();
    // }

    // /**
    //  * Sets the connection to RDB mode.
    //  */
    // public setRDMode() {
    //     this.connection.setRDMode();
    // }

    // /**
    //  * Returns an async generator that yields the next message.
    //  * @returns An async generator that yields the next message.
    //  */
    // public async* nextMsg(): AsyncGenerator<Message> {
    //     while (true) {
    //         if (this.isClosed || this.connection.isRawMode()) {
    //             return;
    //         }

    //         if (this.msgQueue.length > 0) {
    //             yield this.msgQueue.shift()!;
    //         } else {
    //             if (this.hasPendingRequest()) {
    //                 throw new Error('Previous message has not been resolved yet. Please await the previous message before requesting the next one.');
    //             };

    //             await new Promise<void>((resolve, reject) => {
    //                 this.msgResolver = resolve;
    //                 this.msgRejecter = reject;
    //             });
    //         }
            
    //     }
    // }

    // /**
    //  * Returns an async generator that yields the next raw message.
    //  * @returns An async generator that yields the next raw message.
    //  */
    // public async* nextRawMsg(): AsyncGenerator<Buffer> {
    //     while (true) {
    //         if (this.isClosed || !this.connection.isRawMode()) {
    //             return;
    //         }

    //         if (this.rawMsgQueue.length > 0) {
    //             yield this.rawMsgQueue.shift()!;
    //         } else {
    //             if (this.hasPendingRequest()) {
    //                 throw new Error('Previous raw message has not been resolved yet. Please await the previous raw message before requesting the next one.');
    //             };

    //             await new Promise<void>((resolve, reject) => {
    //                 this.rawMsgResolver = resolve;
    //                 this.rawMsgRejecter = reject;
    //             });
    //         }
    //     }
    // }

    // /**
    //  * Reads the next message from the connection.
    //  * @returns A promise that resolves to the next message.
    //  */
    // public async readMessage(): Promise<Message> {
    //     const gen = this.nextMsg();
    //     const { value, done } = await gen.next();

    //     if (done) {
    //         throw new Error('Connection closed');
    //     }

    //     return value;
    // }

    // /**
    //  * Reads the next raw message from the connection.
    //  * @returns A promise that resolves to the next raw message.
    //  */
    // public async readRawMessage(): Promise<Buffer> {
    //     this.setRawMode();
    //     const gen = this.nextRawMsg();
    //     const { value, done } = await gen.next();
    //     this.setRespMode();

    //     if (done) {
    //         throw new Error('Connection closed');
    //     }

    //     return value;
    // }

    // public cleanup() {
    //     this.connection.cleanup();
    //     this.connection.removeAllListeners();
    //     this.isClosed = true;
    // }
}