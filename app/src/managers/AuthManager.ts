import { makeAutoObservable } from 'mobx';

import axios from '@/lib/axiosLike';

import siteManager from './SiteManager';
import adminManager from './AdminManager';

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

    webAuthnEnabled = false;

    constructor() {
        makeAutoObservable(this);

        this.checkAuth();
        this.checkWebAuthnEnabled();
    }

    async checkWebAuthnEnabled() {
        try {
            const { data } = await axios.post('/$/auth/secure/webauthn/enabled');
            this.webAuthnEnabled = data.enabled;
        } catch (error) {
            console.error('error checking webauthn enabled:', error);
        }
    }

    async checkAuth() {
        try {
            const { data } = await axios.post('/$/auth/whoami');

            this.hasInit = true;

            if (!data.error) {
                this.loggedIn = true;
                this.user = data.user;

                siteManager.getSites();
                this.fetchPasskeys();

                if (this.user.admin) adminManager.fetchAllUsers();
                if (this.user.id === 1) adminManager.fetchInstanceInformation();
            }
        } catch (error) {
            console.error(error);
            alert('error checking authentication, try reloading?');
        }
    }

    async fetchPasskeys() {
        const res = await axios.post('/$/auth/passkeys/index');
        this.passkeys = res.data.passkeys;
    }

    isAdmin() {
        return !!this.user?.admin;
    }
}

const authManager = new AuthManager();
export default authManager;