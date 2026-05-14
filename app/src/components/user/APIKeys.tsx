import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import authStore from '@/store/AuthStore';

import RefreshCw from 'lucide-react/icons/refresh-cw';
import Trash2 from 'lucide-react/icons/trash-2';
import KeyRound from 'lucide-react/icons/key-round';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';
import { getRelativeTime } from '@/lib/utils';

import type { PublicAPIKey } from '@/types';

const APIKeys = observer(function APIKeys() {
    const [apiKeys, setAPIKeys] = useState<PublicAPIKey[]>([]);

    const fetchAPIKeys = async () => {
        const { data } = await api.auth.api.keys.get();
        if (data) setAPIKeys(data.apiKeys.map((a) => ({
            ...a,
            createdAt: getRelativeTime(a.createdAt),
            lastUsed: getRelativeTime(a.lastUsed)
        })));
    }

    useEffect(() => {
        fetchAPIKeys();
    }, []);

    const createKey = () => shadd.prompt(
        'create a new API key',
        'name your API key something you\'ll remember later, such as the app you\'re using it in',
        { placeholder: 'Cloudflare Worker #5', maxLength: 24, minLength: 1 },
        async (value: string) => {
            const req = await api.auth.api.keys.create.post({ name: value });
            if (req.data) {
                shadd.copy(
                    'API key created!',
                    'the API key has been created! give this key to any programs you want to authenticate with this drain instance:',
                    req.data.key
                );

                fetchAPIKeys();
            } else shadd.setError(errorFrom(req));
        }
    );

    return (
        <div className='flex flex-col items-center w-full h-full md:w-5/6 gap-5 overflow-y-auto drain-scrollbar mt-6'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <h2 className='text-2xl font-bold'>API keys</h2>
                <Button className='flex items-center gap-2 w-56 py-2 rounded-md transition-colors duration-150' onClick={createKey}>
                    <KeyRound className='h-4 w-4' />
                    create API key
                </Button>
            </div>

            {!authStore.instance.allowAPIKeys && (
                <div className='flex flex-col items-center'>
                    <span className='text-red-500 underline font-bold'>API keys are currently disabled on the instance</span>
                    <span className='text-red-500 underline'>you can create & manage them, but access attempts will be blocked</span>
                </div>
            )}

            <div className='flex flex-col gap-2 w-full'>
                {apiKeys.length < 1
                    ? <p className='text-center text-muted-foreground text-sm py-4'>you have no API keys. <span className='underline cursor-pointer' onClick={createKey}>create one!</span></p>
                    : apiKeys.map((apiKey) => (
                        <div key={apiKey.name} className='flex items-center justify-between w-full py-3 px-4 border rounded-md gap-4'>
                            <span className='font-medium w-32 shrink-0 truncate'>{apiKey.name}</span>

                            <span className='font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded hidden sm:block'>{apiKey.key}</span>

                            <div className='flex flex-col items-end sm:items-center sm:flex-row gap-0 sm:gap-4 text-xs text-muted-foreground shrink-0'>
                                <span>created {apiKey.createdAt}</span>
                                <span>used {apiKey.lastUsed}</span>
                            </div>

                            <div className='flex items-center gap-1 shrink-0'>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size='sm' variant='ghost' onClick={async () => {
                                            if (!confirm(`are you sure you want to regenerate the API key "${apiKey.name}"? any programs using this key will no longer be able to authenticate.`)) return;

                                            const res = await api.auth.api.keys.regen.post({ name: apiKey.name });
                                            if (res.data) {
                                                shadd.copy(
                                                    'API key regenerated!',
                                                    'the API key has been regenerated! give this new key to any programs using the old key to keep them working:',
                                                    res.data.key
                                                );

                                                fetchAPIKeys();
                                            } else shadd.setError(errorFrom(res));
                                        }}>
                                            <RefreshCw className='h-4 w-4' />
                                            <span className='hidden lg:inline ml-1.5'>regenerate</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>regenerate API key</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => {
                                                if (confirm(`are you sure you want to delete the API key "${apiKey.name}"?\n\nany programs using this key will stop working.`))
                                                    api.auth.api.keys.delete.post({ name: apiKey.name }).then(() => fetchAPIKeys());
                                            }}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>delete API key</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    ))
                }
            </div>

            <Dialog>
                <DialogTrigger>
                    <span className='text-sm text-muted-foreground mt-4 cursor-pointer underline'>API documentation</span>
                </DialogTrigger>

                <DialogContent className='min-w-4/5 w-4/5 flex items-center justify-center'>
                    <iframe src='/docs' className='w-[calc(100% -)] h-[80vh] rounded-md border-none' />
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default APIKeys;