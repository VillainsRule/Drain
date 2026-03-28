import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import BookOpen from 'lucide-react/icons/book-open';
import Code from 'lucide-react/icons/code';
import Fingerprint from 'lucide-react/icons/fingerprint-pattern';
import LogOut from 'lucide-react/icons/log-out';
import UserCog from 'lucide-react/icons/user-cog';
import Wrench from 'lucide-react/icons/wrench';

import authManager from '@/managers/AuthManager';

const TopBar = observer(function TopBar() {
    const navigate = useNavigate();

    return (
        <div className='hidden md:flex w-full justify-between items-center pt-6 pb-2 pl-4 z-30'>
            <h1 className='font-semibold text-lg'>welcome, {authManager.user.username}!</h1>

            <div className='flex items-center gap-6 min-h-full'>
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
                        <BookOpen className='w-6 h-6 cursor-pointer text-accent-foreground' onClick={() => navigate('/discovery/requests')} />
                    </TooltipTrigger>

                    <TooltipContent>Requests</TooltipContent>
                </Tooltip>}

                {authManager.isAdmin() && <Tooltip>
                    <TooltipTrigger asChild>
                        <UserCog className='w-6 h-6 cursor-pointer text-accent-foreground' onClick={() => navigate('/admin/users')} />
                    </TooltipTrigger>

                    <TooltipContent>User Management</TooltipContent>
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