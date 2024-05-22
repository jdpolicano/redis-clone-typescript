import { RespType, type RespValue } from "../resp/types";
import type { RequestContext } from "../protocol/base";

/**
 * Defines what type of transaction occurred during this command.
 * This can help the handler that execs the command to know what it should do next.
 */
export enum Transaction {
    Read, // db read
    ReadFail, // attempt to read something that wasn't there.
    Write, // db write
    WriteFail, // attempt to write something but failed.
    Info, // info
    Ping, // ping
    Other, // other
    Internals, 
    Replication, // replication
    ReplicationFail // replication failed
}

export default abstract class Command {
    protected ctx: RequestContext;

    constructor(ctx: RequestContext) {
        this.ctx = ctx;
    }
    
    abstract execute(message: RespValue): Transaction;
}