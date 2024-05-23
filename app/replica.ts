import Connection from "./connection";

export default class Replica {
    connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }
    
    write(data: Buffer) {
        this.connection.write(data);
    }
}