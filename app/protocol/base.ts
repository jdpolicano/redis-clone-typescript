import Connection from "../connection";
import type Database from "../database/database";
import type ServerInfo from "../serverInfo"; // server info meta data...
import type ClientInfo from "../clientInfo";
import type net from "net";
import AsyncLink from "../asyncLink";

export interface RequestContext {
    connection: AsyncLink;
    db: Database;
    serverInfo: ServerInfo;
    clientInfo: ClientInfo;
    internals: Internals;
}

export interface Internals {
    listeningPort?: string;
    capabilities?: string[];
}

export interface HandlerOptions {
    connection: net.Socket; 
    db: Database;
    serverInfo: ServerInfo;
    clientInfo: ClientInfo;
}

export abstract class SocketHandler {
    protected ctx: RequestContext;

    constructor(opts: HandlerOptions) { 
        this.ctx = {
            connection: new AsyncLink(new Connection(opts.connection)),
            db: opts.db,
            serverInfo: opts.serverInfo,
            clientInfo: opts.clientInfo,
            internals: {}
        }
    }

    abstract handle(): void;
}