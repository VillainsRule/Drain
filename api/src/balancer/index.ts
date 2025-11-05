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
const perplexityBalancer = createBasicBalancer('https://api.perplexity.ai/async/chat/completions');

const capmonsterBalancer = createCaptchaBalancer('https://api.capmonster.cloud/getBalance');
const twoCaptchaBalancer = createCaptchaBalancer('https://api.2captcha.com/getBalance');

const getBalancer = (domain: string) => {
    if (domain === 'aimlapi.com') return aimlBalancer;
    if (domain === 'capmonster.cloud') return capmonsterBalancer;
    if (domain === 'cartesia.ai') return cartesiaBalancer;
    if (domain === 'cohere.com') return cohereBalancer;
    if (domain === 'cors.sh') return corsShBalancer;
    if (domain === 'deepgram.com') return deepgramBalancer;
    if (domain === 'deepseek.com') return deepseekBalancer;
    if (domain === 'elevenlabs.io') return elevenlabsBalancer;
    if (domain === 'gemini.google') return geminiBalancer;
    if (domain === 'groq.com') return groqBalancer;
    if (domain === 'https.proxy') return httpsProxy;
    if (domain === 'ipinfo.io') return ipinfoBalancer;
    if (domain === 'mistral.ai') return mistralBalancer;
    if (domain === 'perplexity.ai') return perplexityBalancer;
    if (domain === 'together.ai') return togetherBalancer;
    if (domain === 'vpnapi.io') return vpnApiBalancer; 
    if (domain === '2captcha.com') return twoCaptchaBalancer;

    console.log('no balancer found for', domain);

    return null;
}

export default getBalancer;