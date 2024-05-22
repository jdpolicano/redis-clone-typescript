import Command, { Transaction } from './base';
import type { RequestContext } from "../protocol/base";
import RespBuilder from '../resp/builder';


export default class Info extends Command {
    constructor(ctx: RequestContext) {
        super(ctx);
    }

    public execute() {
        this.ctx.connection.writeResp(RespBuilder.bulkString(this.formatInfo()));
        return Transaction.Other
    }
    
    private formatInfo(): string {
        const parts = [
            `role:${this.ctx.serverInfo.getRole()}`,
            `master_replid:${this.ctx.serverInfo.getMasterReplid()}`,
            `master_repl_offset:${this.ctx.serverInfo.getMasterReplOffset()}`
        ]
        return parts.join("\r\n");
    }
}