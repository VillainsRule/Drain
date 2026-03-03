import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '../shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../shadcn/dialog';
import { Input } from '../shadcn/input';
import { Textarea } from '../shadcn/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../shadcn/tooltip';

import ArrowDownWideNarrow from 'lucide-react/icons/arrow-down-wide-narrow';
import Copy from 'lucide-react/icons/copy';
import ListPlus from 'lucide-react/icons/list-plus';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Trash from 'lucide-react/icons/trash';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const randomHex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const fakeKeys = [randomHex(16), randomHex(16), randomHex(16)];

const SiteKeys = observer(function SiteKeys() {
    const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
    const [bulkAddError, setBulkAddError] = useState('');
    const [bulkAddProgress, setBulkAddProgress] = useState('');

    const [validKeys, setValidKeys] = useState<string[]>([]);
    const [invalidKeys, setInvalidKeys] = useState<string[]>([]);

    const site = siteManager.site;

    if (!site) return <div className='flex justify-center items-center w-full mt-10 text-muted-foreground text-lg'>fetching site...</div>

    return (
        <>
            <div className='flex justify-between items-center flex-col lg:flex-row w-full mt-3 gap-3 lg:gap-0'>
                <h2 className='text-2xl font-bold'>{site.id} x{Object.keys(site.keys)?.length}</h2>
                <div className='flex gap-3'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={() => shadd.prompt(
                                'add a new key',
                                'enter the key you want to add to this site. it can be any string up to 256 characters.',
                                { placeholder: fakeKeys[0], maxLength: 256, minLength: 1 },
                                (value) => {
                                    api.sites.addKey.post({
                                        domain: site.id,
                                        key: value
                                    }).then((res) => {
                                        if (res.data) {
                                            siteManager.refreshCurrent();
                                            shadd.close();
                                        } else shadd.setError(errorFrom(res));
                                    });
                                }
                            )}><Plus /></Button>
                        </TooltipTrigger>

                        <TooltipContent>add key</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={() => setBulkAddDialogOpen(true)}><ListPlus /></Button>
                        </TooltipTrigger>

                        <TooltipContent>bulk add keys</TooltipContent>
                    </Tooltip>

                    {site.sortable && <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={() => {
                                api.sites.sortKeys.post({ domain: site.id }).then((res) => {
                                    if (res.data) siteManager.refreshCurrent();
                                    else alert(errorFrom(res));
                                });
                            }}><ArrowDownWideNarrow /></Button>
                        </TooltipTrigger>

                        <TooltipContent>sort by $$</TooltipContent>
                    </Tooltip>}

                    {authManager.isAdmin() && <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className='w-12 py-2 rounded-md transition-colors duration-150 hidden md:flex' onClick={async () => {
                                const keys = Object.keys(site.keys);
                                const hasOver50Keys = keys.length > 50;
                                if (hasOver50Keys && !confirm('this site has over 50 keys, rechecking all of them MAY HIT RATELIMITS AND GET THE CHECKER IP BANNED. are you sure you want to proceed?')) return;

                                for (const key of keys) await new Promise((r) => {
                                    api.sites.balancer.post({ domain: site.id, key }).then((res) => {
                                        if (res.data) {
                                            siteManager.refreshCurrent();
                                            setInvalidKeys(prev => prev.filter(k => k !== key));
                                            setValidKeys(prev => prev.includes(key) ? prev : [...prev, key]);
                                        } else {
                                            console.error(errorFrom(res));
                                            setValidKeys(prev => prev.filter(k => k !== key));
                                            setInvalidKeys(prev => prev.includes(key) ? prev : [...prev, key]);
                                        }
                                        r(void 0);
                                    });
                                });
                            }}><RefreshCw /></Button>
                        </TooltipTrigger>

                        <TooltipContent>recheck all</TooltipContent>
                    </Tooltip>}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={async () => {
                                const allKeys = Object.keys(site.keys).join('\n');
                                await navigator.clipboard.writeText(allKeys);
                            }}><Copy /></Button>
                        </TooltipTrigger>

                        <TooltipContent>copy all keys</TooltipContent>
                    </Tooltip>
                </div>
            </div >

            <div className='flex flex-col items-center justify-start gap-1 mt-4 pb-4'>
                {Object.keys(site.keys).map((key, i) => {
                    const balance = site.keys[key]

                    return (
                        <div key={i} className='flex items-center justify-center w-full rounded-md md:px-7 hover:bg-gray-50 transition-colors duration-125 py-2 cursor-pointer gap-2 md:gap-5' style={{
                            color: validKeys.includes(key) ? 'green' : invalidKeys.includes(key) ? 'red' : ''
                        }}>
                            <Input value={'...' + key.slice(-4)} readOnly className='font-mono w-fit text-center sm:hidden flex px-1' />
                            <Input value={key} readOnly className='font-mono text-center hidden sm:flex' />

                            {balance && balance !== '?' && <Input value={balance} readOnly className='font-mono min-w-20 sm:min-w-0 sm:w-36 text-center px-1' />}

                            <Button variant='outline' size='sm' onClick={() => navigator.clipboard.writeText(key)}>
                                <Copy className='h-4 w-4' />
                            </Button>

                            {Boolean(site.supportsBalancer && site.editors) && <Button variant='outline' size='sm' onClick={() => {
                                api.sites.balancer.post({ domain: site.id, key: key }).then((res) => {
                                    if (res.data) {
                                        siteManager.refreshCurrent();
                                        setInvalidKeys(prev => prev.filter(k => k !== key));
                                        setValidKeys(prev => prev.includes(key) ? prev : [...prev, key]);
                                    } else {
                                        console.error(errorFrom(res));
                                        setValidKeys(prev => prev.filter(k => k !== key));
                                        setInvalidKeys(prev => prev.includes(key) ? prev : [...prev, key]);
                                    }
                                });
                            }}>
                                <RefreshCw className='h-4 w-4' />
                            </Button>}

                            {authManager.isAdmin() && <Button variant='destructive' size='sm' className='hidden md:flex' onClick={() => {
                                api.sites.removeKey.post({ domain: site.id, key }).then((res) => {
                                    if (res.data) siteManager.refreshCurrent();
                                    else alert(errorFrom(res));
                                });
                            }}>
                                <Trash className='h-4 w-4' />
                            </Button>}
                        </div>
                    )
                })}
            </div>

            <Dialog open={bulkAddDialogOpen} onOpenChange={(isOpen) => {
                setBulkAddDialogOpen(isOpen);
                setBulkAddProgress('');
                setBulkAddError('');
            }}>
                <DialogContent className='max-h-9/10'>
                    <DialogHeader>
                        <DialogTitle>bulk add keys</DialogTitle>
                        <DialogDescription>add multiple keys to {site.id}!</DialogDescription>
                    </DialogHeader>

                    <Textarea placeholder={fakeKeys.join('\n')} id='bulkAddTextarea' className='max-h-74 overflow-auto' />

                    {bulkAddError && (<div className='text-red-500'>{bulkAddError}</div>)}
                    {bulkAddProgress && (<div className='text-muted-foreground'>{bulkAddProgress}</div>)}

                    <Button className='w-3/4' onClick={async () => {
                        const input = (document.getElementById('bulkAddTextarea') as HTMLInputElement).value;
                        const keys = input.split('\n').map(key => key.trim()).filter(key => key.length > 0);
                        if (keys.length === 0) return setBulkAddError('Please enter at least one key.');

                        if (keys.some(k => k.length > 256)) return setBulkAddError('you have 1 or more keys with >256 length, which is too long');

                        for (let i = 0; i < keys.length; i++) {
                            const key = keys[i];

                            const res = await api.sites.addKey.post({ domain: site.id, key });

                            if (res.data) {
                                siteManager.refreshCurrent();
                                setBulkAddError('');
                            } else setBulkAddError(`${key}: ${errorFrom(res)}`);

                            setBulkAddProgress(`${i + 1}/${keys.length} keys processed`);

                            if ((i + 1) === keys.length) {
                                setBulkAddError('');
                                setBulkAddProgress('');
                                setBulkAddDialogOpen(false);
                            }

                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }}>submit</Button>
                </DialogContent>
            </Dialog>
        </>
    )
});

export default SiteKeys;