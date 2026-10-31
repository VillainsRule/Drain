import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import siteStore from '@/store/SiteStore';

import api, { errorFrom } from '@/lib/eden';

import type { PublicSite } from '@/types';

export default function Settings({ site }: { site: PublicSite }) {
    return (
        <Dialog>
            <DialogTrigger>
                <Tooltip>
                    <TooltipTrigger>
                        <Button variant='outline'><SlidersHorizontal className='w-4 h-4' /></Button>
                    </TooltipTrigger>

                    <TooltipContent>site settings</TooltipContent>
                </Tooltip>
            </DialogTrigger>

            <DialogContent className='md:max-w-xl'>
                <DialogHeader>
                    <DialogTitle>site settings</DialogTitle>
                    <DialogDescription>configure settings for {site.id}</DialogDescription>
                </DialogHeader>

                <div className='flex flex-col gap-3'>
                    <label className='flex items-center gap-2'>
                        <Checkbox checked={site.public} onCheckedChange={(e) => {
                            api.v1.sites.settings.public.post({ domain: site.id, public: !!e.valueOf() }).then((res) => {
                                if (res.data) siteStore.refreshCurrent();
                                else alert(errorFrom(res));
                            });
                        }} />
                        <span>public (anyone can join the site from discovery)</span>
                    </label>

                    <label className='flex items-center gap-2'>
                        <Checkbox checked={site.useProxy} onCheckedChange={(e) => {
                            api.v1.sites.settings.useProxy.post({ domain: site.id, useProxy: !!e.valueOf() }).then((res) => {
                                if (res.data) siteStore.refreshCurrent();
                                else alert(errorFrom(res));
                            });
                        }} />
                        <span>proxy balancer (avoids ratelimits on some sites)</span>
                    </label>

                    <div className='flex items-center gap-3'>
                        <span className='shrink-0'>discovery tag:</span>
                        <Input className='inline-block focus-visible:ring-0 border-0 border-b shadow-none rounded-none transition-colors duration-100 mt-px px-0' defaultValue={site.description} onChange={(e) => {
                            api.v1.sites.settings.description.post({ domain: site.id, description: e.target.value }).then((res) => {
                                if (res.data) siteStore.refreshCurrent();
                                else alert(errorFrom(res));
                            });
                        }} />
                    </div>

                    <div className='flex flex-col gap-1'>
                        <span>notes</span>
                        <Textarea defaultValue={site.notes} onChange={(e) => {
                            api.v1.sites.settings.notes.post({ domain: site.id, notes: e.target.value }).then((res) => {
                                if (res.data) siteStore.refreshCurrent();
                                else alert(errorFrom(res));
                            });
                        }} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}