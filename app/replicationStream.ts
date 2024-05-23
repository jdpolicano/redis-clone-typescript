import Replica from './replica';

export default class ReplicationStream {
    private buffer: Buffer;
    private MAX_BUFFER_SIZE = 4 * 1024;
    private connectedReplicas: Replica[];
    private idx: number

    constructor() {
        this.buffer = Buffer.alloc(this.MAX_BUFFER_SIZE);
        this.connectedReplicas = [];
        this.idx = 0;
    }

    public addReplica(replica: Replica) {
        this.connectedReplicas.push(replica);
    }

    public replicate(data: Buffer) {
        if (this.idx + data.length >= this.MAX_BUFFER_SIZE) {
            console.log("replication stream full");
            this.idx = 0;
        }
        data.copy(this.buffer, this.idx);
        this.propogateToReplicas(this.idx, this.idx + data.length);
    }

    private propogateToReplicas(start: number, end: number) {
        const buf = this.buffer.subarray(start, end);
        for (const replica of this.connectedReplicas) {
            replica.write(buf);
        }
        this.idx = end;
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