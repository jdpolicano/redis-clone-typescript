import Command from './base';
import type { RequestContext } from "../handler";


export default class Info extends Command {
    constructor(ctx: RequestContext) {
        super(ctx);
    }

    public execute() {
        this.ctx.connection.writeString(this.formatInfo());
    }
    
    private formatInfo(): string {
        return `role:${this.ctx.info.getRole()}\r\n`;
    }
}