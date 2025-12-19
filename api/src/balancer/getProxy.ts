import configDB from '../db/ConfigDB';
import siteDB from '../db/SiteDB';

const getProxy = (): string | undefined => {
    if (typeof Bun === 'undefined') return undefined;
    if (!configDB.db.useProxiesForBalancer) return undefined;

    const proxySite = siteDB.getSiteKeys('https.proxy');
    if (proxySite.length < 1) return undefined;

    return proxySite[Math.floor(Math.random() * proxySite.length)];
}

const fetchWithProxy = async (url: string, options: BunFetchRequestInit = {}) => {
    const proxy = getProxy();
    if (proxy) options.proxy = proxy;
    return fetch(url, options);
}

export default fetchWithProxy;