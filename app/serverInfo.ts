export type Role = "master" | "slave";

export interface ReplicationInfo {
    role: Role,
    masterReplid: string,
    masterReplOffset: number,
    masterHost: string,
    masterPort: string,
}

export interface ServerInfoOptions {
    host: string,
    port: string,
    role: Role
}

export default class ServerInfo {
    private replication: ReplicationInfo;
    static instance?: ServerInfo;
    
    private constructor() { }
    
    public static getInstance(opts: ServerInfoOptions): ServerInfo {
        if (ServerInfo.instance) {
            if (opts.role !== ServerInfo.instance.getRole()) {
                throw new Error("Instance role no longer matches original state, did you mean to call setRole()?");
            }
            return ServerInfo.instance
        }
        ServerInfo.instance = new ServerInfo();
        ServerInfo.instance.setup(opts);
        return ServerInfo.instance;
    }

    private getDefaultReplicationInfo(opts: ServerInfoOptions): ReplicationInfo {
        if (opts.role === "master") {
            return {
                role: opts.role,
                masterReplid: "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb", // this will eventually be rand gen.
                masterReplOffset: 0,
                masterHost: opts.host,
                masterPort: opts.port,
            }
        } else {
            return {
                role: opts.role,
                masterReplid: "?",
                masterReplOffset: -1,
                masterHost: opts.host,
                masterPort: opts.port,
            }
        }
    }

    private setup(opts: ServerInfoOptions) {
        this.replication = this.getDefaultReplicationInfo(opts);
    }

    public setMasterReplid(id: string) {
        this.replication.masterReplid = id;
    }

    public setMasterReploffset(offset: number) {
        this.replication.masterReplOffset = offset;
    }

    public getRole(): Role {
        return this.replication.role; 
    }

    public getMasterReplid(): string {
        return this.replication.masterReplid
    }

    public getMasterReplOffset(): number {
        return this.replication.masterReplOffset
    }

    public getMasterAddressFull(): string {
        return `${this.replication.masterHost}:${this.replication.masterPort}`;
    }

    public getMasterAddressParts(): [string, string] {
        return [this.replication.masterHost, this.replication.masterPort];
    }
}