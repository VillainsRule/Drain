export interface PublicUser {
    id: number;
    username: string;
    admin: 0 | 1;
}

export interface User extends PublicUser {
    password: string;
}

export interface Session {
    userId: number;
    createdAt: number;
}

export interface SiteKey {
    token: string;
    balance: string;
}

interface BaseSite {
    domain: string;
    public: boolean;
    keys: SiteKey[];
    supportsBalancer?: boolean;
}

export interface FrontendSite extends BaseSite {
    readers: PublicUser[];
    editors: PublicUser[];
    supportsBalancer: boolean;
}

export interface BackendSite extends BaseSite {
    readers: number[];
    editors: number[];
}