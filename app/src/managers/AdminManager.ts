import { makeAutoObservable } from 'mobx';

import api, { errorFrom } from '@/lib/eden';

import type { PublicAdminUser } from '@/types';

class AdminManager {
    users: PublicAdminUser[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    async fetchAllUsers() {
        const req = await api.admin.users.post();
        if (req.data) this.users = req.data.users;
        else alert(errorFrom(req));
    }

    getUser(id: number): PublicAdminUser {
        // yes, this is very not type-safe, BUT if the user is nullish, it'll throw an exception, which is good since that tells us something's wrong
        return this.users.find(u => u.id === id)!;
    }
}

const adminManager = new AdminManager();
export default adminManager;