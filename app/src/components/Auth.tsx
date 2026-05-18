import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import api, { errorFrom } from '@/lib/eden.ts'
import { shadd } from '@/lib/shadd.tsx'

import authStore from '@/store/AuthStore'

const Auth = observer(function Auth() {
    const navigate = useNavigate();

    const [redirectUrl, setRedirectUrl] = useState<string>('');

    useEffect(() => {
        if (authStore.id) navigate('/');
        else api.auth.login.redirect.post({ origin: location.origin }).then((res) => {
            if (res.data?.redirect) setRedirectUrl(res.data.redirect);
            else console.error('failed to get voauth redirect url:', res);
        });
    }, []);

    return (
        <div className='min-h-screen flex items-center justify-center'>
            <Card className='w-11/12 md:w-full max-w-md'>
                <CardHeader className='text-center flex flex-col items-center'>
                    <CardTitle className='text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm'>Drain</CardTitle>
                </CardHeader>

                <CardContent className='-mt-2 space-y-2'>
                    <Button className='w-full cursor-pointer' onClick={() => location.href = redirectUrl}>login with voauth</Button>

                    <Button variant='outline' className='w-full cursor-pointer' onClick={() => shadd.prompt(
                        'have an invite code?',
                        'enter the invite code to activate your account and get started with Drain!',
                        { placeholder: 'invite code', maxLength: 36, minLength: 9 },
                        async (code: string) => {
                            const options = await api.auth.invites.start.post({ code, origin: location.origin });
                            if (options.data) location.href = options.data.redirect;
                            else shadd.setError(errorFrom(options));
                        }
                    )}>i have an invite code</Button>
                </CardContent>
            </Card>
        </div>
    )
});

export default Auth;