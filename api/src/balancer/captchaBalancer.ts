import fetchWithProxy from './getProxy';

const createCaptchaBalancer = (url: string) => async (token: string, useProxy: boolean): Promise<string> => {
    const req = await (useProxy ? fetchWithProxy : fetch)(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientKey: token }),
        signal: AbortSignal.timeout(5000)
    });

    const data = await req.json() as any;

    if (data.errorCode) return 'invalid_key';

    return Number(data.balance).toFixed(2);
}

export default createCaptchaBalancer;