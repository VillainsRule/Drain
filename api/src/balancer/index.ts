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
    switch (domain) {
        case 'aimlapi.com': return aimlBalancer;
        case 'capmonster.cloud': return capmonsterBalancer;
        case 'cartesia.ai': return cartesiaBalancer;
        case 'cohere.com': return cohereBalancer;
        case 'cors.sh': return corsShBalancer;
        case 'deepgram.com': return deepgramBalancer;
        case 'deepseek.com': return deepseekBalancer;
        case 'elevenlabs.io': return elevenlabsBalancer;
        case 'gemini.google': return geminiBalancer;
        case 'groq.com': return groqBalancer;
        case 'https.proxy': return httpsProxy;
        case 'ipinfo.io': return ipinfoBalancer;
        case 'mistral.ai': return mistralBalancer;
        case 'perplexity.ai': return perplexityBalancer;
        case 'together.ai': return togetherBalancer;
        case 'vpnapi.io': return vpnApiBalancer;
        case '2captcha.com': return twoCaptchaBalancer;
        default:
            console.log('no balancer found for', domain);
            return null;
    }
}

export default getBalancer;