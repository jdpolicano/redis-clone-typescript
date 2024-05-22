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
    protected shouldReply: boolean = true;

    constructor(ctx: RequestContext) {
        this.ctx = ctx;
    }
    
    abstract execute(message: RespValue): Transaction;

    public setReply(shouldReply: boolean) {
        this.shouldReply = shouldReply;
    }

    /**
     * Passthrough method that allows the command to reply to the client.
     * Only replies if the shouldReply flag is set to true.
     * @param cb 
     */
    protected reply(cb: () => void) {
        if (this.shouldReply) {
            cb();
        }
    }
}