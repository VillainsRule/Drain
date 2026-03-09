import { makeAutoObservable } from 'mobx';

import api, { errorFrom } from '@/lib/eden';

import type { PublicConfig, PublicUser } from '@/types';

class AdminManager {
    users: PublicUser[] = [];

    instanceInformation: PublicConfig = {
        commit: 'unknown',
        localChanges: true,
        isUsingSystemd: false,
        config: { balancerProxy: '', allowAPIKeys: true, nextUserId: 0 }
    };

    constructor() {
        makeAutoObservable(this);
    }

    async fetchAllUsers() {
        const req = await api.admin.users.post();
        if (req.data) this.users = req.data.users;
        else alert(errorFrom(req));
    }

    async fetchInstanceInformation() {
        const req = await api.admin.instance.get();
        if (req.data) this.instanceInformation = req.data;
        else alert(errorFrom(req));
    }

    getUser(id: number) {
        return this.users.find(u => u.id === id);
    }
}

const adminManager = new AdminManager();
export default adminManager;