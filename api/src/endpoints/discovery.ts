import Elysia, { status, t } from 'elysia';

import apiKeyDB from '../db/impl/APIKeyDB';
import auditDB from '../db/impl/AuditDB';
import configDB from '../db/impl/ConfigDB';
import requestDB from '../db/impl/RequestDB';
import siteDB from '../db/impl/SiteDB';
import userDB from '../db/impl/UserDB';

import o1Optimizer from '../util/O1Optimizer';

const discovery = new Elysia()
    .guard({
        detail: { hide: true },
        headers: t.Object({ authorization: t.Optional(t.String({ description: 'this is an API key you can pick up from <a href="/user/apiKeys" target="_blank">here</a>' })), })
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

    .get('/api/v1/discovery', async ({ user }) => {
        const sites = siteDB.getIDs().map((id) => {
            const info = siteDB.get(id);

            return {
                domain: id,
                keys: o1Optimizer.getKeyCount(id),
                balance: o1Optimizer.getBalance(id),
                public: info?.public || false,
                description: info?.description || ''
            };
        });
        const requests = requestDB.getLinks('user', user.id) || [];
        return { sites, requests };
    }, { detail: { description: 'returns a list of available sites for discovery', tags: ['Discovery'] } })

    .get('/api/v1/discovery/requests', async ({ user }) => {
        if (!user.admin) return status(403, { error: 'admin access required' });
        return { requests: requestDB.getAll() };
    }, { detail: { description: 'returns a list of your discovery requests', tags: ['Discovery'] } })

    .post('/api/v1/discovery/requests', async ({ body, user }) => {
        const currentRequests = requestDB.getLinks('user', user.id) || [];
        if (currentRequests.some(r => r.site === body.domain)) return status(400, { error: 'you have already made a request for this site' });

        const site = siteDB.get(body.domain);
        if (!site) return status(404, { error: 'site not found' });

        const requestId = crypto.randomUUID();
        requestDB.add({ id: requestId, site: body.domain, user: user.id, timestamp: Date.now() });

        return {};
    }, { body: t.Object({ domain: t.String() }) })

    .post('/api/v1/discovery/requests/approve', async ({ body, user }) => {
        if (!user.admin) return status(403, { error: 'admin access required' });

        const request = requestDB.get(body.id);
        if (!request) return status(404, { error: 'request not found' });

        const site = siteDB.get(request.site);
        if (!site) return status(404, { error: 'site not found' });

        const targetUser = userDB.get(request.user);
        if (targetUser) {
            if (!targetUser.sites.includes(request.site)) userDB.update(request.user, { sites: [...targetUser.sites, request.site] });
            if (!site.users.includes(request.user)) siteDB.update(request.site, { users: [...site.users, request.user] });
        }

        requestDB.remove(request.id);

        return {};
    }, { body: t.Object({ id: t.String() }) })

    .post('/api/v1/discovery/requests/deny', async ({ body, user }) => {
        if (!user.admin) return status(403, { error: 'admin access required' });

        const request = requestDB.get(body.id);
        if (!request) return status(404, { error: 'request not found' });

        requestDB.remove(request.id);

        return {};
    }, { body: t.Object({ id: t.String() }) })

    .post('/api/v1/discovery/join', async ({ body, user }) => {
        const site = siteDB.get(body.domain);
        if (!site || !site.public) return status(404, { error: 'site not found' });

        if (!user.sites.includes(body.domain)) userDB.update(user.id, { sites: [...user.sites, body.domain] });
        if (!site.users.includes(user.id)) siteDB.update(body.domain, { users: [...site.users, user.id] });

        auditDB.log('joinSite', user.id, `joined site ${body.domain}`);

        return {};
    }, { body: t.Object({ domain: t.String() }) });

export default discovery;