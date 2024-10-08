export type Role = "master" | "slave";

/**
 * Represents the replication information of a Redis server.
 */
export interface ReplicationInfo {
  /**
   * The role of the server in the replication setup.
   */
  role: Role;

  /**
   * The replication ID of the master server.
   */
  masterReplid: string;

  /**
   * The replication offset of the master server.
   * In the case of a master server, this will be the number of bytes written to all replicas.
   * In the case of a replica server, this will be the number of bytes read from the master.
   * If the two values are equal, the replica is up to date with the master, otherwise the replica missed some data.
   */
  masterReplOffset: number;

  /**
   * The host of the master server.
   */
  masterHost: string;

  /**
   * The port of the master server.
   */
  masterPort: string;
}

/**
 * Represents the configuration of the server.
 */
export interface ServerConfig {
  port: string;
  dir: string;
  dbfilename: string;
}

/**
 * Represents the options for the server information.
 */
export interface ServerInfoOptions {
  /**
   * The replication information of the server.
   */
  replication: {
    role: Role;
    host: string;
    port: string;
  };

  /**
   * The configuration of the server.
   */
  config: {
    port: string;
    dir: string;
    dbfilename: string;
  };
}

/**
 * Represents the server information.
 */
export default class ServerInfo {
  private replication: ReplicationInfo;
  private serverConfig: ServerConfig;
  static instance?: ServerInfo;

  private constructor() {}

  /**
   * Returns the singleton instance of ServerInfo.
   * @param opts - The options for initializing the ServerInfo instance.
   * @returns The singleton instance of ServerInfo.
   * @throws Error if the instance role no longer matches the original state.
   */
  public static getInstance(opts: ServerInfoOptions): ServerInfo {
    if (ServerInfo.instance) {
      if (opts.replication.role !== ServerInfo.instance.getRole()) {
        throw new Error(
          "Instance role no longer matches original state, did you mean to call setRole()?",
        );
      }
      return ServerInfo.instance;
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
      };
    } else {
      return {
        role: opts.replication.role,
        masterReplid: "?",
        masterReplOffset: -1,
        masterHost: opts.replication.host,
        masterPort: opts.replication.port,
      };
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
  public setMasterReplOffset(offset: number) {
    this.replication.masterReplOffset = offset;
  }

  /**
   * Increments the master replication offset by num bytes.
   * @param num - The number of bytes to increment the offset by.
   */
  public incrementMasterReplOffset(num: number) {
    this.replication.masterReplOffset += num;
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
    return this.replication.masterReplid;
  }

  /**
   * Returns the master replication offset.
   * @returns The master replication offset.
   */
  public getMasterReplOffset(): number {
    return this.replication.masterReplOffset;
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

  /**
   * Tells if the server is a slave/
   */
  public isSlave(): boolean {
    return this.replication.role === "slave";
  }

  /**
   * Tells if the server is a master.
   */
  public isMaster(): boolean {
    return this.replication.role === "master";
  }

  /**
   * Gets an arbitrary key from the server configuration.
   */
  public getConfigKey(key: string): string | undefined {
    return this.serverConfig[key];
  }
}
