import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { startAuthentication } from '@simplewebauthn/browser'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import api, { errorFrom } from '@/lib/eden'

import authStore from '@/store/AuthStore'

const LegacyAuth = observer(function LegacyAuth() {
    const navigate = useNavigate();

    const [standardError, setStandardError] = useState<string>('');

    const [usernameInput, setUsernameInput] = useState<string>('');
    const [passwordInput, setPasswordInput] = useState<string>('');

    useEffect(() => {
        if (authStore.id) navigate('/');
    }, []);

    const onLogin = async (data: ({ user: { id: number, username: string, admin: 0 | 1 }, motd: string })) => {
        authStore.instance.motd = data.motd;
        authStore.setAuth(data.user);
        navigate('/migrate');
    }

    const doWebAuthn = async () => {
        const res = await api.auth.webauthn.login.options.post({});
        if (!res.data) return alert(errorFrom(res));

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
            if (res.data) onLogin(res.data);
            else setStandardError(errorFrom(res));
        });
    }

    const handleLogin = () => api.auth.account.post({ username: usernameInput, password: passwordInput }).then((res) => {
        if (res.data) onLogin(res.data);
        else setStandardError(errorFrom(res));
    });

    return (
        <div className='min-h-screen flex items-center justify-center'>
            <Card className='w-11/12 md:w-full max-w-md'>
                <CardHeader className='text-center flex flex-col items-center'>
                    <CardTitle className='text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm'>Drain</CardTitle>
                </CardHeader>

                <CardContent className='space-y-4'>
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

                    {authStore.instance.allowPasskeys && <Button variant='outline' className='w-full cursor-pointer' onClick={doWebAuthn}>use a passkey</Button>}
                </CardContent>
            </Card>
        </div>
    )
});

export default LegacyAuth;