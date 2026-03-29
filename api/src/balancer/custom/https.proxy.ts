export default async function httpsProxy(proxy: string): Promise<string> {
    try {
        if (typeof proxy !== 'string') return 'invalid_key';

        const url = new URL(proxy.startsWith('http') ? proxy : `http://${proxy}`);
        const inferredPort = url.port || proxy.match(/:(\d+)$/)?.[1];
        if (!inferredPort) return 'invalid_key';

        const port = parseInt(inferredPort, 10);
        if (!port || port < 1 || port > 65535) return 'invalid_key';

        for (let i = 0; i < 3; i++) {
            const attempt = await fetch('https://myip.wtf/text', {
                proxy: url.toString(),
                signal: AbortSignal.timeout(10_000),
                tls: { rejectUnauthorized: false }
            });
            if (attempt.status === 407) return 'invalid_key';
            if (attempt.ok) return 'Valid';
            await new Promise(res => setTimeout(res, 1000));
        }

        return 'invalid_key';
    } catch (e) {
        console.error(e);
        return 'invalid_key';
    }
}
