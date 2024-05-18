export enum RespType {
    SimpleString,
    SimpleError,
    Integer,
    BulkString,
    Array,
    Null,
    Boolean,
    Double,
    BigNumber,
    BulkError,
    VerbatimString,
    Map,
    Set,
    Push
}

interface RespSimpleString {
    type: RespType.SimpleString;
    value: string;
}

interface RespSimpleError {
    type: RespType.SimpleError;
    value: string;
}

interface RespInteger {
    type: RespType.Integer;
    value: number;
}

interface RespBulkString {
    type: RespType.BulkString;
    value: Buffer | null; // null represents a null bulk string
}

interface RespArray {
    type: RespType.Array;
    value: RespValue[] | null; // null represents a null array
}

interface RespNull {
    type: RespType.Null;
    value: null;
}

interface RespBoolean {
    type: RespType.Boolean;
    value: boolean;
}

interface RespDouble {
    type: RespType.Double;
    value: number;
}

interface RespBigNumber {
    type: RespType.BigNumber;
    value: string; // Big numbers are typically represented as strings
}

interface RespBulkError {
    type: RespType.BulkError;
    value: Buffer | null; // null represents a null bulk error
}

interface RespVerbatimString {
    type: RespType.VerbatimString;
    value: Buffer;
}

interface RespMap {
    type: RespType.Map;
    value: [RespValue, RespValue][] | null; // key-value pairs
}

interface RespSet {
    type: RespType.Set;
    value: RespValue[] | null; // null represents a null set
}

interface RespPush {
    type: RespType.Push;
    value: RespValue[];
}

// Union type for all RESP values
export type RespValue =
    | RespSimpleString
    | RespSimpleError
    | RespInteger
    | RespBulkString
    | RespArray
    | RespNull
    | RespBoolean
    | RespDouble
    | RespBigNumber
    | RespBulkError
    | RespVerbatimString
    | RespMap
    | RespSet
    | RespPush