import type { RespBulkString } from "../resp/types";
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
            if (dbEntry.expiration.isExpired()) {
                this.data.delete(key.value);
                return;
            } else {
                return dbEntry;
            }
        }

        return dbEntry;
    }

    /**
     * Temporary method to return the RDB file.
     * @returns 
     */
    public getRdbFile(): Buffer {
        const rdb = Buffer.from("UkVESVMwMDEx+glyZWRpcy12ZXIFNy4yLjD6CnJlZGlzLWJpdHPAQPoFY3RpbWXCbQi8ZfoIdXNlZC1tZW3CsMQQAPoIYW9mLWJhc2XAAP/wbjv+wP9aog==", "base64");
        return Buffer.concat([
            Buffer.from(`$${rdb.length.toString()}\r\n`),
            rdb
        ])
    }
    
    public del(key: string): void {
        this.data.delete(key);
    }
}