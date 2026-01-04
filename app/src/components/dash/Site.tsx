import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { AutoComplete } from '../shadcn/autocomplete';
import { Button } from '../shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../shadcn/dialog';
import { Input } from '../shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shadcn/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../shadcn/tabs';
import { Textarea } from '../shadcn/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../shadcn/tooltip';

import ArrowDownWideNarrow from 'lucide-react/icons/arrow-down-wide-narrow';
import Copy from 'lucide-react/icons/copy';
import ListPlus from 'lucide-react/icons/list-plus';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Trash from 'lucide-react/icons/trash';

import axios from '@/lib/axiosLike';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const fakeKeys = [
    crypto.randomUUID().replace(/-/g, ''),
    crypto.randomUUID().replace(/-/g, ''),
    crypto.randomUUID().replace(/-/g, '')
]

const Site = observer(function Site() {
    const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
    const [keyAddError, setKeyAddError] = useState('');

    const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
    const [bulkAddError, setBulkAddError] = useState('');
    const [bulkAddProgress, setBulkAddProgress] = useState('');

    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [addUserError, setAddUserError] = useState('');
    const [addUserSelected, addUserSetSelected] = useState('');

    const [validKeys, setValidKeys] = useState<string[]>([]);
    const [invalidKeys, setInvalidKeys] = useState<string[]>([]);

    return (
        <>
            {!siteManager.siteRef ? (<>loading site (no siteRef)...</>) : (
                <div className='flex justify-center items-center w-full h-full overflow-y-auto overflow-x-hidden drain-scrollbar'>
                    <Tabs className='mt-5 md:w-4/5 w-11/12 h-full' defaultValue='keys'>
                        {(authManager.isAdmin() || siteManager.current.isEditor(authManager.user.id)) && (
                            <TabsList className='w-full'>
                                <TabsTrigger value='keys'>keys</TabsTrigger>
                                <TabsTrigger value='access'>access</TabsTrigger>
                            </TabsList>
                        )}

                        <TabsContent value='keys' className='flex flex-col flex-1 h-full'>
                            <div className='flex justify-between items-center flex-col lg:flex-row w-full mt-2 gap-3 lg:gap-0'>
                                <h2 className='text-2xl font-bold'>{siteManager.domain} x{siteManager.siteRef.keys.length}</h2>
                                <div className='flex gap-3'>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={() => setAddKeyDialogOpen(true)}><Plus /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>add key</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={() => setBulkAddDialogOpen(true)}><ListPlus /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>bulk add keys</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    {siteManager.current.sortable() && <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={() => {
                                                fetch('/$/sites/sortKeys', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ domain: siteManager.domain })
                                                }).then((r) => r.json()).then((data) => {
                                                    if (data.error) {
                                                        console.error(data);
                                                        alert(data.error);
                                                    } else siteManager.getSites();
                                                })
                                            }}><ArrowDownWideNarrow /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>sort by $$</p>
                                        </TooltipContent>
                                    </Tooltip>}

                                    {authManager.isAdmin() && <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button className='w-12 py-2 rounded-md transition-colors duration-150 hidden md:flex' onClick={async () => {
                                                const hasOver50Keys = siteManager.siteRef.keys.length > 50;
                                                if (hasOver50Keys && !confirm('this site has over 50 keys, rechecking all of them MAY HIT RATELIMITS AND GET THE CHECKER IP BANNED. are you sure you want to proceed?')) return;

                                                for (const key of siteManager.siteRef.keys) {
                                                    await new Promise((r) => {
                                                        axios.post('/$/sites/balancer', {
                                                            domain: siteManager.domain,
                                                            key: key.token
                                                        }).then((resp) => {
                                                            if (resp.data.error) {
                                                                console.error(resp.data);
                                                                setValidKeys(prev => prev.filter(k => k !== key.token));
                                                                setInvalidKeys(prev => prev.includes(key.token) ? prev : [...prev, key.token]);
                                                            } else {
                                                                siteManager.getSites();
                                                                setInvalidKeys(prev => prev.filter(k => k !== key.token));
                                                                setValidKeys(prev => prev.includes(key.token) ? prev : [...prev, key.token]);
                                                            }
                                                            r(void 0);
                                                        }).catch((err) => {
                                                            console.error(err);
                                                        });
                                                    });
                                                }
                                            }}><RefreshCw /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>recheck all</p>
                                        </TooltipContent>
                                    </Tooltip>}

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button className='w-12 py-2 rounded-md transition-colors duration-150' onClick={async () => {
                                                const allKeys = siteManager.siteRef.keys.map(k => k.token).join('\n');
                                                await navigator.clipboard.writeText(allKeys);
                                            }}><Copy /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>copy all keys</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>

                            <div className='grow flex flex-col items-center justify-start gap-1 w-full mt-4'>
                                {siteManager.siteRef.keys.map((key, i) => (
                                    <div key={i} className='flex items-center justify-center w-full rounded-md md:px-7 hover:bg-gray-50 transition-colors duration-125 py-2 cursor-pointer gap-2 md:gap-5' style={{
                                        color: validKeys.includes(key.token) ? 'green' : invalidKeys.includes(key.token) ? 'red' : ''
                                    }}>
                                        <Input value={'...' + key.token.slice(-4)} readOnly className='font-mono w-fit text-center sm:hidden flex px-1' />
                                        <Input value={key.token} readOnly className='font-mono w-md text-center hidden sm:flex' />

                                        {key.balance !== '?' && <Input value={key.balance} readOnly className='font-mono min-w-20 sm:min-w-0 sm:w-36 text-center px-1' />}

                                        <Button variant='outline' size='sm' onClick={() => navigator.clipboard.writeText(key.token)}>
                                            <Copy className='h-4 w-4' />
                                        </Button>

                                        {Boolean(siteManager.siteRef.supportsBalancer && (siteManager.current.isEditor(authManager.user.id) || authManager.user.admin)) && <Button variant='outline' size='sm' onClick={() => {
                                            axios.post('/$/sites/balancer', {
                                                domain: siteManager.domain,
                                                key: key.token
                                            }).then((resp) => {
                                                if (resp.data.error) {
                                                    console.error(resp.data);
                                                    setValidKeys(prev => prev.filter(k => k !== key.token));
                                                    setInvalidKeys(prev => prev.includes(key.token) ? prev : [...prev, key.token]);
                                                } else {
                                                    siteManager.getSites();
                                                    setInvalidKeys(prev => prev.filter(k => k !== key.token));
                                                    setValidKeys(prev => prev.includes(key.token) ? prev : [...prev, key.token]);
                                                }
                                            }).catch((err) => {
                                                console.error(err);
                                            });
                                        }}>
                                            <RefreshCw className='h-4 w-4' />
                                        </Button>}

                                        {authManager.isAdmin() && <Button variant='destructive' size='sm' className='hidden md:flex' onClick={() => {
                                            axios.post('/$/sites/removeKey', {
                                                domain: siteManager.domain,
                                                key: key.token
                                            }).then((resp) => {
                                                if (resp.data.error) {
                                                    console.error(resp.data);
                                                    alert(resp.data.error);
                                                } else siteManager.getSites();
                                            }).catch((err) => {
                                                console.error(err);
                                            });
                                        }}>
                                            <Trash className='h-4 w-4' />
                                        </Button>}
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        {(authManager.isAdmin() || siteManager.current.isEditor(authManager.user.id)) && <TabsContent value='access' className='flex flex-col flex-1 h-full'>
                            <div className='flex justify-between items-center flex-col lg:flex-row gap-3 lg:gap-0 w-full mt-2'>
                                <h2 className='text-2xl font-bold'>access@{siteManager.domain}</h2>
                                <div className='flex gap-3'>
                                    <Button className='w-40 py-2 rounded-md transition-colors duration-150' onClick={() => setAddUserDialogOpen(true)}>invite user</Button>
                                </div>
                            </div>

                            <div className='grow flex flex-col items-center justify-start gap-1 w-full mt-4'>
                                {[...siteManager.siteRef.editors, ...siteManager.siteRef.readers].map((userId, i) => {
                                    const role = siteManager.current.isEditor(userId) ? 'editor' : 'reader';

                                    const changeRole = (newRole: 'reader' | 'editor') => {
                                        axios.post('/$/sites/access/setRole', {
                                            domain: siteManager.domain,
                                            userId,
                                            role: newRole
                                        }).then((resp) => {
                                            if (resp.data.error) {
                                                console.error(resp.data);
                                                alert(resp.data.error);
                                            } else siteManager.getSites();
                                        }).catch((err) => console.error(err));
                                    }

                                    const resolvedUsername = adminManager.getUser(userId)?.username || siteManager.siteRef.resolvedReaders[userId] || (userId == authManager.user.id ? authManager.user.username : null);

                                    return (
                                        <div className='w-full py-3 px-4 md:px-5 border rounded-md' key={i}>
                                            <Tooltip>
                                                <TooltipTrigger className='flex justify-between w-full'>
                                                    <div className='flex items-center gap-3'>
                                                        <span className='text-lg font-bold'>{resolvedUsername || '?'}</span>
                                                    </div>

                                                    <div className='flex gap-3'>
                                                        <Select value={role} onValueChange={(value) => changeRole(value as 'reader' | 'editor')} disabled={!resolvedUsername}>
                                                            <SelectTrigger>
                                                                <SelectValue>role: {role}</SelectValue>
                                                            </SelectTrigger>

                                                            <SelectContent>
                                                                <SelectItem value='reader'>Viewer</SelectItem>
                                                                <SelectItem value='editor'>Editor</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        <Button variant='destructive' onClick={() => {
                                                            axios.post('/$/sites/access/removeUser', {
                                                                domain: siteManager.domain,
                                                                userId
                                                            }).then((resp) => {
                                                                if (resp.data.error) {
                                                                    console.error(resp.data);
                                                                    alert(resp.data.error);
                                                                } else siteManager.getSites();
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
                        </TabsContent>}
                    </Tabs>

                    <Dialog open={addKeyDialogOpen} onOpenChange={setAddKeyDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>add key</DialogTitle>
                                <DialogDescription>add a key to {siteManager.domain}!</DialogDescription>
                            </DialogHeader>

                            <Input placeholder={fakeKeys[0]} id='keyAddInput' className='w-full' onKeyUp={(e) => e.key === 'Enter' && (document.querySelector('#keyAddButton') as HTMLButtonElement).click()} />

                            {keyAddError && (<div className='text-red-500'>{keyAddError}</div>)}

                            <Button className='w-3/4' id='keyAddButton' onClick={() => {
                                axios.post('/$/sites/addKey', {
                                    domain: siteManager.domain,
                                    key: (document.getElementById('keyAddInput') as HTMLInputElement).value
                                }).then((resp) => {
                                    if (resp.data.error) setKeyAddError(resp.data.error);
                                    else {
                                        siteManager.getSites();
                                        setKeyAddError('');
                                        setAddKeyDialogOpen(false);
                                    }
                                }).catch((err) => {
                                    console.error(err);
                                });
                            }}>submit</Button>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={bulkAddDialogOpen} onOpenChange={(isOpen) => {
                        setBulkAddDialogOpen(isOpen);
                        setBulkAddProgress('');
                        setBulkAddError('');
                    }}>
                        <DialogContent className='max-h-9/10'>
                            <DialogHeader>
                                <DialogTitle>bulk add keys</DialogTitle>
                                <DialogDescription>add multiple keys to {siteManager.domain}!</DialogDescription>
                            </DialogHeader>

                            <Textarea placeholder={fakeKeys.join('\n')} id='bulkAddTextarea' className='max-h-74 overflow-auto' />

                            {bulkAddError && (<div className='text-red-500'>{bulkAddError}</div>)}
                            {bulkAddProgress && (<div className='text-gray-500'>{bulkAddProgress}</div>)}

                            <Button className='w-3/4' onClick={async () => {
                                const input = (document.getElementById('bulkAddTextarea') as HTMLInputElement).value;
                                const keys = input.split('\n').map(key => key.trim()).filter(key => key.length > 0);
                                if (keys.length === 0) return setBulkAddError('Please enter at least one key.');

                                for (let i = 0; i < keys.length; i++) {
                                    const key = keys[i];

                                    axios.post('/$/sites/addKey', {
                                        domain: siteManager.domain,
                                        key
                                    }).then((resp) => {
                                        if (resp.data.error) setBulkAddError(`${key}: ${resp.data.error}`);
                                        else {
                                            siteManager.getSites();
                                            setBulkAddError('');
                                        }

                                        setBulkAddProgress(`${i + 1}/${keys.length} keys processed`);
                                        if ((i + 1) === keys.length) setBulkAddDialogOpen(false);
                                    }).catch((err) => {
                                        console.error(err);
                                    });

                                    await new Promise(resolve => setTimeout(resolve, 250));
                                }
                            }}>submit</Button>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                        <DialogContent className='max-h-9/10'>
                            <DialogHeader>
                                <DialogTitle>invite a user</DialogTitle>
                                <DialogDescription>invite a user to {siteManager.domain}!</DialogDescription>
                            </DialogHeader>

                            <AutoComplete options={adminManager.users
                                .filter(e => !e.admin && !siteManager.current.isReader(e.id))
                                .map(e => ({ value: e.username, label: '@' + e.username }))} onValueChange={(e) => addUserSetSelected(e.value)} />

                            {addUserError && (<div className='text-red-500'>{addUserError}</div>)}

                            <Button className='w-3/4' onClick={async () => {
                                axios.post('/$/sites/access/addUser', {
                                    domain: siteManager.domain,
                                    username: addUserSelected
                                }).then((resp) => {
                                    if (resp.data.error) setAddUserError(resp.data.error);
                                    else {
                                        siteManager.getSites();
                                        setAddUserError('');
                                        setAddUserDialogOpen(false);
                                    }
                                }).catch((err) => {
                                    console.error(err);
                                });
                            }}>submit</Button>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </>
    )
});

export default Site;