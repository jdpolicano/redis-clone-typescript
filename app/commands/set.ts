import Command from './base';
import type { RequestContext } from "../handler";
import type { RespBulkString } from '../resp/types';
import { RespType } from '../resp/types';

export interface SetOptions {
    key: RespBulkString;
    value: RespBulkString;
}

export default class Set extends Command {
    private options: SetOptions;

    constructor(ctx: RequestContext, options: SetOptions) {
        super(ctx);
        this.options = options;
    }

    public execute(): void {
        this.ctx.db.set(this.options.key, this.options.value);
        this.ctx.connection.writeString("OK");
    }
}