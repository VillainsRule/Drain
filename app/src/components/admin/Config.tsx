import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '@/components/ui/label';

import api from '@/lib/eden';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const AdminConfig = observer(function AdminConfig() {
    const navigate = useNavigate();
    const [balancerProxyValid, setBalancerProxyValid] = useState(true);

    useEffect(() => {
        if (authManager.user.id > 1) navigate('/');
        adminManager.fetchInstanceInformation();
    }, []);

    const info = adminManager.instanceInformation;

    return (
        <div className='w-5/6 mx-auto mt-8 h-full overflow-y-auto drain-scrollbar'>
            <h1 className='text-xl font-semibold mb-6'>drain config controls 🤯 🤯 🤯</h1>

            <div className='grid grid-cols-2 gap-6 items-start'>
                <div className='flex flex-col gap-1 text-sm'>
                    <p className='text-xs uppercase tracking-widest font-medium text-muted-foreground/80 mb-2'>instance</p>
                    <span>{adminManager.users?.length || 0} users &middot; {siteManager.siteList.length || 0} sites</span>
                    <span>commit <a className='font-mono underline text-blue-500' href={`https://github.com/VillainsRule/Drain/commit/${info.commit}`} target='_blank'>{info.commit || '—'}</a></span>
                    <span>{info.commitsBehind} commits behind</span>
                    <span>local changes: {info.localChanges?.toString() ?? 'false'}</span>
                </div>

                <div className='flex flex-col gap-4'>
                    <p className='text-xs uppercase tracking-widest font-medium text-muted-foreground/80'>config</p>

                    <div className='flex items-center gap-2.5'>
                        <Checkbox id='allowAPIKeys' checked={info.config.allowAPIKeys} onCheckedChange={(isChecked) => {
                            info.config.allowAPIKeys = !!isChecked;
                            api.admin.instance.post({ config: info.config })
                                .then(() => adminManager.fetchInstanceInformation());
                        }} />
                        <Label htmlFor='allowAPIKeys' className='cursor-pointer text-sm'>allow API keys</Label>
                    </div>

                    <div className='flex flex-col gap-1.5'>
                        <Label htmlFor='balancerProxy' className='text-sm'>balancer proxy</Label>
                        <Input
                            id='balancerProxy'
                            className={`text-sm font-mono ${!balancerProxyValid ? 'border-red-500 ring-red-500/70!' : ''}`}
                            defaultValue={info.config.balancerProxy}
                            placeholder='http://host:port'
                            onInput={(e) => {
                                const value = e.currentTarget.value;
                                info.config.balancerProxy = value;
                                const proxyRegex = /^https?:\/\/(?:([^:@]+:[^:@]+)@)?([^:@]+:\d+)$/;
                                if (proxyRegex.test(value) || value === '') {
                                    setBalancerProxyValid(true);
                                    api.admin.instance.post({ config: info.config });
                                } else setBalancerProxyValid(false);
                            }}
                        />
                        {!balancerProxyValid && <span className='text-xs text-red-500'>invalid proxy URL</span>}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default AdminConfig;