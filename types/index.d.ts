import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

export type DBId = string | number;

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
    allowAPIKeys: boolean;
    balancerProxy: string;
    motd: string;
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