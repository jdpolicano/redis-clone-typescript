import Connection from "../connection";
import type Database from "../database/database";
import type ServerInfo from "../serverInfo"; // server info meta data...
import type ClientInfo from "../clientInfo";
import type net from "net";
import AsyncLink from "../asyncLink";
import ReplicationStream from "../replicationStream";

export interface RequestContext {
    connection: AsyncLink;
    db: Database;
    serverInfo: ServerInfo;
    clientInfo: ClientInfo;
    internals: Internals;
    replicationStream: ReplicationStream;
}

export interface Internals {
    listeningPort?: string;
    capabilities?: string[];
}

export interface HandlerOptions {
    connection: AsyncLink; 
    db: Database;
    serverInfo: ServerInfo;
    clientInfo: ClientInfo;
    replicationStream: ReplicationStream;
}

export abstract class SocketHandler {
    protected ctx: RequestContext;

    constructor(opts: HandlerOptions) { 
        this.ctx = {
            connection: opts.connection,
            db: opts.db,
            serverInfo: opts.serverInfo,
            clientInfo: opts.clientInfo,
            replicationStream: opts.replicationStream,
            internals: {}
        }
    }

    abstract handle(): void;

    /**
     * returns the request context object back to the caller.
     * @returns RequestContext
     */
    public getCtx(): RequestContext {
        return this.ctx;
    }

    public cleanup() {
        this.ctx.connection.cleanup();
    }

    public swapSocket(socket: net.Socket) {
        this.ctx.connection = new AsyncLink(new Connection(socket));
    }

    public swapConnection(connection: Connection) {
        this.ctx.connection = new AsyncLink(connection);
    }

    public swapLink(link: AsyncLink) {
        this.ctx.connection = link;
    }
}