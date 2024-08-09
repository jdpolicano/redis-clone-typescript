import Command, { Transaction } from "./base";
import type { RequestContext } from "../protocol/base";
import type { RespBulkString } from "../resp/types";
import RespBuilder from "../resp/builder";

export interface GetOptions {
  key: RespBulkString;
}

export default class Get extends Command {
  private options: GetOptions;

  constructor(ctx: RequestContext, options: GetOptions) {
    super(ctx);
    this.options = options;
  }

  public execute(): Transaction {
    const key = this.ctx.db.get(this.options.key);
    if (key) {
      this.reply(() => this.ctx.connection.writeResp(key.value));
      return Transaction.Read;
    } else {
      this.reply(() =>
        this.ctx.connection.writeResp(RespBuilder.bulkString(null)),
      );
      return Transaction.ReadFail;
    }
  }
}
