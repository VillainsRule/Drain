import LinkedDB, { LinkedDBTarget } from '../LinkedDB';

import Hasher from '../../util/hasher';

import { PublicUser, DBUser } from '../../../../types';

export class UserDB extends LinkedDB<DBUser> {
    adminName = 'admin';

    constructor() {
        super('users.db', 2, ['username', 'code', 'sessions']);
    }

    getBaseItems(): LinkedDBTarget<DBUser> {
        return {
            [1]: {
                id: 1,
                username: 'admin',
                password: Hasher.encode('admin'),
                admin: 1,
                sites: [],
                sessions: [],
                passkeyIds: [],
                apiKeys: []
            }
        };
    }

    afterInit() {
        this.adminName = this.get(1)!.username;
    }

    allUsers(): PublicUser[] {
        return this.getAll().map((u) => ({ id: u.id, username: u.username, admin: u.admin, stillPendingLogin: !!u.code }));
    }

    getPublicUser(userId: number): PublicUser | null {
        const u = this.get(userId);
        return u ? { id: u.id, username: u.username, admin: u.admin } : null;
    }
}

const userDB = new UserDB();
export default userDB;