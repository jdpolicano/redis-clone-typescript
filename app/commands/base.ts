import type Connection from "../connection";
import type { RespValue } from "../resp/types";
import type { RequestContext } from "../handler";

export default abstract class Command {
    protected ctx: RequestContext;

    constructor(ctx: RequestContext) {
        this.ctx = ctx;
    }
    
    abstract execute(message: RespValue): unknown;
}