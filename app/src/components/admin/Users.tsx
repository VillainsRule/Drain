import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import Clock from 'lucide-react/icons/clock';
import Crown from 'lucide-react/icons/crown';
import KeyRound from 'lucide-react/icons/key-round';
import ScanSearch from 'lucide-react/icons/scan-search';
import ShieldCheck from 'lucide-react/icons/shield-check';
import ShieldMinus from 'lucide-react/icons/shield-minus';
import Trash2 from 'lucide-react/icons/trash-2';
import UserPlus from 'lucide-react/icons/user-plus';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';

const Users = observer(function Users() {
    const navigate = useNavigate();

    const [sitePopupTarget, setSitePopupTarget] = useState(0);

    useEffect(() => {
        if (!authManager.admin) navigate('/');
    }, []);

    return (
        <div className='flex flex-col items-center h-full w-5/6 gap-5 overflow-y-auto drain-scrollbar mt-6'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <h2 className='text-2xl font-bold'>user manager</h2>
                <Button className='flex items-center gap-2 w-48 py-2 rounded-md transition-colors duration-150' onClick={() => navigate('/user/invites?op=invite')}>
                    <UserPlus className='h-4 w-4' />
                    invite user
                </Button>
            </div>

            <div className='flex flex-col gap-2 w-full'>
                {adminManager.users.map((user) => (
                    <div key={user.id} className='flex items-center justify-between w-full py-3 px-4 border rounded-md gap-4'>
                        <div className='flex items-center gap-2 min-w-0'>
                            <Tooltip>
                                <TooltipTrigger>
                                    <span className='font-medium truncate'>@{user.username}</span>
                                </TooltipTrigger>

                                {!!user.invitedBy && <TooltipContent>
                                    {user.id === 1 ? 'created with drain' : `invited by @${adminManager.users.find(u => u.id === user.invitedBy)?.username || 'unknown'}`}
                                </TooltipContent>}
                            </Tooltip>

                            {user.id === 1 && (<Badge variant='secondary' className='gap-1 shrink-0'>
                                <Crown className='h-3 w-3' />
                                <span className='hidden sm:inline'>sudoer</span>
                            </Badge>)}

                            {user.id !== 1 && !!user.admin && (<Badge variant='secondary' className='gap-1 shrink-0'>
                                <ShieldCheck className='h-3 w-3' />
                                <span className='hidden sm:inline'>admin</span>
                            </Badge>)}

                            {!!user.pendingLogin && (<Badge variant='outline' className='gap-1 text-muted-foreground shrink-0'>
                                <Clock className='h-3 w-3' />
                                <span className='hidden sm:inline'>pending</span>
                            </Badge>)}
                        </div>

                        <div className='flex items-center gap-1 shrink-0'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size='sm' variant='ghost' disabled={user.pendingLogin || !!(user.admin && authManager.id !== 1)} onClick={() => shadd.prompt(
                                        'change the password',
                                        `enter a new password for @${user.username}.`,
                                        { placeholder: 'new password', maxLength: 64, minLength: 3 },
                                        async (value: string) => {
                                            const options = await api.admin.users.setPassword.post({ userId: user.id, newPassword: value });
                                            if (options.data) {
                                                if (user.id === authManager.id) location.reload();
                                                else shadd.close();
                                            } else shadd.setError(errorFrom(options));
                                        }
                                    )}>
                                        <KeyRound className='h-4 w-4' />
                                        <span className='hidden lg:inline ml-1.5'>password</span>
                                    </Button>
                                </TooltipTrigger>

                                <TooltipContent>
                                    {user.pendingLogin ? 'user has not logged in yet' : (user.admin && authManager.id !== 1) ? 'cannot change another admin\'s password' : 'change password'}
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size='sm' variant='ghost' disabled={!!user.admin} onClick={() => setSitePopupTarget(user.id)}>
                                        <ScanSearch className='h-4 w-4' />
                                        <span className='hidden lg:inline ml-1.5'>sites</span>
                                    </Button>
                                </TooltipTrigger>

                                <TooltipContent>
                                    {user.admin ? 'admins can access all sites' : 'manage site access'}
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size='sm' variant='ghost' disabled={user.id === 1} className='hidden lg:flex' onClick={() =>
                                        api.admin.users.setRole
                                            .post({ userId: user.id, isAdmin: !user.admin })
                                            .then(() => adminManager.fetchAllUsers())
                                    }>
                                        {user.admin
                                            ? <><ShieldMinus className='h-4 w-4' /><span className='ml-1.5'>demote</span></>
                                            : <><ShieldCheck className='h-4 w-4' /><span className='ml-1.5'>promote</span></>
                                        }
                                    </Button>
                                </TooltipTrigger>

                                <TooltipContent>
                                    {user.id === 1 ? 'this admin cannot be modified' : user.admin ? 'demote from admin' : 'promote to admin'}
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        disabled={user.id === 1}
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => shadd.confirm(
                                            'delete user',
                                            `are you sure you want to delete @${user.username}? this action cannot be undone.`,
                                            () => api.admin.users.delete.post({ userId: user.id }).then(() => {
                                                adminManager.fetchAllUsers();
                                                shadd.close();
                                            })
                                        )}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </TooltipTrigger>

                                <TooltipContent>
                                    {user.id === 1 ? 'this admin cannot be modified' : 'delete user'}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={sitePopupTarget > 0} onOpenChange={(isOpen) => !isOpen && setSitePopupTarget(0)}>
                <DialogContent className='max-h-3/4 overflow-y-auto overflow-x-hidden'>
                    <DialogHeader>
                        <DialogTitle>site access</DialogTitle>
                        <DialogDescription>@{adminManager.getUser(sitePopupTarget)?.username}'s permitted domains</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col w-full gap-2'>
                        {sitePopupTarget && adminManager.getUser(sitePopupTarget).sites.length > 1 ? adminManager.getUser(sitePopupTarget).sites.map((domain) => (
                            <div className='flex justify-between items-center gap-3 w-full py-2 px-4 border rounded-md' key={domain}>
                                <span className='font-mono text-sm'>{domain}</span>

                                <Button
                                    size='sm'
                                    variant='ghost'
                                    className='text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0'
                                    onClick={() => {
                                        api.v1.sites.access.remove.post({ domain, userId: sitePopupTarget }).then((res) => {
                                            if (res.data) adminManager.fetchAllUsers();
                                            else alert(errorFrom(res));
                                        });
                                    }}
                                >
                                    <Trash2 className='h-4 w-4 mr-1.5' />
                                    remove
                                </Button>
                            </div>
                        )) : <p className='text-center text-muted-foreground text-sm py-4'>this user has no site access.</p>}
                    </div>

                    <Button variant='outline' className='w-3/4 mx-auto' onClick={() => setSitePopupTarget(0)}>close</Button>
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default Users;