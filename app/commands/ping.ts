import Command, { TransactionType, Transaction } from './base';
import type { RequestContext } from '../protocol/base';

export default class Ping extends Command {
    constructor(ctx: RequestContext) {
        super(ctx);
    }

    public execute(): Transaction {
        return this.transaction(TransactionType.Other, this.simpleString("PONG"));
    }
}
