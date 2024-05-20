import net from "node:net";
import Handler from "./protocol/handler";
import ReplicationHandler from "./protocol/replication";
import Database from "./database/database";
import ServerInfo from "./serverInfo";
import type { ServerInfoOptions } from "./serverInfo";

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

    constructor(options: ServerOptions = {}) {
        this.listener = new net.Server();
        this.port = options.port ? options.port : "6379";
        this.exitStatus = ExitStatus.Graceful
        this.db = new Database();
        this.setupServerInfo(options);
    }

    /**
     * Sets up the connection to the socket and begins routing incomming connections to the appropriate handler.
     */
    public start(): Promise<void> {
        if (this.serverInfo.getRole() === "master") {
            return this.listen();
        } else {
            return this.negotiateReplication()
        }
    }

    private listen(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.listener.listen({ port: parseInt(this.port) });
      
            this.listener.on("connection", (connection) => {
                const handler = new Handler({
                    connection,
                    db: this.db,
                    info: this.serverInfo
                });

                handler.handle();
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

    private negotiateReplication(): Promise<void> {
        const [host, port] = this.serverInfo.getMasterAddressParts();
        // connect to the master and send a ping request.
        const socket = net.createConnection({
            host,
            port: parseInt(port)
        });

        const replicationHandler = new ReplicationHandler({
            connection: socket,
            db: this.db,
            info: this.serverInfo
        }); 

        return replicationHandler.handle();
    }

    private setupServerInfo(options: ServerOptions) {
        if (options.replicaof) {
            const [host, port] = options.replicaof.split(" ");

            if (!host || !port) {
                throw new Error('[ERR] replicaof of option requires "[host] [port]" format');
            }

            const infoOpts: ServerInfoOptions = {
                role: "slave",
                host,
                port,
            }

            this.serverInfo = ServerInfo.getInstance(infoOpts);

        } else {
            const infoOpts: ServerInfoOptions = {
                role: "master",
                host: this.host,
                port: this.port,
            }
             
            this.serverInfo = ServerInfo.getInstance(infoOpts);
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