import net from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import Handler from "./protocol/handler";
import ReplicationHandler from "./protocol/replication";
import Database from "./database/database";
import ServerInfo from "./serverInfo";
import ClientInfo from "./clientInfo";
import ReplicationStream from "./replicationStream";
import Connection from "./connection";
import RespBuilder from "./resp/builder";
import RespEncoder from "./resp/encoder";
import RdbFileParser from "./database/persistence/rdbFileParser";

export type Host = "127.0.0.1" | "0.0.0.0"; // ipv4 or ipv6 address.

export enum ExitStatus {
    Graceful, // the server exited gracefully
    Error, // the server is exiting with an error
} 

// options
export interface ServerOptions {
    port?: string,
    replicaof?: string,
    dir?: string
    dbfilename?: string
}

/**
 * Represents a Redis server.
 */
export default class Server {
    /**
     * The server listener.
     */
    private listener: net.Server;

    /**
     * The port the server is listening on.
     */
    private port: string;

    /**
     * The host the server is listening on.
     */
    private host: Host;

    /**
     * the directory to store rdb files
     */
    private dir: string;

    /**
     * The rdb file name
     */
    private dbfilename: string;

    /**
     * The exit status of the server.
     */
    private exitStatus: ExitStatus;

    /**
     * The error that caused the server to exit.
     */
    private error?: Error; 

    /**
     * The database instance.
     */
    private db: Database;

    /**
     * The server information. Contains the role of the server, the host,the port, as well as replication information.
     */
    private serverInfo: ServerInfo;

    /**
     * The replication stream. Contains references to all open replicaiton connections and a buffer of commands to replicate.
     */
    private replicationStream: ReplicationStream;

    /**
     * The health check interval for replica servers. Runs one a second. 
     */
    private healthCheckInterval?: Timer;

    /**
     * Creates a new instance of the Server class.
     * @param options - The server options.
     */
    constructor(options: ServerOptions = {}) {
        this.listener = new net.Server();
        this.host = "127.0.0.1";
        this.port = options.port ? options.port : "6379";
        this.dir = options.dir ? options.dir : "./tmp/redis-files";
        this.dbfilename = options.dbfilename ? options.dbfilename : "dump.rdb";
        this.exitStatus = ExitStatus.Graceful;
        this.db = new Database();
        this.replicationStream = new ReplicationStream();
        this.setupServerInfo(options);
    }

    /**
     * Sets up the connection to the socket and begins routing incoming connections to the appropriate handler.
     * @returns A promise that resolves when the server has started.
     */
    public async start(): Promise<void> {
        await this.restoreFromRdb();
        if (this.serverInfo.getRole() === "master") {
            return this.listen();
        } else {
            const replicationSession = this.negotiateReplication();
            const listener = this.listen();
            await Promise.all([replicationSession, listener]);
        }
    }

    /**
     * Starts listening for incoming connections on the specified port.
     * @returns A promise that resolves when the server has started listening.
     */
    private listen(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.listener.listen({ port: parseInt(this.port) });
      
            this.listener.on("connection", async (socket) => {
                const clientInfo = new ClientInfo();
                const connection = new Connection(socket);

                const handler = new Handler({
                    connection,
                    db: this.db,
                    serverInfo: this.serverInfo,
                    clientInfo,
                    replicationStream: this.replicationStream
                });
                
                try {
                    await handler.handle();
                    // we should start pinging if we are in a replication state now...
                    if (clientInfo.isReplica() && !this.healthCheckInterval) {
                        this.setupHealthNotifications();
                    }
                } catch (err) {
                    console.log(`[ERR]: ${err.message}`);
                }
            });


            this.listener.on("error", (e: NodeJS.ErrnoException) => {
                this.error = e;
                this.exitStatus = ExitStatus.Error;

                if (e.code === 'EADDRINUSE' || e.code === 'EACCES') {
                    this.printErr();
                }

                this.listener.close();
            });

            this.listener.on("close", () => {
                if (this.exitStatus === ExitStatus.Error) {
                    return reject();
                }
                console.log("Server closed")
                resolve();
            });

            this.listener.on("listening", () => {
                console.log(`Server listening on port ${this.getServerPort()}`);
            });
            
        })
    }

    /**
     * Negotiates replication with the master server.
     * @returns A promise that resolves when the replication is complete.
     */
    private async negotiateReplication(): Promise<void> {
        const [host, port] = this.serverInfo.getMasterAddressParts();
        // connect to the master and send a ping request.
        const socket = net.createConnection({
            host,
            port: parseInt(port)
        });

        const connection = new Connection(socket);

        const replicationHandler = new ReplicationHandler({
            connection,
            db: this.db,
            serverInfo: this.serverInfo,
            clientInfo: new ClientInfo(),
            replicationStream: this.replicationStream
        }); 

        await replicationHandler.handle();

        const clientInfo = new ClientInfo();
        clientInfo.setRole("master");
        // all handlers should be reattached at this point.
        const replicationSession = new Handler({
            connection,
            db: this.db,
            serverInfo: this.serverInfo,
            clientInfo,
            replicationStream: this.replicationStream
        });

        return replicationSession.handle();
    }

    /**
     * Sets up health notifications for replica servers.
     */
    private setupHealthNotifications() {
        this.healthCheckInterval = setInterval(() => {
            const message = RespEncoder.encodeResp(
                RespBuilder.bulkStringArray(["PING"])
            );
            this.replicationStream.replicate(Buffer.from(message), this.serverInfo);
        }, 1000)
    }

    /**
     * Sets up the server information based on the provided options.
     * @param options - The server options.
     */
    private setupServerInfo(options: ServerOptions) {
        if (options.replicaof) {
            const [host, port] = options.replicaof.split(" ");

            if (!host || !port) {
                throw new Error('[ERR] replicaof of option requires "[host] [port]" format');
            }

            this.serverInfo = ServerInfo.getInstance({
                replication: {
                    role: "slave",
                    host: host,
                    port: port,
                },

                config: {
                    port: this.port,
                    dir: this.dir,
                    dbfilename: this.dbfilename
                }
            });

        } else {
            this.serverInfo = ServerInfo.getInstance({
                replication: {
                    role: "master",
                    host: this.host,
                    port: this.port,
                },

                config: {
                    port: this.port,
                    dir: this.dir,
                    dbfilename: this.dbfilename
                }
            
            });
        }

    }

    /**
     * restore the database from an rdb file
     */
    private async restoreFromRdb(): Promise<void> {
        const rdbPath = path.join(this.dir, this.dbfilename);
        if (await fs.exists(rdbPath)) {
            const file = await fs.readFile(rdbPath);
            const parser = new RdbFileParser(file, this.db);
            parser.apply();
        }
    }

    /**
     * Gets the address of the server as a full string.
     * @returns The server's port.
     */
    getServerPort(): string {
        return this.port;
    }

    /**
     * Prints the error message for this server in a pretty format.
     */
    printErr() {
        console.log(`[ERR]: ${this.error?.message}`);
    }
}