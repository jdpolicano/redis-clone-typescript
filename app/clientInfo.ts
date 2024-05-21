import type { RespValue } from "./resp/types";
export type ClientType = "replica" | "standard" | "master";

/**
 * Represents the current client's known relationship to the server.
 */
export interface ClientMeta {
    connectionStart: number;
    type: ClientType;
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
     * Adds a session to the session history of the client.
     * @param session The session to be added.
     */
    public addSessionHistory(session: RespValue[]) {
        this.clientMeta.sessionHistory.push(session);
    }
}
