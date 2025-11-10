import { Elysia, status, t } from 'elysia';

import crypto from 'node:crypto';

import userDB from '../db/UserDB';

import hasher from '../hasher';

export default function auth(app: Elysia) {
    app.post('/$/auth/whoami', async ({ cookie: { session } }) => {
        if (typeof session.value !== 'string') return status(401, { error: 'not logged in' });

        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        return { user: { id: user.id, username: user.username, admin: user.admin } };
    });

    app.post('/$/auth/secure/credentials', async ({ body, cookie: { session } }) => {
        try {
            const user = userDB.getUserByUsername(body.username);
            if (!user) return status(401, { error: 'user or password not found' });

            const isValidPassword = hasher.matches(body.password, user.password);
            if (!isValidPassword) return status(401, { error: 'user or password not found' });

            userDB.purgeCodeOf(user.id);

            const newSession = crypto.randomBytes(32).toString('hex');
            userDB.addSession(user.id, newSession);

            session.value = newSession;
            session.httpOnly = true;
            session.path = '/';
            session.sameSite = 'strict';

            return { user: { id: user.id, username: user.username, admin: user.admin } };
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ username: t.String(), password: t.String() }) });

    app.post('/$/auth/secure/code/start', async ({ body }) => {
        try {
            const code = userDB.getCode(body.code);
            if (!code) return status(401, { error: 'that invite code does not exist or has been claimed' });

            return status(200, { username: code.username });
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ code: t.String() }) });

    app.post('/$/auth/secure/code/set', async ({ body, cookie: { session } }) => {
        try {
            const user = userDB.getCode(body.code);
            if (!user) return status(401, { error: 'that invite code does not exist or has been claimed' });

            if (body.password.length < 6) return status(400, { error: 'password is too short' });

            userDB.purgeCodeOf(user.id);
            userDB.setUserPassword(user.id, body.password);

            const newSession = crypto.randomBytes(32).toString('hex');
            userDB.addSession(user.id, newSession);

            session.value = newSession;
            session.httpOnly = true;
            session.path = '/';
            session.sameSite = 'strict';

            return { user: { id: user.id, username: user.username, admin: user.admin } };
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ code: t.String(), password: t.String() }) });

    app.post('/$/auth/logout', async ({ cookie: { session } }) => {
        userDB.removeSession(session.value);

        session.value = '';
        session.httpOnly = true;
        session.path = '/';
        session.sameSite = 'strict';
        session.maxAge = 0;

        return {};
    }, { cookie: t.Cookie({ session: t.String() }) });
}