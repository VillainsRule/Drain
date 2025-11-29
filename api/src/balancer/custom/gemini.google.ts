export default async function geminiBalancer(token: string): Promise<string> {
    const fetchPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'tell me a 2 sentence story.' }] }] })
    });

    const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
    );

    try {
        const req = await Promise.race([fetchPromise, timeoutPromise]);
        const data = await req.json() as any;

        if (data.error?.message?.includes('API key not valid')) return 'invalid_key';
        if (data.error?.message?.includes('API Key not found')) return 'invalid_key';
        if (data.error?.message?.includes('API key expired')) return 'invalid_key';
        if (data.error?.message?.includes('API has not been used in project')) return 'invalid_key';
        if (data.error?.message?.includes('are blocked')) return 'invalid_key';
        if (data.error?.message?.includes('has been suspended')) return 'invalid_key';

        if (data.error?.message?.includes('reported as leaked')) return 'leaked_key';

        if (data.error?.message?.includes('limit: 0')) return 'Free Key';
        if (data.error?.message?.includes('You exceeded your current quota')) return 'Free Key';
        if (data.error?.message?.includes('Quota exceeded for')) return 'Free Key';

        console.log(data);

        return 'Unknown';
    } catch (err) {
        if (err instanceof Error && err.message === 'timeout') return 'Paid Key';
        throw err;
    }
}