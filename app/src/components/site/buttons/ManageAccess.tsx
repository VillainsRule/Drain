import { useState } from 'react';

import { UserCog } from 'lucide-react';

import { AutoComplete } from '@/components/ui/autocomplete';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import adminStore from '@/store/AdminStore';
import siteStore from '@/store/SiteStore';

import api, { errorFrom } from '@/lib/eden';

import type { PublicSite } from '@/types';

export default function ManageAccess({ site }: { site: PublicSite }) {
    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [addUserSelectedId, setAddUserSelectedId] = useState<number | null>(null);
    const [addUserError, setAddUserError] = useState('');

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant='outline'><UserCog className='w-4 h-4' /></Button>
                        </DialogTrigger>
                        <DialogContent className='max-h-9/10'>
                            <DialogHeader>
                                <DialogTitle>manage access</DialogTitle>
                                <DialogDescription>manage who can access {site.id}</DialogDescription>
                            </DialogHeader>

                            <div className='flex flex-col gap-3'>
                                {site.users.map((userId) => (
                                    <div key={userId} className='flex items-center justify-between rounded-md px-2 py-1 hover:bg-accent transition-colors duration-125'>
                                        <span>@{adminStore.users.find(e => e.id === userId)?.username || '?'}</span>
                                        <Button variant='outline' size='sm' onClick={() => {
                                            api.v1.sites.access.remove.post({ domain: site.id, userId }).then((res) => {
                                                if (res.data) siteStore.refreshCurrent();
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
                </TooltipTrigger>

                <TooltipContent>manage access</TooltipContent>
            </Tooltip>

            <Dialog open={addUserDialogOpen} onOpenChange={(isOpen) => setAddUserDialogOpen(isOpen)}>
                <DialogContent className='max-h-9/10'>
                    <DialogHeader>
                        <DialogTitle>add user</DialogTitle>
                        <DialogDescription>grant access to {site.id} for a user by entering their username</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col gap-3'>
                        <AutoComplete
                            options={adminStore.users
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
                                        siteStore.refreshCurrent();
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
        </>
    )
}