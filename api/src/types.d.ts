import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

export interface Passkey {
    userId: number;
    name: string;
    lastUsed: number;

    // webauthn requires
    webAuthnUserID: string; // from step 1
    id: string; // from step 2
    publicKey: string; // from step 2
    counter: number; // from step 2
    transports: AuthenticatorTransportFuture[]; // from step 2
    deviceType: string; // from step 2
    backedUp: boolean; // from step 2
}

export interface APIKey {
    userId: number;
    name: string;
    key: string;
    createdAt: number;
    lastUsed: number;
    lastUserAgent: string;
}

export interface PublicUser {
    id: number;
    username: string;
    admin: 0 | 1;
    stillPendingLogin?: boolean;
}

export interface User extends PublicUser {
    password: string;
    code?: string;
}

export interface Session {
    userId: number;
    createdAt: number;
}

export interface SiteKey {
    token: string;
    balance: string;
}

interface Site {
    domain: string;
    readers: number[];
    editors: number[];
    keys: SiteKey[];
    supportsBalancer?: boolean;
}

export interface IConfigDB {
    useProxiesForBalancer: boolean;
}