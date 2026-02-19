import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { startAuthentication } from '@simplewebauthn/browser'

import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'

import api, { errorFrom } from '@/lib/eden'

import authManager from '@/managers/AuthManager'

const Auth = observer(function Auth() {
    const navigate = useNavigate();

    const [allowCredentials] = useState<any[]>(JSON.parse(localStorage.getItem('passkeys') || '[]'));
    const [showingAll, setShowingAll] = useState<boolean>(allowCredentials.length < 1);

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

        if (localStorage.getItem('dark')) {
            document.body.classList.add('dark');
        }
    }, []);

    const doWebAuthn = async () => {
        const res = await api.auth.webauthn.login.options.post({});
        if (!res.data) return alert(errorFrom(res));

        if (!showingAll) {
            res.data.allowCredentials = localStorage.getItem('internalTransport') ? allowCredentials.map(e => ({ ...e, transports: ['internal'] })) : allowCredentials;
            res.data.userVerification = 'required';
        }

        let assertionResp;
        try {
            assertionResp = await startAuthentication({ optionsJSON: res.data });
        } catch (err: any) {
            return setStandardError(err.toString().includes('NotAllowedError') ?
                'do it again and don\'t close the popup early :P' :
                'failed to complete passkey authentication. try again or sign in with another method.'
            );
        }

        api.auth.webauthn.login.verify.post(assertionResp).then((res) => {
            if (res.data) {
                location.reload();
                localStorage.setItem('resavePasskeys', '1');
            } else setStandardError(errorFrom(res));
        });
    }

    return (
        <div className='min-h-screen flex items-center justify-center'>
            <Card className='w-11/12 md:w-full max-w-md'>
                <CardHeader className='text-center flex flex-col items-center'>
                    <CardTitle className='text-3xl font-bold'>Drain</CardTitle>
                    <CardDescription>your credentials have been provided by the site admin.</CardDescription>
                </CardHeader>

                {showingAll ? <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='username'>Username</Label>
                        <Input id='username' type='text' required ref={usernameRef} onKeyUp={(e) => e.key === 'Enter' && passwordRef.current!.focus()} />
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='password'>Password</Label>
                        <Input id='password' type='password' required ref={passwordRef} onKeyUp={(e) => e.key === 'Enter' && buttonRef.current!.click()} />
                    </div>

                    {standardError && <div className='text-red-500 text-sm'>{standardError}</div>}

                    <Button variant='outline' className='w-full cursor-pointer' ref={buttonRef} onClick={() => {
                        api.auth.account.post({
                            username: usernameRef.current!.value,
                            password: passwordRef.current!.value
                        }).then((res) => {
                            if (res.data) {
                                authManager.setAuth(res.data.user);
                                navigate('/');
                            } else setStandardError(errorFrom(res));
                        })
                    }}>Log In</Button>

                    <div className='flex items-center'>
                        <div className='grow h-px bg-ring' />
                        <span className='mx-3 text-ring text-sm'>OR</span>
                        <div className='grow h-px bg-ring' />
                    </div>

                    <Button variant='outline' className='w-full cursor-pointer' onClick={() => setInviteDialogOpen(true)}>i have an invite code</Button>
                    {authManager.webAuthnEnabled && <Button variant='outline' className='w-full cursor-pointer' onClick={doWebAuthn}>i have a passkey</Button>}
                </CardContent> : <CardContent className='space-y-4'>
                    <div className='border-2 border-dashed bg-background p-6 text-center flex justify-center items-center w-full h-36 rounded-sm cursor-pointer hover:scale-101 transition-all duration-100' onClick={doWebAuthn}>
                        <span className='text-muted-foreground'>reauthenticate with your passkey</span>
                    </div>

                    {standardError && <div className='text-red-500 text-sm'>{standardError}</div>}

                    <Button variant='outline' className='w-full cursor-pointer' ref={buttonRef} onClick={() => setShowingAll(true)}>sign in with alternative method</Button>
                </CardContent>}
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
                            api.auth.invites.attempt.post({
                                code: inviteCodeRef.current!.value
                            }).then((res) => {
                                if (res.data) {
                                    setInviteUsername(res.data.username);
                                    setInviteCode(inviteCodeRef.current!.value);
                                    setInviteDialogOpen(false);
                                    setInviteDialog2Open(true);
                                } else setInviteError(errorFrom(res));
                            })
                        }}>Submit</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={inviteDialog2Open} onOpenChange={setInviteDialog2Open}>
                <DialogContent className='w-11/12 md:w-full max-w-md'>
                    <DialogHeader className='text-center'>
                        <DialogTitle className='text-2xl font-bold'>welcome, {inviteUsername}!</DialogTitle>
                        <DialogDescription>get started by entering a password below:</DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='newPassword'>New Password</Label>
                            <Input id='newPassword' type='password' maxLength={24} required ref={invitePasswordRef} />
                        </div>

                        {standardError && <div className='text-red-500 text-sm'>{standardError}</div>}

                        <Button className='w-full cursor-pointer' ref={buttonRef} onClick={() => {
                            api.auth.invites.claim.post({
                                code: inviteCode,
                                password: invitePasswordRef.current!.value
                            }).then((res) => {
                                if (res.data && res.data.user) location.reload();
                                else setStandardError(errorFrom(res));
                            })
                        }}>Set Password & Log In</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
});

export default Auth;