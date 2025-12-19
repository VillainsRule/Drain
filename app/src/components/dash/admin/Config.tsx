import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Label } from '@/components/shadcn/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';

import adminManager from '@/managers/AdminManager';
import siteManager from '@/managers/SiteManager';

import { useAppState } from '@/components/AppProvider';

import Github from 'lucide-react/icons/github';
import Power from 'lucide-react/icons/power';
import Users from 'lucide-react/icons/users';

import superSecretAdminImage from '@/assets/superSecretAdminImage.png';

const AdminConfig = observer(function AdminConfig() {
    const { setScreen } = useAppState();

    const [gitOutput, setGitOutput] = useState<string>('');

    return (
        <>
            <div className='flex flex-col items-center w-full h-full overflow-y-auto drain-scrollbar mt-6'>
                <div className='flex flex-col items-center h-full w-5/6 gap-5'>
                    <div className='flex justify-between flex-col text-center w-full'>
                        <h1 className='text-2xl text-center font-bold'>drain super secret admin management and config controls 🤯🤯🤯</h1>

                        <h2 className='text-lg text-center font-medium'>total users: {adminManager.users?.length || 0}</h2>
                        <h2 className='text-lg text-center font-medium'>total sites: {siteManager.sites.length || 0}</h2>
                        <h2 className='text-lg text-center font-medium'>total keys: {siteManager.sites.reduce((acc, site) => acc + site.keys.length, 0)}</h2>

                        <h2 className='text-lg text-center font-medium mt-4'>instance commit: {adminManager.instanceInformation.commit}</h2>
                        <h2 className='text-lg text-center font-medium'>is drain dev?: {adminManager.instanceInformation.isDev.toString()}</h2>
                    </div>

                    <div className='flex items-center gap-3'>
                        <Checkbox id='useProxiesBalancer' checked={adminManager.instanceInformation.config.useProxiesForBalancer} onCheckedChange={(isChecked) => {
                            adminManager.instanceInformation.config.useProxiesForBalancer = !!isChecked;
                            fetch('/$/admin/secure/setConfig', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ config: adminManager.instanceInformation.config })
                            }).then(() => adminManager.fetchInstanceInformation());
                        }} />
                        {siteManager.siteExists('https.proxy') && <Label htmlFor='useProxiesBalancer'>use proxies from "https.proxy" for balancer</Label>}
                    </div>

                    <div className={`flex justify-center gap-3 ${adminManager.instanceInformation.isDev && !adminManager.instanceInformation.isUsingSystemd ? 'md:hidden' : ''}`}>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button className='md:hidden' onClick={() => setScreen('users.admin')}><Users /></Button>
                            </TooltipTrigger>

                            <TooltipContent>
                                <span>manage users</span>
                            </TooltipContent>
                        </Tooltip>

                        {!adminManager.instanceInformation.isDev && <Tooltip>
                            <TooltipTrigger onClick={() => {
                                fetch('/$/admin/secure/gitPull', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                }).then(r => r.json()).then(data => setGitOutput(data.out || 'no git output...thats odd!'));
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
                                fetch('/$/admin/secure/systemdRestart', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                }).then(r => r.json()).then(data => {
                                    if (data.error) return alert(data.error);

                                    alert('systemd restart triggered successfully.');
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

                    <img src={superSecretAdminImage} className='mt-3 w-96 h-40 rounded-xl p-2' alt='super secret admin image' />
                </div>
            </div>

            {gitOutput && <Dialog open={!!gitOutput} onOpenChange={(isOpen) => !isOpen && setGitOutput('')}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>git pull</DialogTitle>
                        <DialogDescription>command output or something</DialogDescription>
                    </DialogHeader>

                    <pre className='bg-neutral-900 text-neutral-100 p-4 rounded-lg max-h-[70vh] overflow-y-auto drain-scrollbar whitespace-pre-wrap'>{gitOutput}</pre>
                </DialogContent>
            </Dialog>}
        </>
    )
});

export default AdminConfig;