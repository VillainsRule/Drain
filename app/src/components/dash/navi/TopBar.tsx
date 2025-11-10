import { observer } from 'mobx-react-lite';

import { useAppState } from '@/components/AppProvider';

import Hamburger from 'lucide-react/icons/hamburger';
import KeyRound from 'lucide-react/icons/key-round';
import LogOut from 'lucide-react/icons/log-out';
import UserPen from 'lucide-react/icons/user-pen';
import Wrench from 'lucide-react/icons/wrench';

import axios from '@/lib/axiosLike';

import authManager from '@/managers/AuthManager';

import icon from '@/assets/leak.jpeg';

const TopBar = observer(function TopBar() {
    const { lastScreen, screen, setScreen } = useAppState();

    return (
        <>
            {/* desktop bar */}
            <div className='fixed top-0 left-72 right-0 hidden md:flex justify-between items-center py-3 px-6 z-30'>
                <h1 className='font-semibold text-lg'>welcome, {authManager.user.username}!</h1>

                <div className='flex items-center gap-6'>
                    {authManager.webAuthnEnabled && <KeyRound className='w-6 h-6 cursor-pointer text-gray-700' onClick={() => setScreen('passkeys.user')} />}
                    {authManager.isAdmin() && <Wrench className='w-6 h-6 cursor-pointer text-gray-700' onClick={() => setScreen('config.admin')} />}
                    {authManager.isAdmin() && <UserPen className='w-6 h-6 cursor-pointer text-gray-700' onClick={() => setScreen('users.admin')} />}

                    <LogOut className='w-6 h-6 cursor-pointer text-red-500' onClick={() => {
                        axios.post('/$/auth/logout').then((r) => {
                            if (r.data.error) alert(r.data.error);
                            else location.reload();
                        })
                    }} />
                </div>
            </div>

            {/* mobile bar */}
            <div className='fixed bottom-0 w-[calc(100%-48px)] flex md:hidden justify-between items-center py-5 px-6 z-30'>
                <div className='flex justify-center gap-3 cursor-pointer items-center mb-2 select-none' onClick={() => setScreen('none')}>
                    <img src={icon} className='w-9 h-9' alt='drain logo' />
                    <h1 className='text-3xl font-bold text-neutral-800 drop-shadow-md'>drain!</h1>
                </div>

                <Hamburger className='w-8 h-8 cursor-pointer text-gray-700' onClick={() => setScreen(screen === 'navbox' ? lastScreen : 'navbox')} />
            </div>
        </>
    )
});

export default TopBar;