import AsyncLink from "./asyncLink";

export default class Replica {
    connection: AsyncLink;

    constructor(connection: AsyncLink) {
        this.connection = connection;
    }
    
    write(data: Buffer) {
        this.connection.write(data);
    }
}