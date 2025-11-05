import { useState } from 'react';

import SideBar from '@/components/SideBar';
import Site from '@/components/Site';
import TopBar from '@/components/TopBar';
import Users from '@/components/Users';

import siteManager from '@/managers/SiteManager';

export default function Main() {
    const hash = location.hash.slice(1);
    if (hash !== 'users') siteManager.hash = hash;

    const [state, setState] = useState<'site' | 'users' | ''>(hash === 'users' ? 'users' : 'site');

    if (state) return (
        <div className='bg-blue-200/10 flex gap-5 p-5 h-screen w-screen'>
            <SideBar setState={setState} />

            <div className='absolute flex flex-col top-16 left-72 w-[calc(100%-20rem)] h-[calc(100%-4rem)]'>
                <TopBar setState={setState} />

                {state === 'site' && <Site />}
                {state === 'users' && <Users />}
            </div>
        </div>
    )
}