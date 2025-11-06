import { Elysia, t } from 'elysia';

import siteDB from '../db/SiteDB';
import userDB from '../db/UserDB';

import getBalancer from '../balancer';

import { JSONResponse } from '../util';

export default (app: Elysia) => {
    app.post('/$/sites/index', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });

        const sites = siteDB.getUserSites(user.id);
        const reconstructedSites = sites.map((site) => ({
            ...site,
            readers: site.readers.map((userId) => userDB.getPublicUser(userId)!),
            editors: site.editors.map((userId) => userDB.getPublicUser(userId)!)
        }));

        reconstructedSites.forEach((site) => (site.supportsBalancer = !!getBalancer(site.domain)));

        return new JSONResponse({ sites: reconstructedSites });
    }, { cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/add', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false }, { status: 401 });

        const result = siteDB.addSite(req.body.url);
        return new JSONResponse(result);
    }, { body: t.Object({ url: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/addKey', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false }, { status: 401 });

        if (!siteDB.db.sites[req.body.domain]) return new JSONResponse({ error: 'No permission' }, { status: 403 });
        if (!siteDB.db.sites[req.body.domain].readers.includes(user.id) && !siteDB.db.sites[req.body.domain].editors.includes(user.id) && !user.admin) return new JSONResponse({ error: 'No permission' }, { status: 403 });

        const result = await siteDB.addKeyToSite(req.body.domain, req.body.key);
        return new JSONResponse(result);
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/balancerCheck', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false }, { status: 401 });

        const balancer = getBalancer(req.body.domain);
        if (!balancer) return new JSONResponse({ error: 'No permission' }, { status: 403 });

        const domainInfo = siteDB.db.sites[req.body.domain];
        if (!domainInfo.editors.includes(user.id) && !user.admin) return new JSONResponse({ error: 'No permission' }, { status: 403 });
        if (!domainInfo.keys.some(key => key.token === req.body.key)) return new JSONResponse({ error: 'Key not found' }, { status: 404 });

        const balance = await balancer(req.body.key);
        if (balance === 'invalid_key') return new JSONResponse({ error: 'Balancer has determined the key is invalid.' }, { status: 400 });

        siteDB.setKeyBalance(req.body.domain, req.body.key, isNaN(Number(balance)) ? balance : `$${balance}`);

        return new JSONResponse({});
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/removeKey', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ loggedIn: false }, { status: 401 });

        const domainInfo = siteDB.db.sites[req.body.domain];
        if (!domainInfo.keys.some(key => key.token === req.body.key)) return new JSONResponse({ error: 'Key not found' }, { status: 404 });

        siteDB.removeKeyFromSite(req.body.domain, req.body.key);

        return new JSONResponse({});
    }, { body: t.Object({ domain: t.String(), key: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/sortKeys', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false }, { status: 401 });

        const domainInfo = siteDB.db.sites[req.body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'No permission' }, { status: 403 });
        if (!domainInfo.editors.includes(user.id) && !user.admin) return new JSONResponse({ error: 'No permission' }, { status: 403 });

        siteDB.sortKeys(req.body.domain);

        return new JSONResponse({});
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/addUserToSite', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ error: 'Unauthorized' }, { status: 401 });

        const domainInfo = siteDB.db.sites[req.body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'Site not found' }, { status: 404 });

        const targetUser = userDB.getUserByUsername(req.body.username);
        if (!targetUser) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (domainInfo.readers.includes(targetUser.id)) return new JSONResponse({ error: 'User already a reader' }, { status: 400 });
        domainInfo.readers.push(targetUser.id);

        siteDB.updateDB();

        return new JSONResponse({});
    }, { body: t.Object({ domain: t.String(), username: t.String(), role: t.Union([t.Literal('reader'), t.Literal('editor')]) }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/changeUserRole', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ error: 'Unauthorized' }, { status: 401 });

        const domainInfo = siteDB.db.sites[req.body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'Site does not exist' }, { status: 404 });

        const targetUser = userDB.getUserByUsername(req.body.username);
        if (!targetUser) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (req.body.role === 'reader') {
            if (!domainInfo.readers.includes(targetUser.id)) domainInfo.readers.push(targetUser.id);
            domainInfo.editors = domainInfo.editors.filter(id => id !== targetUser.id);
        } else {
            if (!domainInfo.editors.includes(targetUser.id)) domainInfo.editors.push(targetUser.id);
            domainInfo.readers = domainInfo.readers.filter(id => id !== targetUser.id);
        }

        siteDB.updateDB();

        return new JSONResponse({});
    }, { body: t.Object({ domain: t.String(), username: t.String(), role: t.Union([t.Literal('reader'), t.Literal('editor')]) }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/removeUserFromSite', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ error: 'Unauthorized' }, { status: 401 });

        const domainInfo = siteDB.db.sites[req.body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'Site does not exist' }, { status: 404 });

        const targetUser = userDB.getUserByUsername(req.body.username);
        if (!targetUser) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        domainInfo.readers = domainInfo.readers.filter(id => id !== targetUser.id);
        domainInfo.editors = domainInfo.editors.filter(id => id !== targetUser.id);

        siteDB.updateDB();

        return new JSONResponse({});
    }, { body: t.Object({ domain: t.String(), username: t.String() }), cookie: t.Cookie({ session: t.String() }) });

    app.post('/$/sites/deleteSite', async (req) => {
        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user || !user.admin) return new JSONResponse({ error: 'Unauthorized' }, { status: 401 });

        const domainInfo = siteDB.db.sites[req.body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'Site does not exist' }, { status: 404 });

        return new JSONResponse(siteDB.deleteSite(req.body.domain));
    }, { body: t.Object({ domain: t.String() }), cookie: t.Cookie({ session: t.String() }) });
}