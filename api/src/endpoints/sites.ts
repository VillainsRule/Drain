import Elysia from 'elysia';

import siteDB from '../db/SiteDB';
import userDB from '../db/UserDB';

import getBalancer from '../balancer';

import { JSONResponse } from '../util';

export default function sites(app: Elysia) {
    app.post('/$/sites/index', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ loggedIn: false });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ loggedIn: false });

        const sites = siteDB.getUserSites(user.id);
        const reconstructedSites = sites.map((site) => ({
            ...site,
            readers: site.readers.map((userId) => userDB.getPublicUser(userId)!),
            editors: site.editors.map((userId) => userDB.getPublicUser(userId)!)
        }));

        reconstructedSites.forEach((site) => site.supportsBalancer = getBalancer(site.domain) !== null);

        return new JSONResponse({ sites: reconstructedSites });
    });

    app.post('/$/sites/add', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const body = req.body as { url: string };
        if (typeof body.url !== 'string') return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const result = siteDB.addSite(body.url);
        return new JSONResponse(result);
    });

    app.post('/$/sites/addKey', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const body = req.body as { domain: string, key: string };
        if (typeof body.domain !== 'string' || typeof body.key !== 'string') return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        if (!siteDB.db.sites[body.domain]) return new JSONResponse({ error: 'Site does not exist' }, { status: 404 });
        if (!siteDB.db.sites[body.domain].readers.includes(user.id) && !siteDB.db.sites[body.domain].editors.includes(user.id) && !user.admin) return new JSONResponse({ error: 'No permission' }, { status: 403 });

        const result = await siteDB.addKeyToSite(body.domain, body.key);
        return new JSONResponse(result);
    });

    app.post('/$/sites/balancerCheck', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const body = req.body as { domain: string, key: string };
        if (typeof body.domain !== 'string' || typeof body.key !== 'string') return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const balancer = getBalancer(body.domain);
        if (!balancer) return new JSONResponse({ error: 'Balancer does not exist for domain' }, { status: 404 });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo.editors.includes(user.id) && !user.admin) return new JSONResponse({ error: 'No permission' }, { status: 403 });
        if (!domainInfo.keys.some(key => key.token === body.key)) return new JSONResponse({ error: 'Key not found' }, { status: 404 });

        const balance = await balancer(body.key);
        if (balance === 'invalid_key') return new JSONResponse({ error: 'Balancer has determined the key is invalid.' }, { status: 400 });

        siteDB.setKeyBalance(body.domain, body.key, isNaN(Number(balance)) ? balance : `$${balance}`);

        return new JSONResponse({});
    });

    app.post('/$/sites/removeKey', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ error: 'Not logged in' }, { status: 401 });
        if (!user.admin) return new JSONResponse({ error: 'No permission' }, { status: 403 });

        const body = req.body as { domain: string, key: string };
        if (typeof body.domain !== 'string' || typeof body.key !== 'string') return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo.keys.some(key => key.token === body.key)) return new JSONResponse({ error: 'Key not found' }, { status: 404 });

        siteDB.removeKeyFromSite(body.domain, body.key);

        return new JSONResponse({});
    });

    app.post('/$/sites/sortKeys', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user) return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const body = req.body as { domain: string };
        if (typeof body.domain !== 'string') return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo.editors.includes(user.id) && !user.admin) return new JSONResponse({ error: 'No permission' }, { status: 403 });

        siteDB.sortKeys(body.domain);

        return new JSONResponse({});
    });

    app.post('/$/sites/addUserToSite', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user?.admin) return new JSONResponse({ error: 'Unauthorized' }, { status: 401 });

        const body = req.body as { domain: string, username: string, role: 'reader' | 'editor' };
        if (typeof body.domain !== 'string' || typeof body.username !== 'string')
            return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'Site does not exist' }, { status: 404 });

        const targetUser = userDB.getUserByUsername(body.username);
        if (!targetUser) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (domainInfo.readers.includes(targetUser.id)) return new JSONResponse({ error: 'User already a reader' }, { status: 400 });
        domainInfo.readers.push(targetUser.id);

        siteDB.updateDB();

        return new JSONResponse({});
    });

    app.post('/$/sites/changeUserRole', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user?.admin) return new JSONResponse({ error: 'Unauthorized' }, { status: 401 });

        const body = req.body as { domain: string, username: string, role: 'reader' | 'editor' };
        if (typeof body.domain !== 'string' || typeof body.username !== 'string' || !['reader', 'editor'].includes(body.role))
            return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'Site does not exist' }, { status: 404 });

        const targetUser = userDB.getUserByUsername(body.username);
        if (!targetUser) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        if (body.role === 'reader') {
            if (!domainInfo.readers.includes(targetUser.id)) {
                domainInfo.readers.push(targetUser.id);
            }
            domainInfo.editors = domainInfo.editors.filter(id => id !== targetUser.id);
        } else {
            if (!domainInfo.editors.includes(targetUser.id)) {
                domainInfo.editors.push(targetUser.id);
            }
            domainInfo.readers = domainInfo.readers.filter(id => id !== targetUser.id);
        }

        siteDB.updateDB();

        return new JSONResponse({});
    });

    app.post('/$/sites/removeUserFromSite', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user?.admin) return new JSONResponse({ error: 'Unauthorized' }, { status: 401 });

        const body = req.body as { domain: string, username: string };
        if (typeof body.domain !== 'string' || typeof body.username !== 'string')
            return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'Site does not exist' }, { status: 404 });

        const targetUser = userDB.getUserByUsername(body.username);
        if (!targetUser) return new JSONResponse({ error: 'User not found' }, { status: 404 });

        domainInfo.readers = domainInfo.readers.filter(id => id !== targetUser.id);
        domainInfo.editors = domainInfo.editors.filter(id => id !== targetUser.id);

        siteDB.updateDB();

        return new JSONResponse({});
    });

    app.post('/$/sites/deleteSite', async (req) => {
        if (!req.cookie.session || typeof req.cookie.session.value !== 'string') return new JSONResponse({ error: 'Not logged in' }, { status: 401 });

        const user = userDB.whoIsSession(req.cookie.session.value);
        if (!user?.admin) return new JSONResponse({ error: 'Unauthorized' }, { status: 401 });

        const body = req.body as { domain: string };
        if (typeof body.domain !== 'string') return new JSONResponse({ error: 'Invalid request' }, { status: 400 });

        const domainInfo = siteDB.db.sites[body.domain];
        if (!domainInfo) return new JSONResponse({ error: 'Site does not exist' }, { status: 404 });

        return new JSONResponse(siteDB.deleteSite(body.domain));
    });
}