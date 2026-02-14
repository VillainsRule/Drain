import { Elysia, status, t } from 'elysia';

import apiKeyDB from '../db/impl/APIKeyDB';
import configDB from '../db/impl/ConfigDB';
import siteDB from '../db/impl/SiteDB';
import userDB from '../db/impl/UserDB';

import getBalancer from '../balancer';

const api = new Elysia({ name: 'api' })
    .guard({
        schema: 'standalone',
        headers: t.Object({ authorization: t.Optional(t.String()), 'user-agent': t.Optional(t.String()) }),
        query: t.Optional(t.Object({ key: t.Optional(t.String()) })),
    })

    .resolve(({ headers, query }) => {
        if (headers['user-agent'] && headers['user-agent'].length > 200) return status(413, { error: 'user-agent too long' });

        if (!configDB.db.allowAPIKeys) return status(403, { error: 'API keys are disabled globally on the instance' });

        const inputKey = headers.authorization || query?.key;
        if (!inputKey) return status(401, { error: 'API key is required' });

        const apiKey = apiKeyDB.getLink('key', inputKey);
        if (!apiKey) return status(401, { error: 'invalid API key' });

        const apiUser = userDB.get(apiKey.userId);
        if (!apiUser) return status(401, { error: 'invalid API key' });

        apiKeyDB.update(apiKey.id, { lastUsed: Date.now(), lastUserAgent: headers['user-agent'] || 'no UA specified' });

        return { apiKey: inputKey, apiUser };
    })

    .get('/$/v1/*', ({ path }) => {
        return status(308, { Location: path.replace('$', 'api') })
    })

    .get('/api/v1/getKeys', async ({ query: { site, count }, apiUser }) => {
        const siteInfo = siteDB.get(site);
        if (!siteInfo) return status(401, { error: 'no permission' });

        if (!apiUser.admin && !siteInfo.readers.includes(apiUser.id) && !siteInfo.editors.includes(apiUser.id))
            return status(401, { error: 'no permission' });

        const keys = Object.keys(siteInfo.keys);
        const rndKeys = keys.sort(() => 0.5 - Math.random());

        const countNum = Math.min(parseInt(count as string) || 1, rndKeys.length);

        return { site, keys: rndKeys.slice(0, countNum) };
    }, { query: t.Object({ site: t.String(), count: t.Optional(t.String()) }) })

    .get('/api/v1/getPrecheckedKeys', async ({ query: { site, count }, apiUser }) => {
        const siteInfo = siteDB.get(site);
        if (!siteInfo) return status(401, { error: 'no permission' });

        if (!apiUser.admin && !siteInfo.readers.includes(apiUser.id) && !siteInfo.editors.includes(apiUser.id))
            return status(401, { error: 'no permission' });

        const keys = Object.keys(siteInfo.keys);
        const rndKeys = keys.sort(() => 0.5 - Math.random());

        const countNum = Math.min(parseInt(count as string) || 1, rndKeys.length);
        if (countNum > 10) return status(400, { error: 'count cannot be greater than 10' });

        const balancer = getBalancer(site);
        if (!balancer) return { site, keys: rndKeys.slice(0, countNum) };

        const checkedAndValid: string[] = [];

        for (const key of rndKeys) {
            if (checkedAndValid.length >= countNum) break;

            const balance = await balancer(key);
            if (balance !== 'invalid_key' && balance !== 'leaked_key') checkedAndValid.push(key);
        }

        return { site, keys: checkedAndValid };
    }, { query: t.Object({ site: t.String(), count: t.Optional(t.String()) }) });

export default api;