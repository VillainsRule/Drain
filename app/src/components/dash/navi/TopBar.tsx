import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';

import Code from 'lucide-react/icons/code';
import Fingerprint from 'lucide-react/icons/fingerprint';
import Hamburger from 'lucide-react/icons/hamburger';
import LogOut from 'lucide-react/icons/log-out';
import UserCog from 'lucide-react/icons/user-cog';
import Wrench from 'lucide-react/icons/wrench';

import authManager from '@/managers/AuthManager';

import Logo from '@/assets/Logo';

const TopBar = observer(function TopBar({ setIsNavboxOpen }: { setIsNavboxOpen: Dispatch<SetStateAction<boolean>> }) {
    const navigate = useNavigate();

    useEffect(() => {
        const listener = () => {
            if (window.innerWidth >= 768) setIsNavboxOpen(false);
        }

        document.addEventListener('resize', listener);

        return () => {
            document.removeEventListener('resize', listener);
        };
    }, []);

    return (
        <>
            {/* desktop bar */}
            <div className='fixed top-0 left-72 right-0 hidden md:flex justify-between items-center py-3 px-6 z-30'>
                <h1 className='font-semibold text-lg'>welcome, {authManager.user.username}!</h1>

                <div className='flex items-center gap-6'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Code className='w-6 h-6 cursor-pointer text-gray-700' onClick={() => navigate('/user/apiKeys')} />
                        </TooltipTrigger>
                        <TooltipContent>
                            <span>Drain API Keys</span>
                        </TooltipContent>
                    </Tooltip>

                    {authManager.webAuthnEnabled && <Tooltip>
                        <TooltipTrigger asChild>
                            <Fingerprint className='w-6 h-6 cursor-pointer text-gray-700' onClick={() => navigate('/user/passkeys')} />
                        </TooltipTrigger>
                        <TooltipContent>
                            <span>Passkeys</span>
                        </TooltipContent>
                    </Tooltip>}

                    {authManager.isAdmin() && <Tooltip>
                        <TooltipTrigger asChild>
                            <Wrench className='w-6 h-6 cursor-pointer text-gray-700' onClick={() => navigate('/admin/config')} />
                        </TooltipTrigger>
                        <TooltipContent>
                            <span>Instance Config</span>
                        </TooltipContent>
                    </Tooltip>}

                    {authManager.isAdmin() && <Tooltip>
                        <TooltipTrigger asChild>
                            <UserCog className='w-6 h-6 cursor-pointer text-gray-700' onClick={() => navigate('/admin/users')} />
                        </TooltipTrigger>
                        <TooltipContent>
                            <span>User Management</span>
                        </TooltipContent>
                    </Tooltip>}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <LogOut className='w-6 h-6 cursor-pointer text-red-500' onClick={() => authManager.logout()} />
                        </TooltipTrigger>
                        <TooltipContent>
                            <span>Log Out</span>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* mobile bar */}
            <div className='fixed bottom-0 w-[calc(100%-48px)] flex md:hidden justify-between items-center py-5 px-6 z-30'>
                <div className='flex justify-center gap-3 cursor-pointer items-center mb-2 select-none' onClick={() => navigate('/')}>
                    <Logo className='w-9 h-9' />
                    <h1 className='text-3xl font-bold text-neutral-800 drop-shadow-md'>drain!</h1>
                </div>

                <Hamburger className='w-8 h-8 cursor-pointer text-gray-700' onClick={() => setIsNavboxOpen(o => !o)} />
            </div>
        </>
    )
});

export default TopBar;