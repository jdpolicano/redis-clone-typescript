import { RespType, type RespValue } from "../resp/types";
import type { RequestContext } from "../protocol/base";

/**
 * Defines what type of transaction occurred during this command.
 * This can help the handler that execs the command to know what it should do next.
 */
export enum TransactionType {
    Read, // db read
    ReadFail, // attempt to read something that wasn't there.
    Write, // db write
    WriteFail, // attempt to write something but failed.
    Other // something else, i.e., ping, info, replconf, other goodies
}

/**
 * This is what the Command actually returns. It tells the caller what kind of transaction occured,
 * What the response to the client should be, and maybe later some other meta data.
 */
export interface Transaction {
    type: TransactionType // what kind of transaction occured?
    response: RespValue // what should we write back to the client?
    // to-do: it would be cool to track the command executed, the time it took, and some other stuff later.
}



export default abstract class Command {
    protected ctx: RequestContext;

    constructor(ctx: RequestContext) {
        this.ctx = ctx;
    }
    
    abstract execute(message: RespValue): Transaction;

    bulkString(value: string | null): RespValue {
        return {
            type: RespType.BulkString,
            value
        }
    }

    simpleString(value: string): RespValue {
        return {
            type: RespType.SimpleString,
            value
        }
    }

    transaction(type: TransactionType, value: RespValue): Transaction {
        return {
            type,
            response: value
        }
    }
}