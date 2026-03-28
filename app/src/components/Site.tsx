import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { AutoComplete } from './ui/autocomplete';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

import ArrowDownWideNarrow from 'lucide-react/icons/arrow-down-wide-narrow';
import Copy from 'lucide-react/icons/copy';
import ListPlus from 'lucide-react/icons/list-plus';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Trash from 'lucide-react/icons/trash';
import UserCog from 'lucide-react/icons/user-cog';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';
import adminManager from '@/managers/AdminManager';

import { displayMoney } from '@/lib/utils';

const randomHex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const fakeKeys = [randomHex(16), randomHex(16), randomHex(16)];

const SiteKeys = observer(function SiteKeys() {
    const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
    const [bulkQueue, setBulkQueue] = useState<{ key: string; status: 'pending' | 'processing' | 'ok' | 'err'; error?: string }[]>([]);
    const [bulkTextarea, setBulkTextarea] = useState('');
    const [bulkAddError, setBulkAddError] = useState('');
    const bulkTailRef = useRef<Promise<void>>(Promise.resolve());

    const [accessDialogOpen, setAccessDialogOpen] = useState(false);

    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [addUserSelectedId, setAddUserSelectedId] = useState<number | null>(null);
    const [addUserError, setAddUserError] = useState('');

    const [validKeys, setValidKeys] = useState<string[]>([]);
    const [invalidKeys, setInvalidKeys] = useState<string[]>([]);

    const site = siteManager.site;

    if (!site) return <div className='flex justify-center items-center w-full mt-10 text-muted-foreground text-lg'>fetching site...</div>

    return (
        <div className='flex flex-col w-11/12 drain-scrollbar'>
            <div className='flex justify-between items-center flex-col lg:flex-row w-full mt-5 gap-3 lg:gap-0'>
                <h2 className='text-2xl font-bold'>{site.id} x{Object.keys(site.keys).length} {site.totalBalance && site.totalBalance !== 0 && <> (${displayMoney(site.totalBalance)})</>}</h2>

                <div className='flex gap-3'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={() => shadd.prompt(
                                'add a new key',
                                'enter the key you want to add to this site. it can be any string up to 256 characters.',
                                { placeholder: fakeKeys[0], maxLength: 256, minLength: 1 },
                                (value: string) => {
                                    api.v1.sites.keys.create.post({
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
                                api.v1.sites.keys.sort.post({ domain: site.id }).then((res) => {
                                    if (res.data) siteManager.refreshCurrent();
                                    else alert(errorFrom(res));
                                });
                            }}><ArrowDownWideNarrow /></Button>
                        </TooltipTrigger>

                        <TooltipContent>sort by $$</TooltipContent>
                    </Tooltip>}

                    {authManager.isAdmin() && site.supportsBalancer && <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className='w-12 py-2 rounded-md transition-colors duration-150 hidden md:flex' onClick={async () => {
                                const keys = Object.keys(site.keys);
                                const hasOver50Keys = keys.length > 50;
                                if (hasOver50Keys && !confirm('this site has over 50 keys, rechecking all of them MAY HIT RATELIMITS AND GET THE CHECKER IP BANNED. are you sure you want to proceed?')) return;

                                for (const key of keys) await new Promise((r) => {
                                    api.v1.sites.keys.recheck.post({ domain: site.id, key }).then((res) => {
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

                    {authManager.isAdmin() && <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className='w-12 py-2 rounded-md transition-colors duration-150 hidden md:flex' onClick={() => setAccessDialogOpen(true)}><UserCog className='w-4 h-4' /></Button>
                        </TooltipTrigger>

                        <TooltipContent>manage access</TooltipContent>
                    </Tooltip>}
                </div>
            </div>

            <div className='flex flex-col items-center justify-start gap-1 mt-4 pb-4'>
                {Object.keys(site.keys).map((key, i) => {
                    const balance = site.keys[key]

                    return (
                        <div key={i} className='flex items-center justify-center w-full rounded-md md:px-2 hover:bg-accent transition-colors duration-125 py-2 cursor-pointer gap-2 md:gap-5 max-h-12' style={{
                            color: validKeys.includes(key) ? 'green' : invalidKeys.includes(key) ? 'red' : ''
                        }}>
                            <Input value={'...' + key.slice(-4)} readOnly className='h-8 font-mono w-fit text-center sm:hidden flex px-1 py-0.5' />
                            <Input value={key} readOnly className='font-mono h-8 text-center hidden sm:flex py-0.5' />

                            {balance && balance !== '?' && <Input value={balance} readOnly className='font-mono min-w-20 py-0.5 sm:min-w-0 sm:w-36 text-center px-1' />}

                            <Button variant='outline' size='sm' onClick={() => navigator.clipboard.writeText(key)}>
                                <Copy className='h-4 w-4' />
                            </Button>

                            {Boolean(site.supportsBalancer && site.users) && <Button variant='outline' size='sm' onClick={() => {
                                api.v1.sites.keys.recheck.post({ domain: site.id, key: key }).then((res) => {
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
                                api.v1.sites.keys.delete.post({ domain: site.id, key }).then((res) => {
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
                if (!isOpen && bulkQueue.some(k => k.status === 'pending' || k.status === 'processing')) return;

                setBulkAddDialogOpen(isOpen);

                if (!isOpen) {
                    setBulkQueue([]);
                    setBulkTextarea('');
                    setBulkAddError('');
                }
            }}>
                <DialogContent className='max-h-9/10 flex flex-col gap-3'>
                    <DialogHeader>
                        <DialogTitle>bulk add keys</DialogTitle>
                        <DialogDescription>{site.id}</DialogDescription>
                    </DialogHeader>

                    {bulkQueue.length > 0 && (() => {
                        const done = bulkQueue.filter(k => k.status === 'ok' || k.status === 'err').length;
                        const pct = (done / bulkQueue.length) * 100;
                        return (
                            <div className='w-full h-1.5 rounded-full bg-muted overflow-hidden'>
                                <div
                                    className='h-full bg-primary transition-all duration-300 rounded-full'
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        );
                    })()}

                    <div className='flex flex-col gap-2'>
                        <Textarea
                            placeholder={fakeKeys.join('\n')}
                            value={bulkTextarea}
                            onChange={(e) => {
                                setBulkTextarea(e.target.value);
                                setBulkAddError('');
                            }}
                            className='max-h-40 overflow-auto font-mono text-sm'
                        />

                        {bulkAddError && <div className='text-red-500 text-sm'>{bulkAddError}</div>}

                        <Button onClick={() => {
                            const keys = bulkTextarea
                                .split('\n')
                                .map(k => k.trim())
                                .filter(k => k.length > 0);

                            if (keys.length === 0) return setBulkAddError('enter at least one key.');
                            if (keys.some(k => k.length > 256)) return setBulkAddError('one or more keys exceed 256 chars.');

                            const alreadyQueued = new Set(bulkQueue.map(i => i.key));
                            const newItems = keys.filter(k => !alreadyQueued.has(k));

                            if (newItems.length === 0) return setBulkAddError('all those keys are already queued.');

                            setBulkQueue(prev => [...prev, ...newItems.map(key => ({ key, status: 'pending' as const }))]);
                            setBulkTextarea('');

                            for (const key of newItems) {
                                bulkTailRef.current = bulkTailRef.current.then(async () => {
                                    setBulkQueue(prev => prev.map(k => k.key === key ? { ...k, status: 'processing' } : k));

                                    const res = await api.v1.sites.keys.create.post({ domain: site.id, key });

                                    if (res.data) {
                                        siteManager.refreshCurrent();
                                        setBulkQueue(prev => prev.map(k => k.key === key ? { ...k, status: 'ok' } : k));
                                    } else {
                                        setBulkQueue(prev => prev.map(k => k.key === key ? { ...k, status: 'err', error: errorFrom(res) } : k));
                                    }

                                    await new Promise(r => setTimeout(r, 100));
                                });
                            }
                        }}>
                            queue keys
                        </Button>
                    </div>

                    {bulkQueue.length > 0 && (
                        <div className='flex flex-col gap-0.5 overflow-auto max-h-64 border rounded-md p-1'>
                            {bulkQueue.map((item, i) => (
                                <div key={i} className='flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent gap-3'>
                                    <span className='font-mono text-xs truncate flex-1 text-muted-foreground'>{item.key}</span>
                                    {item.status === 'pending' && <span className='text-xs text-muted-foreground shrink-0'>queued</span>}
                                    {item.status === 'processing' && <span className='text-xs text-blue-500 shrink-0'>adding...</span>}
                                    {item.status === 'ok' && <span className='text-xs text-green-500 shrink-0'>✓ added</span>}
                                    {item.status === 'err' && <span className='text-xs text-red-500 shrink-0' title={item.error}>✗ {item.error}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {bulkQueue.length > 0 && !bulkQueue.some(k => k.status === 'pending' || k.status === 'processing') && (
                        <div className='flex items-center justify-between text-sm text-muted-foreground'>
                            <span>
                                {bulkQueue.filter(k => k.status === 'ok').length} added,{' '}
                                {bulkQueue.filter(k => k.status === 'err').length} failed
                            </span>

                            <Button variant='outline' size='sm' onClick={() => {
                                setBulkAddDialogOpen(false);
                                setBulkQueue([]);
                                setBulkTextarea('');
                            }}>
                                close
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={accessDialogOpen} onOpenChange={(isOpen) => setAccessDialogOpen(isOpen)}>
                <DialogContent className='max-h-9/10'>
                    <DialogHeader>
                        <DialogTitle>manage access</DialogTitle>
                        <DialogDescription>manage who can access {site.id}</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col gap-3'>
                        {site.users.map((userId) => (
                            <div key={userId} className='flex items-center justify-between rounded-md px-2 py-1 hover:bg-accent transition-colors duration-125'>
                                <span>@{adminManager.users.find(e => e.id === userId)?.username || '?'}</span>
                                <Button variant='outline' size='sm' onClick={() => {
                                    api.v1.sites.access.remove.post({ domain: site.id, userId }).then((res) => {
                                        if (res.data) siteManager.refreshCurrent();
                                        else alert(errorFrom(res));
                                    });
                                }}>revoke access</Button>
                            </div>
                        ))}

                        <div className='border-t pt-3'>
                            <Button variant='outline' size='sm' className='w-full' onClick={() => setAddUserDialogOpen(true)}>
                                + add user
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={addUserDialogOpen} onOpenChange={(isOpen) => setAddUserDialogOpen(isOpen)}>
                <DialogContent className='max-h-9/10'>
                    <DialogHeader>
                        <DialogTitle>add user</DialogTitle>
                        <DialogDescription>grant access to {site.id} for a user by entering their username</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col gap-3'>
                        <AutoComplete
                            options={adminManager.users
                                .filter(e => !e.admin && !site.users.includes(e.id))
                                .map(e => ({ value: e.id.toString(), label: '@' + e.username }))}
                            onValueChange={(e) => setAddUserSelectedId(Number(e.value))}
                        />

                        {addUserError && <div className='text-red-500 text-sm'>{addUserError}</div>}

                        <Button
                            className='w-full'
                            disabled={!addUserSelectedId}
                            onClick={() => {
                                if (addUserSelectedId) api.v1.sites.access.add.post({ domain: site.id, userId: addUserSelectedId }).then((res) => {
                                    if (res.data) {
                                        siteManager.refreshCurrent();
                                        setAddUserDialogOpen(false);
                                    } else setAddUserError(errorFrom(res));
                                });
                            }}
                        >
                            grant access
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
});

export default SiteKeys;