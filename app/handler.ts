import net from "node:net";
import Connection from "./connection";
import {
    RespType,
    type RespValue
} from "./resp/types";

import Ping from "./commands/ping";
import Echo from "./commands/echo";

export default class Handler {
    private connection: Connection; // the current connection to the client.

    constructor(socket: net.Socket) {
        this.connection = new Connection(socket);
    }

    public async handle() {
        return new Promise<void>((resolve, reject) => {
            this.connection.on("message", (message) => {
                this.handleMessage(message);
            });

            this.connection.on("close", () => {
                resolve();
            });

            this.connection.on("error", (e) => {
                console.error(e);
                this.connection.writeString("OK");
                reject();
            });
        });
    }

    private async handleMessage(message: RespValue) {
        if (message.type !== RespType.Array || !message.value) {
            this.connection.writeString("ERR expected array of arguments");
            return;
        }

        this.execCommand(message.value);
    }

    // generic K is a type that extends base from ../commands/base
    private execCommand(args: RespValue[]) {
        if (!this.validateArgs(args)) {
            this.connection.writeString("ERR expected array of bulk strings");
            return;
        }

        const commandName = args[0].value;

        if (!commandName) {
            this.connection.writeString("ERR expected command name");
            return;
        }

        switch (commandName.toString().toLowerCase()) {
            case "ping":
                return this.execPing(args.slice(1));
            case "echo":
                return this.execEcho(args.slice(1));
            default:
                this.connection.writeString("ERR unknown command");
                return;
        }
    }

    private execPing(args: RespValue[]) {
        const command = new Ping(this.connection);
        command.execute();
    }

    private execEcho(args: RespValue[]) {
        console.log(args);
        const command = new Echo(this.connection, { msgToEcho: args[0] });
        command.execute();
    }

    private validateArgs(args: RespValue[]): boolean {
        return args.length > 0
            && args.every((arg) => arg.type === RespType.BulkString)
            && args[0].value !== undefined
            && args[0].value !== null;
    }
}