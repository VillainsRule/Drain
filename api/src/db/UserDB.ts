import path from 'node:path';

import BaseDB from './BaseDB';
import siteDB from './SiteDB';

import hasher from '../hasher';

import { PublicUser, Session, User } from '../types.d';

type UserDBType = {
    users: User[];
    sessions: Record<string, Session>;
    nextId: number;
}

export class UserDB extends BaseDB<UserDBType> {
    constructor() {
        super(path.join(import.meta.dirname, '..', '..', 'db', 'users.db'));
    }

    initializeData() {
        this.db = {
            users: [{ id: 1, username: 'admin', password: hasher.encode('admin'), admin: 1 }],
            sessions: {},
            nextId: 2
        };
    }

    getUserByUsername(username: string): User | null {
        return this.db.users.find(user => user.username.toLowerCase() === username.toLowerCase()) || null;
    }

    createUser(username: string, inviteCode: string): void {
        this.db.users.push({
            id: this.db.nextId,
            username,
            password: hasher.encode(crypto.randomUUID()),
            code: inviteCode,
            admin: 0
        });

        this.db.nextId++;

        this.updateDB();
    }

    addSession(userId: number, token: string): void {
        const user = this.db.users.find(user => user.id === userId);
        if (!user) throw new Error('User not found');

        this.db.sessions[token] = { userId, createdAt: Date.now() };

        this.updateDB();
    }

    whoIsSession(session: string): User | null {
        const sessionData = this.db.sessions[session];
        if (!sessionData) return null;

        const user = this.db.users.find(user => user.id === sessionData.userId);
        if (!user) return null;

        return user;
    }

    removeSession(token: string) {
        delete this.db.sessions[token];
        this.updateDB();
    }

    getAllUsers(): PublicUser[] {
        return this.db.users.map((u) => ({ id: u.id, username: u.username, admin: u.admin, stillPendingLogin: !!u.code }));
    }

    getPublicUser(userId: number): PublicUser | null {
        const u = this.db.users.find(u => u.id === userId);
        return u ? { id: u.id, username: u.username, admin: u.admin } : null;
    }

    deleteUser(userId: number): void {
        this.db.users = this.db.users.filter(u => u.id !== userId);

        for (const session in this.db.sessions) {
            if (this.db.sessions[session].userId === userId) {
                delete this.db.sessions[session];
            }
        }

        siteDB.removeUserFromAllSites(userId);

        this.updateDB();
    }

    setUserAdmin(userId: number, isAdmin: boolean): void {
        const user = this.db.users.find(u => u.id === userId);
        if (!user) throw new Error('User not found');

        user.admin = isAdmin ? 1 : 0;

        this.updateDB();
    }

    setUserPassword(userId: number, newPassword: string): void {
        const user = this.db.users.find(u => u.id === userId);
        if (!user) throw new Error('User not found');

        user.password = hasher.encode(newPassword);

        for (const session in this.db.sessions) {
            if (this.db.sessions[session].userId === userId) {
                delete this.db.sessions[session];
            }
        }

        this.updateDB();
    }

    getCode(code: string): User | null {
        return this.db.users.find(user => user.code === code) || null;
    }

    purgeCodeOf(userId: number): void {
        const user = this.db.users.find(u => u.id === userId);
        if (!user) throw new Error('User not found');

        delete user.code;

        this.updateDB();
    }
}

const userDB = new UserDB();
export default userDB;