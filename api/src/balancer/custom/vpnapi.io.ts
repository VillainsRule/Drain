import fetchWithProxy from '../getProxy';

export default async function vpnApiBalancer(token: string): Promise<string> {
    const req = await fetchWithProxy('https://vpnapi.io/api/8.8.8.8?key=' + token);

    if (req.status === 403) return 'invalid_key';
    return 'Valid Key';
}