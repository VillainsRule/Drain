export default async function deepgramBalancer(token: string): Promise<string> {
    const req = await fetch('https://api.deepgram.com/v1/auth/grant', {
        method: 'POST',
        headers: { Authorization: `Token ${token}` }
    });

    const body = await req.json() as any;

    if (body.err_code === 'BAD_REQUEST') return 'invalid_key';
    if (body.err_code === 'FORBIDDEN' || body.access_token) return 'Has Credits';

    console.log('Unexpected response:', body);

    return 'Unknown';
}