import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '../shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';

import authManager from '@/managers/AuthManager';

import RefreshCw from 'lucide-react/icons/refresh-cw';
import Trash from 'lucide-react/icons/trash';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

const APIKeys = observer(function APIKeys() {
    const [usageModalOpen, setUsageModalOpen] = useState(false);

    useEffect(() => {
        authManager.fetchAPIKeys();
    }, []);

    const createKey = () => shadd.prompt(
        'create a new API key',
        'name your API key something you\'ll remember later, such as the app you\'re using it in',
        { placeholder: 'Cloudflare Worker #5', maxLength: 24, minLength: 1 },
        async (value) => {
            const req = await api.auth.api.keys.create.post({ name: value });
            if (req.data) {
                shadd.copy(
                    'API key created!',
                    `the API key has been created! give this key to any programs you want to authenticate with this drain instance:\n\n${req.data.key}`,
                    req.data.key
                );

                authManager.fetchAPIKeys();
            } else shadd.setError(errorFrom(req));
        }
    );

    return (
        <div className='flex flex-col items-center w-full h-full md:w-5/6 gap-5 overflow-y-auto drain-scrollbar mt-6'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <h2 className='text-2xl font-bold'>API key manager</h2>
                <Button className='w-56 py-2 rounded-md transition-colors duration-150' onClick={createKey}>create API key</Button>
            </div>

            {!authManager.apiKeysEnabled && <div className='flex flex-col items-center'>
                <span className='text-red-500 underline font-bold'>API keys are currently disabled on the instance</span>
                <span className='text-red-500 underline'>you can create & manage them, but access attempts will be blocked</span>
            </div>}

            {authManager.apiKeys.length < 1 && <span className='text-muted-foreground text-sm text-center'>you have no API keys. <span className='underline cursor-pointer' onClick={createKey}>create one!</span></span>}

            <div className='flex flex-col justify-center gap-5 w-full'>
                {authManager.apiKeys.map((apiKey) => (
                    <div className='flex justify-between items-center w-full py-3 px-6 border rounded-md'>
                        <span className='text-lg font-bold'>{apiKey.name}</span>

                        <Tooltip>
                            <TooltipTrigger>
                                <span className='text-sm text-muted-foreground'>created {apiKey.createdAt}<br />{apiKey.lastUsed}</span>
                            </TooltipTrigger>
                            {apiKey.lastUserAgent && <TooltipContent>
                                <span>last user agent: {apiKey.lastUserAgent || 'never'}</span>
                            </TooltipContent>}
                        </Tooltip>

                        <div className='flex gap-3'>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Button onClick={async () => {
                                        if (!confirm(`are you sure you want to delete the API key "${apiKey.name}"? this action cannot be undone. any programs using this key will no longer be able to authenticate.`)) return;

                                        const res = await api.auth.api.keys.regen.post({ name: apiKey.name });
                                        if (res.data) {
                                            shadd.copy(
                                                'API key regenerated!',
                                                `the API key has been regenerated! give this new key to any programs using the old key to keep them working:\n\n${res.data.key}`,
                                                res.data.key
                                            );

                                            authManager.fetchAPIKeys();
                                        } else shadd.setError(errorFrom(res));
                                    }}>
                                        <RefreshCw className='h-4 w-4' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <span>regenerate API key</span>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger>
                                    <Button variant='destructive' onClick={() => {
                                        if (confirm(`are you sure you want to regenerate the API key "${apiKey.name}"?\n\nany programs using this key will stop working until you update the new key in their code.`))
                                            api.auth.api.keys.delete.post({ name: apiKey.name }).then(() => authManager.fetchAPIKeys());
                                    }}>
                                        <Trash className='h-4 w-4' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <span>delete API key</span>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ))}
            </div>

            <span className='text-sm text-muted-foreground mt-4 cursor-pointer underline' onClick={() => setUsageModalOpen(true)}>API key mini documentation!</span>

            <Dialog open={usageModalOpen} onOpenChange={setUsageModalOpen}>
                <DialogContent className='min-w-5/6! w-5/6! max-w-5/6! max-h-5/6! overflow-y-auto drain-scrollbar'>
                    <DialogHeader>
                        <DialogTitle>using drain API keys</DialogTitle>
                        <DialogDescription>drain API keys can be used to authenticate requests to this drain instance's API!</DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div className='flex flex-col'>
                            <h3 className='font-semibold'>authenticating</h3>
                            <span>you can authenticate either:</span>
                            <ul className='list-disc list-inside'>
                                <li>by putting the API key in the <code>Authorization</code> header</li>
                                <li>by putting the API key in a query parameter named <code>key</code></li>
                            </ul>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>curl -H "Authorization: YOUR_API_KEY_HERE" https://{location.host}/api/v1/[endpoint]</code></pre>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>curl "https://{location.host}/api/v1/[endpoint]?key=YOUR_API_KEY_HERE"</code></pre>
                        </div>

                        <h2 className='text-lg font-bold'>the endpoints!</h2>

                        <div className='flex flex-col'>
                            <h3 className='font-semibold'>/api/v1/getKeys</h3>
                            <span>this returns keys of the provided count from a site. if the count is higher than the # of keys the site has, the keys array will simply be cut short.</span>
                            <span>requires read permission of the site</span>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>GET https://{location.host}/api/v1/getKeys?site=[site]&count=[count]</code></pre>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>{`{\n\tsite: "[domain]",\n\tkeys: ["[key1]", "[key2]", ...]\n}`}</code></pre>
                        </div>

                        <div className='flex flex-col'>
                            <h3 className='font-semibold'>/api/v1/getPrecheckedKeys</h3>
                            <span>same as getKeys, but they're validated on request, ensuring that the key you get is valid!</span>
                            <span>requires edit permission of the site; you can only get 10 keys at once to avoid nuking the server</span>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>GET https://{location.host}/api/v1/getPrecheckedKeys?site=[site]&count=[count]</code></pre>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>{`{\n\tsite: "[domain]",\n\tkeys: ["[key1]", "[key2]", ...]\n}`}</code></pre>
                        </div>
                    </div>

                    <span>want more endpoints? make an issue to request one on the <a className='text-blue-500 underline' href='https://github.com/VillainsRule/Drain' target='_blank'>drain repository!</a></span>
                </DialogContent>
            </Dialog>
        </div>
    )
});

export default APIKeys;