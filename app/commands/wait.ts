import Command, { Transaction } from './base';
import type { RequestContext } from "../protocol/base"
import type { RespBulkString } from '../resp/types';

export interface WaitOptions {
    numClients: number;
    maxWaitTime: number;
}

export default class Wait extends Command {
    private options: WaitOptions;

    constructor(ctx: RequestContext, options: WaitOptions) {
        super(ctx);
        this.options = options;
    }

    static parseWaitOptions(args: RespBulkString[]): WaitOptions {
        const maxWaitTime = args.pop();
        const numClients = args.pop();

        if (numClients === undefined || numClients === null) {
            throw new Error("ERR missing arguements to wait call");
        }

        const numClientsInt = parseInt(numClients.value as string, 10);
        const maxWaitTimeInt = maxWaitTime ? parseInt(maxWaitTime.value as string, 10) : 0;

        if (isNaN(numClientsInt) || isNaN(maxWaitTimeInt)) {
            throw new Error("ERR wait args not parsable as integers");
        }

        return {
            numClients: numClientsInt,
            maxWaitTime: maxWaitTimeInt
        };
    }

    public execute(): Transaction {
        this.reply(() => this.ctx.connection.writeInteger(0));
        return Transaction.Other; 
    }
}