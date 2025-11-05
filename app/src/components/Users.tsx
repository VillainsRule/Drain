import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import axios from '@/lib/axiosLike';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

interface UserSitesThingy {
    [url: string]: string;
}

const Users = observer(function Users() {
    location.hash = 'users';

    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const addUserUsernameRef = useRef<HTMLInputElement>(null);
    const addUserPasswordRef = useRef<HTMLInputElement>(null);
    const addUserSubmitRef = useRef<HTMLButtonElement>(null);

    const [userSitesDialogOpen, setUserSitesDialogOpen] = useState(false);
    const [userSitesDialogTarget, setUserSitesDialogTarget] = useState('');
    const [userSitesDialogList, setUserSitesDialogList] = useState<UserSitesThingy>({});

    const changeRole = (username: string, domain: string, newRole: 'reader' | 'editor') => {
        axios.post('/$/sites/changeUserRole', {
            domain: domain,
            username: username,
            role: newRole
        }).then((resp) => {
            if (resp.data.error) {
                console.error(resp.data);
                alert(resp.data.error);
            } else siteManager.getSites();
        }).catch((err) => {
            console.error(err);
        });
    }

    useEffect(() => {
        if (!adminManager.users?.length) adminManager.fetchAllUsers();
    }, []);

    const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
    const [changePasswordTarget, setChangePasswordTarget] = useState(0);
    const [changePasswordTargetName, setChangePasswordTargetName] = useState('');
    const changePasswordRef = useRef<HTMLInputElement>(null);
    const changePasswordSubmitRef = useRef<HTMLButtonElement>(null);

    const grabUserSitesDialogList = (username: string) => {
        axios.post('/$/admin/userSites', { username }).then((res) => {
            setUserSitesDialogList(res.data.sites);
        });
    }

    return (
        <>
            <div className='flex flex-col items-center w-full h-full overflow-y-auto drain-scrollbar mt-6'>
                <div className='flex flex-col items-center h-full w-5/6 gap-5'>
                    <div className='flex justify-between w-full'>
                        <h2 className='text-2xl font-bold'>drain login manager</h2>

                        <div className='flex gap-3'>
                            <Button className='w-56 py-2 rounded-md transition-colors duration-150' onClick={() => setAddUserDialogOpen(true)}>add user</Button>
                        </div>
                    </div>

                    <div className='flex flex-col justify-center gap-5 w-full'>
                        {adminManager.users?.map((user) => (
                            <div className='flex justify-between w-full py-3 px-6 border rounded-md'>
                                <div className='flex items-center gap-3'>
                                    <span className='text-lg font-bold'>@{user.username}</span>
                                </div>

                                <div className='flex gap-3'>
                                    <Button disabled={!!(authManager.user.id !== 1 && user.admin && user.id !== authManager.user.id)} onClick={() => {
                                        setChangePasswordTarget(user.id);
                                        setChangePasswordTargetName(user.username);
                                        setChangePasswordDialogOpen(true);
                                    }}>change password</Button>

                                    <Button disabled={user.id === 1} onClick={() => {
                                        setUserSitesDialogOpen(true);
                                        setUserSitesDialogTarget(user.username);
                                        grabUserSitesDialogList(user.username);
                                    }}>site access</Button>

                                    <Button disabled={user.id === 1} onClick={() => {
                                        axios.post('/$/admin/setUserRole', { userId: user.id, isAdmin: !user.admin }).then(() => {
                                            adminManager.fetchAllUsers();
                                        });
                                    }}>{user.admin ? 'demote to user' : 'promote to admin'}</Button>
                                    <Button disabled={user.id === 1} variant='destructive' onClick={() => {
                                        if (confirm(`are you sure you want to delete @${user.username}? this action cannot be undone.`)) {
                                            axios.post('/$/admin/deleteUser', { userId: user.id }).then(() => {
                                                adminManager.fetchAllUsers();
                                            });
                                        }
                                    }}>delete user</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>add a user</DialogTitle>
                        <DialogDescription>add a user to your drain instance. they will have access to no sites by default. add them in site access.</DialogDescription>
                    </DialogHeader>

                    <Input className='w-full' placeholder='username' ref={addUserUsernameRef} onKeyUp={(k) => (k.key === 'Enter') && addUserPasswordRef.current?.focus()} />
                    <Input className='w-full' placeholder='password' ref={addUserPasswordRef} onKeyUp={(k) => (k.key === 'Enter') && addUserSubmitRef.current?.click()} />

                    <Button className='w-3/4' ref={addUserSubmitRef} onClick={() => {
                        const username = addUserUsernameRef.current?.value;
                        const password = addUserPasswordRef.current?.value;

                        axios.post('/$/admin/createUser', { username, password }).then(() => {
                            adminManager.fetchAllUsers();
                            setAddUserDialogOpen(false);
                        });
                    }}>add</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={userSitesDialogOpen} onOpenChange={() => userSitesDialogOpen && setUserSitesDialogOpen(false)}>
                <DialogContent className='max-h-3/4 overflow-y-auto overflow-x-hidden'>
                    <DialogHeader>
                        <DialogTitle>user manager!</DialogTitle>
                        <DialogDescription>@{userSitesDialogTarget}'s site access</DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col w-full py-3 px-6 gap-3 border rounded-md'>
                        {Object.keys(userSitesDialogList).length ? Object.entries(userSitesDialogList).map(([domain, role], i) => (
                            <div className='flex justify-between gap-3 w-full' key={i}>
                                <div className='flex items-center'>
                                    <span className='text-lg font-bold'>{domain}</span>
                                </div>

                                <div className='flex gap-3'>
                                    <Select value={role} onValueChange={(value) => {
                                        changeRole(userSitesDialogTarget, domain, value as 'reader' | 'editor');
                                        grabUserSitesDialogList(userSitesDialogTarget);
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
                                        axios.post('/$/sites/removeUserFromSite', { domain, username: userSitesDialogTarget }).then((resp) => {
                                            if (resp.data.error) {
                                                console.error(resp.data);
                                                alert(resp.data.error);
                                            } else grabUserSitesDialogList(userSitesDialogTarget);
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
                        const newPassword = changePasswordRef.current?.value;

                        axios.post('/$/admin/setUserPassword', { userId: changePasswordTarget, newPassword }).then(() => {
                            setChangePasswordDialogOpen(false);
                        });
                    }}>change password</Button>
                </DialogContent>
            </Dialog>
        </>
    )
});

export default Users;