import { Elysia, status, t } from 'elysia';

import userDB from '../db/UserDB';
import siteDB from '../db/SiteDB';
import getBalancer from '../balancer';

export default (app: Elysia) => {
    const apiElysia = new Elysia()
        .guard({
            schema: 'standalone',
            headers: t.Object({ authorization: t.Optional(t.String()), 'user-agent': t.String() }),
            query: t.Optional(t.Object({ key: t.Optional(t.String()) })),
        })

        .resolve(({ headers, query }) => {
            const apiKey = headers.authorization || query?.key;
            if (!apiKey) return status(401, { error: 'API key is required' });

            const apiUser = userDB.checkAndUpdate(apiKey, headers['user-agent']);
            if (!apiUser) return status(403, { error: 'invalid API key' });

            return { apiKey, apiUser };
        })

        .get('/$/v1/getKeys', async ({ query: { site, count }, apiUser }) => {
            const doesSiteExist = siteDB.siteExists(site);
            if (!doesSiteExist) return status(404, { error: 'site does not exist' });

            const userAccess = siteDB.userAccessLevel(site, apiUser.id);
            if (userAccess === 'none' && !apiUser.admin) return status(404, { error: 'site does not exist' });

            const keys = siteDB.getSiteKeys(site);
            const rndKeys = keys.sort(() => 0.5 - Math.random());

            const countNum = Math.min(parseInt(count as string) || 1, rndKeys.length);

            return { site, keys: rndKeys.slice(0, countNum) };
        }, { query: t.Object({ site: t.String(), count: t.Optional(t.String()) }) })

        .get('/$/v1/getPrecheckedKeys', async ({ query: { site, count }, apiUser }) => {
            const doesSiteExist = siteDB.siteExists(site);
            if (!doesSiteExist) return status(404, { error: 'site does not exist' });

            const userAccess = siteDB.userAccessLevel(site, apiUser.id);
            if (userAccess === 'none' && !apiUser.admin) return status(404, { error: 'site does not exist' });

            const keys = siteDB.getSiteKeys(site);
            const rndKeys = keys.sort(() => 0.5 - Math.random());

            const countNum = Math.min(parseInt(count as string) || 1, rndKeys.length);
            if (countNum > 10) return status(400, { error: 'count cannot be greater than 10' });

            const balancer = getBalancer(site);
            if (!balancer) return { site, keys: rndKeys.slice(0, countNum) };

            const checkedAndValid: string[] = [];

            for (const key of rndKeys) {
                if (checkedAndValid.length >= countNum) break;

                const balance = await balancer(key);
                if (balance !== 'invalid_key') checkedAndValid.push(key);
            }

            return { site, keys: checkedAndValid };
        }, { query: t.Object({ site: t.String(), count: t.Optional(t.String()) }) });

    app.use(apiElysia);
}