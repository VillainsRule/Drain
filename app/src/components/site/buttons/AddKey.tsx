import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import siteStore from '@/store/SiteStore';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import type { PublicSite } from '@/types';

const randomHex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const fakeKey = randomHex(32);

export default function AddKey({ site }: { site: PublicSite }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant='outline' className='hidden md:flex' onClick={() => shadd.prompt(
                    'add a new key',
                    'enter the key you want to add to this site. it can be any string up to 256 characters.',
                    { placeholder: fakeKey, maxLength: 256, minLength: 1 },
                    (value: string) => {
                        api.v1.sites.keys.create.post({
                            domain: site.id,
                            key: value
                        }).then((res) => {
                            if (res.data) {
                                siteStore.refreshCurrent();
                                shadd.close();
                            } else shadd.setError(errorFrom(res));
                        });
                    }
                )}>
                    <Plus />
                </Button>
            </TooltipTrigger>

            <TooltipContent>add key</TooltipContent>
        </Tooltip>
    )
}