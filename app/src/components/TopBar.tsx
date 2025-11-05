import { observer } from 'mobx-react-lite';

import LogOut from 'lucide-react/icons/log-out';
import Users from 'lucide-react/icons/users';

import axios from '@/lib/axiosLike';

import authManager from '@/managers/AuthManager';

const TopBar = observer(function TopBar({ setState }: { setState: React.Dispatch<React.SetStateAction<'site' | 'users' | ''>> }) {
    return (
        <div className='fixed top-0 left-72 right-0 flex justify-between items-center h-16t py-3 px-6 z-30'>
            <h1 className='font-semibold text-lg'>welcome, {authManager.user.username}!</h1>
            <div className='flex items-center gap-6'>
                {authManager.isAdmin() && <Users className='w-6 h-6 cursor-pointer text-gray-700' onClick={() => setState('users')} />}
                <LogOut className='w-6 h-6 cursor-pointer text-red-500' onClick={() => {
                    axios.post('/$/auth/logout').then((r) => {
                        if (r.data.loggedOut) {
                            authManager.loggedIn = false;
                            authManager.user = authManager.placeholderUser;
                        } else alert(r.data.error);
                    })
                }} />
            </div>
        </div>
    )
});

export default TopBar;