import Command from './base';
import type { RequestContext } from "../handler";
import { RespType } from '../resp/types';


export default class Info extends Command {
    constructor(ctx: RequestContext) {
        super(ctx);
    }

    public execute() {
        this.ctx.connection.writeResp({ type: RespType.BulkString, value: this.formatInfo()});
    }
    
    private formatInfo(): string {
        const parts = [
            `role:${this.ctx.info.getRole()}`,
            `master_replid:${this.ctx.info.getMasterReplid()}`,
            `master_repl_offset:${this.ctx.info.getMasterReplOffset()}`
        ]
        return parts.join("\r\n");
    }
}