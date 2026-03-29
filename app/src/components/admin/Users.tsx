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

    const [userSitesDialogOpen, setUserSitesDialogOpen] = useState(false);
    const [userSitesDialogTargetId, setUserSitesDialogTargetId] = useState(0);
    const [userSitesDialogTargetName, setUserSitesDialogTargetName] = useState('');
    const [userSitesDialogList, setUserSitesDialogList] = useState<string[]>([]);

    const grabUserSitesDialogList = (userId: number) => api.admin.users.sites.post({ userId }).then((res) => {
        if (res.data) setUserSitesDialogList(res.data.sites);
        else alert(errorFrom(res));
    });

    useEffect(() => {
        if (authManager.user.id > 1 && !authManager.user.admin) navigate('/');
    }, []);

    return (
        <div className='flex flex-col items-center h-full w-5/6 gap-5 overflow-y-auto drain-scrollbar mt-6'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <h2 className='text-2xl font-bold'>user manager</h2>
                <Button className='w-48 py-2 rounded-md transition-colors duration-150' onClick={() => shadd.prompt(
                    'create a new user',
                    'enter a username for the new user. they will be able to set their password and site access after the account is created.',
                    { placeholder: 'username', maxLength: 16, minLength: 1 },
                    (value: string) => {
                        api.admin.users.create.post({ username: value }).then((res) => {
                            if (res.data) {
                                adminManager.fetchAllUsers();

                                shadd.copy(
                                    'user created!',
                                    'the user has been created! give them this invite code to set their password and log in:',
                                    res.data.inviteCode
                                );
                            } else shadd.setError(errorFrom(res));
                        });
                    }
                )}>
                    <UserPlus className='h-4 w-4 mr-2' />
                    create user
                </Button>
            </div>

            <div className='flex flex-col gap-2 w-full'>
                {adminManager.users.map((user) => (
                    <div key={user.id} className='flex items-center justify-between w-full py-3 px-4 border rounded-md gap-4'>
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='font-medium truncate'>@{user.username}</span>

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
                                    <Button size='sm' variant='ghost' disabled={user.pendingLogin || !!(user.admin && authManager.user.id !== 1)} onClick={() => shadd.prompt(
                                        'change the password',
                                        `enter a new password for @${user.username}.`,
                                        { placeholder: 'new password', maxLength: 64, minLength: 3 },
                                        async (value: string) => {
                                            const options = await api.admin.users.setPassword.post({ userId: user.id, newPassword: value });
                                            if (options.data) {
                                                if (user.id === authManager.user.id) location.reload();
                                                else shadd.close();
                                            } else shadd.setError(errorFrom(options));
                                        }
                                    )}>
                                        <KeyRound className='h-4 w-4' />
                                        <span className='hidden lg:inline ml-1.5'>password</span>
                                    </Button>
                                </TooltipTrigger>

                                <TooltipContent>
                                    {user.pendingLogin ? 'user has not logged in yet' : (user.admin && authManager.user.id !== 1) ? 'cannot change another admin\'s password' : 'change password'}
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size='sm' variant='ghost' disabled={!!user.admin} onClick={() => {
                                        setUserSitesDialogOpen(true);
                                        setUserSitesDialogTargetId(user.id);
                                        setUserSitesDialogTargetName(user.username);
                                        grabUserSitesDialogList(user.id);
                                    }}>
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
                                            () => api.admin.users.delete.post({ userId: user.id }).then(() => adminManager.fetchAllUsers())
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

            <Dialog open={userSitesDialogOpen} onOpenChange={() => userSitesDialogOpen && setUserSitesDialogOpen(false)}>
                <DialogContent className='max-h-3/4 overflow-y-auto overflow-x-hidden'>
                    <DialogHeader>
                        <DialogTitle>site access</DialogTitle>
                        <DialogDescription>@{userSitesDialogTargetName}'s permitted domains</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col w-full gap-2'>
                        {userSitesDialogList.length ? userSitesDialogList.map((domain, i) => (
                            <div className='flex justify-between items-center gap-3 w-full py-2 px-4 border rounded-md' key={i}>
                                <span className='font-mono text-sm'>{domain}</span>

                                <Button
                                    size='sm'
                                    variant='ghost'
                                    className='text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0'
                                    onClick={() => {
                                        api.v1.sites.access.remove.post({ domain, userId: userSitesDialogTargetId }).then((res) => {
                                            if (res.data) grabUserSitesDialogList(userSitesDialogTargetId);
                                            else alert(errorFrom(res));
                                        });
                                    }}
                                >
                                    <Trash2 className='h-4 w-4 mr-1.5' />
                                    remove
                                </Button>
                            </div>
                        )) : (<p className='text-center text-muted-foreground text-sm py-4'>this user has no site access.</p>)}
                    </div>

                    <Button variant='outline' className='w-3/4 mx-auto' onClick={() => setUserSitesDialogOpen(false)}>close</Button>
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default Users;