import {
  RespType,
  type RespBulkString,
  type RespArray,
  type RespValue,
} from "../resp/types";
import Ping from "../commands/ping";
import Echo from "../commands/echo";
import Set from "../commands/set";
import Get from "../commands/get";
import Info from "../commands/info"; // info command
import Replconf from "../commands/replconf"; // replconf command
import Psync from "../commands/psync"; // psync command
import Wait from "../commands/wait"; // wait command
import Config from "../commands/config"; // config command
import Keys from "../commands/keys"; // keys command
import { Transaction } from "../commands/base";
import { SocketHandler, type HandlerOptions } from "./base";
import Replica from "../replica";
import type { ParseSuccess } from "../../interfaces/parser";
import { ReadError } from "../connection";

type Message = ParseSuccess<RespValue>;

/**
 * Represents a Handler class that handles incoming messages and executes commands.
 */
export default class Handler extends SocketHandler {
  private shouldExit: boolean = false;
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
    while (!this.shouldExit) {
      try {
        const message = await this.ctx.connection.readResp();
        if (this.ctx.serverInfo.isSlave()) {
          console.log(JSON.stringify(message));
        }
        this.handleMessage(message);
        // console.log(this.ctx.connection);
      } catch (e) {
        if (e.message === ReadError.EREADCLOSED) {
          console.log("connection closed");
          return;
        }

        console.log(e.message);
        return;
      }
    }
  }

  /**
   * Handles a single message.
   * @param message - The message to handle.
   */
  private async handleMessage(message: Message) {
    await this.execCommand(message);
  }

  /**
   * Executes a command based on the command name.
   * @param args - The arguments for the command.
   */
  private async execCommand(msg: Message) {
    const msgArray = msg.value;

    if (!this.validateIsArray(msgArray)) {
      this.ctx.connection.writeError("ERR expected array");
      return;
    }

    const args = msgArray.value;

    if (!this.validateArrayContents(args)) {
      this.ctx.connection.writeError("ERR array should contain bulk strings");
      return;
    }

    // validateArrayContents guarantees that args is a RespBulkString[] and non 0 length
    const commandName = args[0].value as string;
    return this.routeCommand(commandName, args, msg);
  }

  /**
   * Routes a command for a master server.
   * @param commandName - The name of the command.
   * @param args - The arguments for the command.
   */
  private async routeCommand(
    commandName: string,
    args: RespBulkString[],
    msg: Message,
  ) {
    switch (commandName.toString().toLowerCase()) {
      case "ping":
        return this.execPing(args.slice(1), msg.source);
      case "echo":
        return this.execEcho(args.slice(1), msg.source);
      case "set":
        return this.execSet(args.slice(1), msg.source);
      case "get":
        return this.execGet(args.slice(1), msg.source);
      case "info":
        return this.execInfo(args.slice(1), msg.source);
      case "replconf":
        return this.execReplconf(args.slice(1), msg.source);
      case "psync":
        return this.execPsync(args.slice(1), msg.source);
      case "wait":
        return this.execWait(args.slice(1), msg.source);
      case "config":
        return this.execConfig(args.slice(1), msg.source);
      case "keys":
        return this.execKeys(args.slice(1), msg.source);
      default:
        this.ctx.connection.writeString("ERR unknown command");
        return;
    }
  }
  /**
   * Executes the "ping" command.
   * @param args - The arguments for the command.
   */
  private execPing(args: RespBulkString[], source: Buffer) {
    const command = new Ping(this.ctx);

    if (this.ctx.clientInfo.getRole() === "master") {
      // todo: the replica should keep track of the state of
      // this connection somewhere.
      command.setReply(false);
    }

    this.handleTransaction(command.execute(), source);
  }

  /**
   * Executes the "echo" command.
   * @param args - The arguments for the command.
   */
  private execEcho(args: RespBulkString[], source: Buffer) {
    if (args.length === 0) {
      this.ctx.connection.writeString("ERR expected at least one argument");
      return;
    }

    const command = new Echo(this.ctx, { msgToEcho: args[0] });
    this.handleTransaction(command.execute(), source);
  }

  /**
   * Executes the "get" command.
   * @param args - The arguments for the command.
   */
  private execGet(args: RespBulkString[], source: Buffer) {
    if (args.length !== 1) {
      this.ctx.connection.writeString("ERR expected 1 argument");
      return;
    }

    const command = new Get(this.ctx, { key: args[0] });
    this.handleTransaction(command.execute(), source);
  }

  /**
   * Executes the "set" command.
   * @param args - The arguments for the command.
   */
  private execSet(args: RespBulkString[], source: Buffer) {
    if (args.length < 2) {
      this.ctx.connection.writeString("ERR expected 2 arguments");
      return;
    }

    if (
      this.ctx.serverInfo.getRole() === "slave" &&
      this.ctx.clientInfo.getRole() !== "master"
    ) {
      this.ctx.connection.writeString("ERR server is read-only");
      return;
    }
    // todo: The other commands should implement this pattern too.
    const options = Set.parseSetOptions(args);
    const command = new Set(this.ctx, options);
    // the replica should not reply to the master when it forwards.
    if (this.ctx.serverInfo.getRole() === "slave") {
      command.setReply(false);
    }

    this.handleTransaction(command.execute(), source);
  }

  /**
   * Executes the "info" command.
   * @param args - The arguments for the command.
   */
  private execInfo(args: RespBulkString[], source: Buffer) {
    const command = new Info(this.ctx);
    this.handleTransaction(command.execute(), source);
  }

  /**
   * Executes the "replconf" command.
   * @param args - The arguments for the command.
   */
  private execReplconf(args: RespBulkString[], source: Buffer) {
    try {
      const options = Replconf.parseArgs(args);
      const command = new Replconf(this.ctx, options);
      this.handleTransaction(command.execute(), source);
    } catch (e) {
      this.ctx.connection.writeString("ERR unable to parse arguments");
      return;
    }
  }

  /**
   * Executes the "psync" command.
   * @param args - The arguments for the command.
   */
  private execPsync(args: RespBulkString[], source: Buffer) {
    try {
      const options = Psync.parseArgs(args);
      const command = new Psync(this.ctx, options);
      this.handleTransaction(command.execute(), source);
    } catch (e) {
      this.ctx.connection.writeString("ERR unable to parse arguments");
      return;
    }
  }

  /**
   * Executes the "wait" command.
   * @param args - The arguments for the command.
   */
  private async execWait(args: RespBulkString[], source: Buffer) {
    try {
      const options = Wait.parseWaitOptions(args);
      const command = new Wait(this.ctx, options);
      this.handleTransaction(await command.execute(), source);
    } catch (e) {
      this.ctx.connection.writeString("ERR unable to parse arguments");
      return;
    }
  }

  /**
   * Executes the "config" command.
   * @param args - The arguments for the command.
   */
  private execConfig(args: RespBulkString[], source: Buffer) {
    try {
      const options = Config.parseConfigArgs(args);
      const command = new Config(this.ctx, options);
      this.handleTransaction(command.execute(), source);
    } catch (e) {
      this.ctx.connection.writeString(e.message);
      return;
    }
  }

  /**
   * Executes the "keys" command.
   */
  private execKeys(args: RespBulkString[], source: Buffer) {
    try {
      const keysOptions = Keys.parseKeysOptions(args);
      const command = new Keys(this.ctx, keysOptions);
      this.handleTransaction(command.execute(), source);
    } catch (e) {
      this.ctx.connection.writeString(e.message);
      return;
    }
  }

  /**
   * Handles a transaction.
   * @param t - The transaction to handle.
   */
  private handleTransaction(t: Transaction, source: Buffer) {
    // todo: if the server is a replica we will need
    // logic here to only respond in certain circumstances...
    // we will also need to add the source message to our replication stream
    // if this was a write transaction.
    if (t === Transaction.Replication) {
      const replica = new Replica(this.ctx.connection);
      this.ctx.replicationStream.addReplica(replica);
      this.shouldExit = true;
      return;
    }

    if (this.ctx.serverInfo.getRole() === "master") {
      this.masterTransaction(t, source);
    } else {
      this.slaveTransaction(t, source);
    }
  }

  private masterTransaction(t: Transaction, source: Buffer) {
    if (t === Transaction.Write) {
      this.ctx.replicationStream.replicate(source, this.ctx.serverInfo);
    }
  }

  private slaveTransaction(t: Transaction, source: Buffer) {
    // unclear if we should be replicating the message...
    if (t === Transaction.Write) {
      this.ctx.replicationStream.replicate(source, this.ctx.serverInfo);
      return;
    }
    // slaves shoud increment regardless of the transaction type.
    this.ctx.serverInfo.incrementMasterReplOffset(source.length);
  }

  /**
   * Validates the arguments for a command.
   * @param args - The arguments to validate.
   * @returns True if the arguments are valid, false otherwise.
   */
  private validateIsArray(args: RespValue): args is RespArray {
    return args.type === RespType.Array;
  }

  /**
   * Validate the arguments are all bulk strings
   */
  private validateArrayContents(
    args: RespValue[] | null,
  ): args is RespBulkString[] {
    return (
      args !== null &&
      args.length > 0 &&
      args.every((v) => v.type === RespType.BulkString)
    );
  }
}
