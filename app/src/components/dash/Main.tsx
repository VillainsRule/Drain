import { createElement, type FC } from 'react';

import SideBar from '@/components/dash/navi/SideBar';
import TopBar from '@/components/dash/navi/TopBar';
import AdminConfig from '@/components/dash/admin/Config';
import Users from '@/components/dash/admin/Users';
import Site from '@/components/dash/Site';

import { useAppState } from '@/components/AppProvider';
import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

import icon from '@/assets/leak.jpeg';

import type { ScreensT } from '@/lib/screens';

const getUnit = (number: number) => {
    if (number === 1) return 'st';
    if (number === 2) return 'nd';
    if (number === 3) return 'rd';
    return 'th';
}

export default function Main() {
    const { screen } = useAppState();

    const assignedScreens: { [K in ScreensT]?: FC } = {
        'site': Site,
        'users.admin': Users,
        'config.admin': AdminConfig
    }

    if (screen) return (
        <div className='bg-blue-200/10 flex gap-5 p-5 h-screen w-screen'>
            <SideBar />

            <div className='absolute flex flex-col top-16 left-72 w-[calc(100%-20rem)] h-[calc(100%-4rem)]'>
                <TopBar />

                {screen in assignedScreens && assignedScreens[screen] ? createElement(assignedScreens[screen]!) : <>
                    <div className='flex justify-center items-center gap-9 h-full w-full -mt-32'>
                        <img src={icon} className='w-45 h-45 rounded-xl shadow-md border border-neutral-200 p-4 bg-white' alt='drain logo' />
                        <div className='flex items-center flex-col'>
                            <h1 className='text-4xl font-bold mb-1.5'>hi, drainer? drainee? idk</h1>
                            <h3 className='text-2xl font-medium'>welcome to drain! you are the {authManager.user.id}{getUnit(authManager.user.id)} user!</h3>
                            <h3 className='text-2xl font-medium'>
                                {authManager.user.admin ? 'you are an admin! you get it all :P' : siteManager.sites.length > 0 ? 'your sites are to the left.' : 'you got nothing yet...ask an admin for stuff!'}
                            </h3>
                        </div>
                    </div>
                </>}
            </div>
        </div>
    )
}