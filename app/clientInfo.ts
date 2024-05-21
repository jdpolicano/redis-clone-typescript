import type { RespValue } from "./resp/types";
export type ClientType = "replica" | "standard";

/**
 * Represents the current client's known relationship to the server.
 */
export interface ClientMeta {
    connectionStart: number;
    type: ClientType;
    listeningPort?: string;
    capabilities?: string[];
    sessionHistory: RespValue[][];
}

/**
 * Represents client information.
 */
export default class ClientInfo {
    private clientMeta: ClientMeta;

    constructor() {
        this.clientMeta = {
            connectionStart: Date.now(),
            type: "standard",
            sessionHistory: [],
        };
    }

    /**
     * Sets the role of the client.
     * @param role The role of the client.
     */
    public setRole(role: ClientType) {
        this.clientMeta.type = role;
    }

    /**
     * Gets the role of the client.
     * @returns The role of the client.
     */
    public getRole(): ClientType {
        return this.clientMeta.type;
    }

    /**
     * Sets the listening port of the client.
     * @param port The listening port of the client.
     */
    public setListeningPort(port: string) {
        this.clientMeta.listeningPort = port;
    }

    /**
     * Gets the listening port of the client.
     * @returns The listening port of the client.
     */
    public getListeningPort(): string | undefined {
        return this.clientMeta.listeningPort;
    }

    /**
     * Sets the capabilities of the client.
     * @param capabilities The capabilities of the client.
     */
    public setCapabilities(capabilities: string[]) {
        this.clientMeta.capabilities = capabilities;
    }

    /**
     * Gets the capabilities of the client.
     * @returns The capabilities of the client.
     */
    public getCapabilities(): string[] | undefined {
        return this.clientMeta.capabilities;
    }

    /**
     * Adds a session to the session history of the client.
     * @param session The session to be added.
     */
    public addSessionHistory(session: RespValue[]) {
        this.clientMeta.sessionHistory.push(session);
    }
}
