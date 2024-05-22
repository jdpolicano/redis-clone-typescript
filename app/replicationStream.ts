export default class ReplicationStream {
    private buffer: Buffer;
    private MAX_BUFFER_SIZE = 4 * 1024;
    private idx: number

    constructor() {
        this.buffer = Buffer.alloc(this.MAX_BUFFER_SIZE);
        this.idx = 0;
    }

    public write(data: Buffer) {
        if (this.idx + data.length >= this.MAX_BUFFER_SIZE) {
            // todo handle this case. 
        }
        data.copy(this.buffer, this.idx);
        this.idx += data.length;
    }

    public getSlice(): Buffer {
        const buf = this.buffer.subarray(0, this.idx);
        this.idx = 0;
        return buf; 
    }

    public getIdx(): number {
        return this.idx;
    }

    public getBuffer(): Buffer {
        return this.buffer;
    }
}