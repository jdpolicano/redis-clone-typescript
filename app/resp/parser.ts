import {
  RespType,
  RespValue,
  RespSimpleString,
  RespSimpleError,
  RespInteger,
  RespBulkString,
  RespArray,
} from "./types";

import type { Parser, ParseResult } from "../../interfaces/parser";

export default class RespParser implements Parser<RespValue> {
  private parseIndex: number;

  constructor() {
    this.parseIndex = 0;
  }
  /**
   * Reads the next message from the buffer. It will return an error in the case the message is malformed.
   * It will return null if there are no more messages to read or if the message is incomplete.
   */
  public parse(data: Buffer): ParseResult<RespValue> {
    if (data.length === 0) {
      return {
        ok: false,
      };
    }

    let result: RespValue | null = null;

    switch (data[this.parseIndex++]) {
      case "+".charCodeAt(0):
        result = this.readSimpleString(data);
        break;
      case "-".charCodeAt(0):
        result = this.readSimpleError(data);
        break;
      case ":".charCodeAt(0):
        result = this.readInteger(data);
        break;
      case "$".charCodeAt(0):
        result = this.readBulkString(data);
        break;
      case "*".charCodeAt(0):
        result = this.readArray(data);
        break;
    }

    if (result === null) {
      return {
        ok: false,
      };
    }

    return {
      value: result,
      source: data.subarray(0, this.parseIndex),
      ok: true,
    }; // return the result
  }

  private readSimpleString(data: Buffer): RespValue | null {
    const value = this.readUntil(data, "\r\n");

    if (value === null) {
      return null;
    }

    return {
      type: RespType.SimpleString,
      value: value.toString(),
    };
  }

  private readSimpleError(data: Buffer): RespValue | null {
    const value = this.readUntil(data, "\r\n");

    if (value === null) {
      return null;
    }

    return {
      type: RespType.SimpleError,
      value: value.toString(),
    };
  }

  private readInteger(data: Buffer): RespValue | null {
    const value = this.readUntil(data, "\r\n");

    if (value === null) {
      return null;
    }

    return {
      type: RespType.Integer,
      value: value.toString(),
    };
  }

  private readBulkString(data: Buffer): RespValue | null {
    const len = this.readUntil(data, "\r\n");

    if (len === null) {
      return null;
    }

    const value = this.readUntil(data, "\r\n");

    if (value === null) {
      return null;
    }

    if (value.length !== parseInt(len.toString())) {
      throw this.protocolError("Invalid bulk string length");
    }

    return {
      type: RespType.BulkString,
      value: value.toString("binary"),
    };
  }

  private readArray(data: Buffer): RespValue | null {
    const len = this.readUntil(data, "\r\n");

    if (len === null) {
      return null;
    }

    const count = parseInt(len.toString());

    if (count < 0) {
      return {
        type: RespType.Array,
        value: [],
      };
    }

    const value: RespValue[] = [];

    for (let i = 0; i < count; i++) {
      const item = this.parse(data);

      if (!item.ok) {
        return null;
      }

      value.push(item.value);
    }

    return {
      type: RespType.Array,
      value,
    };
  }

  private readUntil(data: Buffer, delimiter: string): Buffer | null {
    const end = data.indexOf(delimiter, this.parseIndex);
    if (end === -1) {
      return null; // the message is incomplete
    }
    const result = data.subarray(this.parseIndex, end);
    this.parseIndex = end + delimiter.length;
    return result;
  }

  private protocolError(msg: string): Error {
    return new Error(`[ERR] Protocol error: ${msg}`);
  }
}
