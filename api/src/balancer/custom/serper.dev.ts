import fetchWithProxy from '../getProxy';

export default async function serperBalancer(token: string, useProxy: boolean): Promise<string> {
    const req = await (useProxy ? fetchWithProxy : fetch)('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'x-api-key': token }
    });

    const res = await req.json() as any;
    if (res.message === 'Not enough credits') return 'Empty Key';
    else if (res.message === 'Missing query parameter') return 'Has Credits';
    else if (res.message === 'Unauthorized. Sign up for a free account.' || res.message === 'Unauthorized.') return 'invalid_key';

    console.log('[serper] unexpected response:', res);

    return '?';
}