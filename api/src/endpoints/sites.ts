import { Elysia, status, t } from 'elysia';

import apiKeyDB from '../db/impl/APIKeyDB';
import configDB from '../db/impl/ConfigDB';
import siteDB from '../db/impl/SiteDB';
import userDB from '../db/impl/UserDB';

import o1Optimizer from '../util/O1Optimizer';

import getBalancer from '../balancer';

const usersRunningBalancer: number[] = [];

const sites = new Elysia({ name: 'sites' })
    .guard({
        headers: t.Object({
            authorization: t.Optional(t.String({ description: 'this is an API key you can pick up from <a href="/user/apiKeys" target="_blank">here</a>' })),
        })
    })

    .resolve(({ headers, cookie }) => {
        if (headers['authorization']) {
            if (!configDB.db.allowAPIKeys) return status(403, { error: 'API keys are disabled globally on the instance' });

            const inputKey = headers.authorization;
            if (!inputKey) return status(401, { error: 'API key is required' });

            const apiKey = apiKeyDB.getLink('key', inputKey);
            if (!apiKey) return status(401, { error: 'invalid API key' });

            const apiUser = userDB.get(apiKey.userId);
            if (!apiUser) return status(401, { error: 'invalid API key' });

            apiKeyDB.update(apiKey.id, { lastUsed: Date.now() });

            return { apiKey: inputKey, user: apiUser };
        } else if (cookie.session && typeof cookie.session.value === 'string') {
            const user = userDB.getLink('sessions', cookie.session.value);
            if (user) return { user };
        }

        return status(401, { error: 'not logged in' });
    })

    .get('/api/v1/sites/list', async ({ user }) => ({ sites: user.sites }), { detail: { description: 'returns a list of site domains the user has access to', tags: ['Sites'] } })

    .post('/api/v1/sites/info', async ({ body, user }) => {
        const site = siteDB.get(body.domain);
        if (site && (site.users.includes(user.id) || user.admin)) return {
            id: site.id,
            keys: site.keys,
            users: user.admin ? site.users : [user.id],
            supportsBalancer: !!getBalancer(site.id),
            totalBalance: o1Optimizer.getBalance(site.id),
            description: site.description,
            public: site.public,
            useProxy: site.useProxy
        }
        else return status(401, { error: 'no permission' });
    }, { body: t.Object({ domain: t.String() }), detail: { description: 'returns detailed information about a site, including its keys and (if admin) allowed users', tags: ['Sites'] } })

    .post('/api/v1/sites/create', async ({ body, user }) => {
        if (!user.admin) return status(401, { error: 'unauthorized' });

        if (body.url.length > 36) return status(413, { error: 'URL too long' });
        if (siteDB.has(body.url)) return status(403, { error: 'site already exists' });

        siteDB.add({
            id: body.url,
            description: '',
            public: false,
            users: [user.id],
            keys: {},
            useProxy: false
        });

        user.sites.push(body.url);
        userDB.update(user.id, { sites: user.sites });

        return {};
    }, { body: t.Object({ url: t.String() }), detail: { description: 'creates a new site with the given URL. requires: admin', tags: ['Sites'] } })

    .post('/api/v1/sites/keys/create', async ({ body, user }) => {
        if (body.key.length > 256) return status(413, { error: 'key too long' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!site.users.includes(user.id) && !user.admin) return status(401, { error: 'no permission' });

        if (site.keys[body.key]) return status(403, { error: 'key already exists' });

        const balancer = getBalancer(body.domain);
        if (balancer) {
            if (usersRunningBalancer.includes(user.id) && !user.admin) return status(429, { error: 'you are already running a balancer request. please wait.' });
            usersRunningBalancer.push(user.id);

            const balance = await balancer(body.key, site.useProxy);

            usersRunningBalancer.splice(usersRunningBalancer.indexOf(user.id), 1);

            if (balance === 'invalid_key') return status(424, { error: 'balancer has determined this key is invalid.' });
            if (balance === 'leaked_key') return status(424, { error: 'balancer has determined this key was flagged.' });

            site.keys[body.key] = isNaN(Number(balance)) ? balance : `$${balance}`;
            o1Optimizer.addToBalance(body.domain, isNaN(Number(balance)) ? 0 : Number(balance));
        } else site.keys[body.key] = null;

        siteDB.update(body.domain, { keys: site.keys });
        o1Optimizer.incrementKeys(body.domain);

        return {};
    }, { body: t.Object({ domain: t.String(), key: t.String() }), detail: { description: 'adds a key to a site. if the site supports balancer, the key will be checked and its balance will be stored', tags: ['Site Keys'] } })

    .post('/api/v1/sites/keys/recheck', async ({ body, user }) => {
        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!site.users.includes(user.id) && !user.admin) return status(401, { error: 'no permission' });
        if (!site.keys[body.key]) return status(401, { error: 'no permission' });

        const balancer = getBalancer(body.domain);
        if (!balancer) return status(401, { error: 'no permission' });

        if (usersRunningBalancer.includes(user.id)) return status(429, { error: 'you are already running a balancer request. please wait.' });
        usersRunningBalancer.push(user.id);

        const balance = await balancer(body.key, site.useProxy);

        usersRunningBalancer.splice(usersRunningBalancer.indexOf(user.id), 1);

        if (balance === 'invalid_key') return status(400, { error: 'balancer has determined the key is invalid' });
        if (balance === 'leaked_key') return status(400, { error: 'balancer has determined the key was flagged' });

        const oldBalance = site.keys[body.key];
        if (oldBalance && oldBalance.startsWith('$')) o1Optimizer.subtractFromBalance(body.domain, Number(oldBalance.slice(1)));
        if (!isNaN(Number(balance))) o1Optimizer.addToBalance(body.domain, Number(balance));

        site.keys[body.key] = isNaN(Number(balance)) ? balance : `$${balance}`;
        siteDB.update(body.domain, { keys: site.keys });

        return {};
    }, { body: t.Object({ domain: t.String(), key: t.String() }), detail: { description: 'checks a key with the balancer and updates its stored balance', tags: ['Site Keys'] } })

    .post('/api/v1/sites/keys/delete', async ({ body, user }) => {
        if (!user.admin) return status(401, { error: 'unauthorized' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!site.keys[body.key]) return status(401, { error: 'no permission' });

        delete site.keys[body.key];
        siteDB.update(body.domain, { keys: site.keys });
        o1Optimizer.decrementKeys(body.domain);

        return {};
    }, { body: t.Object({ domain: t.String(), key: t.String() }), detail: { description: 'removes a key from a site. requires: admin', tags: ['Site Keys'] } })

    .post('/api/v1/sites/keys/sort', async ({ body, user }) => {
        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!site.users.includes(user.id) && !user.admin) return status(401, { error: 'no permission' });

        const dedupedEntries = Array.from(new Map(Object.entries(site.keys)).entries());
        if (dedupedEntries.length === 0) return status(404, { error: 'no keys with balance to sort' });

        const score = (balance: string): number => {
            if (balance.startsWith('$')) {
                const num = parseFloat(balance.slice(1));
                return isNaN(num) ? 0 : 10_000 + num;
            }

            const tierMatch = balance.match(/Tier\s*(\d+)/i);
            if (tierMatch) return 1_000 + parseInt(tierMatch[1], 10);

            if (/paid|premium|prod/i.test(balance)) return 500;
            if (/has credits/i.test(balance)) return 200;
            if (/trial|free|valid/i.test(balance)) return 100;
            if (/empty/i.test(balance)) return 0;
            if (/unknown|\?/i.test(balance)) return -1;

            return 0;
        };

        let hasSignificant = false;

        const sorted = dedupedEntries.sort((a, b) => {
            const sa = score(a[1] || '?');
            const sb = score(b[1] || '?');
            if (sa !== 0 || sb !== 0) hasSignificant = true;
            return sb - sa;
        });

        if (!hasSignificant) return status(404, { error: 'no keys with balance to sort' });

        site.keys = Object.fromEntries(sorted);
        siteDB.update(body.domain, { keys: site.keys });

        return {};
    }, { body: t.Object({ domain: t.String() }), detail: { description: 'sorts the keys of a site by their balance', tags: ['Site Keys'] } })

    .post('/api/v1/sites/access/add', async ({ body, user }) => {
        const targetUser = userDB.get(body.userId);
        if (!targetUser) return status(401, { error: 'no permission' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!user.admin && !site.users.includes(user.id)) return status(401, { error: 'no permission' });
        if (site.users.includes(body.userId)) return status(403, { error: 'user already has access to this site' });

        site.users.push(body.userId);
        siteDB.update(body.domain, { users: site.users });

        targetUser.sites.push(body.domain);
        userDB.update(targetUser.id, { sites: targetUser.sites });

        return {};
    }, { body: t.Object({ domain: t.String(), userId: t.Number() }), detail: { description: 'grants a user access to a site', tags: ['Site Access'] } })

    .post('/api/v1/sites/access/remove', async ({ body, user }) => {
        const targetUser = userDB.get(body.userId);
        if (!targetUser) return status(401, { error: 'no permission' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });
        if (!user.admin) return status(401, { error: 'no permission' });

        siteDB.update(body.domain, { users: site.users.filter(u => u !== body.userId) });

        targetUser.sites = targetUser.sites.filter(s => s !== body.domain);
        userDB.update(targetUser.id, { sites: targetUser.sites });

        return {};
    }, { body: t.Object({ domain: t.String(), userId: t.Number() }), detail: { description: 'revokes a user\'s access to a site', tags: ['Site Access'] } })

    .post('/api/v1/sites/delete', async ({ body, user }) => {
        if (!user.admin) return status(401, { error: 'unauthorized' });

        const site = siteDB.get(body.domain);
        if (!site) return status(401, { error: 'no permission' });

        site.users.forEach((userId) => {
            const u = userDB.get(userId);
            if (u) {
                u.sites = u.sites.filter(s => s !== body.domain);
                userDB.update(u.id, { sites: u.sites });
            }
        });

        siteDB.remove(body.domain);

        return {};
    }, { body: t.Object({ domain: t.String() }), detail: { description: 'deletes a site and removes it from all users. requires admin', tags: ['Sites'] } })

    .post('/api/v1/sites/settings/public', async ({ body, user }) => {
        const site = siteDB.get(body.domain);
        if (!site || !user.admin) return status(401, { error: 'no permission' });

        siteDB.update(body.domain, { public: body.public });

        return {};
    }, { body: t.Object({ domain: t.String(), public: t.Boolean() }), detail: { description: 'sets whether a site is public or not. public sites are visible to everyone in the discovery endpoint', tags: ['Site Settings'] } })

    .post('/api/v1/sites/settings/description', async ({ body, user }) => {
        const site = siteDB.get(body.domain);
        if (!site || !user.admin) return status(401, { error: 'no permission' });

        siteDB.update(body.domain, { description: body.description });

        return {};
    }, { body: t.Object({ domain: t.String(), description: t.String() }), detail: { description: 'sets a site\'s description. requires admin or site access', tags: ['Site Settings'] } })

    .post('/api/v1/sites/settings/useProxy', async ({ body, user }) => {
        const site = siteDB.get(body.domain);
        if (!site || !user.admin) return status(401, { error: 'no permission' });

        siteDB.update(body.domain, { useProxy: body.useProxy });

        return {};
    }, { body: t.Object({ domain: t.String(), useProxy: t.Boolean() }), detail: { description: 'sets whether a site should be accessed through the proxy. requires admin or site access', tags: ['Site Settings'] } });

export default sites;
