import { configure, makeAutoObservable } from 'mobx';

import api from '@/lib/eden';
import { getRelativeTime } from '@/lib/utils';

import adminManager from './AdminManager';
import siteManager from './SiteManager';

import type { PublicPasskey, PublicUser } from '@/types';

configure({ enforceActions: 'never' });

class AuthManager {
    hasInit = false;

    id = 0;
    username = '';
    admin = 0;

    passkeys: PublicPasskey[] = [];

    instance = {
        allowAPIKeys: true,
        allowPasskeys: true,
        numRequests: 0,
        motd: ''
    };

    constructor() {
        makeAutoObservable(this);

        this.checkAuth();
    }

    setAuth(user: PublicUser) {
        this.id = user.id;
        this.username = user.username;
        this.admin = user.admin;

        if (localStorage.getItem('resavePasskeys')) {
            this.fetchPasskeys();
            localStorage.removeItem('resavePasskeys');
        }

        siteManager.getList();

        const urlParts = location.pathname.split('/');
        if (urlParts[1] === 'domain' && urlParts[2].includes('.')) siteManager.select(urlParts[2]);

        if (this.admin) adminManager.fetchAllUsers();
    }

    async checkAuth() {
        try {
            const res = await api.auth.account.get();
            const data = res.data;
            if (!data) throw new Error('authentication fetch error');

            this.hasInit = true;
            this.instance.allowPasskeys = data.instance.allowPasskeys;

            if (data.user) {
                this.setAuth(data.user);
                this.instance = data.instance;
            }
        } catch (error) {
            console.error('auth error', error);
            alert('error checking authentication, try reloading?');
        }
    }

    async fetchPasskeys() {
        const { data } = await api.auth.passkeys.get();
        if (data) {
            this.passkeys = data.passkeys.map((pk) => ({ ...pk, lastUsed: getRelativeTime(pk.lastUsed) }));
            localStorage.setItem('passkeys', JSON.stringify(this.passkeys.map(e => ({ type: 'public-key', id: e.id, transports: e.transports }))));
        }
    }

    async logout() {
        await api.auth.logout.post();
        location.reload();
    }
}

const authManager = new AuthManager();
export default authManager;