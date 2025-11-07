import { useRef, useState } from 'react'

import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'

import axios from '@/lib/axiosLike'

export default function Auth() {
    const [error, setError] = useState<string>('');

    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50'>
            <Card className='w-full max-w-md'>
                <CardHeader className='text-center'>
                    <CardTitle className='text-2xl font-bold'>Drain</CardTitle>
                    <CardDescription>log in with your dedicated credentials</CardDescription>
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

                    {error && <div className='text-red-500 text-sm'>{error}</div>}

                    <Button className='w-full cursor-pointer' ref={buttonRef} onClick={() => {
                        axios.post('/$/auth/secure', {
                            username: usernameRef.current!.value,
                            password: passwordRef.current!.value
                        }).then((response) => {
                            if (response.data.user) location.reload();
                            else setError(response.data.error);
                        })
                    }}>Log In</Button>
                </CardContent>
            </Card>
        </div>
    )
}