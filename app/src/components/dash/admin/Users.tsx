import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Button } from '../../shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../shadcn/dialog';
import { Input } from '../../shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shadcn/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shadcn/tooltip';

import api, { errorFrom } from '@/lib/eden';

import KeyRound from 'lucide-react/icons/key-round';
import ScanSearch from 'lucide-react/icons/scan-search';
import Trash from 'lucide-react/icons/trash';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';

const Users = observer(function Users() {
    const navigate = useNavigate();

    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [addUserError, setAddUserError] = useState('');
    const addUserUsernameRef = useRef<HTMLInputElement>(null);
    const addUserPasswordRef = useRef<HTMLInputElement>(null);
    const addUserSubmitRef = useRef<HTMLButtonElement>(null);

    const [userSitesDialogOpen, setUserSitesDialogOpen] = useState(false);
    const [userSitesDialogTargetId, setUserSitesDialogTargetId] = useState(0);
    const [userSitesDialogTargetName, setUserSitesDialogTargetName] = useState('');
    const [userSitesDialogList, setUserSitesDialogList] = useState<Record<string, 'reader' | 'editor'>>({});

    const [inviteCode, setInviteCode] = useState('');

    const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
    const [changePasswordTargetId, setChangePasswordTargetId] = useState(0);
    const [changePasswordTargetName, setChangePasswordTargetName] = useState('');
    const changePasswordRef = useRef<HTMLInputElement>(null);
    const changePasswordSubmitRef = useRef<HTMLButtonElement>(null);

    const grabUserSitesDialogList = (userId: number) =>
        api.admin.users.sites.post({ userId }).then((res) =>
            setUserSitesDialogList(res.data?.sites || {}));

    useEffect(() => {
        if (authManager.user.id > 1 && !authManager.user.admin) navigate('/');
    }, []);

    return (
        <div className='flex flex-col items-center h-full w-5/6 gap-5 overflow-y-auto drain-scrollbar mt-6'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <h2 className='text-2xl font-bold'>drain login manager</h2>
                <Button className='w-56 py-2 rounded-md transition-colors duration-150' onClick={() => setAddUserDialogOpen(true)}>create user</Button>
            </div>

            <div className='flex flex-col justify-center gap-5 w-full'>
                {adminManager.users?.map((user) => (
                    <div className='flex justify-between w-full py-3 px-6 border rounded-md'>
                        <span className='text-lg font-bold'>@{user.username}</span>

                        <div className='flex gap-3'>
                            <Tooltip>
                                <TooltipProvider>
                                    <TooltipTrigger>
                                        <Button disabled={(!!(authManager.user.id !== 1 && user.admin && user.id !== authManager.user.id)) || user.stillPendingLogin} onClick={() => {
                                            setChangePasswordTargetId(user.id);
                                            setChangePasswordTargetName(user.username);
                                            setChangePasswordDialogOpen(true);
                                        }}>
                                            <KeyRound className='h-4 w-4 md:hidden' />
                                            <span className='hidden md:flex'>change password</span>
                                        </Button>
                                    </TooltipTrigger>

                                    {user.stillPendingLogin && <TooltipContent>this user is tied to an invite code and has not yet logged in.</TooltipContent>}
                                    {user.id === 1 && authManager.user.id !== 1 && <TooltipContent>this admin cannot be modified.</TooltipContent>}
                                </TooltipProvider>
                            </Tooltip>

                            <Tooltip>
                                <TooltipProvider>
                                    <TooltipTrigger>
                                        <Button disabled={user.id === 1} onClick={() => {
                                            setUserSitesDialogOpen(true);
                                            setUserSitesDialogTargetId(user.id);
                                            setUserSitesDialogTargetName(user.username);
                                            grabUserSitesDialogList(user.id);
                                        }}>
                                            <ScanSearch className='h-4 w-4 md:hidden' />
                                            <span className='hidden md:flex'>site access</span>
                                        </Button>
                                    </TooltipTrigger>

                                    {user.id === 1 && <TooltipContent>this admin cannot be modified.</TooltipContent>}
                                </TooltipProvider>
                            </Tooltip>

                            <Tooltip>
                                <TooltipProvider>
                                    <TooltipTrigger className='hidden md:flex'>
                                        <Button disabled={user.id === 1} onClick={() => {
                                            api.admin.users.setRole.post({ userId: user.id, isAdmin: !user.admin }).then(() => adminManager.fetchAllUsers());
                                        }}>{user.admin ? 'demote to user' : 'promote to admin'}</Button>
                                    </TooltipTrigger>

                                    {user.id === 1 && <TooltipContent>this admin cannot be modified.</TooltipContent>}
                                </TooltipProvider>
                            </Tooltip>

                            <Tooltip>
                                <TooltipProvider>
                                    <TooltipTrigger>
                                        <Button disabled={user.id === 1} variant='destructive' onClick={() => {
                                            if (confirm(`are you sure you want to delete @${user.username}? this action cannot be undone.`))
                                                api.admin.users.delete.post({ userId: user.id }).then(() => adminManager.fetchAllUsers());
                                        }}>
                                            <Trash className='h-4 w-4 md:hidden' />
                                            <span className='hidden md:flex'>delete user</span>
                                        </Button>
                                    </TooltipTrigger>

                                    {user.id === 1 && <TooltipContent>this admin cannot be modified.</TooltipContent>}
                                </TooltipProvider>
                            </Tooltip>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>add a user</DialogTitle>
                        <DialogDescription>add a user to your drain instance. they will have access to no sites by default. add them in site access.</DialogDescription>
                    </DialogHeader>

                    <Input className='w-full' placeholder='username' ref={addUserUsernameRef} maxLength={16} onKeyUp={(k) => (k.key === 'Enter') && addUserPasswordRef.current?.focus()} />

                    {addUserError && <span className='text-red-500'>{addUserError}</span>}

                    <Button className='w-3/4' ref={addUserSubmitRef} onClick={() => {
                        const username = addUserUsernameRef.current?.value!;

                        api.admin.users.create.post({ username }).then((res) => {
                            if (res.data) {
                                adminManager.fetchAllUsers();

                                setInviteCode(res.data.inviteCode);
                                setAddUserDialogOpen(false);
                            } else setAddUserError(errorFrom(res));
                        });
                    }}>add</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={userSitesDialogOpen} onOpenChange={() => userSitesDialogOpen && setUserSitesDialogOpen(false)}>
                <DialogContent className='max-h-3/4 overflow-y-auto overflow-x-hidden'>
                    <DialogHeader>
                        <DialogTitle>user manager!</DialogTitle>
                        <DialogDescription>@{userSitesDialogTargetName}'s site access</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col w-full py-3 px-6 gap-3 border rounded-md'>
                        {Object.keys(userSitesDialogList).length ? Object.entries(userSitesDialogList).map(([domain, role], i) => (
                            <div className='flex justify-between gap-3 w-full' key={i}>
                                <div className='flex items-center'>
                                    <span className='text-lg font-bold'>{domain}</span>
                                </div>

                                <div className='flex gap-3'>
                                    <Select value={role} onValueChange={(role) => {
                                        if (role !== 'reader' && role !== 'editor') return alert('error: invalid role');

                                        api.sites.access.setRole.post({ domain, userId: userSitesDialogTargetId, role }).then((res) => {
                                            if (res.data) grabUserSitesDialogList(userSitesDialogTargetId);
                                            else alert(errorFrom(res));
                                        });
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue>role: {role}</SelectValue>
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value='reader'>Viewer</SelectItem>
                                            <SelectItem value='editor'>Editor</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button variant='destructive' onClick={() => {
                                        api.sites.access.removeUser.post({ domain, userId: userSitesDialogTargetId }).then((res) => {
                                            if (res.data) grabUserSitesDialogList(userSitesDialogTargetId);
                                            else alert(errorFrom(res));
                                        });
                                    }}>remove user</Button>
                                </div>
                            </div>
                        )) : <span className='mx-auto'>this user has no site access.</span>}
                    </div>

                    <Button className='w-3/4 mx-auto' onClick={() => setUserSitesDialogOpen(false)}>close</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={changePasswordDialogOpen} onOpenChange={() => changePasswordDialogOpen && setChangePasswordDialogOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>change password</DialogTitle>
                        <DialogDescription>change the password for @{changePasswordTargetName}</DialogDescription>
                    </DialogHeader>

                    <Input className='w-full' placeholder='new password' ref={changePasswordRef} onKeyUp={(k) => (k.key === 'Enter') && changePasswordSubmitRef.current?.click()} />

                    <Button className='w-3/4' ref={changePasswordSubmitRef} onClick={() => {
                        const newPassword = changePasswordRef.current?.value!;

                        api.admin.users.setPassword.post({ userId: changePasswordTargetId, newPassword }).then((res) => {
                            if (res.data) {
                                setChangePasswordDialogOpen(false);
                                if (changePasswordTargetId === authManager.user.id) setTimeout(() => location.reload(), 100);
                            } else alert(errorFrom(res));
                        });
                    }}>change password</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={!!inviteCode} onOpenChange={(isOpen) => !isOpen && setInviteCode('')}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>user created!</DialogTitle>
                        <DialogDescription>the user has been created! give them this invite code to set their password and log in:</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col gap-3'>
                        <Input className='w-full' value={inviteCode} readOnly />

                        <Button className='w-3/4 mx-auto' onClick={() => setInviteCode('')}>close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
});

export default Users;