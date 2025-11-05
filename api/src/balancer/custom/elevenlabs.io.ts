export default async function elevenlabsBalancer(token: string): Promise<string> {
    const req = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: {
            Accept: 'application/json',
            'xi-api-key': token
        }
    });

    const status = req.status;

    if (status === 401) return 'invalid_key';
    if (status === 429) return 'Rate Limited';

    const data = await req.json() as any;

    const tiersHighestToLowest = [
        'starter', // tier 1,
        'creator', // tier 2
        'pro' // tier 3
    ];

    const userTier = data.tier.toLowerCase();
    if (userTier === 'free') return 'Free Tier';
    if (!tiersHighestToLowest.includes(userTier)) return 'Unknown Tier';

    return `T${tiersHighestToLowest.indexOf(userTier) + 1} (${userTier.charAt(0).toUpperCase() + userTier.slice(1)})`;
}