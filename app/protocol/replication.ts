import { SocketHandler, type HandlerOptions } from "../protocol/base";
import { RespValue, RespType } from "../resp/types";

enum ReplicationState {
    Start,
    ServerAlive,
    Error,
}

/**
 * Represents a Handler class that negotates a replication session with a 
 * given conection.
 */
export default class ReplicationHandler extends SocketHandler {
    private state: ReplicationState;
    private master

    constructor(opts: HandlerOptions) {
        super(opts);
        this.state = ReplicationState.Start;
    }

    async handle() {
        await this.ping();
        await this.notifyListeningPort();
        await this.notifyCapabilities();
        console.log("Replication session started.")
    }

    /**
     * Pings the server to ensure it is alive.
     */
    private async ping() {
        this.ctx.connection.writeResp({
            type: RespType.Array,
            value: [{ type: RespType.BulkString, value: "PING" }]
        });

        const response = await this.ctx.connection.readMessage();

        this.expect(response, {
            type: RespType.SimpleString,
            value: "PONG"
        });

        this.setState(ReplicationState.ServerAlive)
    }

    private async notifyListeningPort() {
        this.ctx.connection.writeResp({
            type: RespType.Array,
            value: [
                { type: RespType.BulkString, value: "REPLCONF" },
                { type: RespType.BulkString, value: "listening-port" },
                { type: RespType.BulkString, value: this.ctx.info.getPort() }
            ]
        });

        const response = await this.ctx.connection.readMessage();

        this.expect(response, {
            type: RespType.SimpleString,
            value: "OK"
        });
    }

    public async notifyCapabilities() {
        this.ctx.connection.writeResp({
            type: RespType.Array,
            value: [
                { type: RespType.BulkString, value: "REPLCONF" },
                { type: RespType.BulkString, value: "capa" },
                { type: RespType.BulkString, value: "psync2" }
            ]
        });

        const response = await this.ctx.connection.readMessage();

        this.expect(response, {
            type: RespType.SimpleString,
            value: "OK"
        });
    }

    private expect(received: RespValue, expected: RespValue) {
        if (expected.value !== received.value) {
            throw new Error(`Expected ${expected.value} but got ${received.value}`);
        }

        if (received.type !== expected.type) {
            throw new Error(`Expected ${expected.type} but got ${received.type}`);
        }
    }

    private setState(state: ReplicationState) {
        this.state = state;
    }
}