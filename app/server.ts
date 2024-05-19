import net from "node:net";
import Handler from "./handler";
import Database from "./database/database";
import ServerInfo from "./serverInfo";

export type Host = "127.0.0.1" | "0.0.0.0"; // ipv4 or ipv6 address.

export enum ExitStatus {
    Error, // the server is exiting with an error
    Graceful, // the server exited gracefully
    None // the server is ongoing
} 

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
    private options: ServerOptions;

    constructor(options: ServerOptions = {}) {
        this.listener = new net.Server();
        this.port = options.port ? options.port : "6379";
        this.exitStatus = ExitStatus.None;
        this.db = new Database();
        this.options = options;
    }

    /**
     * Sets up the connection to the socket and begins routing incomming connections to the appropriate handler.
     */
    public start(): Promise<void> {
        const serverInfo = this.options.replicaof
            ? ServerInfo.getInstance("replica")
            : ServerInfo.getInstance("master");

        return new Promise((resolve, reject) => {
            this.listener.listen({ port: parseInt(this.port) });

            this.listener.on("connection", (connection) => {
                const handler = new Handler({
                    client: connection,
                    db: this.db,
                    info: serverInfo
                });

                handler.handle();
            });


            this.listener.on("error", (e) => {
                this.error = e;
                this.exitStatus = ExitStatus.Error;
                this.listener.close();
            });

            this.listener.on("close", () => {
                if (this.exitStatus === ExitStatus.Error) {
                    this.printErr();
                    return reject();
                } 
                resolve();
            })
            
        })
    }

    /**
     * @returns the address of the server as a full string.
     */
    getServerAddress(): string {
        return `${this.host}:${this.port}`;
    }

    /**
     * Prints the error message for this server in a pretty format.
     */
    printErr() {
        console.log(`[ERR]: ${this.error?.message}`);
    }
}