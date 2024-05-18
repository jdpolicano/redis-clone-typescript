import { RespValue, RespType } from "./types";

export default class RespEncoder {
    static encodeResp(payload: RespValue): Buffer {
        switch (payload.type) {
            case RespType.SimpleString: {
                return this.encodeSimpleString(payload.value);
            }
            
            case RespType.SimpleError: {
                return this.encodeSimpleError(payload.value);
            }
            
            case RespType.Integer: {
                return this.encodeInteger(payload.value);
            }
                
            case RespType.BulkString: {
                return this.encodeBulkString(payload.value);
            }
            
            case RespType.Array: {
                return this.encodeArray(payload.value);
            }

            default:
                throw new Error("Invalid message type");
        }
    }

    static encodeSimpleString(value: string): Buffer {
        return Buffer.from(`+${value}\r\n`);
    }

    static encodeSimpleError(value: string): Buffer {
        return Buffer.from(`-${value}\r\n`);
    }

    static encodeInteger(value: number): Buffer {
        return Buffer.from(`:${value}\r\n`);
    }

    static encodeBulkString(value: Buffer | null): Buffer {
        if (value === null) {
            return Buffer.from("$-1\r\n");
        }

        return Buffer.concat([Buffer.from(`$${value.length}\r\n`), value, Buffer.from("\r\n")]);
    }

    static encodeArray(value: RespValue[] | null): Buffer {
        if (value === null) {
            return Buffer.from("*-1\r\n");
        }
        const buffers = value.map((v) => this.encodeResp(v));
        return Buffer.concat([Buffer.from(`*${buffers.length}\r\n`), ...buffers]);
    }
}