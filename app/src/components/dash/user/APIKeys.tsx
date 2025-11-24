import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '../../shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';

import authManager from '@/managers/AuthManager';

import RefreshCw from 'lucide-react/icons/refresh-cw';
import Trash from 'lucide-react/icons/trash';

import axios from '@/lib/axiosLike';

const APIKeys = observer(function APIKeys() {
    const [keyNameModalOpen, setKeyNameModalOpen] = useState(false);
    const keyNameRef = useRef<HTMLInputElement>(null);
    const keyNameSetRef = useRef<HTMLButtonElement>(null);
    const [keyNameError, setKeyNameError] = useState('');

    const [keyValue, setKeyValue] = useState('');
    const [keyWasARegen, setKeyWasARegen] = useState(false);

    const [usageModalOpen, setUsageModalOpen] = useState(false);

    return (
        <>
            <div className='flex flex-col items-center w-full h-full overflow-y-auto drain-scrollbar mt-6'>
                <div className='flex flex-col items-center h-full w-full md:w-5/6 gap-5'>
                    <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                        <h2 className='text-2xl font-bold'>drain API key manager</h2>

                        <div className='flex gap-3'>
                            <Button className='w-56 py-2 rounded-md transition-colors duration-150' onClick={() => setKeyNameModalOpen(true)}>create API key</Button>
                        </div>
                    </div>

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
                                                if (confirm(`are you sure you want to delete the API key "${apiKey.name}"? this action cannot be undone. any programs using this key will no longer be able to authenticate.`)) {
                                                    const res = await axios.post('/$/auth/api/keys/regen', { name: apiKey.name });
                                                    setKeyWasARegen(true);
                                                    setKeyValue(res.data.key);
                                                    authManager.fetchAPIKeys();
                                                }
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
                                                    axios.post('/$/auth/api/keys/delete', { name: apiKey.name }).then(() => authManager.fetchAPIKeys());
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
                </div>
            </div>

            <Dialog open={keyNameModalOpen} onOpenChange={setKeyNameModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>create a new API key</DialogTitle>
                        <DialogDescription>name your API key something you'll remember later, such as the app you're using it in</DialogDescription>
                    </DialogHeader>

                    <Input placeholder='Cloudflare Worker #5' className='w-full mb-4' ref={keyNameRef} onKeyUp={(e) => (e.key === 'Enter') && keyNameSetRef.current!.click()} />

                    {keyNameError && (<div className='text-red-500 mb-2'>{keyNameError}</div>)}

                    <Button className='w-3/4' ref={keyNameSetRef} onClick={async () => {
                        const req = await axios.post('/$/auth/api/keys/create', {
                            name: keyNameRef.current!.value
                        });

                        if (req.data.error) setKeyNameError(req.data.error);
                        else {
                            setKeyValue(req.data.key);
                            setKeyNameModalOpen(false);
                            authManager.fetchAPIKeys();
                        }
                    }}>submit</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={!!keyValue} onOpenChange={(isOpen) => !isOpen && setKeyValue('')}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>API key {keyWasARegen ? 'regenerated' : 'created'}!</DialogTitle>
                        <DialogDescription>please copy and store this API key somewhere safe. you will not be able to view it again! {keyWasARegen ? 'if this key was being used elsewhere, please update it in order to keep your apps running smoothly!' : ''}</DialogDescription>
                    </DialogHeader>

                    <Input className='w-full mb-4 select-all' value={keyValue} readOnly />
                    <Button className='w-3/4' onClick={() => setKeyValue('')}>i have copied my API key</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={usageModalOpen} onOpenChange={setUsageModalOpen}>
                <DialogContent className='min-w-5/6! w-5/6! max-w-5/6! max-h-5/6! overflow-y-auto drain-scrollbar'>
                    <DialogHeader>
                        <DialogTitle>using drain API keys</DialogTitle>
                        <DialogDescription>drain API keys can be used to authenticate requests to the drain API. they should be included in the <code>Authorization</code> header of your requests.</DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div className='flex flex-col'>
                            <h3 className='font-semibold'>authenticating</h3>
                            <span>you can authenticate using 2 methods:</span>
                            <ul className='list-disc list-inside'>
                                <li>include the API key in the <code>Authorization</code> header</li>
                                <li>include the API key as a query parameter named <code>key</code></li>
                            </ul>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>curl -H "Authorization: YOUR_API_KEY_HERE" https://{location.host}/$/v1/[endpoint]</code></pre>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>curl "https://{location.host}/$/v1/[endpoint]?key=YOUR_API_KEY_HERE"</code></pre>
                        </div>

                        <h2 className='text-lg font-bold'>endpoints!</h2>

                        <div className='flex flex-col'>
                            <h3 className='font-semibold'>/$/v1/getKeys</h3>
                            <span>this returns keys of the provided count from a site. if the count is higher than the site, the keys array will simply be short.</span>
                            <span>requires read permission of the site</span>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>GET https://{location.host}/$/v1/getKeys?site=[site]&count=[count]</code></pre>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>{`{\n\tsite: "[domain]",\n\tkeys: ["[key1]", "[key2]", ...]\n}`}</code></pre>
                        </div>

                        <div className='flex flex-col'>
                            <h3 className='font-semibold'>/$/v1/getPrecheckedKeys</h3>
                            <span>same as getKeys, but they're PRECHECKED, ensuring that the key you get is valid!</span>
                            <span>responses will take slightly longer than getKeys since keys have to be prechecked (obviously)</span>
                            <span>requires edit permission of the site; you can only get 5 keys at once unless you are a site admin</span>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>GET https://{location.host}/$/v1/getPrecheckedKeys?site=[site]&count=[count]</code></pre>
                            <pre className='bg-gray-100 p-4 rounded-md my-2'><code>{`{\n\tsite: "[domain]",\n\tkeys: ["[key1]", "[key2]", ...]\n}`}</code></pre>
                        </div>
                    </div>

                    <span>more endpoints will be added later...if i feel like it. you can always make an issue to request one on the <a className='text-blue-500 underline' href='https://github.com/VillainsRule/Drain' target='_blank'>drain repository!</a></span>
                </DialogContent>
            </Dialog >
        </>
    )
});

export default APIKeys;