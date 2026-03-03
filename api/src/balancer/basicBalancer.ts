import fetchWithProxy from './getProxy';

interface X {
    tokenHeader?: string;
    extraHeaders?: Record<string, string>;
    validCode?: number;
    invalidCode?: number | number[];
    method?: 'GET' | 'POST';
    customText?: string;
}

const createBasicBalancer = (url: string, x: X = {}) => async (token: string): Promise<string> => {
    const response = await fetchWithProxy(url, {
        method: x.method || 'GET',
        headers: {
            ...(x.tokenHeader ? { [x.tokenHeader]: token } : { 'Authorization': `Bearer ${token}` }),
            ...(x.extraHeaders ?? {})
        }
    });

    const code = response.status;

    if (typeof x.invalidCode === 'object' && x.invalidCode.includes(code)) return 'invalid_key';
    else if (typeof x.invalidCode === 'number' && code === x.invalidCode) return 'invalid_key';
    else if (code === 401) return 'invalid_key';

    if (code === (x.validCode || 200)) return x.customText || 'Valid';

    console.log('unexpected status code for', url, code);

    return '?';
};

export default createBasicBalancer;