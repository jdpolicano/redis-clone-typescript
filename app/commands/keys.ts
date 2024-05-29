import Command, { Transaction } from './base';
import type { RequestContext } from "../protocol/base";
import RespBuilder from '../resp/builder';
import type { RespBulkString } from '../resp/types';

export interface KeysOptions {
    pattern: string;
}

export default class Keys extends Command {
    constructor(ctx: RequestContext, options: KeysOptions) {
        super(ctx);
    }

    public execute() {
        const keys = this.ctx.db.getKeys();
        const payload = RespBuilder.bulkStringArray(keys);
        this.reply(() => this.ctx.connection.writeResp(payload));
        return Transaction.Read;
    }
    
    static parseKeysOptions(args: RespBulkString[]): KeysOptions {
        if (args.length !== 1 || !args[0].value) {
            throw new Error("ERR wrong number of arguments for 'keys' command");
        }

        return {
            pattern: args[0].value
        }
    };
}