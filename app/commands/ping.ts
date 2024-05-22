import Command, { Transaction } from './base';
import type { RequestContext } from '../protocol/base';
import RespBuilder from '../resp/builder';

export default class Ping extends Command {
    constructor(ctx: RequestContext) {
        super(ctx);
    }

    public execute(): Transaction {
        this.reply(() => this.ctx.connection.writeResp(RespBuilder.simpleString("PONG")));
        return Transaction.Other
    }
}
