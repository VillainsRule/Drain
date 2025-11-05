import Elysia from 'elysia';

import userDB from '../db/UserDB';

import { JSONResponse } from '../util';
import siteDB from '../db/SiteDB';

export default function admin(app: Elysia) {
    app.get('/$/admin/users', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ loggedIn: false });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });
        if (!user.admin) return new JSONResponse({ error: 'unauthorized' });

        const allUsers = userDB.getAllUsers();

        return new JSONResponse({ allUsers });
    });

    app.post('/$/admin/createUser', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ loggedIn: false });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });
        if (!user.admin) return new JSONResponse({ error: 'unauthorized' });

        const body = req.body as { username: any, password: any };

        if (typeof body.username !== 'string' || typeof body.password !== 'string')
            return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        if (userDB.getUserByUsername(body.username)) return new JSONResponse({ error: 'User already exists' }, { status: 400 });

        userDB.createUser(body.username, body.password);

        return new JSONResponse({});
    })

    app.post('/$/admin/userSites', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ loggedIn: false });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });
        if (!user.admin) return new JSONResponse({ error: 'unauthorized' });

        const body = req.body as { username: any };

        if (typeof body.username !== 'string')
            return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const userId = userDB.getUserByUsername(body.username)?.id;
        if (!userId) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        const siteList = siteDB.getUserSites(userId);
        if (!siteList) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        const index: { [key: string]: 'reader' | 'editor' } = {};

        siteList.forEach((site) => {
            index[site.domain] = site.readers.includes(userId) ? 'reader' : 'editor';
        })

        return new JSONResponse({ sites: index });
    });

    app.post('/$/admin/deleteUser', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ loggedIn: false });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });
        if (!user.admin) return new JSONResponse({ error: 'unauthorized' });

        const body = req.body as { userId: any };

        if (typeof body.userId !== 'number')
            return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        if (body.userId === 1) return new JSONResponse({ error: 'Cannot delete primary admin' }, { status: 400 });

        const target = userDB.getPublicUser(body.userId);
        if (!target) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return new JSONResponse({ error: 'Cannot delete other admins' }, { status: 403 });

        userDB.deleteUser(body.userId);

        return new JSONResponse({});
    });

    app.post('/$/admin/setUserRole', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ loggedIn: false });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });
        if (!user.admin) return new JSONResponse({ error: 'unauthorized' });

        const body = req.body as { userId: any, isAdmin: any };
        if (typeof body.userId !== 'number' || typeof body.isAdmin !== 'boolean')
            return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const targetUser = userDB.getPublicUser(body.userId);
        if (!targetUser) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (body.userId === 1) return new JSONResponse({ error: 'Cannot change role of primary admin' }, { status: 400 });

        userDB.setUserAdmin(body.userId, body.isAdmin);

        return new JSONResponse({});
    });

    app.post('/$/admin/setUserPassword', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ loggedIn: false });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });
        if (!user.admin) return new JSONResponse({ error: 'unauthorized' });

        const body = req.body as { userId: any, newPassword: any };
        if (typeof body.userId !== 'number' || typeof body.newPassword !== 'string')
            return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const target = userDB.getPublicUser(body.userId);
        if (!target) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return new JSONResponse({ error: 'Cannot change password of other admins' }, { status: 403 });

        userDB.setUserPassword(body.userId, body.newPassword);

        return new JSONResponse({});
    });
}