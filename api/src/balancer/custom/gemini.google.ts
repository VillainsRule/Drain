export default async function geminiBalancer(token: string): Promise<string> {
    const req = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-001:predictLongRunning?key=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [{ prompt: 'generate a beautiful sunset.' }] })
    });

    const data = await req.json() as any;
    if (data.error?.code === 400) return 'invalid_key';
    if (data.error?.code === 429) return 'Free Key';
    else if (data.name) return 'Paid Key';

    console.log(data);

    return 'Unknown';
}