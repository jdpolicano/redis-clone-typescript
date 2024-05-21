import Command, { TransactionType, Transaction } from './base';
import type { RequestContext } from '../protocol/base';
import RespBuilder from '../resp/builder';

export default class Ping extends Command {
    constructor(ctx: RequestContext) {
        super(ctx);
    }

    public execute(): Transaction {
        return this.transaction(TransactionType.Other, RespBuilder.simpleString("PONG"));
    }
}
