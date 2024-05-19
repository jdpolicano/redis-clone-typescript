import net from "net";
import Connection from "./connection";
import {
    RespBulkString,
    RespType,
    type RespValue
} from "./resp/types";
import Ping from "./commands/ping";
import Echo from "./commands/echo";
import Set, { SetOptions } from "./commands/set";
import Get from "./commands/get";
import Database from "./database/database";

export interface RequestContext {
    connection: Connection;
    db: Database;
}
export interface HandlerOptions {
    client: net.Socket; 
    db: Database;
}

export default class Handler {
    private ctx: RequestContext;

    constructor(opts: HandlerOptions) {
        this.ctx = {
            connection: new Connection(opts.client),
            db: opts.db
        };
    }

    public async handle() {
        return new Promise<void>((resolve, reject) => {
            this.ctx.connection.on("message", (message) => {
                this.handleMessage(message);
            });

            this.ctx.connection.on("close", () => {
                console.log("connection closed");
                resolve();
            });

            this.ctx.connection.on("error", (e) => {
                console.error(e);
                reject();
            });
        });
    }

    private async handleMessage(message: RespValue) {
        if (message.type !== RespType.Array || !message.value) {
            this.ctx.connection.writeString("ERR expected array of arguments");
            return;
        }

        this.execCommand(message.value);
    }

    // generic K is a type that extends base from ../commands/base
    private execCommand(args: RespValue[]) {
        if (!this.validateArgs(args)) {
            this.ctx.connection.writeString("ERR expected array of bulk strings");
            return;
        }

        const commandName = args[0].value;

        if (!commandName) {
            this.ctx.connection.writeString("ERR expected command name");
            return;
        }

        switch (commandName.toString().toLowerCase()) {
            case "ping":
                return this.execPing(args.slice(1) as RespBulkString[]);
            case "echo":
                return this.execEcho(args.slice(1) as RespBulkString[]);
            case "set":
                return this.execSet(args.slice(1) as RespBulkString[]);
            case "get":
                return this.execGet(args.slice(1) as RespBulkString[]);
            default:
                this.ctx.connection.writeString("ERR unknown command");
                return;
        }
    }

    private execPing(args: RespBulkString[]) {
        const command = new Ping(this.ctx);
        command.execute();
    }

    private execEcho(args: RespBulkString[]) {
        if (args.length === 0) {
            this.ctx.connection.writeString("ERR expected at least one argument");
            return;
        }
        const command = new Echo(this.ctx, { msgToEcho: args[0] });
        command.execute();
    }

    private execSet(args: RespBulkString[]) { 
        if (args.length < 2) {
            this.ctx.connection.writeString("ERR expected 2 arguments");
            return;
        }
        
        const options = this.parseSetOptions(args);

        const command = new Set(this.ctx, options);
        command.execute();
    }

    private parseSetOptions(args: RespBulkString[]): SetOptions {
        const options: SetOptions = {
            key: args[0],
            value: args[1]
        };

        for (let i = 2; i < args.length; i += 2) {
            const flag = args[i].value?.toString().toLowerCase();
            const value = args[i + 1].value;

            if (value === undefined || value === null) {
                return options;
            }

            if (flag === "px") {
                options.px = parseInt(value.toString());
            } else if (flag === "ex") {
                options.ex = parseInt(value.toString());
            }
        }

        return options;
    }

    private execGet(args: RespBulkString[]) {
        if (args.length !== 1) {
            this.ctx.connection.writeString("ERR expected 1 argument");
            return;
        }
        
        const command = new Get(this.ctx, { key: args[0] });
        command.execute();
    }

    private validateArgs(args: RespValue[]): boolean {
        return args.length > 0
            // type narrow down to RespBulkString
            && args.every((arg) => arg.type === RespType.BulkString)
            && args[0].value !== undefined
            && args[0].value !== null;
    }
}