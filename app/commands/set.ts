import Command, { TransactionType, Transaction } from './base';
import type { RequestContext } from "../protocol/base";
import type { RespBulkString } from '../resp/types';
import Expiration from "../database/expiration";

export interface SetOptions {
    key: RespBulkString;
    value: RespBulkString;
    px?: number;
    ex?: number;
    nx?: boolean;
    xx?: boolean;
}

export default class Set extends Command {
    private options: SetOptions;

    constructor(ctx: RequestContext, options: SetOptions) {
        super(ctx);
        this.options = options;
    }

    public execute(): Transaction {
        let expiry: Expiration | undefined;

        if (this.options.ex) {
            expiry = new Expiration(this.options.ex, "sec");
        }

        if (this.options.px) {
            expiry = new Expiration(this.options.px, "ms");
        }

        this.ctx.db.set(this.options.key, this.options.value, expiry);
        return this.transaction(TransactionType.Write, this.simpleString("OK"));
    }
}