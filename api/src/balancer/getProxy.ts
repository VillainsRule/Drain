import configDB from '../db/impl/ConfigDB';
import siteDB from '../db/impl/SiteDB';

const getProxy = (): string | undefined => {
    if (typeof Bun === 'undefined') return undefined;
    if (!configDB.db.useProxiesForBalancer) return undefined;
    
    const site = siteDB.get('https.proxy');
    if (!site) return undefined;

    const keys = Object.keys(site.keys);
    if (keys.length < 1) return undefined;

    return keys[Math.floor(Math.random() * keys.length)];
}

const fetchWithProxy = async (url: string, options: BunFetchRequestInit = {}) => {
    const proxy = getProxy();
    if (proxy) options.proxy = proxy;
    return fetch(url, options);
}

export default fetchWithProxy;