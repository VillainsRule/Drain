import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { startAuthentication } from '@simplewebauthn/browser'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import api, { errorFrom } from '@/lib/eden'
import { shadd } from '@/lib/shadd'

import authManager from '@/managers/AuthManager'

const Auth = observer(function Auth() {
    const navigate = useNavigate();

    const [allowCredentials] = useState<any[]>(JSON.parse(localStorage.getItem('passkeys') || '[]'));
    const [showingAll, setShowingAll] = useState<boolean>(allowCredentials.length < 1);

    const [standardError, setStandardError] = useState<string>('');

    const [usernameInput, setUsernameInput] = useState<string>('');
    const [passwordInput, setPasswordInput] = useState<string>('');

    useEffect(() => {
        if (authManager.user.id) navigate('/');
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

    const handleLogin = () => api.auth.account.post({ username: usernameInput, password: passwordInput }).then((res) => {
        if (res.data) {
            authManager.motd = res.data.motd;
            authManager.setAuth(res.data.user);
            navigate('/');
        } else setStandardError(errorFrom(res));
    });

    return (
        <div className='min-h-screen flex items-center justify-center'>
            <Card className='w-11/12 md:w-full max-w-md'>
                <CardHeader className='text-center flex flex-col items-center'>
                    <CardTitle className='text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm'>Drain</CardTitle>
                </CardHeader>

                {showingAll ? <CardContent className='space-y-4'>
                    <form onSubmit={(e) => (e.preventDefault(), handleLogin())} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='username'>Username</Label>
                            <Input
                                type='text'
                                value={usernameInput}
                                required
                                autoFocus
                                onInput={(e) => setUsernameInput(e.currentTarget.value)}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='password'>Password</Label>
                            <Input
                                type='password'
                                value={passwordInput}
                                required
                                onInput={(e) => setPasswordInput(e.currentTarget.value)}
                            />
                        </div>

                        {standardError && <div className='text-red-500 text-sm'>{standardError}</div>}

                        <Button type='submit' className='w-full cursor-pointer'>Log In</Button>
                    </form>

                    <div className='flex w-full justify-center gap-3 items-center'>
                        <Button variant='outline' className='flex-1 min-w-0 cursor-pointer' onClick={() => shadd.prompt(
                            'have an invite code?',
                            'enter the invite code to activate your account and get started with Drain!',
                            { placeholder: 'invite code', maxLength: 36, minLength: 9 },
                            async (code: string) => {
                                const options = await api.auth.invites.attempt.post({ code });
                                if (options.data) shadd.prompt(
                                    `welcome, ${options.data.username}!`,
                                    'get started by entering a password below:',
                                    { placeholder: 'password', maxLength: 24, minLength: 3 },
                                    async (password: string) => {
                                        const res = await api.auth.invites.claim.post({ code, password });

                                        if (res.data && res.data.user) {
                                            authManager.setAuth(res.data.user);
                                            location.reload();
                                        } else shadd.setError(errorFrom(res));
                                    }
                                )
                                else shadd.setError(errorFrom(options));
                            }
                        )}>i have an invite code</Button>

                        {authManager.webAuthnEnabled && <Button variant='outline' className='flex-1 min-w-0 cursor-pointer' onClick={doWebAuthn}>i have a passkey</Button>}
                    </div>
                </CardContent> : <CardContent className='space-y-4'>
                    <div className='border-2 border-dashed bg-background p-6 text-center flex justify-center items-center w-full h-36 rounded-sm cursor-pointer hover:scale-101 transition-all duration-100' onClick={doWebAuthn}>
                        <span className='text-muted-foreground'>reauthenticate with your passkey</span>
                    </div>

                    {standardError && <div className='text-red-500 text-sm'>{standardError}</div>}

                    <Button variant='outline' className='w-full cursor-pointer' onClick={() => setShowingAll(true)}>sign in with alternative method</Button>
                </CardContent>}
            </Card>
        </div>
    )
});

export default Auth;