import fetchWithProxy from '../getProxy';

export default async function cartesiaBalancer(token: string, useProxy: boolean): Promise<string> {
    const req = await (useProxy ? fetchWithProxy : fetch)('https://api.cartesia.ai/voices/clone', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'cartesia-version': '2025-04-16',
            'content-type': 'multipart/form-data'
        }
    });

    if (req.status === 401) return 'invalid_key';
    if (req.status === 402) return 'Free Key';

    return 'Paid Key';
}