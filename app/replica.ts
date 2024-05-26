import Connection from "./connection";

export default class Replica {
    connection: Connection;
    private lastKnownOffset: number;

    constructor(connection: Connection) {
        this.connection = connection;
        this.lastKnownOffset = -1; // -1 means we don't know the offset
    }
    
    write(data: Buffer) {
        this.connection.write(data);
    }

    setLastKnownOffset(offset: number) {
        this.lastKnownOffset = offset;
    }

    getLastKnownOffset() {
        return this.lastKnownOffset;
    }
}