import crypto from 'node:crypto';

import { Elysia, status, t } from 'elysia';

import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
    type AuthenticationResponseJSON,
    type RegistrationResponseJSON,
    type VerifiedAuthenticationResponse,
    type VerifiedRegistrationResponse
} from '@simplewebauthn/server';

import auditDB from '../db/impl/AuditDB';
import apiKeyDB from '../db/impl/APIKeyDB';
import configDB from '../db/impl/ConfigDB';
import passkeyDB from '../db/impl/PasskeyDB';
import requestDB from '../db/impl/RequestDB';
import userDB from '../db/impl/UserDB';

import Hasher from '../util/hasher';

import { DBAPIKey } from '../../../types';

const currentRegistrations: Record<number, { name: string, value: string, expiry: number }> = {};

const passkeysConfigured = typeof Bun.env.RP_ID === 'string';

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
                admin: user.admin
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

            const isValidPassword = Hasher.matches(body.password, user.password);
            if (!isValidPassword) return status(401, { error: 'user or password not found' });

            const newSession = crypto.randomBytes(32).toString('hex');
            userDB.update(user.id, { sessions: [...user.sessions, newSession], code: undefined });

            session.value = newSession;
            session.httpOnly = true;
            session.path = '/';
            session.sameSite = 'strict';
            session.secure = true;

            return { user: { id: user.id, username: user.username, admin: user.admin }, motd: configDB.db.motd };
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ username: t.String(), password: t.String() }) })

    .post('/api/auth/invites/attempt', async ({ body }) => {
        try {
            const user = userDB.getLink('code', body.code);
            if (!user) return status(401, { error: 'that invite code does not exist or has been claimed' });

            return status(200, { username: user.username });
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ code: t.String() }) })

    .post('/api/auth/invites/claim', async ({ body, cookie: { session } }) => {
        try {
            const user = userDB.getLink('code', body.code);
            if (!user) return status(401, { error: 'that invite code does not exist or has been claimed' });

            if (body.password.length < 4) return status(400, { error: 'password is too short' });
            if (body.password.length > 24) return status(413, { error: 'password too long' });

            const newSession = crypto.randomBytes(32).toString('hex');

            userDB.update(user.id, {
                password: Hasher.encode(body.password),
                sessions: [...user.sessions, newSession],
                code: undefined
            });

            session.value = newSession;
            session.httpOnly = true;
            session.path = '/';
            session.sameSite = 'strict';
            session.secure = true;

            const inviter = userDB.get(user.invitedBy);
            auditDB.log('claimInvite', user.id, `claimed an invite created by @${inviter?.username || 'unknown user'}`);

            return { user: { id: user.id, username: user.username, admin: user.admin } };
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ code: t.String(), password: t.String() }) })

    .post('/api/auth/logout', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return {};

        user.sessions = user.sessions.filter(s => s !== session.value);
        userDB.update(user.id, { sessions: user.sessions });

        session.value = '';
        session.httpOnly = true;
        session.path = '/';
        session.sameSite = 'strict';
        session.maxAge = 0;
        session.secure = true;

        return {};
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/webauthn/register/options', async ({ body, cookie: { session } }) => {
        if (!passkeysConfigured) return status(404);

        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        if (body.name.length > 24) return status(413, { error: 'name too long' });

        if (currentRegistrations[user.id] && currentRegistrations[user.id].expiry > Date.now())
            return status(400, { error: 'you have an ongoing registration, please complete or wait for it to expire' });

        const existingPasskeys = user.passkeyIds.map(e => passkeyDB.get(e)).filter(Boolean);
        if (existingPasskeys.some((pk) => pk && pk.name === body.name))
            return status(400, { error: 'you already have a passkey with that name' });

        if (user.passkeyIds.length >= 10)
            return status(400, { error: 'you have reached the maximum number of passkeys (10)' });

        const opts = await generateRegistrationOptions({
            rpName: 'Drain',
            rpID: Bun.env.RP_ID!,
            userName: user.username,
            userID: Buffer.from(user.id.toString()),
            attestationType: 'none',
            excludeCredentials: user.passkeyIds.map(e => ({ id: e })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred'
            }
        });

        currentRegistrations[user.id] = {
            name: body.name,
            value: opts.challenge,
            expiry: Date.now() + (2 * 60 * 1000)
        };

        return opts;
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/auth/webauthn/register/verify', async ({ body, headers: { origin }, cookie: { session } }) => {
        if (!passkeysConfigured) return status(404);
        if (!origin) return status(404);

        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const currentChallenge = currentRegistrations[user.id];
        if (!currentChallenge || currentChallenge.expiry < Date.now())
            return status(400, { error: 'challenge has expired, please try registering again' });

        const passableBody = { ...body } as { name?: string } & RegistrationResponseJSON;
        delete passableBody.name;

        let verification: VerifiedRegistrationResponse;

        try {
            verification = await verifyRegistrationResponse({
                response: passableBody,
                expectedChallenge: currentChallenge.value,
                expectedOrigin: origin,
                expectedRPID: Bun.env.RP_ID!
            });
        } catch (error) {
            console.error(error);
            return status(400, { error: (error as Error).message });
        }

        if (!verification.verified || !verification.registrationInfo) {
            return status(400, { error: 'could not verify registration' });
        }

        passkeyDB.add({
            userId: user.id,
            webAuthnUserID: Buffer.from(user.id.toString()).toString('base64'),
            id: verification.registrationInfo.credential.id,
            publicKey: Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64'),
            counter: verification.registrationInfo.credential.counter,
            transports: verification.registrationInfo.credential.transports || [],
            deviceType: verification.registrationInfo.credentialDeviceType || 'unknown',
            backedUp: verification.registrationInfo.credentialBackedUp || false,
            lastUsed: 0,
            name: currentChallenge.name
        });

        const passkeyIds = user.passkeyIds;
        passkeyIds.push(verification.registrationInfo.credential.id);
        userDB.update(user.id, { passkeyIds });

        delete currentRegistrations[user.id];

        return { verified: true };
    }, {
        body: t.Object({
            id: t.String(),
            rawId: t.String(),
            response: t.Object({
                clientDataJSON: t.String(),
                attestationObject: t.String(),
                authenticatorData: t.Optional(t.String()),
                transports: t.Optional(
                    t.Array(
                        t.Union([
                            t.Literal('ble'),
                            t.Literal('cable'),
                            t.Literal('hybrid'),
                            t.Literal('internal'),
                            t.Literal('nfc'),
                            t.Literal('smart-card'),
                            t.Literal('usb')
                        ])
                    )
                ),
                publicKeyAlgorithm: t.Optional(t.Number()),
                publicKey: t.Optional(t.String())
            }),
            authenticatorAttachment: t.Optional(t.String()),
            clientExtensionResults: t.Object({
                appid: t.Optional(t.Boolean()),
                hmacCreateSecret: t.Optional(t.Boolean()),
                credProps: t.Optional(t.Object({ rk: t.Optional(t.Boolean()) }))
            }),
            type: t.Literal('public-key')
        }),
        headers: t.Object({ origin: t.Optional(t.String()) }),
        cookie: t.Cookie({ session: t.String() })
    })

    .post('/api/auth/webauthn/login/options', async ({ cookie: { webauthn } }) => {
        if (!passkeysConfigured) return status(404);

        const options = await generateAuthenticationOptions({
            rpID: Bun.env.RP_ID!,
            userVerification: 'preferred'
        });

        webauthn.value = options.challenge;
        webauthn.httpOnly = true;
        webauthn.path = '/';
        webauthn.sameSite = 'strict';
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
        session.sameSite = 'strict';
        session.secure = true;

        webauthn.value = '';
        webauthn.httpOnly = true;
        webauthn.path = '/';
        webauthn.sameSite = 'strict';
        webauthn.maxAge = 0;
        webauthn.secure = true;

        return { user: { id: user.id, username: user.username, admin: user.admin } };
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

        userDB.add({
            id: configDB.db.nextUserId,
            username: body.username,
            password: Hasher.encode(crypto.randomUUID()),
            code: inviteCode,
            invitedBy: user.id,
            admin: 0,
            sites: [],
            sessions: [],
            passkeyIds: [],
            apiKeys: []
        });

        auditDB.log('createInvite', user.id, `created an invite for @${body.username}`);

        configDB.updateConfig({ nextUserId: configDB.db.nextUserId + 1 });

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