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
  Push,
}

export interface RespSimpleString {
  type: RespType.SimpleString;
  value: string;
}

export interface RespSimpleError {
  type: RespType.SimpleError;
  value: string;
}

export interface RespInteger {
  type: RespType.Integer;
  value: string;
}

export interface RespBulkString {
  type: RespType.BulkString;
  value: string | null; // null represents a null bulk string
}

export interface RespArray {
  type: RespType.Array;
  value: RespValue[] | null; // null represents a null array
}

export interface RespNull {
  type: RespType.Null;
  value: null;
}

export interface RespBoolean {
  type: RespType.Boolean;
  value: string;
}

export interface RespDouble {
  type: RespType.Double;
  value: string;
}

export interface RespBigNumber {
  type: RespType.BigNumber;
  value: string; // Big numbers are typically represented as strings
}

export interface RespBulkError {
  type: RespType.BulkError;
  value: string | null; // null represents a null bulk error
}

export interface RespVerbatimString {
  type: RespType.VerbatimString;
  value: string;
}

export interface RespMap {
  type: RespType.Map;
  value: [RespValue, RespValue][]; // key-value pairs
}

export interface RespSet {
  type: RespType.Set;
  value: RespValue[]; // null represents a null set
}

export interface RespPush {
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
  | RespPush;
