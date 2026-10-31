import { useRef, useState } from 'react';

import { ArrowDownWideNarrow, DollarSign, Regex, Type, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import authStore from '@/store/AuthStore';
import siteStore from '@/store/SiteStore';

import api, { errorFrom } from '@/lib/eden';

import type { PublicSite } from '@/types';
import { Input } from '@/components/ui/input';

type Expression = { id: string, value: string, regex: boolean };

export default function Sort({ site }: { site: PublicSite }) {
    const [managePanelOpen, setManagePanelOpen] = useState(false);

    const [expressions, setExpressions] = useState<Expression[]>(() => site.sortPatterns.map((p) => ({ id: crypto.randomUUID(), value: p.value, regex: p.regex })));
    const pendingFocus = useRef<string | null>(null);

    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleSave = (next: Expression[]) => {
        setSaveState('saving');

        if (saveTimeout.current) clearTimeout(saveTimeout.current);

        saveTimeout.current = setTimeout(() => {
            api.v1.sites.sort.save.post({
                domain: site.id,
                patterns: next.map(({ value, regex }) => ({ value, regex })),
            }).then((res) => {
                if (res.data) {
                    setSaveState('saved');
                    site.sortPatterns = next.map(({ value, regex }) => ({ value, regex }));
                } else alert(errorFrom(res));
            });
        }, 600);
    };

    const update = (id: string, patch: Partial<Expression>) => {
        setExpressions((list) => {
            const next = list.map((item) => item.id === id ? { ...item, ...patch } : item);
            scheduleSave(next);
            return next;
        });
    };

    return (
        <>
            {(!!authStore.admin || site.sortPatterns.length > 0) && <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant='outline' onClick={() => {
                        if (site.sortPatterns.length < 1) setManagePanelOpen(true);
                        else api.v1.sites.sort.run.post({ domain: site.id }).then((res) => {
                            if (res.data) siteStore.refreshCurrent();
                            else alert(errorFrom(res));
                        });
                    }} onContextMenu={(e) => {
                        e.preventDefault();
                        setManagePanelOpen(true);
                    }}><ArrowDownWideNarrow /></Button>
                </TooltipTrigger>

                <TooltipContent>sort keys</TooltipContent>
            </Tooltip>}

            <Dialog open={managePanelOpen} onOpenChange={setManagePanelOpen}>
                <DialogContent className='md:max-w-xl'>
                    <DialogHeader>
                        <DialogTitle>manage sort patterns</DialogTitle>
                        <DialogDescription>return to this panel by right clicking "sort keys"</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col gap-3'>
                        {expressions.map((exp, i) => (
                            <div key={i} className='flex gap-2'>
                                <Button variant={exp.regex ? 'secondary' : 'outline'} size='icon' onClick={() => update(exp.id, { regex: true })}><Regex /></Button>
                                <Button variant={exp.regex ? 'outline' : 'secondary'} size='icon' onClick={() => update(exp.id, { regex: false })}><Type /></Button>

                                <div className='relative flex-1'>
                                    {exp.regex && <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-muted-foreground'>/</span>}
                                    <Input
                                        className={exp.regex ? 'px-5' : ''}
                                        value={exp.value}
                                        onChange={(e) => update(exp.id, { value: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const id = crypto.randomUUID();
                                                pendingFocus.current = id;
                                                setExpressions((list) => [...list, { id, value: '', regex: exp.regex }]);
                                            }
                                        }}
                                        ref={(e) => {
                                            if (e && pendingFocus.current === exp.id) {
                                                pendingFocus.current = null;
                                                e.focus();
                                            }
                                        }}
                                    />
                                    {exp.regex && <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-muted-foreground'>/</span>}
                                </div>

                                <Button variant='outline' size='icon' onClick={() => update(exp.id, { value: '\\$[0-9]+\\.?[0-9]{0,2}', regex: true })}><DollarSign /></Button>
                                <Button variant='outline' size='icon' onClick={() => setExpressions((list) => {
                                    const next = list.filter((item) => item.id !== exp.id);
                                    scheduleSave(next);
                                    return next;
                                })}><Trash2 /></Button>
                            </div>
                        ))}

                        <div className='flex gap-2'>
                            <Input className='ml-22 mr-22' onFocus={() => {
                                const id = crypto.randomUUID();
                                pendingFocus.current = id;
                                setExpressions((list) => [...list, { id, value: '', regex: false }]);
                            }} />
                        </div>

                        {saveState !== 'idle' && (
                            <div className='text-sm text-muted-foreground'>
                                {saveState === 'saving' ? 'changes saving...' : 'changes saved'}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}