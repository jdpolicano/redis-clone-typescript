import { SocketHandler, type HandlerOptions } from "../protocol/base";
import { RespValue, RespType } from "../resp/types";
import RespBuilder from "../resp/builder";

enum ReplicationState {
    Start,
    ServerAlive,
    SentListeningPort,
    SentCapabilities,
    SentPsync,
    ReceivedRdbFile,
    Error,
}

/**
 * Represents a Handler class that negotates a replication session with a 
 * given conection.
 */
export default class ReplicationHandler extends SocketHandler {
    private state: ReplicationState;

    constructor(opts: HandlerOptions) {
        super(opts);
        this.state = ReplicationState.Start;
    }

    public async handle() {
        return this.negotiate();
    }

    /**
     * Basic state machine for handling replication.
     */
    public async negotiate() {
        if (this.state === ReplicationState.Start) {
            this.state = await this.checkServerAlive();
        }

        if (this.state === ReplicationState.ServerAlive) {
            this.state = await this.notifyListeningPort();
        }

        if (this.state === ReplicationState.SentListeningPort) {
            this.state = await this.notifyCapabilities();
        }

        if (this.state === ReplicationState.SentCapabilities) {
            this.state = await this.psync();
        }

        if (this.state === ReplicationState.Error) {
            throw new Error("Error occurred during replication negotiation.");
        }
    }

    /**
     * Check if the server is alive by sending a PING command.
     */
    public async checkServerAlive(): Promise<ReplicationState> {
        this.ctx.connection.writeResp(RespBuilder.bulkStringArray(["PING"]));
        const { value } = await this.ctx.connection.readResp();
        this.expect(value, RespBuilder.simpleString("PONG"));
        console.log("master is alive");
        return ReplicationState.ServerAlive;
    }

    /**
     * Notify the server of the listening port.
     */
    public async notifyListeningPort(): Promise<ReplicationState> {
        this.ctx.connection.writeResp(RespBuilder.bulkStringArray(["REPLCONF", "listening-port", this.ctx.serverInfo.getPort()]));
        const { value } = await this.ctx.connection.readResp();
        this.expect(value, RespBuilder.simpleString("OK"));
        console.log("sent listening port")
        return ReplicationState.SentListeningPort;
    }

    /**
     * Notify the server of the capabilities.
     */
    public async notifyCapabilities(): Promise<ReplicationState> {
        this.ctx.connection.writeResp(RespBuilder.bulkStringArray(["REPLCONF", "capa", "psync2"]));
        const { value } = await this.ctx.connection.readResp();
        this.expect(value, RespBuilder.simpleString("OK"));
        console.log("sent capabilities");
        return ReplicationState.SentCapabilities;
    };
88
    /**
     * Perform a PSYNC operation.
     */
    public async psync(): Promise<ReplicationState> {
        this.ctx.connection.writeResp(RespBuilder.bulkStringArray([
             "PSYNC",
             this.ctx.serverInfo.getMasterReplid(),
             this.ctx.serverInfo.getMasterReplOffset().toString()
        ]));
        const { value } = await this.ctx.connection.readResp();
        this.expectType(value, RespType.SimpleString);
        const [id, offset] = this.processPsyncResponse(value.value as string); // expectType confirmed this is a string
        this.ctx.serverInfo.setMasterReplid(id);
        this.ctx.serverInfo.setMasterReplOffset(offset);
        // read the RDB file - todo: implement this
        const rdbfile = await this.ctx.connection.readRdbFile();
        return ReplicationState.SentPsync;
    }

    private processPsyncResponse(response: string): [string, number] {
        const parts = response.split(" ");
        if (parts.length !== 3 || parts[0] !== "FULLRESYNC") {
            this.setState(ReplicationState.Error);
            throw new Error("Invalid PSYNC response received " + response);
        }

        const id = parts[1];
        const offset = parseInt(parts[2]);

        return [id, offset];
    }
    
    private expect(received: RespValue, expected: RespValue) {
        if (expected.value !== received.value) {
            this.setState(ReplicationState.Error);
            throw new Error(`Expected ${expected.value} but got ${received.value}`);
        }

        if (received.type !== expected.type) {
            this.setState(ReplicationState.Error);
            throw new Error(`Expected ${expected.type} but got ${received.type}`);
        }
    }

    private expectType(received: RespValue, type: RespType) {
        if (received.type !== type) {
            this.setState(ReplicationState.Error);
            throw new Error(`Expected ${type} but got ${received.type}`);
        }
    }

    private setState(state: ReplicationState) {
        this.state = state;
    }
}