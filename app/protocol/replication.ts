import { SocketHandler, type HandlerOptions } from "../protocol/base";
import { RespValue } from "../resp/types";
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
        if (this.state === ReplicationState.Error) {
            throw new Error("Error occurred during replication negotiation.");
        }

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
    }

    /**
     * Check if the server is alive by sending a PING command.
     */
    public async checkServerAlive(): Promise<ReplicationState> {
        this.ctx.connection.writeResp(RespBuilder.bulkStringArray(["PING"]));
        const response = await this.ctx.connection.readMessage();
        this.expect(response, RespBuilder.simpleString("PONG"));
        console.log("master is alive");
        return ReplicationState.ServerAlive;
    }

    /**
     * Notify the server of the listening port.
     */
    public async notifyListeningPort(): Promise<ReplicationState> {
        this.ctx.connection.writeResp(RespBuilder.bulkStringArray(["REPLCONF", "listening-port", this.ctx.serverInfo.getPort()]));
        const response = await this.ctx.connection.readMessage();
        this.expect(response, RespBuilder.simpleString("OK"));
        console.log("sent listening port")
        return ReplicationState.SentListeningPort;
    }

    /**
     * Notify the server of the capabilities.
     */
    public async notifyCapabilities(): Promise<ReplicationState> {
        this.ctx.connection.writeResp(RespBuilder.bulkStringArray(["REPLCONF", "capa", "psync2"]));
        const response = await this.ctx.connection.readMessage();
        this.expect(response, RespBuilder.simpleString("OK"));
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
        const response = await this.ctx.connection.readMessage();
        this.expect(response, RespBuilder.simpleString("FULLRESYNC"));
        console.log("sent psync");
        return ReplicationState.SentPsync;
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

    private setState(state: ReplicationState) {
        this.state = state;
    }
}