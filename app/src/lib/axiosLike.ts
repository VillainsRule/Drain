interface PostParams {
    method?: string;
    body?: string;
    headers: Record<string, string>;
}

interface ResponseLike {
    headers: Record<string, string>;
    status: number;
    statusText: string;
    data: any;
}

const baseLike = (url: string, params?: RequestInit) => new Promise<ResponseLike>((r) => {
    const response: ResponseLike = { headers: {}, status: 0, statusText: '', data: null };

    fetch(url, params).then((res) => {
        response.headers = Object.fromEntries(res.headers.entries());
        response.status = res.status;
        response.statusText = res.statusText;
        res.text().then((text) => {
            try {
                response.data = JSON.parse(text);

                if (response.data && typeof response.data === 'object' && 'type' in response.data && response.data.type === 'validation') {
                    const data = response.data as { type: string, on: string, property: string };
                    if (data.on === 'cookie' && data.property === '/session') response.data = { error: 'not logged in' };
                }
            } catch {
                response.data = text;
            }

            r(response);
        })
    })
});

const postLike = (url: string, data?: Object, params?: PostParams) => baseLike(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        ...(params?.headers || {})
    },
    body: JSON.stringify(data)
});

const axios = {
    get: baseLike,
    post: postLike
};

export default axios;