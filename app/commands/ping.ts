import Command from './base';
import type { RequestContext } from '../handler';
import type { RespValue } from '../resp/types';

export default class Ping extends Command {
    constructor(ctx: RequestContext) {
        super(ctx);
    }

    public execute() {
        this.ctx.connection.writeString("PONG");
    }
}
