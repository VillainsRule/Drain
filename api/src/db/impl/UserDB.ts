import LinkedDB from '../struct/LinkedDB';

import { DBUser } from '../../../../types';

const linkedKeys = [
    { prop: 'username', type: 'string' },
    { prop: 'code', type: 'string' },
    { prop: 'sessions', type: 'string' },
    { prop: 'invitedBy', type: 'array' },
    { prop: 'voauthId', type: 'number' },
] as const;

export class UserDB extends LinkedDB<DBUser, typeof linkedKeys> {
    constructor() {
        super('users.db', linkedKeys, {
            [1]: {
                id: 1,
                voauthId: -1,
                username: 'admin',
                code: 'admin',
                admin: 1,
                invitedBy: 0,
                sites: [],
                sessions: [],
                apiKeys: []
            }
        });
    }

    nextId(): number {
        const current = (this.db.meta?.nextId as number) ?? 2;
        this.db.meta = { ...this.db.meta, nextId: current + 1 };
        this.updateDB();
        return current;
    }
}

const userDB = new UserDB();
export default userDB;