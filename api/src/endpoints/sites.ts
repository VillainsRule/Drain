import { Elysia, status, t } from 'elysia';

import siteDB from '../db/SiteDB';
import userDB from '../db/UserDB';

import getBalancer from '../balancer';

export default (app: Elysia) => {
    app.post('/$/sites/get', async ({ cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        const rawSites = siteDB.getUserSites(user.id);
        const sites = rawSites.map((site) => ({
            ...site,
            readers: site.readers.map((userId) => userDB.getPublicUser(userId)!),
            editors: site.editors.map((userId) => userDB.getPublicUser(userId)!)
        }));

        sites.forEach((site) => (site.supportsBalancer = !!getBalancer(site.domain)));

        return { sites };
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/create', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        if (siteDB.siteExists(body.url)) return status(403, { error: 'site already exists' });

        siteDB.addSite(body.url);

        return {};
    }, { body: t.Object({ url: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/addKey', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user) return status(401, { error: 'not logged in' });

        if (!siteDB.siteExists(body.domain)) return status(401, { error: 'no permission' });
        if (siteDB.userAccessLevel(body.domain, user.id) === 'none' && !user.admin) return status(401, { error: 'no permission' });

        if (siteDB.keyExistsOn(body.domain, body.key)) return status(403, { error: 'key already exists' });

        return await siteDB.addKeyToSite(body.domain, body.key);
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/balancerCheck', async ({ body, cookie: { session } }) => {
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

        const balance = await balancer(body.key);
        if (balance === 'invalid_key') return status(400, { error: 'balancer has determined the key is invalid' });

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
        if (!domainInfo.editors.includes(user.id) && !user.admin) return status(401, { error: 'no permission' });

        const result = siteDB.sortKeys(body.domain);
        return result;
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/access/addUser', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return status(404, { error: 'site does not exist' });

        const targetUser = userDB.getUserByUsername(body.username);
        if (!targetUser) return status(404, { error: 'user not found' });

        if (domainInfo.readers.includes(targetUser.id)) return status(403, { error: 'user already has access to site' });

        domainInfo.readers.push(targetUser.id);
        siteDB.updateDB();

        return {};
    }, { body: t.Object({ domain: t.String(), username: t.String(), role: t.Union([t.Literal('reader'), t.Literal('editor')]) }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/access/changeUserRole', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return status(404, { error: 'site does not exist' });

        const targetUser = userDB.getUserByUsername(body.username);
        if (!targetUser) return status(404, { error: 'user not found' });

        if (body.role === 'reader') {
            if (!domainInfo.readers.includes(targetUser.id)) domainInfo.readers.push(targetUser.id);
            domainInfo.editors = domainInfo.editors.filter(id => id !== targetUser.id);
        } else {
            if (!domainInfo.editors.includes(targetUser.id)) domainInfo.editors.push(targetUser.id);
            domainInfo.readers = domainInfo.readers.filter(id => id !== targetUser.id);
        }

        siteDB.updateDB();

        return {};
    }, { body: t.Object({ domain: t.String(), username: t.String(), role: t.Union([t.Literal('reader'), t.Literal('editor')]) }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/access/removeUser', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return status(404, { error: 'site does not exist' });

        const targetUser = userDB.getUserByUsername(body.username);
        if (!targetUser) return status(404, { error: 'user not found' });

        domainInfo.readers = domainInfo.readers.filter(id => id !== targetUser.id);
        domainInfo.editors = domainInfo.editors.filter(id => id !== targetUser.id);

        siteDB.updateDB();

        return {};
    }, { body: t.Object({ domain: t.String(), username: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/deleteSite', async ({ body, cookie: { session } }) => {
        const user = userDB.whoIsSession(session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (!siteDB.siteExists(body.domain)) return status(404, { error: 'site does not exist' });

        siteDB.deleteSite(body.domain);

        return {};
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) });
}