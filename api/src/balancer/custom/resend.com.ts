import fetchWithProxy from '../getProxy';

const packageVersion = (await (await fetch('https://registry.npmjs.org/resend')).json() as any)['dist-tags'].latest;

export default async function resendBalancer(token: string, useProxy: boolean): Promise<string> {
    const req = await (useProxy ? fetchWithProxy : fetch)('https://api.resend.com/domains', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': `resend-node:${packageVersion}`
        }
    });

    const res = await req.json() as any;
    if (res.message === 'API key is invalid') return 'invalid_key';
    else if (res.message === 'This API key is suspended') return 'invalid_key';
    // you don't know what domains the user has, so unfortunately the key is invalid
    else if (res.message === 'This API key is restricted to only send emails') return 'invalid_key';

    return `${res.data.find((e: any) => e.status === 'verified')?.name || 'no domains'}`;
}