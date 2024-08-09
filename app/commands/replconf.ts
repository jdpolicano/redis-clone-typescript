import Command, { Transaction } from "./base";
import type { RequestContext } from "../protocol/base";
import type { RespBulkString, RespValue } from "../resp/types";
import RespBuilder from "../resp/builder";

export interface ReplconfOptions {
  listeningPort?: string;
  capabilities?: string[];
  getAck?: string; // GETACK * | no | <ack>
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
      this.reply(() =>
        this.ctx.connection.writeResp(RespBuilder.simpleString("OK")),
      );
    }

    if (this.options.capabilities) {
      this.ctx.internals.capabilities = this.options.capabilities;
      this.reply(() =>
        this.ctx.connection.writeResp(RespBuilder.simpleString("OK")),
      );
    }

    if (this.options.getAck) {
      const args = [
        "REPLCONF",
        "ACK",
        this.ctx.serverInfo.getMasterReplOffset().toString(),
      ];
      this.reply(() =>
        this.ctx.connection.writeResp(RespBuilder.bulkStringArray(args)),
      );
    }

    return Transaction.Internals;
  }

  static parseArgs(args: RespBulkString[]): ReplconfOptions {
    const options: ReplconfOptions = {};

    const firstArg = args[0].value?.toLowerCase();

    if (firstArg === "listening-port") {
      if (!args[1]?.value) {
        throw new Error(
          "ERR wrong number of arguments for 'replconf listening-port' command",
        );
      }
      options.listeningPort = args[1].value;
    } else if (firstArg === "capa") {
      options.capabilities = args
        .slice(1)
        .map((arg) => arg.value)
        .filter((arg): arg is string => typeof arg === "string");
    } else if (firstArg === "getack") {
      if (!args[1]?.value) {
        throw new Error(
          "ERR wrong number of arguments for 'replconf getack' command",
        );
      }
      options.getAck = args[1].value;
    }

    return options;
  }
}
