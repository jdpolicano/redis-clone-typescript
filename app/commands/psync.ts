import Command, { Transaction } from "./base";
import type { RequestContext } from "../protocol/base";
import type { RespBulkString, RespValue } from "../resp/types";
import RespBuilder from "../resp/builder";

export interface PsyncOptions {
  clientMasterId: string;
  clientMasterReplOffet: number;
}

export default class Replconf extends Command {
  private options: PsyncOptions;

  constructor(ctx: RequestContext, options: PsyncOptions) {
    super(ctx);
    this.options = options;
  }

  public execute(): Transaction {
    // todo do something with the id and offset...
    const fullResync = `FULLRESYNC ${this.ctx.serverInfo.getMasterReplid()} ${this.ctx.serverInfo.getMasterReplOffset()}`;
    const rdbFile = this.ctx.db.getRdbFile();
    this.reply(() =>
      this.ctx.connection.writeResp(RespBuilder.simpleString(fullResync)),
    );
    this.reply(() => this.ctx.connection.write(rdbFile));
    this.ctx.clientInfo.setRole("replica");
    return Transaction.Replication;
  }

  static parseArgs(args: RespBulkString[]): PsyncOptions {
    if (args.length !== 2) {
      throw new Error("ERR wrong number of arguments for 'pysnc' command");
    }

    if (typeof args[0].value !== "string") {
      throw new Error("ERR client id must be a string");
    }

    if (!args[1].value || isNaN(parseInt(args[1].value))) {
      throw new Error("ERR offset must be a number");
    }

    return {
      clientMasterId: args[0].value,
      clientMasterReplOffet: parseInt(args[1].value),
    };
  }
}
