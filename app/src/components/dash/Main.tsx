import { createElement, type FC } from 'react';

import UserPen from 'lucide-react/icons/user-pen';
import Wrench from 'lucide-react/icons/wrench';

import authManager from '@/managers/AuthManager';

import { useAppState } from '@/components/AppProvider';

import NavBox from './navi/NavBox';
import SideBar from './navi/SideBar';
import TopBar from './navi/TopBar';

import AdminConfig from './admin/Config';
import Users from './admin/Users';

import Site from './Site';

import icon from '@/assets/leak.jpeg';

import type { ScreensT } from '@/lib/screens';

export default function Main() {
    const { screen, setScreen } = useAppState();

    const assignedScreens: { [K in ScreensT]?: FC } = {
        'site': Site,
        'navbox': NavBox,
        'users.admin': Users,
        'config.admin': AdminConfig
    }

    if (screen) return (
        <div className='bg-blue-200/10 flex gap-5 p-5 h-screen w-screen'>
            <div className='hidden md:flex'><SideBar /></div>

            <div className='absolute flex flex-col md:top-16 md:left-72 w-[calc(100%-2.5rem)] md:w-[calc(100%-20rem)] h-[calc(100%-6.5rem)] md:h-[calc(100%-4rem)]'>
                <TopBar />

                {screen in assignedScreens && assignedScreens[screen] ? createElement(assignedScreens[screen]!) : <>
                    <div className='flex md:justify-center items-center flex-col md:flex-row gap-3 md:gap-9 h-full w-full mt-2 md:-mt-32'>
                        <img src={icon} className='w-45 h-45 rounded-xl shadow-md border border-neutral-200 p-4 bg-white' alt='drain logo' />

                        <div className='flex items-center flex-col text-center'>
                            <h1 className='text-4xl font-bold mb-1.5'>hi, internet user!</h1>
                            <h3 className='text-2xl font-medium'>welcome to drain! you are user #{authManager.user.id}!</h3>
                        </div>

                        <div className='flex md:hidden flex-col gap-2 min-w-fit'>
                            {authManager.user.id === 1 && <div
                                className='flex items-center justify-center gap-2 bg-blue-600 w-67 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-125 cursor-pointer font-semibold text-lg'
                                onClick={() => setScreen('config.admin')}
                            >
                                <Wrench className='w-6 h-6 text-white' />
                                <span className='text-white'>super secret panel</span>
                            </div>}

                            {authManager.isAdmin() && <div
                                className='flex items-center justify-center gap-2 bg-blue-600 w-67 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-125 cursor-pointer font-semibold text-lg'
                                onClick={() => setScreen('users.admin')}
                            >
                                <UserPen className='w-6 h-6 text-white' />
                                <span className='text-white'>manage users</span>
                            </div>}
                        </div>
                    </div>
                </>}
            </div>
        </div>
    )
}