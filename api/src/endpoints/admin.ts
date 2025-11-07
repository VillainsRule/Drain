import { Elysia, status, t } from 'elysia';

import terminal from 'node:child_process';

import siteDB from '../db/SiteDB';
import userDB from '../db/UserDB';

export default function admin(app: Elysia) {
    app.get('/$/admin/users', async ({ cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const users = userDB.getAllUsers();
        return { users };
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/createUser', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (userDB.getUserByUsername(body.username)) return status(400, { error: 'user already exists' });
        if (body.password.length < 6) return status(400, { error: 'password is too short' });

        userDB.createUser(body.username, body.password);

        return {};
    }, { body: t.Object({ username: t.String(), password: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/getUserSites', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const target = userDB.getUserByUsername(body.username);
        if (!target) return status(404, { error: 'user not found' });

        const targetSites = siteDB.getUserSites(target.id);
        if (!targetSites) return status(404, { error: 'user not found' });

        const sites: { [key: string]: 'reader' | 'editor' } = {};

        targetSites.forEach((site) => {
            sites[site.domain] = site.readers.includes(target.id) ? 'reader' : 'editor';
        });

        return { sites };
    }, { body: t.Object({ username: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/deleteUser', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (body.userId === 1) return status(403, { error: 'cannot modify primary admin' });

        const target = userDB.getPublicUser(body.userId);
        if (!target) return status(404, { error: 'user not found' });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return status(403, { error: 'cannot delete other admins' });

        userDB.deleteUser(body.userId);

        return {};
    }, { body: t.Object({ userId: t.Number() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/setUserRole', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const targetUser = userDB.getPublicUser(body.userId);
        if (!targetUser) return status(404, { error: 'user not found' });

        if (body.userId === 1) return status(403, { error: 'cannot modify primary admin' });

        userDB.setUserAdmin(body.userId, body.isAdmin);

        return {};
    }, { body: t.Object({ userId: t.Number(), isAdmin: t.Boolean() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/setUserPassword', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const target = userDB.getPublicUser(body.userId);
        if (!target) return status(404, { error: 'user not found' });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return status(403, { error: 'cannot modify other admins' });

        userDB.setUserPassword(body.userId, body.newPassword);

        return {};
    }, { body: t.Object({ userId: t.Number(), newPassword: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/removeAllSessions', async ({ cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        userDB.db.sessions = {};
        userDB.updateDB();

        return {};
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.get('/$/admin/instanceInformation', async ({ cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        const commit = terminal.execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).toString().trim();
        const isDev = terminal.execSync('git status --porcelain', { encoding: 'utf8' }).trim().length > 0;
        const isUsingSystemd = !!process.env['INVOCATION_ID'];

        return { commit, isDev, isUsingSystemd };
    }, { cookie: t.Cookie({ session: t.String() }) });
}