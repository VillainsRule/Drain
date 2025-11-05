interface RequestConfig {
    headers: Record<string, string>;
}

interface Response {
    headers: Record<string, string>;
    status: number;
    statusText: string;
    data: any;
}

const getLike = (url: string, params?: RequestConfig) => new Promise<Response>((r) => {
    const response: Response = { headers: {}, status: 0, statusText: '', data: null };

    fetch(url, params).then((res) => {
        response.headers = Object.fromEntries(res.headers.entries());
        response.status = res.status;
        response.statusText = res.statusText;
        res.text().then((text) => {
            try {
                response.data = JSON.parse(text);
            } catch {
                response.data = text;
            }

            r(response);
        });
    });
});

const postLike = (url: string, data?: any, params?: RequestConfig) => new Promise<Response>((r) => {
    const response: Response = { headers: {}, status: 0, statusText: '', data: null };

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(params?.headers || {})
        },
        body: JSON.stringify(data)
    }).then((res) => {
        response.headers = Object.fromEntries(res.headers.entries());
        response.status = res.status;
        response.statusText = res.statusText;
        res.text().then((text) => {
            try {
                response.data = JSON.parse(text);
            } catch {
                response.data = text;
            }

            r(response);
        });
    });
});

const axios = {
    get: getLike,
    post: postLike
};

export default axios;