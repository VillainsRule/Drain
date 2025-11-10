/// <reference types="vite/client" />

export interface PublicUser {
    id: number;
    username: string;
    admin: 0 | 1;
    stillPendingLogin?: boolean;
}

export interface SiteKey {
    token: string;
    balance: string;
}

export interface FrontendSite {
    domain: string;
    public: boolean;
    readers: PublicUser[];
    editors: PublicUser[];
    keys: SiteKey[];
    supportsBalancer: boolean;
}

export interface InstanceInformation {
    commit: string;
    isDev: boolean;
    isUsingSystemd: boolean;
}