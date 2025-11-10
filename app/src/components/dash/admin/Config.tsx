import { observer } from 'mobx-react-lite';

import { Button } from '@/components/shadcn/button';

import adminManager from '@/managers/AdminManager';
import siteManager from '@/managers/SiteManager';

import { useAppState } from '@/components/AppProvider';

import superSecretAdminImage from '@/assets/superSecretAdminImage.png';

const AdminConfig = observer(function AdminConfig() {
    const { setScreen } = useAppState();

    return (
        <>
            <div className='flex flex-col items-center w-full h-full overflow-y-auto drain-scrollbar mt-6'>
                <div className='flex flex-col items-center h-full w-5/6 gap-5'>
                    <div className='flex justify-between flex-col text-center w-full'>
                        <h1 className='text-2xl text-center font-bold'>drain super secret admin management and config controls 🤯🤯🤯</h1>

                        <h2 className='text-lg text-center font-medium'>total users: {adminManager.users?.length || 0}</h2>
                        <h2 className='text-lg text-center font-medium'>total sites: {siteManager.sites.length || 0}</h2>
                        <h2 className='text-lg text-center font-medium'>total keys: {siteManager.sites.reduce((acc, site) => acc + site.keys.length, 0)}</h2>

                        <h2 className='text-lg text-center font-medium mt-4'>instance commit: {adminManager.instanceInformation.commit}</h2>
                        <h2 className='text-lg text-center font-medium'>is drain dev?: {adminManager.instanceInformation.isDev.toString()}</h2>
                    </div>

                    <div className='flex justify-center gap-3'>
                        <Button onClick={() => setScreen('users.admin')}>manage users</Button>
                        <Button onClick={() => {
                            fetch('/$/admin/removeAllSessions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            }).then(r => r.json()).then(data => {
                                if (data.error) return alert(data.error);

                                alert('all sessions have been invalidated, including yours. you will be logged out momentarily.');
                                setTimeout(() => location.reload(), 2000);
                            });
                        }}>nuke sessions</Button>
                        {adminManager.instanceInformation.isUsingSystemd && <Button>trigger systemd restart</Button>}
                    </div>

                    <img src={superSecretAdminImage} className='mt-3 w-96 h-40 rounded-xl shadow-md border border-neutral-300 p-2' alt='super secret admin image' />
                </div>
            </div>
        </>
    )
});

export default AdminConfig;