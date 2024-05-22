import Command, { Transaction, TransactionType } from './base';
import type { RequestContext } from "../protocol/base"
import type { RespBulkString, RespValue } from '../resp/types';
import RespBuilder from '../resp/builder';

export interface ReplconfOptions {
    listeningPort?: string;
    capabilities?: string[];
}

export default class Replconf extends Command {
    private options: ReplconfOptions;

    constructor(ctx: RequestContext, options: ReplconfOptions) {
        super(ctx);
        this.options = options;
    }

    public execute(): Transaction {
        if (this.options.listeningPort) {
            this.ctx.internals.listeningPort = this.options.listeningPort;
        }

        if (this.options.capabilities) {
            this.ctx.internals.capabilities = this.options.capabilities;
        }

        return this.transaction(TransactionType.Internals, RespBuilder.simpleString("OK"));
    }

    static parseArgs(args: RespBulkString[]): ReplconfOptions {
        const options: ReplconfOptions = {};
        const firstArg = args[0].value;
        if (firstArg === "listening-port") {
            if (!args[1]?.value) {
                throw new Error("ERR wrong number of arguments for 'replconf' command");
            }
            options.listeningPort = args[1].value;
        } else if (firstArg === "capa") {
            options.capabilities = args.slice(1)
                .map((arg) => arg.value)
                .filter((arg): arg is string => typeof arg === "string");
        }
        return options;
    }
}