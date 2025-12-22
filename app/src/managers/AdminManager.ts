import { makeAutoObservable } from 'mobx';

import axios from '@/lib/axiosLike';

import type { InstanceInformation, PublicUser } from '@/types';

class AdminManager {
    users: PublicUser[] = [];

    instanceInformation: InstanceInformation = {
        commit: 'unknown',
        isDev: true,
        isUsingSystemd: false,
        config: {
            useProxiesForBalancer: false
        }
    };

    constructor() {
        makeAutoObservable(this);
    }

    async fetchAllUsers() {
        const req = await axios.post('/$/admin/secure/users');
        this.users = req.data.users;
    }

    async fetchInstanceInformation() {
        const req = await axios.post('/$/admin/secure/instance');
        this.instanceInformation = req.data;
    }

    getUser(id: number) {
        return this.users.find(u => u.id === id);
    }
}

const adminManager = new AdminManager();
export default adminManager;