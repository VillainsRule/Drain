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

import apiKeyDB from '../db/impl/APIKeyDB';
import configDB from '../db/impl/ConfigDB';
import passkeyDB from '../db/impl/PasskeyDB';
import userDB from '../db/impl/UserDB';

import Hasher from '../util/hasher';

import { DBAPIKey, DBPasskey } from '../../../types';

const currentRegistrations: Record<number, { name: string, value: string, expiry: number }> = {};

const isDev = Bun.env.DD === '1';
const isWebAuthnConfigured = typeof Bun.env.RP_ID === 'string';

const auth = new Elysia({ name: 'auth' })
    .get('/auth/account', async ({ cookie: { session } }) => {
        if (typeof session.value !== 'string') return { isWebAuthnConfigured, isDev: false };

        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        return { user: { id: user.id, username: user.username, admin: user.admin }, isWebAuthnConfigured, isDev };
    })

    .post('/auth/account', async ({ body, cookie: { session } }) => {
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

            return { user: { id: user.id, username: user.username, admin: user.admin } };
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ username: t.String(), password: t.String() }) })

    .post('/auth/invites/attempt', async ({ body }) => {
        try {
            const user = userDB.getLink('code', body.code);
            if (!user) return status(401, { error: 'that invite code does not exist or has been claimed' });

            return status(200, { username: user.username });
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ code: t.String() }) })

    .post('/auth/invites/claim', async ({ body, cookie: { session } }) => {
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

            return { user: { id: user.id, username: user.username, admin: user.admin } };
        } catch (error) {
            console.error(error);
            return status(502, {});
        }
    }, { body: t.Object({ code: t.String(), password: t.String() }) })

    .post('/auth/logout', async ({ cookie: { session } }) => {
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

    .get('/auth/passkeys', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const passkeys = user.passkeyIds.map(e => passkeyDB.get(e)).filter((e): e is DBPasskey => e !== undefined).map((pk) => {
            return {
                id: pk.id,
                name: pk.name,
                transports: pk.transports,
                lastUsed: pk.lastUsed
            }
        });

        return { passkeys };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/auth/passkeys/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        passkeyDB.remove(body.id);
        userDB.update(user.id, { passkeyIds: user.passkeyIds.filter(i => i !== body.id) });

        return {};
    }, { body: t.Object({ id: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/auth/webauthn/register/options', async ({ body, cookie: { session } }) => {
        if (!isWebAuthnConfigured) return status(404);

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

    .post('/auth/webauthn/register/verify', async ({ body, headers: { origin }, cookie: { session } }) => {
        if (!isWebAuthnConfigured) return status(404);
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

    .post('/auth/webauthn/login/options', async ({ cookie: { webauthn } }) => {
        if (!isWebAuthnConfigured) return status(404);

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

    .post('/auth/webauthn/login/verify', async ({ body, headers: { origin }, cookie: { webauthn, session } }) => {
        if (!isWebAuthnConfigured) return status(404);
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

    .get('/auth/api/keys', async ({ cookie: { session } }) => {
        if (!isWebAuthnConfigured) return status(404);

        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const apiKeys = user.apiKeys.map(e => apiKeyDB.get(e)).filter((e): e is DBAPIKey => e !== null).map((e) => ({
            name: e.name,
            createdAt: e.createdAt,
            lastUsed: e.lastUsed,
            lastUserAgent: e.lastUserAgent
        }))

        return { apiKeys, enabled: configDB.db.allowAPIKeys };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/auth/api/keys/create', async ({ body, cookie: { session } }) => {
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
            lastUsed: 0,
            lastUserAgent: ''
        });

        user.apiKeys.push(identifier);
        userDB.update(user.id, { apiKeys: user.apiKeys });

        return { key };
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/auth/api/keys/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const identifier = `${user.id} ${body.name}`;
        if (!apiKeyDB.has(identifier)) return status(400, { error: 'you do not have an API key with that name' });

        apiKeyDB.remove(identifier);

        user.apiKeys = user.apiKeys.filter(i => i !== identifier);
        userDB.update(user.id, { apiKeys: user.apiKeys });

        return {};
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/auth/api/keys/regen', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const identifier = `${user.id} ${body.name}`;
        if (!apiKeyDB.has(identifier)) return status(400, { error: 'you do not have an API key with that name' });

        const newKey = crypto.randomBytes(24).toString('hex');
        apiKeyDB.update(identifier, { key: newKey });

        return { key: newKey };
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) });

export default auth;