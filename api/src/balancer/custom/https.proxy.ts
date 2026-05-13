export default async function httpsProxy(proxy: string, _useProxy: boolean): Promise<string> {
    try {
        if (typeof proxy !== 'string') return 'invalid_key';

        const url = new URL(proxy.startsWith('http') ? proxy : `http://${proxy}`);
        url.protocol = 'http:';

        const inferredPort = url.port || proxy.match(/:(\d+)$/)?.[1];
        if (!inferredPort) {
            console.log('cannot infer port for', proxy);
            return 'invalid_key';
        }

        const port = parseInt(inferredPort, 10);
        if (!port || port < 1 || port > 65535) {
            console.log('port is invalid', port);
            return 'invalid_key';
        }

        for (let i = 0; i < 3; i++) {
            const attempt = await fetch('https://myip.wtf/text', {
                proxy: url.toString(),
                signal: AbortSignal.timeout(10_000),
                tls: { rejectUnauthorized: false }
            });
            if (attempt.status === 407) return 'invalid_key';
            else if (attempt.ok) return 'Valid';
            else console.log('proxy failure', attempt);
            await new Promise(res => setTimeout(res, 1000));
        }

        console.log('proxy failed all attempts', proxy);
        return 'invalid_key';
    } catch (e) {
        console.error(e);
        return 'invalid_key';
    }
}
