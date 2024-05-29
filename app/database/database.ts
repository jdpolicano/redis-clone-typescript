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
    private data: Map<string, DbEntry>;
    
    constructor() {
        this.data = new Map();
    }
    
    public set(key: RespBulkString, value: RespBulkString, expiration?: Expiration): void {
        if (!key.value) return;
        this.data.set(key.value, { value, expiration });
    }

    public setWithKey(key: string, value: RespBulkString, expiration?: Expiration): void {
        this.data.set(key, { value, expiration });
    }
    
    public get(key: RespBulkString): DbEntry | undefined {
        if (!key.value) return;
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

    public del(key: string): void {
        this.data.delete(key);
    }

    public getKeys(): string[] {
        return Array.from(this.data.keys());
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
}