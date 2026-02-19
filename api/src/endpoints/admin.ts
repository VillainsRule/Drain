import { Elysia, status, t } from 'elysia';

import term from 'node:child_process';
import path from 'node:path';

import configDB from '../db/impl/ConfigDB';
import siteDB from '../db/impl/SiteDB';
import userDB from '../db/impl/UserDB';

import Hasher from '../util/hasher';

const drainHome = path.join(import.meta.dirname, '..', '..', '..');

const commit = term.execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: drainHome }).toString().trim();
const localChanges = term.execSync('git status --porcelain', { encoding: 'utf8', cwd: drainHome }).trim().length > 0;
const isUsingSystemd = !!process.env['INVOCATION_ID']

const admin = new Elysia({ name: 'admin' })
    .post('/api/admin/users', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const users = userDB.allUsers();
        return { users };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/users/create', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (body.username.length > 16) return status(413, { error: 'username too long' });
        if (userDB.getLink('username', body.username)) return status(400, { error: 'user already exists' });

        const inviteCode = [...Array(9)].map((_, i) => i == 4 ? '-' : String.fromCharCode(97 + Math.random() * 26)).join('').toUpperCase();

        userDB.add({
            id: configDB.db.nextUserId,
            username: body.username,
            password: Hasher.encode(crypto.randomUUID()),
            code: inviteCode,
            admin: 0,
            sites: [],
            sessions: [],
            passkeyIds: [],
            apiKeys: []
        });

        configDB.updateConfig({ nextUserId: configDB.db.nextUserId + 1 });

        return { inviteCode };
    }, { body: t.Object({ username: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/users/sites', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const targetUser = userDB.get(body.userId);
        if (!targetUser) return status(404, { error: 'user not found' });

        const sites: Record<string, 'reader' | 'editor'> = {};

        for (const siteId of targetUser.sites) {
            const site = siteDB.get(siteId);
            if (site) sites[siteId] = site.readers.includes(body.userId) ? 'reader' : 'editor';
        }

        return { sites };
    }, { body: t.Object({ userId: t.Number() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/users/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (body.userId === 1) return status(403, { error: 'cannot modify primary admin' });

        const target = userDB.getPublicUser(body.userId);
        if (!target) return status(404, { error: 'user not found' });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return status(403, { error: 'cannot delete other admins' });

        userDB.remove(body.userId);

        return {};
    }, { body: t.Object({ userId: t.Number() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/users/setRole', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const targetUser = userDB.getPublicUser(body.userId);
        if (!targetUser) return status(404, { error: 'user not found' });

        if (body.userId === 1) return status(403, { error: 'cannot modify primary admin' });

        userDB.update(body.userId, { admin: body.isAdmin ? 1 : 0 });

        return {};
    }, { body: t.Object({ userId: t.Number(), isAdmin: t.Boolean() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/users/setPassword', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (body.newPassword.length > 24) return status(413, { error: 'password too long' });

        const target = userDB.getPublicUser(body.userId);
        if (!target) return status(404, { error: 'user not found' });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return status(403, { error: 'cannot modify other admins' });

        userDB.update(body.userId, { password: Hasher.encode(body.newPassword), sessions: [] });

        return {};
    }, { body: t.Object({ userId: t.Number(), newPassword: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .get('/api/admin/instance', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        return { commit, localChanges, isUsingSystemd, config: configDB.db };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/gitPull', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        const out = term.execSync('git pull', { encoding: 'utf8', cwd: drainHome }).toString();
        return { out };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/systemdRestart', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        if (!isUsingSystemd) return status(400, { error: 'not using systemd' });

        term.exec('systemctl restart drain.service');

        return {};
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/instance', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        configDB.updateConfig(body.config);

        return {};
    }, { body: t.Object({ config: t.Any() }), cookie: t.Cookie({ session: t.String() }) });

export default admin;