import * as resp from "./types";

export default class RespBuilder {
  static simpleString(value: string): resp.RespSimpleString {
    return {
      type: resp.RespType.SimpleString,
      value,
    };
  }

  static simpleError(value: string): resp.RespSimpleError {
    return {
      type: resp.RespType.SimpleError,
      value,
    };
  }

  static integer(value: string): resp.RespInteger {
    return {
      type: resp.RespType.Integer,
      value,
    };
  }

  static bulkString(value: string | null): resp.RespBulkString {
    return {
      type: resp.RespType.BulkString,
      value,
    };
  }

  static array(value: resp.RespValue[] | null): resp.RespArray {
    return {
      type: resp.RespType.Array,
      value,
    };
  }

  static bulkStringArray(value: (string | null)[] | null): resp.RespArray {
    return {
      type: resp.RespType.Array,
      value: value?.map((v) => this.bulkString(v)) || null,
    };
  }
}
