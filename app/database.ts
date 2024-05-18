import type { RespBulkString } from "./resp/types";

/**
 * Database class to store data in memory.
 */
export default class Database {
    private data: Map<string | null, RespBulkString>;
    
    constructor() {
        this.data = new Map();
    }
    
    public set(key: RespBulkString, value: RespBulkString): void {
        this.data.set(key.value, value);
    }
    
    public get(key: RespBulkString): RespBulkString | undefined {
        return this.data.get(key.value);
    }
    
    public del(key: string): void {
        this.data.delete(key);
    }
}