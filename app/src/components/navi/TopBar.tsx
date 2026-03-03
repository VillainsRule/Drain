import { type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';

import Code from 'lucide-react/icons/code';
import Fingerprint from 'lucide-react/icons/fingerprint';
import Flask from 'lucide-react/icons/flask-conical';
import LogOut from 'lucide-react/icons/log-out';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import UserCog from 'lucide-react/icons/user-cog';
import Wrench from 'lucide-react/icons/wrench';

import authManager from '@/managers/AuthManager';
import labManager from '@/managers/LabManager';

const TopBar = observer(function TopBar({ dark, setDark }: { dark: boolean, setDark: Dispatch<SetStateAction<boolean>> }) {
    const navigate = useNavigate();

    return (
        <div className='hidden md:flex w-full justify-between items-center pt-6 pb-2 pl-4 z-30'>
            <h1 className='font-semibold text-lg'>welcome, {authManager.user.username}!</h1>

            <div className='flex items-center gap-6 min-h-full'>
                {labManager.get('darkMode') && <>
                    {dark ? <Sun className='w-6 h-6 cursor-pointer text-accent-foreground' onClick={() => {
                        document.body.classList.remove('dark');
                        localStorage.removeItem('dark');
                        setDark(false);
                    }} /> : <Moon className='w-6 h-6 cursor-pointer text-accent-foreground' onClick={() => {
                        document.body.classList.add('dark');
                        localStorage.setItem('dark', '1');
                        setDark(true);
                    }} />}
                </>}

                {authManager.apiKeysEnabled && <Tooltip>
                    <TooltipTrigger asChild>
                        <Code className='w-6 h-6 cursor-pointer text-accent-foreground' onClick={() => navigate('/user/apiKeys')} />
                    </TooltipTrigger>

                    <TooltipContent>Drain API Keys</TooltipContent>
                </Tooltip>}

                {authManager.webAuthnEnabled && <Tooltip>
                    <TooltipTrigger asChild>
                        <Fingerprint className='w-6 h-6 cursor-pointer text-accent-foreground' onClick={() => navigate('/user/passkeys')} />
                    </TooltipTrigger>

                    <TooltipContent>Passkeys</TooltipContent>
                </Tooltip>}

                {authManager.user.id === 1 && <Tooltip>
                    <TooltipTrigger asChild>
                        <Wrench className='w-6 h-6 cursor-pointer text-accent-foreground' onClick={() => navigate('/admin/config')} />
                    </TooltipTrigger>

                    <TooltipContent>Instance Config</TooltipContent>
                </Tooltip>}

                {authManager.isAdmin() && <Tooltip>
                    <TooltipTrigger asChild>
                        <UserCog className='w-6 h-6 cursor-pointer text-accent-foreground' onClick={() => navigate('/admin/users')} />
                    </TooltipTrigger>

                    <TooltipContent>User Management</TooltipContent>
                </Tooltip>}

                {authManager.isDev && <Tooltip>
                    <TooltipTrigger asChild>
                        <Flask className='w-5.75 h-5.75 rotate-7 -mx-0.5 cursor-pointer text-accent-foreground' onClick={() => navigate('/admin/labs')} />
                    </TooltipTrigger>

                    <TooltipContent>Labs</TooltipContent>
                </Tooltip>}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <LogOut className='w-6 h-6 cursor-pointer text-red-500' onClick={() => authManager.logout()} />
                    </TooltipTrigger>

                    <TooltipContent>Log Out</TooltipContent>
                </Tooltip>
            </div>
        </div>
    )
});

export default TopBar;