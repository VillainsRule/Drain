import fetchWithProxy from '../getProxy';

export default async function deepgramBalancer(token: string): Promise<string> {
    const req = await fetchWithProxy('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${token}` }
    });

    const body = await req.json() as any;
    if (req.status === 401) return 'invalid_key';

    const billingReq = await fetchWithProxy(`https://api.deepgram.com/v1/projects/${body.projects[0].project_id}/balances`, {
        headers: { Authorization: `Token ${token}` }
    });

    const billingBody = await billingReq.json() as any;

    if (billingBody.balances) {
        let total = 0;
        for (const balance of billingBody.balances) {
            if (balance.units !== 'usd') console.warn('[deepgram] non-USD balance detected:', balance);
            total += balance.amount;
        }
        return `$${total.toFixed(2)}`;
    }

    if (billingBody.category && billingBody.category === 'INSUFFICIENT_PERMISSIONS') return 'Valid Key';

    console.log('[deepgram] unexpected response:', body);
    return '?';
}