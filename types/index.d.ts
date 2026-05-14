import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

export type DBId = string | number;

export interface DBPasskey {
    userId: number;
    name: string;
    lastUsed: number;

    webAuthnUserID: string; // from step 1
    id: string; // from step 2
    publicKey: string; // from step 2
    counter: number; // from step 2
    transports: AuthenticatorTransportFuture[]; // from step 2
    deviceType: string; // from step 2
    backedUp: boolean; // from step 2
}

export interface DBAPIKey {
    id: string;
    key: string;
    userId: number;
    name: string;
    createdAt: number;
    lastUsed: number;
}

export interface PublicAPIKey {
    name: string;
    key: string;
    createdAt: string;
    lastUsed: string;
}

export interface DBUser {
    id: number;
    voauthId: number;
    username: string;
    admin: 0 | 1;
    password?: string;
    code?: string | undefined;
    invitedBy: number;
    sessions: string[];
    sites: string[];
    apiKeys: string[];
}

export interface PublicUser {
    id: number;
    username: string;
    admin: 0 | 1;
    mustMigrate?: boolean;
}

export interface PublicAdminUser extends PublicUser {
    pendingLogin: boolean;
    invitedBy: number;
    sites: string[];
    voauthed: boolean;
}

export interface DBSite {
    id: string;
    description: string;
    public: boolean;
    users: number[];
    keys: Record<string, string | null>;
    useProxy: boolean;
}

export interface PublicSite extends DBSite {
    supportsBalancer: boolean;
    sortable: boolean;
    totalBalance?: number;
}

export interface DBConfig {
    balancerProxy: string;
    motd: string;
    allowAPIKeys: boolean;
}

export interface PublicConfig {
    commit: string;
    localChanges: boolean;
    commitsBehind: string;
    config: DBConfig;
}

export interface DBRequest {
    id: string;
    site: string;
    user: number;
    timestamp: number;
}

export interface DBAuditEntry {
    id: string;
    action: string;
    user: number;
    timestamp: number;
    details: string;
}

export interface PublicInvite {
    username: string;
    accepted: boolean;
}