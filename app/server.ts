import net from "node:net";
import Handler from "./protocol/handler";
import ReplicationHandler from "./protocol/replication";
import Database from "./database/database";
import ServerInfo from "./serverInfo";
import ClientInfo from "./clientInfo";
import Replica from "./replica";
import ReplicationStream from "./replicationStream";
import type { RequestContext } from "./protocol/base";

export type Host = "127.0.0.1" | "0.0.0.0"; // ipv4 or ipv6 address.

export enum ExitStatus {
    Graceful, // the server exited gracefully
    Error, // the server is exiting with an error
} 

// options
export interface ServerOptions {
    port?: string,
    replicaof?: string
}

export default class Server {
    private listener: net.Server;
    private port: string;
    private host: Host;
    private exitStatus: ExitStatus;
    private error?: Error; 
    private db: Database;
    private serverInfo: ServerInfo;
    private replicationStream: ReplicationStream;

    constructor(options: ServerOptions = {}) {
        this.listener = new net.Server();
        this.host = "127.0.0.1";
        this.port = options.port ? options.port : "6379";
        this.exitStatus = ExitStatus.Graceful
        this.db = new Database();
        this.replicationStream = new ReplicationStream();
        this.setupServerInfo(options);
    }

    /**
     * Sets up the connection to the socket and begins routing incomming connections to the appropriate handler.
     */
    public async start(): Promise<void> {

        if (this.serverInfo.getRole() === "master") {
            return this.listen();
        } else {
            const replicationSession = this.negotiateReplication();
            const listener = this.listen();
            await Promise.all([replicationSession, listener]);
        }
    }

    private listen(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.listener.listen({ port: parseInt(this.port) });
      
            this.listener.on("connection", async (connection) => {
                // will be used to keep track of replicas...
                const clientInfo = new ClientInfo();
                const handler = new Handler({
                    connection,
                    db: this.db,
                    serverInfo: this.serverInfo,
                    clientInfo,
                    replicationStream: this.replicationStream
                });
                
                try {
                    await handler.handle();
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
                    this.printErr();
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

    private async negotiateReplication(): Promise<void> {
        const [host, port] = this.serverInfo.getMasterAddressParts();
        // connect to the master and send a ping request.
        const socket = net.createConnection({
            host,
            port: parseInt(port)
        });

        const replicationHandler = new ReplicationHandler({
            connection: socket,
            db: this.db,
            serverInfo: this.serverInfo,
            clientInfo: new ClientInfo(),
            replicationStream: this.replicationStream
        }); 

        await replicationHandler.handle();
        console.log("replicating...");
        replicationHandler.cleanup(); // removes all listeners from the connection to the master.
        console.log("replication handler severed...");

        const clientInfo = new ClientInfo();
        clientInfo.setRole("master");
        // all handlers should be reattached at this point.
        const replicationSession = new Handler({
            connection: socket,
            db: this.db,
            serverInfo: this.serverInfo,
            clientInfo,
            replicationStream: this.replicationStream
        });

        return replicationSession.handle();
    }

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
                    port: this.port
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
                    port: this.port
                }
            
            });
        }

    }

    /**
     * @returns the address of the server as a full string.
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