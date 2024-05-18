import Command from './base';
import type Connection from '../connection';
import type { RespValue } from '../resp/types';

export interface EchoOptions {
    msgToEcho: RespValue;
}

export default class Echo extends Command {
    private options: EchoOptions;

    constructor(connection: Connection, options: EchoOptions) {
        super(connection);
        this.options = options;
    }

    public execute() {
        this.connection.writeResp(this.options.msgToEcho);
    }
}