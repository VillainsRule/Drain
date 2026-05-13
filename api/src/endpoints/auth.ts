import crypto from 'node:crypto';

import { Elysia, status, t } from 'elysia';

import {
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    type AuthenticationResponseJSON,
    type VerifiedAuthenticationResponse
} from '@simplewebauthn/server';

import auditDB from '../db/impl/AuditDB';
import apiKeyDB from '../db/impl/APIKeyDB';
import configDB from '../db/impl/ConfigDB';
import passkeyDB from '../db/impl/PasskeyDB';
import requestDB from '../db/impl/RequestDB';
import userDB from '../db/impl/UserDB';

import Hasher from '../util/hasher';

import { DBAPIKey } from '../../../types';

const passkeysConfigured = typeof Bun.env.RP_ID === 'string';

const oauthStates = new Map<string, number>();

const auth = new Elysia({ name: 'auth' })
    .guard({ detail: { hide: true } })

    .get('/api/auth/account', async ({ cookie: { session } }) => {
        if (typeof session.value !== 'string') return { instance: { allowPasskeys: passkeysConfigured } };

        const user = userDB.getLink('sessions', session.value);
        if (!user) return { instance: { allowPasskeys: passkeysConfigured } };

        return {
            user: {
                id: user.id,
                username: user.username,
                admin: user.admin,
                mustMigrate: typeof user.voauthId !== 'number' || user.voauthId < 0
            },
            instance: {
                allowPasskeys: passkeysConfigured,
                allowAPIKeys: configDB.db.allowAPIKeys,
                motd: configDB.db.motd,
                numRequests: user.admin && requestDB.getSize()
            }
        };
    })

    .post('/api/auth/account', async ({ body, cookie: { session } }) => {
        try {
            const user = userDB.getLink('username', body.username);
            if (!user) return status(401, { error: 'user or password not found' });
            if (!user.password || (typeof user.voauthId === 'number' && user.voauthId > -1)) return status(401, { error: 'use voauth to log in' });

            const isValidPassword = Hasher.matches(body.password, user.password);
            if (!isValidPassword) return status(401, { error: 'user or password not found' });

            const newSession = crypto.randomBytes(32).toString('hex');
            userDB.update(user.id, { sessions: [...user.sessions, newSession], code: undefined });

            session.value = newSession;
            session.httpOnly = true;
            session.path = '/';
            session.sameSite = 'lax';
            session.secure = true;

            return { user: { id: user.id, username: user.username, admin: user.admin }, motd: configDB.db.motd };
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ username: t.String(), password: t.String() }) })

    .post('/api/auth/login/redirect', async ({ body }) => {
        const redirectUrl = `${Bun.env.VOAUTH_HOST}/oauth/v1?client_id=${Bun.env.VOAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${body.origin}/api/auth/login/complete`)}`;
        return { redirect: redirectUrl };
    }, { body: t.Object({ origin: t.Optional(t.String()) }) })

    .get('/api/auth/login/complete', async ({ query: { code }, cookie: { session } }) => {
        try {
            if (!code) return status(400, { error: 'missing code' });

            const userReq = await fetch(`${Bun.env.VOAUTH_HOST}/api/v1/oauth/validate`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ appId: Bun.env.VOAUTH_CLIENT_ID, appSecret: Bun.env.VOAUTH_CLIENT_SECRET, code })
            });

            const userRes = await userReq.json() as { error: string } | { user: { id: number, username: string } };
            if (!('user' in userRes)) return status(401, { error: userRes.error || 'invalid code' });

            let user = userDB.getLink('voauthId', userRes.user.id);
            if (!user) return status(401, { error: 'that voauth account has not been used on Drain before, use the invite flow to create an account' });

            const newSession = crypto.randomBytes(32).toString('hex');
            userDB.update(user.id, { sessions: [...user.sessions, newSession] });

            session.value = newSession;
            session.httpOnly = true;
            session.path = '/';
            session.sameSite = 'lax';
            session.secure = true;

            return new Response(null, { status: 302, headers: { Location: '/' } });
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { query: t.Object({ code: t.Optional(t.String()) }) })

    .post('/api/auth/invites/start', async ({ body }) => {
        try {
            const user = userDB.getLink('code', body.code);
            if (!user) return status(401, { error: 'that invite code does not exist or has been claimed' });

            const state = crypto.randomUUID();
            oauthStates.set(state, user.id);

            const redirect = `${Bun.env.VOAUTH_HOST}/oauth/v1?client_id=${Bun.env.VOAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${body.origin}/api/auth/invites/complete`)}&state=${state}`;

            return status(200, { username: user.username, redirect });
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ code: t.String(), origin: t.String() }) })

    .get('/api/auth/invites/complete', async ({ query: { state, code }, cookie: { session } }) => {
        try {
            if (!state || !code) return status(400, { error: 'missing state or code' });

            const userId = oauthStates.get(state);
            if (!userId) return status(401, { error: 'invalid state' });

            const user = userDB.get(userId);
            if (!user) return status(401, { error: 'invalid state' });

            const userReq = await fetch(`${Bun.env.VOAUTH_HOST}/api/v1/oauth/validate`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ appId: Bun.env.VOAUTH_CLIENT_ID, appSecret: Bun.env.VOAUTH_CLIENT_SECRET, code })
            });

            const userRes = await userReq.json() as { error: string } | { user: { id: number, username: string } };
            if (!('user' in userRes)) return status(401, { error: userRes.error || 'invalid code' });

            const currentVoauth = userDB.getLink('voauthId', userRes.user.id);
            if (currentVoauth) return status(401, { error: 'that voauth account has already been used on Drain, make a new account to sign in' });

            const newSession = crypto.randomBytes(32).toString('hex');

            userDB.update(user.id, {
                voauthId: userRes.user.id,
                sessions: [...user.sessions, newSession],
                code: undefined
            });

            session.value = newSession;
            session.httpOnly = true;
            session.path = '/';
            session.sameSite = 'lax';
            session.secure = true;

            const inviter = userDB.get(user.invitedBy);
            auditDB.log('claimInvite', user.id, `claimed an invite created by @${inviter?.username || 'unknown user'}`);

            return new Response(null, { status: 302, headers: { Location: '/' } });
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { query: t.Object({ state: t.Optional(t.String()), code: t.Optional(t.String()) }) })

    .post('/api/auth/migr/redirect', async ({ body, cookie: { session } }) => {
        if (!session.value) return status(401, { error: 'not logged in' });

        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const redirectUrl = `${Bun.env.VOAUTH_HOST}/oauth/v1?client_id=${Bun.env.VOAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${body.origin}/api/auth/migr/complete`)}`;
        return { redirect: redirectUrl };
    }, { body: t.Object({ origin: t.String() }), cookie: t.Object({ session: t.String() }) })

    .get('/api/auth/migr/complete', async ({ query: { code }, cookie: { session } }) => {
        try {
            if (!session.value) return status(401, { error: 'not logged in' });

            const user = userDB.getLink('sessions', session.value);
            if (!user) return status(401, { error: 'not logged in' });

            if (!code) return status(400, { error: 'missing code' });

            const userReq = await fetch(`${Bun.env.VOAUTH_HOST}/api/v1/oauth/validate`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ appId: Bun.env.VOAUTH_CLIENT_ID, appSecret: Bun.env.VOAUTH_CLIENT_SECRET, code })
            });

            const userRes = await userReq.json() as { error: string } | { user: { id: number, username: string } };
            if (!('user' in userRes)) return status(401, { error: userRes.error || 'invalid code' });

            let existingLink = userDB.getLink('voauthId', userRes.user.id);
            if (existingLink) return status(403, { error: 'that voauth account is being used on another drain account' });

            userDB.update(user.id, { voauthId: userRes.user.id, password: '', code: undefined });

            return new Response(null, { status: 302, headers: { Location: '/' } });
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { query: t.Object({ code: t.Optional(t.String()) }), cookie: t.Cookie({ session: t.Optional(t.String()) }) })

    .post('/api/auth/logout', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return {};

        user.sessions = user.sessions.filter(s => s !== session.value);
        userDB.update(user.id, { sessions: user.sessions });

        session.value = '';
        session.httpOnly = true;
        session.path = '/';
        session.sameSite = 'lax';
        session.maxAge = 0;
        session.secure = true;

        return {};
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/webauthn/login/options', async ({ cookie: { webauthn } }) => {
        if (!passkeysConfigured) return status(404);

        const options = await generateAuthenticationOptions({
            rpID: Bun.env.RP_ID!,
            userVerification: 'preferred'
        });

        webauthn.value = options.challenge;
        webauthn.httpOnly = true;
        webauthn.path = '/';
        webauthn.sameSite = 'lax';
        webauthn.secure = true;

        return options;
    })

    .post('/api/auth/webauthn/login/verify', async ({ body, headers: { origin }, cookie: { webauthn, session } }) => {
        if (!passkeysConfigured) return status(404);
        if (!origin) return status(404);

        const passableBody = body as AuthenticationResponseJSON;

        const passkey = passkeyDB.get(body.id);
        if (!passkey) return status(401, { error: 'could not find passkey' });

        const user = userDB.get(passkey.userId);
        if (!user) return status(401, { error: 'could not find passkey' });

        if (body.response.userHandle) {
            if (Buffer.from(body.response.userHandle, 'base64').toString() !== user.id.toString())
                return status(401, { error: 'could not find passkey' });
        }

        let verification: VerifiedAuthenticationResponse;

        try {
            verification = await verifyAuthenticationResponse({
                response: passableBody,
                expectedChallenge: webauthn.value,
                expectedOrigin: origin,
                expectedRPID: Bun.env.RP_ID!,
                credential: {
                    id: passkey.id,
                    publicKey: Buffer.from(passkey.publicKey, 'base64'),
                    counter: passkey.counter,
                    transports: passkey.transports
                }
            });
        } catch (error) {
            console.error(error);
            return status(400, { error: (error as Error).message });
        }

        if (!verification.verified) return status(400, { error: 'could not verify authentication' });

        passkeyDB.update(verification.authenticationInfo.credentialID, {
            counter: verification.authenticationInfo.newCounter,
            lastUsed: Date.now()
        });

        const newSession = crypto.randomBytes(32).toString('hex');
        userDB.update(user.id, { sessions: [...user.sessions, newSession] });

        session.value = newSession;
        session.httpOnly = true;
        session.path = '/';
        session.sameSite = 'lax';
        session.secure = true;

        webauthn.value = '';
        webauthn.httpOnly = true;
        webauthn.path = '/';
        webauthn.sameSite = 'lax';
        webauthn.maxAge = 0;
        webauthn.secure = true;

        return { user: { id: user.id, username: user.username, admin: user.admin }, motd: configDB.db.motd };
    }, {
        body: t.Object({
            id: t.String(),
            rawId: t.String(),
            response: t.Object({
                clientDataJSON: t.String(),
                authenticatorData: t.String(),
                signature: t.String(),
                userHandle: t.Optional(t.String())
            }),
            type: t.Literal('public-key')
        }),
        headers: t.Object({ origin: t.Optional(t.String()) }),
        cookie: t.Cookie({ webauthn: t.String() })
    })

    .get('/api/auth/api/keys', async ({ cookie: { session } }) => {
        if (!passkeysConfigured) return status(404);

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

    .get('/api/auth/invites', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const invites = userDB.getLinks('invitedBy', user.id).filter(u => u.id !== 1).map((u) => ({
            username: u.username,
            accepted: !(!!u.code)
        }));

        return { invites };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/invites/create', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const currentInvites = userDB.getLinks('invitedBy', user.id);
        if (!user.admin && currentInvites.filter(e => !!e.code).length >= 3) return status(400, { error: 'you have reached the maximum number of invites you can create (3)' });

        if (body.username.length > 16) return status(413, { error: 'username too long' });
        if (!body.username.match(/^[a-zA-Z0-9_]+$/)) return status(400, { error: 'username can only contain letters, numbers, and underscores' });
        if (userDB.getLink('username', body.username)) return status(400, { error: 'a user with that username already exists' });

        const inviteCode = [...Array(9)].map((_, i) => i == 4 ? '-' : String.fromCharCode(97 + Math.random() * 26)).join('').toUpperCase();

        const newID = userDB.nextId();

        userDB.add({
            id: newID,
            voauthId: -1,
            username: body.username,
            code: inviteCode,
            invitedBy: user.id,
            admin: 0,
            sites: [],
            sessions: [],
            apiKeys: []
        });

        auditDB.log('createInvite', user.id, `created an invite for @${body.username}`);

        return { inviteCode };
    }, { body: t.Object({ username: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/invites/revoke', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const targetInvite = userDB.getLink('username', body.username);
        if (!targetInvite) return status(404, { error: 'invite not found' });
        if (targetInvite.invitedBy !== user.id) return status(403, { error: 'you can only revoke invites you have created' });
        if (targetInvite.code === undefined) return status(400, { error: 'that invite has already been claimed' });

        auditDB.log('revokeInvite', user.id, `revoked an invite for @${body.username}`);

        userDB.remove(targetInvite.id);

        return {};
    }, { body: t.Object({ username: t.String() }), cookie: t.Cookie({ session: t.String() }) })

export default auth;