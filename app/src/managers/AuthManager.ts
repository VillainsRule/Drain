import { makeAutoObservable } from 'mobx';

import axios from '@/lib/axiosLike';

import adminManager from './AdminManager';
import siteManager from './SiteManager';

import type { APIKey } from '@/types';

class AuthManager {
    hasInit = false;
    loggedIn = false;

    placeholderUser = {
        id: 0,
        username: '',
        admin: 0
    };

    user = this.placeholderUser;

    passkeys: Array<{ name: string; lastUsed: string }> = [];
    apiKeys: APIKey[] = [];

    webAuthnEnabled = false;

    constructor() {
        makeAutoObservable(this);

        this.checkAuth();
    }

    setAuth(user: typeof this.placeholderUser) {
        this.loggedIn = true;
        this.user = user;

        siteManager.getSites();

        this.fetchPasskeys();
        this.fetchAPIKeys();

        if (this.user.admin) adminManager.fetchAllUsers();
        if (this.user.id === 1) adminManager.fetchInstanceInformation();
    }

    async checkAuth() {
        try {
            const { data } = await axios.post('/$/auth/account');

            this.hasInit = true;
            this.webAuthnEnabled = data.isWebAuthnConfigured;

            if (!data.error) this.setAuth(data.user);
        } catch (error) {
            console.error(error);
            alert('error checking authentication, try reloading?');
        }
    }

    async fetchPasskeys() {
        const res = await axios.post('/$/auth/passkeys');
        this.passkeys = res.data.passkeys;
    }

    async fetchAPIKeys() {
        const res = await axios.post('/$/auth/api/keys');
        this.apiKeys = res.data.apiKeys;
    }

    isAdmin() {
        return !!this.user?.admin;
    }

    async logout() {
        await axios.post('/$/auth/logout');

        this.loggedIn = false;
        this.user = this.placeholderUser;
    }
}

const authManager = new AuthManager();
export default authManager;