import { useRef, useState } from 'react';

import { ListPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import siteStore from '@/store/SiteStore';

import api, { errorFrom } from '@/lib/eden';

import type { PublicSite } from '@/types';

const randomHex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const fakeKeys = [randomHex(32), randomHex(32), randomHex(32)];

export default function BulkAddKeys({ site }: { site: PublicSite }) {
    const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
    const [bulkQueue, setBulkQueue] = useState<{ key: string; status: 'pending' | 'processing' | 'ok' | 'err'; error?: string }[]>([]);
    const [bulkTextarea, setBulkTextarea] = useState('');
    const [bulkAddError, setBulkAddError] = useState('');
    const bulkTailRef = useRef<Promise<void>>(Promise.resolve());

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant='outline' className='hidden md:flex' onClick={() => setBulkAddDialogOpen(true)}><ListPlus /></Button>
                </TooltipTrigger>

                <TooltipContent>bulk add keys</TooltipContent>
            </Tooltip>


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
                            const newItems = Array.from(new Set(keys)).filter(k => !alreadyQueued.has(k));

                            if (newItems.length === 0) return setBulkAddError('all those keys are already queued.');

                            setBulkQueue(prev => [...prev, ...newItems.map(key => ({ key, status: 'pending' as const }))]);
                            setBulkTextarea('');

                            for (const key of newItems) {
                                bulkTailRef.current = bulkTailRef.current.then(async () => {
                                    setBulkQueue(prev => prev.map(k => k.key === key ? { ...k, status: 'processing' } : k));

                                    const res = await api.v1.sites.keys.create.post({ domain: site.id, key });

                                    if (res.data) {
                                        siteStore.refreshCurrent();
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
        </>
    )
}