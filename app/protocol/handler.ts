import {
    RespBulkString,
    RespType,
    type RespValue
} from "../resp/types";
import Ping from "../commands/ping";
import Echo from "../commands/echo";
import Set, { SetOptions } from "../commands/set";
import Get from "../commands/get";
import Info from "../commands/info"; // info command
import type { Transaction } from "../commands/base";
import { SocketHandler, type HandlerOptions } from "./base";


/**
 * Represents a Handler class that handles incoming messages and executes commands.
 */
export default class Handler extends SocketHandler {
    /**
     * Creates an instance of Handler.
     * @param opts - The options for the Handler.
     */
    constructor(opts: HandlerOptions) {
        super(opts);
    }

    /**
     * Handles incoming messages.
     * @returns A promise that resolves when the handling is complete.
     */
    public async handle() {
        while (true) {
            try {
                const message = await this.ctx.connection.readMessage();
                this.handleMessage(message);
                // console.log(this.ctx.connection);
            } catch (e) {
                console.log(e.message);
                return;
            }
        }
    }

    /**
     * Handles a single message.
     * @param message - The message to handle.
     */
    private async handleMessage(message: RespValue) {
        if (message.type !== RespType.Array || !message.value) {
            this.ctx.connection.writeError("ERR expected array of arguments");
            return;
        }

        this.execCommand(message.value);
    }

    /**
     * Executes a command based on the command name.
     * @param args - The arguments for the command.
     */
    private execCommand(args: RespValue[]) {
        if (!this.validateArgs(args)) {
            this.ctx.connection.writeError("ERR expected array of bulk strings");
            return;
        }

        const commandName = args[0].value;

        if (!commandName) {
            this.ctx.connection.writeError("ERR expected command name");
            return;
        }

        switch (commandName.toString().toLowerCase()) {
            case "ping":
                return this.execPing(args.slice(1));
            case "echo":
                return this.execEcho(args.slice(1));
            case "set":
                return this.execSet(args.slice(1));
            case "get":
                return this.execGet(args.slice(1));
            case "info":
                return this.execInfo(args.slice(1));
            default:
                this.ctx.connection.writeString("ERR unknown command");
                return;
        }
    }

    /**
     * Executes the "ping" command.
     * @param args - The arguments for the command.
     */
    private execPing(args: RespBulkString[]) {
        const command = new Ping(this.ctx);
        this.handleTransaction(command.execute());
    }

    /**
     * Executes the "echo" command.
     * @param args - The arguments for the command.
     */
    private execEcho(args: RespBulkString[]) {
        if (args.length === 0) {
            this.ctx.connection.writeString("ERR expected at least one argument");
            return;
        }
        const command = new Echo(this.ctx, { msgToEcho: args[0] });
        this.handleTransaction(command.execute());
    }

    /**
     * Executes the "get" command.
     * @param args - The arguments for the command.
     */
    private execGet(args: RespBulkString[]) {
        if (args.length !== 1) {
            this.ctx.connection.writeString("ERR expected 1 argument");
            return;
        }
        
        const command = new Get(this.ctx, { key: args[0] });
        this.handleTransaction(command.execute());
    }

    /**
     * Executes the "set" command.
     * @param args - The arguments for the command.
     */
    private execSet(args: RespBulkString[]) { 
        if (args.length < 2) {
            this.ctx.connection.writeString("ERR expected 2 arguments");
            return;
        }
        
        const options = this.parseSetOptions(args);

        const command = new Set(this.ctx, options);
        this.handleTransaction(command.execute());
    }

    /**
     * Executes the "info" command.
     * @param args - The arguments for the command.
     */
    private execInfo(args: RespBulkString[]) {
        const command = new Info(this.ctx);
        this.handleTransaction(command.execute());
    }

    /**
     * Handles a transaction.
     * @param t - The transaction to handle.
     */
    private handleTransaction(t: Transaction) {
        // todo: if the server is a replica we will need
        // logic here to only respond in certain circumstances...
        this.ctx.connection.writeResp(t.response);
    }

    /**
     * Parses the options for the "set" command.
     * @param args - The arguments for the command.
     * @returns The parsed options.
     */
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

    /**
     * Validates the arguments for a command.
     * @param args - The arguments to validate.
     * @returns True if the arguments are valid, false otherwise.
     */
    private validateArgs(args: RespValue[]): args is RespBulkString[] {
        return args.length > 0
            // type narrow down to RespBulkString
            && args.every((arg) => arg.type === RespType.BulkString)
            && args[0].value !== undefined
            && args[0].value !== null;
    }

}