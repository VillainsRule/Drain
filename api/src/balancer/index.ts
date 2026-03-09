import cartesiaBalancer from './custom/cartesia.ai';
import deepgramBalancer from './custom/deepgram.com';
import deepseekBalancer from './custom/deepseek.com'
import elevenlabsBalancer from './custom/elevenlabs.io';
import geminiBalancer from './custom/gemini.google';
import ipinfoBalancer from './custom/ipinfo.io';
import httpsProxy from './custom/https.proxy';
import vpnApiBalancer from './custom/vpnapi.io';

import createBasicBalancer from './basicBalancer';
import createCaptchaBalancer from './captchaBalancer';

const corsShBalancer = createBasicBalancer('https://proxy.cors.sh/https://ip.villainsrule.xyz', { tokenHeader: 'x-cors-api-key', validCode: 400, customText: 'Paid Key' });
const mistralBalancer = createBasicBalancer('https://api.mistral.ai/v1/models', { customText: 'Has Credits' });
const togetherBalancer = createBasicBalancer('https://api.together.xyz/v1/models', { customText: 'Has Credits' });

const aimlBalancer = createBasicBalancer('https://api.aimlapi.com/v1/chat/completions', { validCode: 400, method: 'POST' });
const cohereBalancer = createBasicBalancer('https://api.cohere.com/v1/models');
const groqBalancer = createBasicBalancer('https://api.groq.com/openai/v1/models', { invalidCode: [401, 400] });
const fireworksBalancer = createBasicBalancer('https://api.fireworks.ai/v1/accounts');
const perplexityBalancer = createBasicBalancer('https://api.perplexity.ai/async/chat/completions');

const capmonsterBalancer = createCaptchaBalancer('https://api.capmonster.cloud/getBalance');
const twoCaptchaBalancer = createCaptchaBalancer('https://api.2captcha.com/getBalance');

const warnedDomains = new Set<string>();

const getBalancer = (domain: string) => {
    if (domain.endsWith('aimlapi.com')) return aimlBalancer;
    if (domain.endsWith('capmonster.cloud')) return capmonsterBalancer;
    if (domain.endsWith('cartesia.ai')) return cartesiaBalancer;
    if (domain.endsWith('cohere.com')) return cohereBalancer;
    if (domain.endsWith('cors.sh')) return corsShBalancer;
    if (domain.endsWith('deepgram.com')) return deepgramBalancer;
    if (domain.endsWith('deepseek.com')) return deepseekBalancer;
    if (domain.endsWith('elevenlabs.io')) return elevenlabsBalancer;
    if (domain.endsWith('fireworks.ai')) return fireworksBalancer;
    if (domain.endsWith('gemini.google')) return geminiBalancer;
    if (domain.endsWith('groq.com')) return groqBalancer;
    if (domain.endsWith('https.proxy')) return httpsProxy;
    if (domain.endsWith('ipinfo.io')) return ipinfoBalancer;
    if (domain.endsWith('mistral.ai')) return mistralBalancer;
    if (domain.endsWith('perplexity.ai')) return perplexityBalancer;
    if (domain.endsWith('together.ai')) return togetherBalancer;
    if (domain.endsWith('vpnapi.io')) return vpnApiBalancer;
    if (domain.endsWith('2captcha.com')) return twoCaptchaBalancer;

    if (!warnedDomains.has(domain)) {
        console.warn(`no balancer configured for domain: ${domain}`);
        warnedDomains.add(domain);
    }

    return null;
}

export default getBalancer;