import fetchWithProxy from '../getProxy';

export default async function vpnApiBalancer(token: string, useProxy: boolean): Promise<string> {
    const req = await (useProxy ? fetchWithProxy : fetch)('https://vpnapi.io/api/8.8.8.8?key=' + token);

    if (req.status === 403) return 'invalid_key';
    return 'Valid';
}