export interface ParseSuccess<T> {
    value: T; // the parsed value
    source: Buffer; // the source that was parsed;
    ok: true;
}

export interface ParseFailure {
    ok: false;
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export interface Parser<T> {
    parse(data: Buffer): ParseResult<T>;
}