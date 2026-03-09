import configDB from '../db/impl/ConfigDB';

const getProxy = (): string | undefined => (configDB.db.balancerProxy || undefined);

const fetchWithProxy = async (url: string, options: BunFetchRequestInit = {}) => {
    const proxy = getProxy();
    if (proxy) options.proxy = proxy;
    return fetch(url, options);
}

export default fetchWithProxy;