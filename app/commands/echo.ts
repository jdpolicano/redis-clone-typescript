import Command, { Transaction, TransactionType } from './base';
import type { RequestContext } from "../protocol/base"
import type { RespValue } from '../resp/types';

export interface EchoOptions {
    msgToEcho: RespValue;
}

export default class Echo extends Command {
    private options: EchoOptions;

    constructor(ctx: RequestContext, options: EchoOptions) {
        super(ctx);
        this.options = options;
    }

    public execute(): Transaction {
        return this.transaction(TransactionType.Other, this.options.msgToEcho)
    }
}