export type Role = "master" | "slave";

export interface ReplicationInfo {
    role: Role,
    masterReplid: string,
    masterReplOffset: number,
}

export default class ServerInfo {
    private replication: ReplicationInfo;
    static instance?: ServerInfo;
    
    private constructor() { }
    
    public static getInstance(role: Role): ServerInfo {
        if (ServerInfo.instance) {
            if (role !== ServerInfo.instance.getRole()) {
                throw new Error("Instance role no longer matches original state, did you mean to call setRole()?");
            }
            return ServerInfo.instance
        }
        ServerInfo.instance = new ServerInfo();
        ServerInfo.instance.setup(role);
        return ServerInfo.instance;
    }

    private getDefaultReplicationInfo(role: Role): ReplicationInfo {
        if (role === "master") {
            return {
                role,
                masterReplid: "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb", // this will eventually be rand gen.
                masterReplOffset: 0
            }
        } else {
            return {
                role,
                masterReplid: "?",
                masterReplOffset: -1
            }
        }
    }

    private setup(role: Role) {
        this.replication = this.getDefaultReplicationInfo(role);
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
}