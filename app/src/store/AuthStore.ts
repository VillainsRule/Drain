import { configure, makeAutoObservable } from 'mobx';

import api from '@/lib/eden';

import adminStore from './AdminStore';
import siteStore from './SiteStore';

import type { PublicUser } from '@/types';

configure({ enforceActions: 'never' });

class AuthStore {
    hasInit = false;

    id = 0;
    username = '';
    admin = 0;

    instance = {
        allowAPIKeys: true,
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

        siteStore.getList();

        const urlParts = location.pathname.split('/');
        if (urlParts[1] === 'domain' && urlParts[2].includes('.')) siteStore.select(urlParts[2]);

        if (this.admin) adminStore.fetchAllUsers();
    }

    async checkAuth() {
        try {
            const res = await api.auth.account.get();
            const data = res.data;
            if (!data) throw new Error('authentication fetch error');

            this.hasInit = true;

            if (data.user) {
                this.setAuth(data.user);
                this.instance = data.instance;
            }
        } catch (error) {
            console.error('auth error', error);
            alert('error checking authentication, try reloading?');
        }
    }

    async logout() {
        await api.auth.logout.post();
        location.reload();
    }
}

const authStore = new AuthStore();
export default authStore;