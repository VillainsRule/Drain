import fetchWithProxy from '../getProxy';

export default async function cohereBalancer(token: string, useProxy: boolean): Promise<string> {
    const req = await (useProxy ? fetchWithProxy : fetch)('https://api.cohere.com/v2/rerank', {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (req.status === 401) return 'invalid_key';
    if (req.status === 405 && req.headers.get('x-trial-endpoint-call-remaining')) return 'Trial Key';
    if (req.status === 405 && !req.headers.get('x-trial-endpoint-call-remaining')) return 'Prod Key';
    if (req.status === 429) return 'Rate Limited';

    console.log('[cohere] unexpected response:', req.status, req.headers);

    return '?';
}