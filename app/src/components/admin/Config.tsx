import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '../shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

import Github from 'lucide-react/icons/github';
import Power from 'lucide-react/icons/power';
import Users from 'lucide-react/icons/users';

import superSecretAdminImage from '@/assets/superSecretAdminImage.png';

const AdminConfig = observer(function AdminConfig() {
    const navigate = useNavigate();

    const [balancerProxyValid, setBalancerProxyValid] = useState(true);
    const [gitOutput, setGitOutput] = useState<string>('');

    useEffect(() => {
        if (authManager.user.id > 1) navigate('/');

        adminManager.fetchInstanceInformation();
    }, []);

    return (
        <div className='flex flex-col items-center w-5/6 gap-5 h-full overflow-y-auto drain-scrollbar mt-6'>
            <div className='flex justify-between flex-col text-center w-full'>
                <h1 className='text-2xl text-center font-bold'>drain super secret admin management and config controls 🤯🤯🤯</h1>

                <h2 className='text-lg text-center font-medium'>total users: {adminManager.users?.length || 0}</h2>
                <h2 className='text-lg text-center font-medium'>total sites: {siteManager.siteList.length || 0}</h2>

                <h2 className='text-lg text-center font-medium mt-4'>instance commit: {adminManager.instanceInformation.commit}</h2>
                <h2 className='text-lg text-center font-medium'>has local changes?: {adminManager.instanceInformation.localChanges.toString()}</h2>
            </div>

            <div className='flex items-center gap-3'>
                <Checkbox id='allowAPIKeys' checked={adminManager.instanceInformation.config.allowAPIKeys} onCheckedChange={(isChecked) => {
                    adminManager.instanceInformation.config.allowAPIKeys = !!isChecked;
                    api.admin.instance.post({ config: adminManager.instanceInformation.config })
                        .then(() => adminManager.fetchInstanceInformation());
                }} />

                <Label htmlFor='allowAPIKeys'>allow API keys</Label>
            </div>

            {<div className='flex items-center gap-3'>
                <span className='min-w-28'>balancer proxy:</span>
                <Input className={`py-0.5 ${!balancerProxyValid ? 'border-red-500 ring-red-500/70!' : ''}`} defaultValue={adminManager.instanceInformation.config.balancerProxy} onInput={(e) => {
                    const value = e.currentTarget.value;
                    adminManager.instanceInformation.config.balancerProxy = value;

                    const proxyRegex = /^https?:\/\/(?:([^:@]+:[^:@]+)@)?([^:@]+:\d+)$/;
                    if (proxyRegex.test(value) || value === '') {
                        setBalancerProxyValid(true);
                        api.admin.instance.post({ config: adminManager.instanceInformation.config });
                    } else setBalancerProxyValid(false);
                }} />
            </div>}

            <div className={`flex justify-center gap-3 ${adminManager.instanceInformation.localChanges && !adminManager.instanceInformation.isUsingSystemd ? 'md:hidden' : ''}`}>
                <Tooltip>
                    <TooltipTrigger>
                        <Button className='md:hidden' onClick={() => navigate('/admin/users')}><Users /></Button>
                    </TooltipTrigger>

                    <TooltipContent>
                        <span>manage users</span>
                    </TooltipContent>
                </Tooltip>

                {!adminManager.instanceInformation.localChanges && <Tooltip>
                    <TooltipTrigger onClick={() => {
                        api.admin.gitPull.post().then((res) => setGitOutput(res.data?.out || errorFrom(res)));
                    }}>
                        <Button className='md:hidden'><Github /></Button>
                        <Button className='hidden md:flex'>git pull</Button>
                    </TooltipTrigger>

                    <TooltipContent>
                        <span>git pull</span>
                    </TooltipContent>
                </Tooltip>}

                {adminManager.instanceInformation.isUsingSystemd && <Tooltip>
                    <TooltipTrigger onClick={() => {
                        api.admin.systemdRestart.post().then(() => {
                            shadd.alert('systemd restart triggered!', 'the page will reload in ~2 seconds. gg.');
                            setTimeout(() => location.reload(), 2000);
                        });
                    }}>
                        <Button className='md:hidden'><Power /></Button>
                        <Button className='hidden md:flex'>restart app</Button>
                    </TooltipTrigger>

                    <TooltipContent>
                        <span>restart app</span>
                    </TooltipContent>
                </Tooltip>}
            </div>

            <img src={superSecretAdminImage} className='mt-3 w-3xl h-30 rounded-xl p-2' alt='super secret admin image' />

            {gitOutput && <Dialog open={!!gitOutput} onOpenChange={(isOpen) => !isOpen && setGitOutput('')}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>git pull</DialogTitle>
                        <DialogDescription>command output or something</DialogDescription>
                    </DialogHeader>

                    <pre className='bg-neutral-900 text-neutral-100 p-4 rounded-lg max-h-[70vh] overflow-y-auto drain-scrollbar whitespace-pre-wrap'>{gitOutput}</pre>
                </DialogContent>
            </Dialog>}
        </div>
    )
});

export default AdminConfig;