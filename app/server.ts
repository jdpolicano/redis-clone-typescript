import net from "node:net";
import Handler from "./handler";

export type Host = "127.0.0.1" | "0.0.0.0"; // ipv4 or ipv6 address.

export enum ExitStatus {
    Error, // the server is exiting with an error
    Graceful, // the server exited gracefully
    None // the server is ongoing
} 

export interface ServerOptions {
    port?: number,
    host?: Host
}

export default class Server {
    private listener: net.Server;
    private port: number;
    private host: Host;
    private exitStatus: ExitStatus;
    private error?: Error; 

    constructor(options: ServerOptions = {}) {
        this.listener = new net.Server();
        this.port = options.port ? options.port : 6379;
        this.host = options.host ? options.host : "127.0.0.1";
        this.exitStatus = ExitStatus.None;
    }

    /**
     * Sets up the connection to the socket and begins routing incomming connections to the appropriate handler.
     */
    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.listener.listen({ host: this.host, port: this.port });

            this.listener.on("connection", (connection) => {
                new Handler(connection).handle();
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