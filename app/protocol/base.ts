import Connection from "../connection";
import type Database from "../database/database";
import type ServerInfo from "../serverInfo"; // server info meta data...
import type net from "net";
import AsyncLink from "../asyncLink";

export interface RequestContext {
    connection: AsyncLink;
    db: Database;
    info: ServerInfo;
}

export interface HandlerOptions {
    connection: net.Socket; 
    db: Database;
    info: ServerInfo
}

export abstract class SocketHandler {
    protected ctx: RequestContext;

    constructor(opts: HandlerOptions) { 
        this.ctx = {
            connection: new AsyncLink(new Connection(opts.connection)),
            db: opts.db,
            info: opts.info
        }
    }

    abstract handle(): void;
}