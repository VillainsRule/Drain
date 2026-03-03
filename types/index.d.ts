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

export interface PublicPasskey {
    id: string;
    name: string;
    lastUsed: string;
    transports: string[];
}

export interface DBAPIKey {
    id: string;
    key: string;
    userId: number;
    name: string;
    createdAt: number;
    lastUsed: number;
    lastUserAgent: string;
}

export interface PublicAPIKey {
    name: string;
    createdAt: number;
    lastUsed: number;
    lastUserAgent: string;
}

export interface DBUser {
    id: number;
    username: string;
    admin: 0 | 1;
    password: string;
    code?: string | undefined;
    sessions: string[];
    passkeyIds: string[];
    sites: string[];
    apiKeys: string[];
}

export interface PublicUser {
    id: number;
    username: string;
    admin: 0 | 1;
    stillPendingLogin?: boolean;
}

export interface DBSite {
    id: string;
    readers: number[];
    editors: number[];
    keys: Record<string, string | null>;
}

export interface PublicSite {
    id: string;
    readers?: number[];
    editors?: number[];
    keys: Record<string, string | null>;
    supportsBalancer: boolean;
    resolvedReaders?: Record<number, string>;
    sortable: boolean;
}

export interface DBConfig {
    useProxiesForBalancer: boolean;
    allowAPIKeys: boolean;
    nextUserId: number;
}

export interface PublicConfig {
    commit: string;
    localChanges: boolean;
    isUsingSystemd: boolean;
    config: {
        allowAPIKeys: boolean;
        useProxiesForBalancer: boolean;
    };
}