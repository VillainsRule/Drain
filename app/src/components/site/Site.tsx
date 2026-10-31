import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

import ArrowDownWideNarrow from 'lucide-react/icons/arrow-down-wide-narrow';
import Copy from 'lucide-react/icons/copy';
import FunnelX from 'lucide-react/icons/funnel-x';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Trash from 'lucide-react/icons/trash';

import api, { errorFrom } from '@/lib/eden';

import authStore from '@/store/AuthStore';
import siteStore from '@/store/SiteStore';

import { displayMoney } from '@/lib/utils';

import AddKey from '@/components/site/buttons/AddKey';
import BulkAddKeys from '@/components/site/buttons/BulkAddKeys';
import ManageAccess from '@/components/site/buttons/ManageAccess';
import Settings from '@/components/site/buttons/Settings';

const SiteKeys = observer(function SiteKeys() {
    const [validKeys, setValidKeys] = useState<string[]>([]);
    const [invalidKeys, setInvalidKeys] = useState<string[]>([]);

    const site = siteStore.site;
    if (!site) return <div className='flex justify-center items-center w-full mt-10 text-muted-foreground text-lg'>fetching site...</div>

    return (
        <div className='flex flex-col w-11/12 drain-scrollbar'>
            <div className='flex justify-between items-center flex-col lg:flex-row w-full mt-5 gap-3 lg:gap-0'>
                <h2 className='text-2xl font-bold'>{site.id} x{Object.keys(site.keys).length} {!!(site.totalBalance && site.totalBalance > 0) && <>(${displayMoney(site.totalBalance)})</>}</h2>

                <div className='flex gap-3'>
                    <AddKey site={site} />
                    <BulkAddKeys site={site} />

                    {site.sortable && <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant='outline' onClick={() => {
                                api.v1.sites.keys.sort.post({ domain: site.id }).then((res) => {
                                    if (res.data) siteStore.refreshCurrent();
                                    else alert(errorFrom(res));
                                });
                            }}><ArrowDownWideNarrow /></Button>
                        </TooltipTrigger>

                        <TooltipContent>sort by $$</TooltipContent>
                    </Tooltip>}

                    {!!authStore.admin && site.supportsBalancer && <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant='outline' onClick={async () => {
                                const keys = Object.keys(site.keys);
                                const hasOver50Keys = keys.length > 50;
                                if (hasOver50Keys && !site.useProxy && !confirm('this site does not employ a proxy for checking. do you want to proceed?')) return;

                                for (const key of keys) await new Promise((r) => {
                                    api.v1.sites.keys.recheck.post({ domain: site.id, key }).then((res) => {
                                        if (res.data) {
                                            siteStore.refreshCurrent();
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

                    {!!authStore.admin && site.supportsBalancer && <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant='outline' onClick={() => {
                                api.v1.sites.keys.delete.bulk.post({
                                    domain: site.id,
                                    keys: Object.keys(site.keys).filter(k => invalidKeys.includes(k))
                                }).then((res) => {
                                    if (res.data) siteStore.refreshCurrent();
                                    else alert(errorFrom(res));
                                });
                            }}><FunnelX /></Button>
                        </TooltipTrigger>

                        <TooltipContent>delete invalid</TooltipContent>
                    </Tooltip>}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant='outline' onClick={async () => {
                                const allKeys = Object.keys(site.keys).join('\n');
                                await navigator.clipboard.writeText(allKeys);
                            }}><Copy /></Button>
                        </TooltipTrigger>

                        <TooltipContent>copy all keys</TooltipContent>
                    </Tooltip>

                    {!!authStore.admin && <ManageAccess site={site} />}
                    {!!authStore.admin && <Settings site={site} />}
                </div>
            </div>

            <div className='flex flex-col items-center justify-start gap-1 mt-4 pb-4'>
                {Object.keys(site.keys).map((key, i) => {
                    const balance = site.keys[key]

                    return (
                        <div key={i} className='flex items-center justify-center w-full rounded-md md:px-2 hover:bg-accent transition-colors duration-125 py-2 cursor-pointer gap-2 md:gap-5 max-h-12' style={{
                            color: validKeys.includes(key) ? 'green' : invalidKeys.includes(key) ? 'red' : ''
                        }}>
                            <Input value={'...' + key.slice(-4)} readOnly className='h-8 font-mono w-fit text-center sm:hidden flex px-1 py-0.5 border-none shadow-none' />
                            <Input value={key} readOnly className='font-mono h-8 text-center hidden sm:flex py-0.5 border-none shadow-none' />

                            {balance && balance !== '?' && <Input value={balance} readOnly className='font-mono min-w-20 py-0.5 sm:min-w-0 sm:w-36 text-center px-1 border-none shadow-none' />}

                            <Button variant='ghost' size='sm' onClick={() => navigator.clipboard.writeText(key)}>
                                <Copy className='h-4 w-4' />
                            </Button>

                            {Boolean(site.supportsBalancer && site.users) && <Button variant='ghost' size='sm' onClick={() => {
                                api.v1.sites.keys.recheck.post({ domain: site.id, key: key }).then((res) => {
                                    if (res.data) {
                                        siteStore.refreshCurrent();
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

                            {!!authStore.admin && <Button variant='ghost' size='sm' className='hidden md:flex' onClick={() => {
                                api.v1.sites.keys.delete.post({ domain: site.id, key }).then((res) => {
                                    if (res.data) siteStore.refreshCurrent();
                                    else alert(errorFrom(res));
                                });
                            }}>
                                <Trash className='h-4 w-4 text-red-500' />
                            </Button>}
                        </div>
                    )
                })}
            </div>
        </div>
    )
});

export default SiteKeys;