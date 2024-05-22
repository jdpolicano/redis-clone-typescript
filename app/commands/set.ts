import Command, { Transaction } from './base';
import type { RequestContext } from "../protocol/base";
import type { RespBulkString } from '../resp/types';
import Expiration from "../database/expiration";
import RespBuilder from "../resp/builder";

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
        this.reply(() => this.ctx.connection.writeResp(RespBuilder.simpleString("OK")));
        return Transaction.Write;
    }

   /**
    * Parses the options for the "set" command.
    * @param args - The arguments for the command.
    * @returns The parsed options.
    */
   static parseSetOptions(args: RespBulkString[]): SetOptions {
       const options: SetOptions = {
           key: args[0],
           value: args[1]
       };

       for (let i = 2; i < args.length; i += 2) {
           const flag = args[i].value?.toString().toLowerCase();
           const value = args[i + 1].value;

           if (value === undefined || value === null) {
               return options;
           }

           if (flag === "px") {
               options.px = parseInt(value.toString());
           } else if (flag === "ex") {
               options.ex = parseInt(value.toString());
           }
       }

       return options;
   }
}