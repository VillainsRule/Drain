import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import authManager from '@/managers/AuthManager';

import RefreshCw from 'lucide-react/icons/refresh-cw';
import Trash from 'lucide-react/icons/trash';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

const APIKeys = observer(function APIKeys() {
    useEffect(() => {
        authManager.fetchAPIKeys();
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

                        <span className='text-sm text-muted-foreground text-center'>created {apiKey.createdAt}<br />used {apiKey.lastUsed}</span>

                        <div className='flex gap-3'>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Button onClick={async () => {
                                        if (!confirm(`are you sure you want to delete the API key "${apiKey.name}"? this action cannot be undone. any programs using this key will no longer be able to authenticate.`)) return;

                                        const res = await api.auth.api.keys.regen.post({ name: apiKey.name });
                                        if (res.data) {
                                            shadd.copy(
                                                'API key regenerated!',
                                                'the API key has been regenerated! give this new key to any programs using the old key to keep them working:',
                                                res.data.key
                                            );

                                            authManager.fetchAPIKeys();
                                        } else shadd.setError(errorFrom(res));
                                    }}>
                                        <RefreshCw className='h-4 w-4' />
                                    </Button>
                                </TooltipTrigger>

                                <TooltipContent>regenerate API key</TooltipContent>
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

                                <TooltipContent>delete API key</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ))}
            </div>

            <a className='text-sm text-muted-foreground mt-4 cursor-pointer underline' target='_blank' href='/docs'>API documentation</a>
        </div>
    )
});

export default APIKeys;