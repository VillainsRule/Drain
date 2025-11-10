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
            session.secure = true;

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
            session.secure = true;

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
        session.secure = true;

        return {};
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/auth/passkeys/index', async ({ cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const passkeys = userDB.getPubPasskeysFor(user.id);
        return { passkeys };
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/auth/passkeys/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        userDB.deletePasskey(user.id, body.name);

        return {};
    }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    const isWebAuthnConfigured: boolean = typeof Bun.env.RP_ID === 'string' && typeof Bun.env.RP_NAME === 'string';

    app.post('/$/auth/secure/webauthn/enabled', async () => {
        return { enabled: isWebAuthnConfigured };
    });

    if (isWebAuthnConfigured) {
        interface MiniChallenge {
            value: string;
            expiry: number;
        }

        const currentRegistrations: { [userId: number]: MiniChallenge } = {};

        app.post('/$/auth/secure/webauthn/register/options', async ({ body, cookie: { session } }) => {
            const user = userDB.whoIsSession(session.value);
            if (!user) return status(401, { error: 'not logged in' });

            if (currentRegistrations[user.id] && currentRegistrations[user.id].expiry > Date.now())
                return status(400, { error: 'you have an ongoing registration, please complete or wait for it to expire' });

            if (userDB.userHasPasskey(user.id, body.name))
                return status(400, { error: 'you already have a passkey with that name' });

            const userPasskeys = userDB.getPasskeyIDsForUser(user.id);
            if (userPasskeys.length >= 10)
                return status(400, { error: 'you have reached the maximum number of passkeys (10)' });

            const opts = await generateRegistrationOptions({
                rpName: Bun.env.RP_NAME!,
                rpID: Bun.env.RP_ID!,
                userName: user.username,
                userID: Buffer.from(user.id.toString()),
                attestationType: 'none',
                excludeCredentials: userPasskeys,
                authenticatorSelection: {
                    residentKey: 'preferred',
                    userVerification: 'preferred'
                }
            });

            currentRegistrations[user.id] = {
                value: opts.challenge,
                expiry: Date.now() + (2 * 60 * 1000)
            };

            return opts;
        }, { body: t.Object({ name: t.String() }), cookie: t.Cookie({ session: t.String() }) });

        app.post('/$/auth/secure/webauthn/register/verify', async ({ body, cookie: { session } }) => {
            const user = userDB.whoIsSession(session.value);
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
                    expectedOrigin: `https://${Bun.env.RP_ID!}`,
                    expectedRPID: Bun.env.RP_ID!
                });
            } catch (error) {
                console.error(error);
                return status(400, { error: (error as Error).message });
            }

            if (!verification.verified || !verification.registrationInfo) {
                return status(400, { error: 'could not verify registration' });
            }

            userDB.addPasskey({
                userId: user.id,
                webAuthnUserID: Buffer.from(user.id.toString()).toString('base64'),
                id: verification.registrationInfo.credential.id,
                publicKey: Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64'),
                counter: verification.registrationInfo.credential.counter,
                transports: verification.registrationInfo.credential.transports || [],
                deviceType: verification.registrationInfo.credentialDeviceType || 'unknown',
                backedUp: verification.registrationInfo.credentialBackedUp || false,
                lastUsed: 0,
                name: body.name
            });

            delete currentRegistrations[user.id];

            return { verified: true };
        }, {
            body: t.Object({
                name: t.String(),
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
            }), cookie: t.Cookie({ session: t.String() })
        });

        app.post('/$/auth/secure/webauthn/login/options', async ({ cookie: { webauthn } }) => {
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
        });

        app.post('/$/auth/secure/webauthn/login/verify', async ({ body, cookie: { webauthn, session } }) => {
            const passableBody = body as AuthenticationResponseJSON;

            const passkey = userDB.getPasskeyById(body.id);
            if (!passkey) return status(401, { error: 'could not find passkey' });

            const user = userDB.getUserFromPasskeyId(body.id);
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
                    expectedOrigin: `https://${Bun.env.RP_ID!}`,
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

            userDB.updatePasskeyDetails(verification.authenticationInfo.credentialID, verification.authenticationInfo.newCounter);

            const newSession = crypto.randomBytes(32).toString('hex');
            userDB.addSession(user.id, newSession);

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
            }), cookie: t.Cookie({ webauthn: t.String() })
        });
    }
}