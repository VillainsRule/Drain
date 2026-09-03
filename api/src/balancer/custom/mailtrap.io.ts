import fetchWithProxy from '../getProxy';

export default async function mailtrapBalancer(token: string, useProxy: boolean): Promise<string> {
    const req = await (useProxy ? fetchWithProxy : fetch)('https://mailtrap.io/api/domains', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const res = await req.json() as { data?: [{ name: string, dns_verified: boolean }], errors?: string };
    if (res.errors === 'Access forbidden') return 'invalid_key';
    else if (res.errors === 'Incorrect API token') return 'invalid_key';

    if (res.data) return `${res.data.find(e => e.dns_verified)?.name || 'no domains'}`;

    console.log('[mailtrap.io] unknown resp:', res);

    return '?';
}