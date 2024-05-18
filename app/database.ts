import type { RespBulkString } from "./resp/types";
import Expiration, { type Metric } from "./expiration";

export interface DbEntry {
    value: RespBulkString;
    expiration?: Expiration;
}

/**
 * Database class to store data in memory.
 */
export default class Database {
    private data: Map<string | null, DbEntry>;
    
    constructor() {
        this.data = new Map();
    }
    
    public set(key: RespBulkString, value: RespBulkString, expiration?: Expiration): void {
        this.data.set(key.value, { value, expiration });
    }
    
    public get(key: RespBulkString): DbEntry | undefined {
        const dbEntry = this.data.get(key.value);
        if (dbEntry && dbEntry.expiration) {
            console.log(dbEntry.expiration);
            if (dbEntry.expiration.isExpired()) {
                this.data.delete(key.value);
                return;
            } else {
                return dbEntry;
            }
        }

        return dbEntry;
    }
    
    public del(key: string): void {
        this.data.delete(key);
    }
}