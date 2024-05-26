import Command, { Transaction } from './base';
import type { RequestContext } from "../protocol/base"
import type { RespBulkString } from '../resp/types';
import RespBuilder from '../resp/builder';

export interface ConfigOptions {
    get: boolean;
    key: RespBulkString;
}

export default class Config extends Command {
    private options: ConfigOptions;

    constructor(ctx: RequestContext, options: ConfigOptions) {
        super(ctx);
        this.options = options;
    }

    public execute(): Transaction {
        if (this.options.key.value === null) {
            this.reply(() => this.ctx.connection.writeResp(RespBuilder.simpleError("ERR wrong number of arguments for 'config' command")));
            return Transaction.ReadFail;
        }

        const serverConfigValue = this.ctx.serverInfo.getConfigKey(this.options.key.value);
        const response = [this.options.key.value, serverConfigValue || null]
        this.reply(() => this.ctx.connection.writeResp(RespBuilder.bulkStringArray(response)));
        return Transaction.Read;
    }

    static parseConfigArgs(args: RespBulkString[]): ConfigOptions {
        const key = args.pop();
        const command = args.pop();

        if (!command || !key) {
            throw new Error("ERR wrong number of arguments for 'config' command");
        };

        if (command.value?.toLowerCase() !== "get") {
            throw new Error("ERR Unsupported CONFIG subcommand or wrong number of arguments");
        }

        return {
            get: true,
            key: key
        }
    }
}