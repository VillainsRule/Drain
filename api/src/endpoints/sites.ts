import { Elysia, status, t } from 'elysia';

import siteDB from '../db/impl/SiteDB';
import userDB from '../db/impl/UserDB';

import getBalancer from '../balancer';

const usersRunningBalancer: number[] = [];

const sites = new Elysia({ name: 'sites' })
    .post('/api/sites/list', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        return { sites: user.admin ? siteDB.getIDs() : user.sites };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/info', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });

        const supportsBalancer = !!getBalancer(site.id);

        if (site.readers.includes(user.id)) return { site: { id: site.id, keys: site.keys, supportsBalancer } };
        else if (site.editors.includes(user.id) || user.admin) {
            return {
                site: {
                    id: site.id,
                    keys: site.keys,
                    readers: site.readers,
                    editors: site.editors,
                    resolvedReaders: Object.fromEntries(
                        site.readers.map((id: number) => {
                            const user = userDB.get(id);
                            return user ? [id, user.username] : null;
                        }).filter((entry): entry is [number, string] => entry !== null)
                    )
                }
            }
        } else return status(401, { error: 'no permission' });
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/create', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (body.url.length > 36) return status(413, { error: 'URL too long' });
        if (siteDB.has(body.url)) return status(403, { error: 'site already exists' });

        siteDB.add({
            id: body.url,
            readers: [],
            editors: [user.id],
            keys: {}
        });

        user.sites.push(body.url);
        userDB.update(user.id, { sites: user.sites });

        return {};
    }, { body: t.Object({ url: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/addKey', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        if (body.key.length > 256) return status(413, { error: 'key too long' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!user.admin && !site.editors.includes(user.id) && !site.readers.includes(user.id)) return status(401, { error: 'no permission' });

        if (site.keys[body.key]) return status(403, { error: 'key already exists' });

        const balancer = getBalancer(body.domain);
        if (balancer) {
            if (usersRunningBalancer.includes(user.id)) return status(429, { error: 'you are already running a balancer request. please wait.' });
            usersRunningBalancer.push(user.id);

            const balance = await balancer(body.key);

            usersRunningBalancer.splice(usersRunningBalancer.indexOf(user.id), 1);

            if (balance === 'invalid_key') return status(424, { error: 'balancer has determined this key is invalid.' });
            if (balance === 'leaked_key') return status(424, { error: 'balancer has determined this key was flagged.' });

            site.keys[body.key] = isNaN(Number(balance)) ? balance : `$${balance}`;
        } else site.keys[body.key] = null;

        siteDB.update(body.domain, { keys: site.keys });

        return {};
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/balancer', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!site.editors.includes(user.id) && !user.admin) return status(401, { error: 'no permission' });
        if (!site.keys[body.key]) return status(401, { error: 'no permission' });

        const balancer = getBalancer(body.domain);
        if (!balancer) return status(401, { error: 'no permission' });

        if (usersRunningBalancer.includes(user.id)) return status(429, { error: 'you are already running a balancer request. please wait.' });
        usersRunningBalancer.push(user.id);

        const balance = await balancer(body.key);

        usersRunningBalancer.splice(usersRunningBalancer.indexOf(user.id), 1);

        if (balance === 'invalid_key') return status(400, { error: 'balancer has determined the key is invalid' });
        if (balance === 'leaked_key') return status(400, { error: 'balancer has determined the key was flagged' });

        site.keys[body.key] = isNaN(Number(balance)) ? balance : `$${balance}`
        siteDB.update(body.domain, { keys: site.keys });

        return {};
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/removeKey', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!site.keys[body.key]) return status(401, { error: 'no permission' });

        delete site.keys[body.key];
        siteDB.update(body.domain, { keys: site.keys });

        return {};
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/sortKeys', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });

        const entries = Object.entries(site.keys);

        const dedupedEntries = Array.from(
            entries.reduce((map, [token, balance]) => map.set(token, balance), new Map()).entries()
        );

        if (entries.length === dedupedEntries.length && dedupedEntries.length === 0)
            return status(404, { error: 'no keys with balance to sort' });

        const firstBalance = dedupedEntries[0]?.[1];
        if (!firstBalance) return status(404, { error: 'no keys with balance to sort' });

        let sortedEntries: [string, string][];

        if (firstBalance.startsWith('$')) {
            const parseBalance = (balance: string) => {
                const num = parseFloat(balance.replace(/^\$/, ''));
                return isNaN(num) ? 0 : num;
            };

            sortedEntries = dedupedEntries.sort((a, b) => parseBalance(b[1]) - parseBalance(a[1]));
        } else if (firstBalance.startsWith('Paid ')) {
            sortedEntries = dedupedEntries.sort((a, b) => {
                const aPaid = a[1].startsWith('Paid ');
                const bPaid = b[1].startsWith('Paid ');
                return bPaid ? 1 : aPaid ? -1 : 0;
            });
        } else if (firstBalance.includes('Tier')) {
            const tierOrder = (balance: string) => {
                if (balance === 'Free Tier' || balance === 'Free Key') return 0;
                const match = balance.match(/^T(\d+)/) || balance.match(/^Tier (\d+)/);
                return match ? parseInt(match[1], 10) : -1;
            };

            sortedEntries = dedupedEntries.sort((a, b) => tierOrder(b[1]) - tierOrder(a[1]));
        } else return status(404, { error: 'no keys with balance to sort' });

        site.keys = Object.fromEntries(sortedEntries);
        siteDB.update(body.domain, { keys: site.keys });

        return {};
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/access/addUser', async ({ body, cookie: { session } }) => {
        const reqUser = userDB.getLink('sessions', session.value);
        if (!reqUser) return status(401, { error: 'not logged in' });

        const targetUser = userDB.get(body.userId);
        if (!targetUser) return status(401, { error: 'no permission' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!reqUser.admin && !site.editors.includes(reqUser.id)) return status(401, { error: 'no permission' });

        if (
            site.readers.includes(body.userId) ||
            site.editors.includes(body.userId)
        ) return {};

        site.readers.push(body.userId);
        siteDB.update(body.domain, { readers: site.readers });

        targetUser.sites.push(body.domain);
        userDB.update(targetUser.id, { sites: targetUser.sites });

        return {};
    }, { body: t.Object({ domain: t.String(), userId: t.Number() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/access/setRole', async ({ body, cookie: { session } }) => {
        const reqUser = userDB.getLink('sessions', session.value);
        if (!reqUser) return status(401, { error: 'not logged in' });

        const targetUser = userDB.get(body.userId);
        if (!targetUser) return status(401, { error: 'no permission' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!reqUser.admin && !site.editors.includes(reqUser.id)) return status(401, { error: 'no permission' });

        if (body.role === 'reader') {
            if (!site.readers.includes(body.userId)) site.readers.push(body.userId);
            if (site.editors.includes(body.userId)) site.editors = site.editors.filter(u => u !== body.userId);
        } else {
            if (!site.editors.includes(body.userId)) site.editors.push(body.userId);
            if (site.readers.includes(body.userId)) site.readers = site.readers.filter(u => u !== body.userId);
        }

        siteDB.update(body.domain, { readers: site.readers, editors: site.editors });

        return {};
    }, { body: t.Object({ domain: t.String(), userId: t.Number(), role: t.Union([t.Literal('reader'), t.Literal('editor')]) }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/access/removeUser', async ({ body, cookie: { session } }) => {
        const reqUser = userDB.getLink('sessions', session.value);
        if (!reqUser) return status(401, { error: 'not logged in' });

        const targetUser = userDB.get(body.userId);
        if (!targetUser) return status(401, { error: 'no permission' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!reqUser.admin && !site.editors.includes(reqUser.id)) return status(401, { error: 'no permission' });
        if (!reqUser.admin && !site.editors.includes(targetUser.id)) return status(401, { error: 'no permission' });

        if (site.readers.includes(body.userId)) site.readers = site.readers.filter(u => u !== body.userId);
        if (site.editors.includes(body.userId)) site.editors = site.editors.filter(u => u !== body.userId);

        siteDB.update(body.domain, { readers: site.readers, editors: site.editors });

        return {};
    }, { body: t.Object({ domain: t.String(), userId: t.Number() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/sites/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });

        site.readers.forEach((r) => {
            const u = userDB.get(r);
            if (u) {
                u.sites = u.sites.filter(s => s !== body.domain);
                userDB.update(u.id, { sites: u.sites });
            }
        });

        site.editors.forEach((r) => {
            const u = userDB.get(r);
            if (u) {
                u.sites = u.sites.filter(s => s !== body.domain);
                userDB.update(u.id, { sites: u.sites });
            }
        });

        siteDB.remove(body.domain);

        return {};
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) });

export default sites;