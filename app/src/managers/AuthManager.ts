import { configure, makeAutoObservable } from 'mobx';

import api from '@/lib/eden';
import { getRelativeTime } from '@/lib/utils';

import adminManager from './AdminManager';
import siteManager from './SiteManager';

import type { PublicAPIKey, PublicPasskey, PublicUser } from '@/types';

configure({ enforceActions: 'never' });

class AuthManager {
    hasInit = false;

    placeholderUser = {
        id: 0,
        username: '',
        admin: 0
    } as const;

    user: PublicUser = this.placeholderUser;

    passkeys: PublicPasskey[] = [];
    apiKeys: PublicAPIKey[] = [];

    apiKeysEnabled = true;
    webAuthnEnabled = false;
    numRequests = 0;

    motd = '';

    constructor() {
        makeAutoObservable(this);

        this.checkAuth();
    }

    setAuth(user: PublicUser) {
        this.user = user;

        if (localStorage.getItem('resavePasskeys')) {
            this.fetchPasskeys();
            localStorage.removeItem('resavePasskeys');
        }

        siteManager.getList();

        const urlParts = location.pathname.split('/');
        if (urlParts[1] === 'domain' && urlParts[2].includes('.')) siteManager.select(urlParts[2]);

        if (this.user.admin) adminManager.fetchAllUsers();
    }

    async checkAuth() {
        try {
            const res = await api.auth.account.get();
            const data = res.data;
            if (!data) throw new Error('authentication fetch error');

            this.hasInit = true;
            this.webAuthnEnabled = data.instance.allowPasskeys;

            if ('user' in data) {
                if (data.user) this.setAuth(data.user);

                if (data.instance.motd) this.motd = data.instance.motd;
                if (data.instance.numRequests) this.numRequests = data.instance.numRequests;
            }
        } catch (error) {
            console.error('auth error', error);
            alert('error checking authentication, try reloading?');
        }
    }

    async fetchPasskeys() {
        const { data } = await api.auth.passkeys.get();
        if (!data) return;

        const passkeys = data.passkeys.map((pk: any) => {
            pk.lastUsed = getRelativeTime(pk.lastUsed);
            return pk;
        }) as PublicPasskey[];

        this.passkeys = passkeys;
        localStorage.setItem('passkeys', JSON.stringify(passkeys.map(e => ({ type: 'public-key', id: e.id, transports: e.transports }))));
    }

    async fetchAPIKeys() {
        const { data } = await api.auth.api.keys.get();
        if (!data) return;

        const apiKeys = data.apiKeys.map((a: any) => {
            a.createdAt = getRelativeTime(a.createdAt);
            a.lastUsed = getRelativeTime(a.lastUsed);
            return a;
        }) as PublicAPIKey[];

        this.apiKeys = apiKeys;
        this.apiKeysEnabled = data.enabled;
    }

    isAdmin() {
        return !!this.user.admin;
    }

    async logout() {
        await api.auth.logout.post();
        location.reload();
    }
}

const authManager = new AuthManager();
export default authManager;