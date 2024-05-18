import Command from './base';
import type { RequestContext } from "../handler";
import type { RespBulkString } from '../resp/types';
import { RespType } from '../resp/types';

export interface GetOptions {
    key: RespBulkString;
}

export default class Get extends Command {
    private options: GetOptions;

    constructor(ctx: RequestContext, options: GetOptions) {
        super(ctx);
        this.options = options;
    }

    public execute(): void {
        const key = this.ctx.db.get(this.options.key);
        if (key) {
            this.ctx.connection.writeResp(key);
        } else {
            this.ctx.connection.writeResp({ type:RespType.BulkString, value: null })
        }
    }
}