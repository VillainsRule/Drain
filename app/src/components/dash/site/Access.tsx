import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { AutoComplete } from '../../shadcn/autocomplete';
import { Button } from '../../shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../shadcn/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shadcn/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../shadcn/tooltip';

import Trash from 'lucide-react/icons/trash';

import api, { errorFrom } from '@/lib/eden';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const SiteAccess = observer(function SiteAccess() {
    const navigate = useNavigate();

    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [addUserError, setAddUserError] = useState('');
    const [addUserSelectedId, setAddUserSelectedId] = useState(0);

    const site = siteManager.site;

    if (!site) return (
        <div className='flex justify-center items-center w-full'>
            <span className='text-muted-foreground text-lg'>fetching site...</span>
        </div>
    );

    useEffect(() => {
        if (site.keys && !site.editors) navigate(`/domain/${site.id}/keys`);
    }, []);

    if (!site.editors || !site.readers) return <>loading...</>;

    return (
        <>
            <div className='flex justify-between items-center flex-col lg:flex-row gap-3 lg:gap-0 w-full mt-3'>
                <h2 className='text-2xl font-bold'>access@{site.id}</h2>
                <div className='flex gap-3'>
                    <Button className='w-40 py-2 rounded-md transition-colors duration-150' onClick={() => setAddUserDialogOpen(true)}>invite user</Button>
                </div>
            </div>

            {site.editors.length < 1 && site.readers.length < 1 && <span className='text-muted-foreground text-sm mt-5 text-center'>only admins can access {site.id}</span>}

            <div className='grow flex flex-col items-center justify-start gap-1 w-full mt-4'>
                {[...site.editors, ...site.readers].map((userId, i) => {
                    const role = site.editors!.includes(userId) ? 'editor' : 'reader';

                    const resolvedUsername = adminManager.getUser(userId)?.username || site.resolvedReaders?.[userId] || (userId == authManager.user.id ? authManager.user.username : null);

                    return (
                        <div className='w-full py-3 px-4 md:px-5 border rounded-md' key={i}>
                            <Tooltip>
                                <TooltipTrigger className='flex justify-between w-full'>
                                    <div className='flex items-center gap-3'>
                                        <span className='text-lg font-bold'>{resolvedUsername || '?'}</span>
                                    </div>

                                    <div className='flex gap-3'>
                                        <Select value={role} onValueChange={(role) => (role === 'reader' || role === 'editor') &&
                                            api.sites.access.setRole.post({ domain: site.id, userId, role }).then((res) => {
                                                if (res.data) siteManager.refreshCurrent();
                                                else alert(errorFrom(res));
                                            })
                                        } disabled={!resolvedUsername}>
                                            <SelectTrigger>
                                                <SelectValue>role: {role}</SelectValue>
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value='reader'>Viewer</SelectItem>
                                                <SelectItem value='editor'>Editor</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button variant='destructive' onClick={() => {
                                            api.sites.access.removeUser.post({ domain: site.id, userId }).then((res) => {
                                                if (res.data) siteManager.refreshCurrent();
                                                else alert(errorFrom(res));
                                            });
                                        }}>
                                            <span className='hidden md:flex'>revoke access</span>
                                            <Trash className='h-4 w-4 md:hidden' />
                                        </Button>
                                    </div>
                                </TooltipTrigger>

                                {!resolvedUsername && <TooltipContent>this user is another editor, which you cannot view or modify</TooltipContent>}
                            </Tooltip>
                        </div>
                    )
                })}
            </div>

            <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogContent className='max-h-9/10'>
                    <DialogHeader>
                        <DialogTitle>invite a user</DialogTitle>
                        <DialogDescription>invite a user to {site.id}!</DialogDescription>
                    </DialogHeader>

                    <AutoComplete options={adminManager.users
                        .filter(e => !e.admin && !site.readers!.includes(e.id) && !site.editors!.includes(e.id))
                        .map(e => ({ value: e.id.toString(), label: '@' + e.username }))} onValueChange={(e) => setAddUserSelectedId(Number(e.value))} />

                    {addUserError && (<div className='text-red-500'>{addUserError}</div>)}

                    <Button className='w-3/4' onClick={async () => {
                        api.sites.access.addUser.post({
                            domain: site.id,
                            userId: addUserSelectedId
                        }).then((res) => {
                            if (res.data) {
                                siteManager.refreshCurrent();
                                setAddUserError('');
                                setAddUserDialogOpen(false);
                            } else setAddUserError(errorFrom(res));
                        });
                    }}>submit</Button>
                </DialogContent>
            </Dialog>
        </>
    )
});

export default SiteAccess;