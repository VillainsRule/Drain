import Elysia from 'elysia';

import crypto from 'node:crypto';

import userDB from '../db/UserDB';

import { hasher, JSONResponse } from '../util';

export default function auth(app: Elysia) {
    app.post('/$/auth/whoami', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ loggedIn: false });

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
    });

    app.post('/$/auth/login', async (req) => {
        try {
            const body = req.body as { username: any, password: any };

            if (typeof body.username !== 'string' || typeof body.password !== 'string')
                return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

            const user = userDB.getUserByUsername(body.username);
            if (!user) return new JSONResponse({ error: 'User not found' }, { status: 404 });

            const isValidPassword = hasher.matches(body.password, user.password);
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
    });

    app.post('/$/auth/logout', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') {
            return new JSONResponse({ error: 'Not logged in' }, { status: 401 });
        }

        const session = req.cookie.session.value;
        userDB.removeSession(session);
        return new JSONResponse({ loggedOut: true }, { headers: { 'Set-Cookie': 'session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0' } });
    });
}