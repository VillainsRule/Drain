import { Elysia, t } from 'elysia';

import siteDB from '../db/SiteDB';
import userDB from '../db/UserDB';

import { JSONResponse } from '../util';

export default function admin(app: Elysia) {
    app.get('/$/admin/users', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ loggedIn: false });

        const allUsers = userDB.getAllUsers();

        return new JSONResponse({ allUsers });
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/createUser', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ loggedIn: false });

        if (userDB.getUserByUsername(req.body.username))
            return new JSONResponse({ error: 'User already exists' }, { status: 400 });

        userDB.createUser(req.body.username, req.body.password);

        return new JSONResponse({});
    }, { body: t.Object({ username: t.String(), password: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/userSites', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ loggedIn: false });
        if (!user.admin) return new JSONResponse({ error: 'unauthorized' });

        const target = userDB.getUserByUsername(req.body.username);
        if (!target) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        const targetSites = siteDB.getUserSites(target.id);
        if (!targetSites) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        const index: { [key: string]: 'reader' | 'editor' } = {};

        targetSites.forEach((site) => {
            index[site.domain] = site.readers.includes(target.id) ? 'reader' : 'editor';
        });

        return new JSONResponse({ sites: index });
    }, { body: t.Object({ username: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/deleteUser', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ loggedIn: false });

        if (req.body.userId === 1) return new JSONResponse({ error: 'Cannot delete primary admin' }, { status: 400 });

        const target = userDB.getPublicUser(req.body.userId);
        if (!target) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return new JSONResponse({ error: 'Cannot delete other admins' }, { status: 403 });

        userDB.deleteUser(req.body.userId);

        return new JSONResponse({});
    }, { body: t.Object({ userId: t.Number() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/setUserRole', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ loggedIn: false });

        const targetUser = userDB.getPublicUser(req.body.userId);
        if (!targetUser) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (req.body.userId === 1) return new JSONResponse({ error: 'Cannot change role of primary admin' }, { status: 400 });

        userDB.setUserAdmin(req.body.userId, req.body.isAdmin);

        return new JSONResponse({});
    }, { body: t.Object({ userId: t.Number(), isAdmin: t.Boolean() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/admin/setUserPassword', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ loggedIn: false });

        const target = userDB.getPublicUser(req.body.userId);
        if (!target) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return new JSONResponse({ error: 'Cannot change password of other admins' }, { status: 403 });

        userDB.setUserPassword(req.body.userId, req.body.newPassword);

        return new JSONResponse({});
    }, { body: t.Object({ userId: t.Number(), newPassword: t.String() }), cookie: t.Cookie({ session: t.String() }) });
}