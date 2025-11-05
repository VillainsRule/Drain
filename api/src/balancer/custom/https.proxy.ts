export default async function httpsProxy(proxy: string): Promise<string> {
    try {
        if (typeof proxy !== 'string') return 'invalid_key';
        const match = proxy.match(/^(https?:\/\/)?([a-zA-Z0-9\-._~%!$&'()*+,;=:@]+)@?([a-zA-Z0-9.\-]+):(\d{1,5})$/);
        if (!match) return 'invalid_key';

        const port = parseInt(match[4], 10);
        if (port < 1 || port > 65535) return 'invalid_key';

        for (let i = 0; i < 3; i++) {
            const attempt = await fetch('https://myip.wtf/text', { proxy });

            if (attempt.status === 407) return 'invalid_key';
            if (attempt.ok) return 'Valid!';

            await new Promise(res => setTimeout(res, 1000));
        }

        return 'invalid_key';
    } catch (e) {
        return 'invalid_key';
    }
}