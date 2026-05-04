import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import Code from 'lucide-react/icons/code';
import Link from 'lucide-react/icons/link';
import LogOut from 'lucide-react/icons/log-out';
import Pencil from 'lucide-react/icons/pencil';
import UserCog from 'lucide-react/icons/user-cog';
import Wrench from 'lucide-react/icons/wrench';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import authManager from '@/managers/AuthManager';

import Iconic from '@/assets/notSoSecretAnymorePublicImage.png';

const Hub = observer(function Hub() {
    const navigate = useNavigate();

    return (
        <div className='flex items-center flex-col gap-2.5 h-full w-full mt-16 md:mt-24'>
            <div className='flex items-center gap-7.5'>
                <img className='hidden md:flex h-24 w-48' src={Iconic} />

                <div className='flex flex-col gap-2.5'>
                    <h1 className='text-5xl font-bold'>hi, @{authManager.username}</h1>
                    <h2 className='text-3xl font-medium'>welcome to drain!</h2>
                </div>
            </div>

            <Card className='gap-1 py-4.5 px-6 mt-3 w-md'>
                <div className='flex items-center gap-2'>
                    <span className='text-xs text-muted-foreground'>MOTD</span>

                    {authManager.id === 1 && <Pencil className='w-3.5 h-3.5 text-muted-foreground ml-auto cursor-pointer hover:text-foreground transition-colors' onClick={() => shadd.prompt(
                        'edit MOTD',
                        'all users will see this when they log in. make it funny.',
                        { placeholder: 'welcome to my drain instance!', defaultValue: authManager.instance.motd, textarea: true },
                        async (value: string) => {
                            const req = await api.admin.instance.post({ config: { motd: value } });
                            if (req.data) {
                                authManager.checkAuth();
                                shadd.close();
                            } else shadd.setError(errorFrom(req));
                        }
                    )} />}
                </div>

                <span className='text-sm whitespace-pre-wrap'>{authManager.instance.motd.replaceAll('\\n', '\n')}</span>
            </Card>

            {authManager.instance.numRequests > 0 && <Badge variant='outline' className='mt-4 px-3 py-1 cursor-pointer' onClick={() => navigate('/discovery/requests')}>
                <Link className='w-3.5 h-3.5 text-muted-foreground mr-1' />
                <span>{authManager.instance.numRequests} pending request{authManager.instance.numRequests > 1 && 's'}</span>
            </Badge>}

            <div className='flex md:hidden justify-center gap-2 mt-4 flex-wrap max-w-3/5'>
                {authManager.instance.allowAPIKeys && <Button variant='outline' size='sm' onClick={() => navigate('/user/apiKeys')}><Code className='w-4 h-4 mr-2' />API Keys</Button>}
                {!!authManager.admin && <Button variant='outline' size='sm' onClick={() => navigate('/admin/config')}><Wrench className='w-4 h-4 mr-2' />Config</Button>}
                {!!authManager.admin && <Button variant='outline' size='sm' onClick={() => navigate('/admin/users')}><UserCog className='w-4 h-4 mr-2' />Users</Button>}
                <Button variant='destructive' size='sm' onClick={() => authManager.logout()}><LogOut className='w-4 h-4 mr-2' />Logout</Button>
            </div>
        </div>
    )
});

export default Hub;