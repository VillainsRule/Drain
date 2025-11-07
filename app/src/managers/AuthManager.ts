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
            if (data.error) {
                console.error(data);
                alert('Error checking authentication. Check the console for details.');
            } else {
                this.hasInit = true;
                this.user = data.user;
                siteManager.getSites();
                if (this.isAdmin()) adminManager.fetchAllUsers();
                this.loggedIn = data.loggedIn;
            }
        } catch (error) {
            console.error(error);
            alert('Error checking authentication. Check the console for details.');
        }
    }

    isAdmin() {
        return !!this.user?.admin;
    }
}

const authManager = new AuthManager();
export default authManager;