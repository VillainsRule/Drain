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

    constructor() {
        makeAutoObservable(this);

        this.checkAuth();
    }

    async checkAuth() {
        try {
            const { data } = await axios.post('/$/auth/whoami');

            this.hasInit = true;

            if (!data.error) {
                this.loggedIn = true;
                this.user = data.user;

                siteManager.getSites();
                if (this.user.admin) adminManager.fetchAllUsers();
                if (this.user.id === 1) adminManager.fetchInstanceInformation();
            }
        } catch (error) {
            console.error(error);
            alert('error checking authentication, try reloading?');
        }
    }

    isAdmin() {
        return !!this.user?.admin;
    }
}

const authManager = new AuthManager();
export default authManager;