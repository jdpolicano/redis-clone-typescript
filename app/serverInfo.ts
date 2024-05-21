export type Role = "master" | "slave";

/**
 * Represents the replication information of a Redis server.
 */
export interface ReplicationInfo {
    /**
     * The role of the server in the replication setup.
     */
    role: Role,

    /**
     * The replication ID of the master server.
     */
    masterReplid: string,

    /**
     * The replication offset of the master server.
     */
    masterReplOffset: number,

    /**
     * The host of the master server.
     */
    masterHost: string,

    /**
     * The port of the master server.
     */
    masterPort: string,
}

/**
 * Represents the configuration of the server.
 */
export interface ServerConfig {
    port: string,
}

/**
 * Represents the options for the server information.
 */
export interface ServerInfoOptions {
    /**
     * The replication information of the server.
     */
    replication: {
        role: Role
        host: string,
        port: string,
    },

    /**
     * The configuration of the server.
     */
    config: {
        port: string
    }
}

/**
 * Represents the server information.
 */
export default class ServerInfo {
    private replication: ReplicationInfo;
    private serverConfig: ServerConfig;
    static instance?: ServerInfo;
    
    private constructor() { }
    
    /**
     * Returns the singleton instance of ServerInfo.
     * @param opts - The options for initializing the ServerInfo instance.
     * @returns The singleton instance of ServerInfo.
     * @throws Error if the instance role no longer matches the original state.
     */
    public static getInstance(opts: ServerInfoOptions): ServerInfo {
        if (ServerInfo.instance) {
            if (opts.replication.role !== ServerInfo.instance.getRole()) {
                throw new Error("Instance role no longer matches original state, did you mean to call setRole()?");
            }
            return ServerInfo.instance
        }
        ServerInfo.instance = new ServerInfo();
        ServerInfo.instance.setup(opts);
        return ServerInfo.instance;
    }

    /**
     * Sets up the server information.
     * @param opts - The options for setting up the server information.
     */
    private setup(opts: ServerInfoOptions) {
        this.replication = this.getDefaultReplicationInfo(opts);
        this.serverConfig = this.getServerConfig(opts);
    }

    /**
     * Returns the default replication information based on the options.
     * @param opts - The options for getting the default replication information.
     * @returns The default replication information.
     */
    private getDefaultReplicationInfo(opts: ServerInfoOptions): ReplicationInfo {
        if (opts.replication.role === "master") {
            return {
                role: opts.replication.role,
                masterReplid: "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb", // this will eventually be rand gen.
                masterReplOffset: 0,
                masterHost: opts.replication.host,
                masterPort: opts.replication.port,
            }
        } else {
            return {
                role: opts.replication.role,
                masterReplid: "?",
                masterReplOffset: -1,
                masterHost: opts.replication.host,
                masterPort: opts.replication.port,
            }
        }
    }

    /**
     * Returns the server configuration based on the options.
     * @param opts - The options for getting the server configuration.
     * @returns The server configuration.
     */
    private getServerConfig(opts: ServerInfoOptions) {
        return opts.config; 
    }

    /**
     * Sets the master replication ID.
     * @param id - The master replication ID to set.
     */
    public setMasterReplid(id: string) {
        this.replication.masterReplid = id;
    }

    /**
     * Sets the master replication offset.
     * @param offset - The master replication offset to set.
     */
    public setMasterReploffset(offset: number) {
        this.replication.masterReplOffset = offset;
    }

    /**
     * Returns the role of the server.
     * @returns The role of the server.
     */
    public getRole(): Role {
        return this.replication.role; 
    }

    /**
     * Returns the master replication ID.
     * @returns The master replication ID.
     */
    public getMasterReplid(): string {
        return this.replication.masterReplid
    }

    /**
     * Returns the master replication offset.
     * @returns The master replication offset.
     */
    public getMasterReplOffset(): number {
        return this.replication.masterReplOffset
    }

    /**
     * Returns the full address of the master server.
     * @returns The full address of the master server.
     */
    public getMasterAddressFull(): string {
        return `${this.replication.masterHost}:${this.replication.masterPort}`;
    }

    /**
     * Returns the parts of the master server address.
     * @returns The parts of the master server address.
     */
    public getMasterAddressParts(): [string, string] {
        return [this.replication.masterHost, this.replication.masterPort];
    }

    /**
     * Returns the port of the server.
     * @returns The port of the server.
     */
    public getPort(): string {
        return this.serverConfig.port;
    }
}