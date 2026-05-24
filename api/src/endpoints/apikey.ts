import crypto from 'node:crypto';

import { Elysia, status, t } from 'elysia';

import apiKeyDB from '../db/impl/APIKeyDB';
import configDB from '../db/impl/ConfigDB';
import userDB from '../db/impl/UserDB';

import { DBAPIKey } from '../../../types';

const apikey = new Elysia({ name: 'account' })
    .guard({ detail: { hide: true } })

    .get('/api/auth/api/keys', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const apiKeys = user.apiKeys.map(e => apiKeyDB.get(e)).filter((e): e is DBAPIKey => e !== null).map((e) => ({
            name: e.name,
            createdAt: e.createdAt,
            lastUsed: e.lastUsed,
            key: e.key.slice(-4).padStart(e.key.length, '*').slice(-24)
        }));

        return { apiKeys, enabled: configDB.db.allowAPIKeys };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/api/keys/create', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        if (body.name.length > 24) return status(413, { error: 'name too long' });

        const identifier = `${user.id} ${body.name}`;
        if (apiKeyDB.get(identifier)) return status(400, { error: 'you already have an API key with that name' });

        const key = crypto.randomBytes(12).toString('hex');

        apiKeyDB.add({
            id: identifier,
            userId: user.id,
            name: body.name,
            key,
            createdAt: Date.now(),
            lastUsed: 0
        });

        user.apiKeys.push(identifier);
        userDB.update(user.id, { apiKeys: user.apiKeys });

        return { key };
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/api/keys/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const identifier = `${user.id} ${body.name}`;
        if (!apiKeyDB.has(identifier)) return status(400, { error: 'you do not have an API key with that name' });

        apiKeyDB.remove(identifier);

        user.apiKeys = user.apiKeys.filter(i => i !== identifier);
        userDB.update(user.id, { apiKeys: user.apiKeys });

        return {};
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/api/keys/regen', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const identifier = `${user.id} ${body.name}`;
        if (!apiKeyDB.has(identifier)) return status(400, { error: 'you do not have an API key with that name' });

        const newKey = crypto.randomBytes(12).toString('hex');
        apiKeyDB.update(identifier, { key: newKey });

        return { key: newKey };
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) })

export default apikey;