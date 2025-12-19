import { createElement, type FC } from 'react';
import { observer } from 'mobx-react-lite';

import Fingerprint from 'lucide-react/icons/fingerprint';
import LogOut from 'lucide-react/icons/log-out';
import UserCog from 'lucide-react/icons/user-cog';
import Wrench from 'lucide-react/icons/wrench';

import authManager from '@/managers/AuthManager';

import { useAppState } from '@/components/AppProvider';

import NavBox from './navi/NavBox';
import SideBar from './navi/SideBar';
import TopBar from './navi/TopBar';

import AdminConfig from './admin/Config';
import Users from './admin/Users';

import APIKeys from './user/APIKeys';
import Passkeys from './user/Passkeys';

import Site from './Site';

import Logo from '@/assets/Logo';

import type { ScreensT } from '@/lib/screens';

const Main = observer(function Main() {
    const { screen, setScreen } = useAppState();

    const assignedScreens: { [K in ScreensT]?: FC } = {
        'site': Site,
        'navbox': NavBox,
        'users.admin': Users,
        'config.admin': AdminConfig,
        'apikeys.user': APIKeys,
        'passkeys.user': Passkeys
    }

    if (screen) return (
        <div className='bg-blue-200/10 flex gap-5 p-5 h-screen w-screen'>
            <div className='hidden md:flex'><SideBar /></div>

            <div className='absolute flex flex-col md:top-16 md:left-72 w-[calc(100%-2.5rem)] md:w-[calc(100%-20rem)] h-[calc(100%-6.5rem)] md:h-[calc(100%-4rem)]'>
                <TopBar />

                {screen in assignedScreens && assignedScreens[screen] ? createElement(assignedScreens[screen]!) : <>
                    <div className='flex md:justify-center items-center flex-col md:flex-row gap-3 md:gap-9 h-full w-full mt-2 md:-mt-32'>
                        <Logo className='w-45 h-45 rounded-xl shadow-md border border-neutral-200 p-4 bg-white' />

                        <div className='flex items-center flex-col text-center'>
                            <h1 className='text-4xl font-bold mb-1.5'>hi, @{authManager.user.username}</h1>
                            <h3 className='text-2xl font-medium'>welcome to drain!</h3>
                        </div>

                        <div className='flex md:hidden flex-row gap-4 min-w-fit mt-2'>
                            {authManager.webAuthnEnabled && <Fingerprint className='w-8 h-8 cursor-pointer text-gray-700' onClick={() => setScreen('passkeys.user')} />}
                            {authManager.isAdmin() && <Wrench className='w-8 h-8 cursor-pointer text-gray-700' onClick={() => setScreen('config.admin')} />}
                            {authManager.isAdmin() && <UserCog className='w-8 h-8 cursor-pointer text-gray-700' onClick={() => setScreen('users.admin')} />}

                            <LogOut className='w-8 h-8 cursor-pointer text-red-500' onClick={() => authManager.logout()} />
                        </div>
                    </div>
                </>}
            </div>
        </div>
    )
});

export default Main;