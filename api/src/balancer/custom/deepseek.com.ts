import fetchWithProxy from '../getProxy';

const yuanToUSD = (yuan: number): number => yuan / 7.10; // 1 USD = 7.10 CNY (as of 10/22/25)

export default async function deepseekBalancer(token: string): Promise<string> {
    const req = await fetchWithProxy('https://api.deepseek.com/user/balance', {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
        }
    });

    const status = req.status;
    if (status === 401) return 'invalid_key';
    if (status === 429) return 'Rate Limited';

    const data = await req.json() as any;

    if (data.error) {
        console.log('Deepseek API error for token', token, data.error);
        return 'Unknown Error';
    }

    let totalBalance = 0;

    if (data.error_msg?.includes('401 errors detected')) return 'ratelimited';

    data.balance_infos.forEach((info: { currency: string, total_balance: number }) => {
        if (info.currency === 'USD') totalBalance += Number(info.total_balance);
        else if (info.currency === 'CNY') totalBalance += yuanToUSD(Number(info.total_balance));
    });

    return totalBalance.toFixed(2);
}