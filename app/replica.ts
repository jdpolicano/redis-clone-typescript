import AsyncLink from "./asyncLink";

export default class Replica {
    connection: AsyncLink;
    streamIdx: number;

    constructor(connection: AsyncLink, streamIdx: number) {
        this.connection = connection;
        this.streamIdx = streamIdx;
    }

    setStreamIdx(idx: number) {
        this.streamIdx = idx;
    }

    getStreamIdx() {
        return this.streamIdx;
    }

    write(data: Buffer) {
        this.connection.write(data);
    }
}