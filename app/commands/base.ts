import type Connection from "../connection";
import type { RespValue } from "../resp/types";

export default abstract class Command {
    protected connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }
    
    abstract execute(message: RespValue): void;
}