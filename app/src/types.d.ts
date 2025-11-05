export interface PublicUser {
    id: number;
    username: string;
    admin: 0 | 1;
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