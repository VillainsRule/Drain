import fetchWithProxy from './getProxy';

const createCaptchaBalancer = (url: string) => async (token: string): Promise<string> => {
    const req = await fetchWithProxy(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientKey: token })
    });

    const data = await req.json() as any;

    if (data.errorCode) return 'invalid_key';

    return Number(data.balance).toFixed(2);
}

export default createCaptchaBalancer;