import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Button } from '../shadcn/button';

import Fingerprint from 'lucide-react/icons/fingerprint';
import LogOut from 'lucide-react/icons/log-out';
import Plus from 'lucide-react/icons/plus';
import UserCog from 'lucide-react/icons/user-cog';
import Wrench from 'lucide-react/icons/wrench';

import authManager from '@/managers/AuthManager';

import Logo from '@/assets/Logo';

const Main = observer(function Main() {
    const navigate = useNavigate();

    return (
        <div className='flex md:justify-center items-center flex-col gap-3 md:gap-6 h-full w-full mt-2 md:-mt-32'>
            <div className='flex md:justify-center items-center flex-col md:flex-row md:gap-9 w-full'>
                <Logo className='w-32 h-32 rounded-xl shadow-md border border-neutral-200 p-4 bg-white' />

                <div className='flex items-center flex-col text-center'>
                    <h1 className='text-4xl font-bold mb-1.5'>hi, @{authManager.user.username}</h1>
                    <h3 className='text-2xl font-medium'>welcome to drain!</h3>
                </div>
            </div>

            <Button size='lg'><Plus />new site</Button>

            <div className='flex md:hidden flex-row gap-4 min-w-fit mt-2'>
                {authManager.webAuthnEnabled && <Fingerprint className='w-8 h-8 cursor-pointer text-gray-700' onClick={() => navigate('/user/passkeys')} />}
                {authManager.isAdmin() && <Wrench className='w-8 h-8 cursor-pointer text-gray-700' onClick={() => navigate('/admin/config')} />}
                {authManager.isAdmin() && <UserCog className='w-8 h-8 cursor-pointer text-gray-700' onClick={() => navigate('/admin/users')} />}

                <LogOut className='w-8 h-8 cursor-pointer text-red-500' onClick={() => authManager.logout()} />
            </div>
        </div>
    )
});

export default Main;