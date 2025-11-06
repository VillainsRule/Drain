import { Elysia, t } from 'elysia';

import crypto from 'node:crypto';

import userDB from '../db/UserDB';

import { hasher, JSONResponse } from '../util';

export default function auth(app: Elysia) {
    app.post('/$/auth/whoami', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });

        return new JSONResponse({
            loggedIn: true,
            user: {
                id: user.id,
                username: user.username,
                admin: user.admin
            }
        });
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/auth/login', async (req) => {
        try {
            const user = userDB.getUserByUsername(req.body.username);
            if (!user) return new JSONResponse({ error: 'User not found' }, { status: 404 });

            const isValidPassword = hasher.matches(req.body.password, user.password);
            if (!isValidPassword) return new JSONResponse({ error: 'Incorrect password' }, { status: 401 });

            const session = crypto.randomBytes(32).toString('hex');
            userDB.addSession(user.id, session);

            return new JSONResponse({
                loggedIn: true,
                user: {
                    id: user.id,
                    username: user.username,
                    admin: 0
                }
            }, {
                headers: {
                    'Set-Cookie': `session=${session}; HttpOnly; Path=/; SameSite=Strict`
                }
            });
        } catch (error) {
            console.error(error);
            return new JSONResponse({ error: 'Internal Server Error' }, { status: 502 });
        }
    }, { body: t.Object({ username: t.String(), password: t.String() }) });

    app.post('/$/auth/logout', async (req) => {
        const session = req.cookie.session.value;
        userDB.removeSession(session);
        return new JSONResponse({ loggedOut: true }, { headers: { 'Set-Cookie': 'session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0' } });
    }, { cookie: t.Cookie({ session: t.String() }) });
}