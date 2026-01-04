import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { startAuthentication } from '@simplewebauthn/browser'

import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'

import axios from '@/lib/axiosLike'

import authManager from '@/managers/AuthManager'

import Logo from '@/assets/Logo'

const Auth = observer(function Auth() {
    const navigate = useNavigate();

    const [standardError, setStandardError] = useState<string>('');
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteError, setInviteError] = useState<string>('');
    const inviteCodeRef = useRef<HTMLInputElement>(null);

    const [inviteDialog2Open, setInviteDialog2Open] = useState(false);
    const [inviteUsername, setInviteUsername] = useState<string>('');
    const [inviteCode, setInviteCode] = useState<string>('');
    const invitePasswordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (authManager.user.id) navigate('/');
    }, []);

    return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50'>
            <Card className='w-11/12 md:w-full max-w-md'>
                <CardHeader className='text-center flex flex-row md:flex-col items-center gap-3'>
                    <Logo className='w-30 h-30 rounded-xl shadow-md border border-neutral-200 p-4 bg-white md:hidden mb-3' />

                    <div className='flex flex-col'>
                        <CardTitle className='text-3xl font-bold'>Drain</CardTitle>
                        <CardDescription>your credentials have been provided by the site admin.</CardDescription>
                    </div>
                </CardHeader>

                <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='username'>Username</Label>
                        <Input id='username' type='text' required ref={usernameRef} onKeyUp={(e) => e.key === 'Enter' && passwordRef.current!.focus()} />
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='password'>Password</Label>
                        <Input id='password' type='password' required ref={passwordRef} onKeyUp={(e) => e.key === 'Enter' && buttonRef.current!.click()} />
                    </div>

                    {standardError && <div className='text-red-500 text-sm'>{standardError}</div>}

                    <Button className='w-full cursor-pointer' ref={buttonRef} onClick={() => {
                        axios.post('/$/auth/secure/credentials', {
                            username: usernameRef.current!.value,
                            password: passwordRef.current!.value
                        }).then((response) => {
                            if (response.data.user) {
                                authManager.setAuth(response.data.user);
                                navigate('/');
                            } else setStandardError(response.data.error);
                        })
                    }}>Log In</Button>

                    <div className="flex items-center">
                        <div className="grow h-px bg-gray-200" />
                        <span className="mx-3 text-gray-400 text-sm">OR</span>
                        <div className="grow h-px bg-gray-200" />
                    </div>

                    <Button className='w-full cursor-pointer' onClick={() => setInviteDialogOpen(true)}>i have an invite code</Button>
                    {authManager.webAuthnEnabled && <Button className='w-full cursor-pointer' onClick={async () => {
                        const req = await axios.post('/$/auth/secure/webauthn/login/options');
                        if (req.data.error) return setStandardError(req.data.error);

                        let assertionResp;
                        try {
                            assertionResp = await startAuthentication({ optionsJSON: req.data });
                        } catch (err) {
                            console.error(err);
                            return setStandardError('failed to get passkey credential. make sure you have a passkey set up and try again.');
                        }

                        axios.post('/$/auth/secure/webauthn/login/verify', assertionResp).then((response) => {
                            if (response.data.user) location.reload();
                            else setStandardError(response.data.error);
                        });
                    }}>i have a passkey</Button>}
                </CardContent>
            </Card>

            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent className='w-11/12 md:w-full max-w-md'>
                    <DialogHeader className='text-center'>
                        <DialogTitle className='text-2xl font-bold'>Enter Invite Code</DialogTitle>
                        <DialogDescription>please enter your invite code to create an account.</DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='inviteCode'>Invite Code</Label>
                            <Input id='inviteCode' type='text' required ref={inviteCodeRef} onKeyUp={(e) => e.key === 'Enter' && buttonRef.current!.click()} />
                        </div>

                        {inviteError && <div className='text-red-500 text-sm'>{inviteError}</div>}

                        <Button className='w-full cursor-pointer' ref={buttonRef} onClick={() => {
                            axios.post('/$/auth/secure/invite/account', {
                                code: inviteCodeRef.current!.value
                            }).then((response) => {
                                if (response.data.username) {
                                    setInviteUsername(response.data.username);
                                    setInviteCode(inviteCodeRef.current!.value);
                                    setInviteDialogOpen(false);
                                    setInviteDialog2Open(true);
                                } else setInviteError(response.data.error);
                            })
                        }}>Submit</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={inviteDialog2Open} onOpenChange={setInviteDialog2Open}>
                <DialogContent className='w-11/12 md:w-full max-w-md'>
                    <DialogHeader className='text-center'>
                        <DialogTitle className='text-2xl font-bold'>Welcome, {inviteUsername}!</DialogTitle>
                        <DialogDescription>Get started by entering a password below:</DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='newPassword'>New Password</Label>
                            <Input id='newPassword' type='password' required ref={invitePasswordRef} />
                        </div>

                        {standardError && <div className='text-red-500 text-sm'>{standardError}</div>}

                        <Button className='w-full cursor-pointer' ref={buttonRef} onClick={() => {
                            axios.post('/$/auth/secure/invite/claim', {
                                code: inviteCode,
                                password: invitePasswordRef.current!.value
                            }).then((response) => {
                                if (response.data.user) location.reload();
                                else setStandardError(response.data.error);
                            })
                        }}>Set Password & Log In</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
});

export default Auth;