/// <reference types="vite/client" />

export interface PublicUser {
    id: number;
    username: string;
    admin: 0 | 1;
    order?: string[];
    stillPendingLogin?: boolean;
}

export interface SiteKey {
    token: string;
    balance: string;
}

export interface FrontendSite {
    domain: string;
    readers: number[];
    editors: number[];
    keys: SiteKey[];
    supportsBalancer: boolean;
    resolvedReaders: Record<number, string>;
}

export interface InstanceConfiguration {
    useProxiesForBalancer: boolean;
}

export interface InstanceInformation {
    commit: string;
    localChanges: boolean;
    isUsingSystemd: boolean;
    config: InstanceConfiguration;
}

export interface APIKey {
    name: string;
    createdAt: number;
    lastUsed: number;
    lastUserAgent: string;
}