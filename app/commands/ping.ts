import Command from './base';
import type Connection from '../connection';
import type { RespValue } from '../resp/types';

export default class Ping extends Command {
    constructor(connection: Connection) {
        super(connection);
    }

    public execute() {
        this.connection.writeString("PONG");
    }
}
