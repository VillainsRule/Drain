import LinkedDB from '../struct/LinkedDB';

import Hasher from '../../util/hasher';

import { DBUser } from '../../../../types';

const linkedKeys = [
    { prop: 'username', type: 'string' },
    { prop: 'code', type: 'string' },
    { prop: 'sessions', type: 'string' },
    { prop: 'invitedBy', type: 'array' }
] as const;

export class UserDB extends LinkedDB<DBUser, typeof linkedKeys> {
    constructor() {
        super('users.db', linkedKeys, {
            [1]: {
                id: 1,
                username: 'admin',
                password: Hasher.encode('admin'),
                admin: 1,
                invitedBy: 0,
                sites: [],
                sessions: [],
                passkeyIds: [],
                apiKeys: []
            }
        });
    }
}

const userDB = new UserDB();
export default userDB;