import fetchWithProxy from '../getProxy';

const yuanToUSD = (yuan: number): number => yuan / 6.88; // 1 USD = 6.88 CNY (as of 3/3/25) - https://www.google.com/search?q=1+usd+to+cny

export default async function deepseekBalancer(token: string, useProxy: boolean): Promise<string> {
    for (let i = 1; i <= 5; i++) {
        const req = await (useProxy ? fetchWithProxy : fetch)('https://api.deepseek.com/user/balance', {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        const status = req.status;

        if (status === 401) return 'invalid_key';
        if (status === 429) {
            console.log(`[deepseek] rate limited on #${i}, waiting ${i}s & retrying...`);
            await new Promise(resolve => setTimeout(resolve, i * 1000));
            continue;
        }

        const data = await req.json() as any;

        if (data.error) {
            console.log('[deepseek] API error', token, data.error);
            return 'Error';
        }

        let totalBalance = 0;

        data.balance_infos.forEach((info: { currency: string, total_balance: number }) => {
            if (info.currency === 'USD') totalBalance += Number(info.total_balance);
            else if (info.currency === 'CNY') totalBalance += yuanToUSD(Number(info.total_balance));
        });

        const rounded = totalBalance.toFixed(2);
        return rounded === '-0.00' ? '0.00' : rounded;
    }

    console.log('[deepseek] failed all 5 times');
    return 'invalid_key';
}