import { RespValue, RespType } from "./types";

export default class RespEncoder {
    static encodeResp(payload: RespValue): string {
        switch (payload.type) {
            case RespType.SimpleString: {
                return this.encodeSimpleString(payload.value.toString());
            }
            
            case RespType.SimpleError: {
                return this.encodeSimpleError(payload.value.toString());
            }
            
            case RespType.Integer: {
                return this.encodeInteger(payload.value.toString());
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

    static encodeSimpleString(value: string): string {
        return `+${value}\r\n`;
    }

    static encodeSimpleError(value: string): string {
        return `-${value}\r\n`;
    }

    static encodeInteger(value: string): string {
        return `:${value}\r\n`;
    }

    static encodeBulkString(value: string | null): string {
        if (value === null) {
            return "$-1\r\n";
        }  
        return `$${value.length}\r\n${value}\r\n`;
    }

    static encodeArray(value: RespValue[] | null): string {
        if (value === null) {
            return "*-1\r\n";
        }
        const parts = value.map((v) => this.encodeResp(v));
        return `*${parts.length}\r\n${parts.join("")}`;
    }
}