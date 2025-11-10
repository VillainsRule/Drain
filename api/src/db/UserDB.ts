import path from 'node:path';

import BaseDB from './BaseDB';
import siteDB from './SiteDB';

import hasher from '../hasher';

import { Passkey, PublicUser, Session, User } from '../types.d';

type UserDBType = {
    users: User[];
    passkeys: Passkey[];
    sessions: Record<string, Session>;
    nextId: number;
}

const getRelativeTime = (timestamp: number): string => {
    if (timestamp <= 0) return 'never';

    const now = Date.now();
    let diff = Math.floor((now - timestamp) / 1000);

    if (diff < 0) return 'just now';

    const units = [
        { name: 'month', secs: 2592000 },
        { name: 'week', secs: 604800 },
        { name: 'day', secs: 86400 },
        { name: 'hour', secs: 3600 },
        { name: 'minute', secs: 60 },
        { name: 'second', secs: 1 }
    ];

    for (const unit of units) {
        const value = Math.floor(diff / unit.secs);
        if (value > 0) return `${value} ${unit.name}${value > 1 ? 's' : ''} ago`;
    }

    return 'just now';
}

export class UserDB extends BaseDB<UserDBType> {
    constructor() {
        super(path.join(import.meta.dirname, '..', '..', 'db', 'users.db'));
    }

    initializeData() {
        this.db = {
            users: [{ id: 1, username: 'admin', password: hasher.encode('admin'), admin: 1 }],
            passkeys: [],
            sessions: {},
            nextId: 2
        };
    }

    runDBMigrations(): void {
        if (!this.db.hasOwnProperty('passkeys')) (this.db as any).passkeys = [];
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

    getPasskeyIDsForUser(userId: number): { id: string }[] {
        return this.db.passkeys.filter(pk => pk.userId === userId).map(pk => ({ id: pk.id }));
    }

    addPasskey(passkey: Passkey): void {
        this.db.passkeys.push(passkey);
        this.updateDB();
    }

    getPubPasskeysFor(userId: number): Array<{ name: string; lastUsed: string }> {
        return this.db.passkeys.filter(pk => pk.userId === userId).map(pk => {
            const relativeUse = getRelativeTime(pk.lastUsed);

            return {
                name: pk.name,
                lastUsed: relativeUse === 'never' ? 'never used' : 'last used: ' + relativeUse
            }
        });
    }

    userHasPasskey(userId: number, name: string): boolean {
        return this.db.passkeys.some(pk => pk.userId === userId && pk.name === name);
    }

    deletePasskey(userId: number, name: string): void {
        this.db.passkeys = this.db.passkeys.filter(pk => !(pk.userId === userId && pk.name === name));
        this.updateDB();
    }

    getUserFromPasskeyId(passkeyId: string): User | null {
        const passkey = this.db.passkeys.find(pk => pk.id === passkeyId);
        if (!passkey) return null;

        const user = this.db.users.find(u => u.id === passkey.userId);
        return user || null;
    }

    getPasskeyById(passkeyId: string): Passkey | null {
        return this.db.passkeys.find(pk => pk.id === passkeyId) || null;
    }

    updatePasskeyDetails(passkeyId: string, newCounter: number): void {
        const passkey = this.db.passkeys.find(pk => pk.id === passkeyId);
        if (!passkey) return;

        passkey.counter = newCounter;
        passkey.lastUsed = Date.now();

        this.updateDB();
    }
}

const userDB = new UserDB();
export default userDB;