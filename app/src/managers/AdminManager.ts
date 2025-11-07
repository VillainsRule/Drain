import { makeAutoObservable } from 'mobx';

import type { InstanceInformation, PublicUser } from '@/types';

class AdminManager {
    users: PublicUser[] = [];

    instanceInformation: InstanceInformation = {
        commit: 'unknown',
        isDev: false,
        isUsingSystemd: false
    };

    constructor() {
        makeAutoObservable(this);
    }

    async fetchAllUsers() {
        const req = await fetch('/$/admin/users');
        const json = await req.json();
        this.users = json.users as PublicUser[] || [];
    }

    async fetchInstanceInformation() {
        const req = await fetch('/$/admin/instanceInformation');
        const json = await req.json();
        this.instanceInformation = json as InstanceInformation;
    }
}

const adminManager = new AdminManager();
export default adminManager;