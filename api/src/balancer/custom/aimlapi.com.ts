import fetchWithProxy from '../getProxy';

export default async function aimlBalancer(token: string, useProxy: boolean): Promise<string> {
    const req = await (useProxy ? fetchWithProxy : fetch)('https://api.aimlapi.com/v2/billing', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (req.status === 401) return 'invalid_key';

    const json = await req.json() as any;
    if (typeof json.current_balance === 'number') return `$${json.current_balance.toFixed(2)}`;

    console.log('unexpected aimlapi response', json, req.status);
    return '?';
}