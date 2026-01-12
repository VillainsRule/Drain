import { Elysia, status, t } from 'elysia';

import siteDB from '../db/SiteDB';
import userDB from '../db/UserDB';

import getBalancer from '../balancer';

export default (app: Elysia) => {
    app.post('/$/sites/dump', async ({ cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const sites = siteDB.getUserSites(user.id);
        const publicSites = sites.map((site: any) => {
            site.supportsBalancer = !!getBalancer(site.domain);

            if (site.editors.includes(user.id))
                site.resolvedReaders = Object.fromEntries(site.readers.map((id: number) => [id, userDB.getPublicUser(id)?.username]));

            return site;
        });

        return { sites: publicSites };
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/create', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (siteDB.siteExists(body.url)) return status(403, { error: 'site already exists' });

        siteDB.addSite(body.url/*, user.id */);

        return {};
    }, { body: t.Object({ url: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    const usersRunningBalancer: number[] = [];

    app.post('/$/sites/addKey', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        if (!siteDB.siteExists(body.domain)) return status(401, { error: 'no permission' });
        if (siteDB.userAccessLevel(body.domain, user.id) === 'none' && !user.admin) return status(401, { error: 'no permission' });

        if (siteDB.keyExistsOn(body.domain, body.key)) return status(403, { error: 'key already exists' });

        const balancer = getBalancer(body.domain);
        if (balancer) {
            if (usersRunningBalancer.includes(user.id)) return status(429, { error: 'you are already running a balancer request. please wait.' });
            usersRunningBalancer.push(user.id);

            const balance = await balancer(body.key);

            usersRunningBalancer.splice(usersRunningBalancer.indexOf(user.id), 1);

            if (balance === 'invalid_key') return { error: 'balancer has determined this key is invalid.' };
            if (balance === 'leaked_key') return { error: 'balancer has determined this key was flagged.' };
            siteDB.setKeyBalance(body.domain, body.key, isNaN(Number(balance)) ? balance : `$${balance}`);
        } else siteDB.addKeyToSite(body.domain, body.key);

        return await siteDB.addKeyToSite(body.domain, body.key);
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/balancer', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const domainExists = siteDB.siteExists(body.domain);
        if (!domainExists) return status(401, { error: 'no permission' });

        const balancer = getBalancer(body.domain);
        if (!balancer) return status(401, { error: 'no permission' });

        const accessLevel = siteDB.userAccessLevel(body.domain, user.id);
        if (accessLevel !== 'editor' && !user.admin) return status(401, { error: 'no permission' });

        const keyExists = siteDB.keyExistsOn(body.domain, body.key);
        if (!keyExists) return status(404, { error: 'key not found' });

        if (usersRunningBalancer.includes(user.id)) return status(429, { error: 'you are already running a balancer request. please wait.' });
        usersRunningBalancer.push(user.id);

        const balance = await balancer(body.key);

        usersRunningBalancer.splice(usersRunningBalancer.indexOf(user.id), 1);

        if (balance === 'invalid_key') return status(400, { error: 'balancer has determined the key is invalid' });
        if (balance === 'leaked_key') return status(400, { error: 'balancer has determined the key was flagged' });

        siteDB.setKeyBalance(body.domain, body.key, isNaN(Number(balance)) ? balance : `$${balance}`);

        return {};
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/removeKey', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo.keys.some(key => key.token === body.key)) return status(404, { error: 'key not found' });

        const keyExists = siteDB.keyExistsOn(body.domain, body.key);
        if (!keyExists) return status(404, { error: 'key not found' });

        siteDB.removeKeyFromSite(body.domain, body.key);

        return {};
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/sortKeys', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return status(401, { error: 'no permission' });

        const result = siteDB.sortKeys(body.domain);
        return result;
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/access/addUser', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return status(404, { error: 'site does not exist' });
        if (siteDB.userAccessLevel(body.domain, user.id) !== 'editor' && !user.admin) return status(401, { error: 'no permission' });

        const targetUser = userDB.getUserByUsername(body.username);
        if (!targetUser) return status(404, { error: 'user not found' });

        if (domainInfo.readers.includes(targetUser.id)) return status(403, { error: 'user already has access to site' });

        domainInfo.readers.push(targetUser.id);
        siteDB.updateDB();

        return {};
    }, { body: t.Object({ domain: t.String(), username: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/access/setRole', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return status(404, { error: 'site does not exist' });
        if (siteDB.userAccessLevel(body.domain, user.id) !== 'editor' && !user.admin) return status(401, { error: 'no permission' });

        const userExists = userDB.userExists(body.userId);
        if (!userExists) return status(404, { error: 'user not found' });

        if (body.role === 'reader') {
            if (!domainInfo.readers.includes(body.userId)) domainInfo.readers.push(body.userId);
            domainInfo.editors = domainInfo.editors.filter(id => id !== body.userId);
        } else {
            if (!domainInfo.editors.includes(body.userId)) domainInfo.editors.push(body.userId);
            domainInfo.readers = domainInfo.readers.filter(id => id !== body.userId);
        }

        siteDB.updateDB();

        return {};
    }, { body: t.Object({ domain: t.String(), userId: t.Number(), role: t.Union([t.Literal('reader'), t.Literal('editor')]) }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/access/removeUser', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return status(404, { error: 'site does not exist' });
        if (siteDB.userAccessLevel(body.domain, user.id) !== 'editor' && !user.admin) return status(401, { error: 'no permission' });

        const userExists = userDB.userExists(body.userId);
        if (!userExists) return status(404, { error: 'user not found' });

        domainInfo.readers = domainInfo.readers.filter(id => id !== body.userId);
        domainInfo.editors = domainInfo.editors.filter(id => id !== body.userId);

        siteDB.updateDB();

        return {};
    }, { body: t.Object({ domain: t.String(), userId: t.Number() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (!siteDB.siteExists(body.domain)) return status(404, { error: 'site does not exist' });

        siteDB.deleteSite(body.domain);

        return {};
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/order', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        user.order = body.order;
        userDB.updateDB();

        return {};
    }, { body: t.Object({ order: t.Array(t.String()) }), cookie: t.Cookie({ session: t.String() }) });
}
