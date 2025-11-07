import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '@/components/shadcn/button';

import adminManager from '@/managers/AdminManager';
import siteManager from '@/managers/SiteManager';

import { useAppState } from '@/components/AppProvider';

import superSecretAdminImage from '@/assets/superSecretAdminImage.png';

const AdminConfig = observer(function AdminConfig() {
    const { setScreen } = useAppState();

    const [isUsingSystemd, setIsUsingSystemd] = useState(false);

    useEffect(() => {
        fetch('/$/admin/instanceInformation', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(r => r.json()).then(data => {
            setIsUsingSystemd(data.isUsingSystemd);
        });
    }, []);

    return (
        <>
            <div className='flex flex-col items-center w-full h-full overflow-y-auto drain-scrollbar mt-6'>
                <div className='flex flex-col items-center h-full w-5/6 gap-5'>
                    <div className='flex justify-between flex-col text-center w-full'>
                        <h1 className='text-2xl text-center font-bold'>drain super secret admin management and config controls 🤯🤯🤯</h1>

                        <h2 className='text-lg text-center font-medium'>hey! you over there! you are user ID 1...how special!</h2>
                        <h2 className='text-lg text-center font-medium mt-4'>total users: {adminManager.users?.length || 0}</h2>
                        <h2 className='text-lg text-center font-medium'>total sites: {siteManager.sites.length || 0}</h2>
                    </div>

                    <div className='flex justify-center gap-3'>
                        <Button onClick={() => setScreen('users.admin')}>manage users</Button>
                        <Button onClick={() => {
                            fetch('/$/admin/invalidateAllSessions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            }).then(r => r.json()).then(data => {
                                if (data.success) {
                                    alert('all sessions have been invalidated, including yours. you will be logged out momentarily.');
                                    setTimeout(() => location.reload(), 2000);
                                } else alert(`Error: ${data.error}`);
                            });
                        }}>nuke sessions</Button>
                        {isUsingSystemd && <Button>trigger systemd restart</Button>}
                    </div>

                    <img src={superSecretAdminImage} className='mt-3 mb-6 w-96 h-96 rounded-xl shadow-md border border-neutral-300 p-2' alt='super secret admin image' />
                </div>
            </div>
        </>
    )
});

export default AdminConfig;