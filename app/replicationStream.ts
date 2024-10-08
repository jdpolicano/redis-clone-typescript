import Replica from "./replica";
import { RespBulkString, RespType, RespValue } from "./resp/types";
import type ServerInfo from "./serverInfo";

export default class ReplicationStream {
  private buffer: Buffer;
  private MAX_BUFFER_SIZE = 4 * 1024;
  private connectedReplicas: Replica[];
  private idx: number;

  constructor() {
    this.buffer = Buffer.alloc(this.MAX_BUFFER_SIZE);
    this.connectedReplicas = [];
    this.idx = 0;
  }

  public addReplica(replica: Replica) {
    this.connectedReplicas.push(replica);
  }

  public replicate(data: Buffer, serverInfo: ServerInfo) {
    if (this.idx + data.length >= this.MAX_BUFFER_SIZE) {
      console.log("replication stream full");
      this.idx = 0;
    }
    data.copy(this.buffer, this.idx);
    this.propogateToReplicas(this.idx, this.idx + data.length);
    serverInfo.incrementMasterReplOffset(data.length);
  }

  public updateAckOffsets() {
    for (const replica of this.connectedReplicas) {
      replica.connection
        .readResp()
        .then((message) => {
          const offset = this.parseAckMessage(message.value);
          if (offset >= 0) {
            replica.setLastKnownOffset(offset);
          }
        })
        .catch((e) => {
          console.error(e);
          // todo: an error indicates the connection may have closed.
          // need to handle this somehow.
        });
    }
  }

  private propogateToReplicas(start: number, end: number) {
    const buf = this.buffer.subarray(start, end);
    for (const replica of this.connectedReplicas) {
      replica.write(buf);
    }
    this.idx = end;
  }

  private parseAckMessage(data: RespValue): number {
    if (data.type === RespType.Array && data.value !== null) {
      const validate = (v: RespValue): v is RespBulkString =>
        v !== undefined && v.value !== null && v.type === RespType.BulkString;
      if (data.value.every(validate) && data.value.length === 3) {
        const offset = data.value.pop()!;
        const ack = data.value.pop()!;
        const cmdName = data.value.pop()!;
        if (
          cmdName.value?.toLowerCase() === "replconf" &&
          ack.value?.toLowerCase() === "ack" &&
          offset.value !== null
        ) {
          return parseInt(offset.value);
        }
      }
    }

    return -1;
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

  public getReplicas(): Replica[] {
    return this.connectedReplicas;
  }
}
