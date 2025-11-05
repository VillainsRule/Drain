import { makeAutoObservable } from 'mobx';

import type { PublicUser } from '@/types';

class AdminManager {
    users: PublicUser[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    async fetchAllUsers() {
        try {
            const req = await fetch('/$/admin/users');
            const json = await req.json();
            this.users = json.allUsers as PublicUser[] || [];
        } catch (error) {
            console.error(error);
            alert('Error checking authentication. Check the console for details.');
        }
    }
}

const adminManager = new AdminManager();
export default adminManager;