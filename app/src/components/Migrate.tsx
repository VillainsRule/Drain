import { useEffect, useState } from 'react';

import { Button } from './ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.tsx';

import api, { errorFrom } from '@/lib/eden.ts';

export default function Migrate() {
    const [migrUrl, setMigrUrl] = useState('');

    useEffect(() => {
        api.auth.migr.redirect.post({ origin: location.origin }).then((res) => {
            if (res.data) setMigrUrl(res.data.redirect);
            else alert(errorFrom(res));
        })
    }, []);

    return (
        <div className='flex w-full h-screen items-center justify-center'>
            <Card className='w-sm gap-3'>
                <CardHeader className='text-center'>
                    <CardTitle>voauth migration</CardTitle>
                    <CardDescription>Drain is migrating to voauth for authorization! voauth provides a slightly simpler login flow and makes my life easier in terms of implementing passkeys in each of my projects!<br /><br />voauth migration will end on June 1st. after then, any users who haven't migrated will lose access to their accounts.</CardDescription>
                </CardHeader>

                <CardContent>
                    <Button size='sm' className='w-full' onClick={() => location.href = migrUrl}>
                        connect voauth
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}