import fetchWithProxy from '../getProxy';

export default async function ipinfoBalancer(token: string): Promise<string> {
    const req = await fetchWithProxy('https://ipinfo.io/8.8.8.8', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (req.status === 403) return 'invalid_key';

    const res = await req.json() as any;

    if (res.asn) return 'Paid Key';
    return 'Free Key';
}