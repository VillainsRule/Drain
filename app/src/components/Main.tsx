import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import Code from 'lucide-react/icons/code';
import Fingerprint from 'lucide-react/icons/fingerprint';
import LogOut from 'lucide-react/icons/log-out';
import UserCog from 'lucide-react/icons/user-cog';
import Wrench from 'lucide-react/icons/wrench';

import authManager from '@/managers/AuthManager';

import SSAI from '@/assets/superSecretAdminImage.png';

const today = new Date(Date.now());
const shouldShowCow = Math.random() < 0.01 || (today.getMonth() === 3 && today.getDate() === 1);

const Main = observer(function Main() {
    const navigate = useNavigate();

    return (
        <div className='flex items-center flex-col gap-3 md:gap-6 h-full w-full mt-2 md:mt-16'>
            <div className='flex text-center items-center flex-col w-full mt-10'>
                <h1 className='text-4xl font-bold mt-10 mb-1.5'>hi, @{authManager.user.username}</h1>
                <h3 className='text-2xl font-medium'>welcome to drain!</h3>
            </div>

            {shouldShowCow && <img className='hidden md:flex w-200 h-30 mt-10' src={SSAI} />}

            <div className='flex md:hidden flex-row gap-4 min-w-fit mt-2'>
                {authManager.apiKeysEnabled && <Code className='w-8 h-8 cursor-pointer text-accent-foreground' onClick={() => navigate('/user/apiKeys')} />}
                {authManager.webAuthnEnabled && <Fingerprint className='w-8 h-8 cursor-pointer text-accent-foreground' onClick={() => navigate('/user/passkeys')} />}
                {authManager.isAdmin() && <Wrench className='w-8 h-8 cursor-pointer text-accent-foreground' onClick={() => navigate('/admin/config')} />}
                {authManager.isAdmin() && <UserCog className='w-8 h-8 cursor-pointer text-accent-foreground' onClick={() => navigate('/admin/users')} />}

                <LogOut className='w-8 h-8 cursor-pointer text-red-500' onClick={() => authManager.logout()} />
            </div>
        </div>
    )
});

export default Main;