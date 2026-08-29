import fetchWithProxy from '../getProxy';

export default async function mailtrapBalancer(token: string, useProxy: boolean): Promise<string> {
    const req = await (useProxy ? fetchWithProxy : fetch)('https://mailtrap.io/api/billing/usage', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const res = await req.json() as any;
    if (res.errors === 'Access forbidden') return 'invalid_key';
    else if (res.errors === 'Incorrect API token') return 'invalid_key';

    return `${res.sending.plan.name} (${res.sending.usage.sent_messages_count.current}/${res.sending.usage.sent_messages_count.limit})`;
}