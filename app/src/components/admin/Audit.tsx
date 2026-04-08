import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Button } from '../ui/button';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import Trash2 from 'lucide-react/icons/trash-2';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';

import type { DBAuditEntry } from '@/types';

const Audit = observer(function Audit() {
    const navigate = useNavigate();

    const [logs, setLogs] = useState<DBAuditEntry[]>([]);

    useEffect(() => {
        if (!authManager.admin) navigate('/');
        else api.admin.audit.get().then((res) => {
            if (res.data) setLogs(res.data.sort((a, b) => b.timestamp - a.timestamp));
            else shadd.setError(errorFrom(res));
        })
    }, []);

    return (
        <div className='flex flex-col items-center h-full w-5/6 gap-5 overflow-y-auto drain-scrollbar mt-6'>
            <h2 className='text-2xl font-bold text-left'>audit log</h2>

            <div className='flex flex-col gap-2 w-full'>
                {logs.sort((a, b) => b.timestamp - a.timestamp).map((entry) => {
                    const u = adminManager.getUser(entry.user);

                    return (
                        <div key={entry.id} className='flex items-center justify-between w-full py-3 px-4 border rounded-md gap-4'>
                            <div className='flex items-center gap-2 min-w-0'>
                                <span className='font-mono text-sm text-muted-foreground mr-1 mt-0.5'>[{new Date(entry.timestamp).toLocaleString()}]</span>
                                <span className='font-medium'>@{u?.username || '{deleted}'}</span>
                                <span className='text-muted-foreground'>-</span>
                                <span className='font-medium'> {entry.action}</span>
                                <span className='text-muted-foreground'>-</span>
                                <span className='font-medium'>{entry.details}</span>
                            </div>

                            <div className='flex items-center gap-1 shrink-0'>
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    disabled={entry.user === 1 || !(!!u)}
                                    className='flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10'
                                    onClick={() => shadd.confirm(
                                        'delete user',
                                        `are you sure you want to delete @${u.username}? this action cannot be undone.`,
                                        () => api.admin.users.delete.post({ userId: entry.user }).then(() => {
                                            adminManager.fetchAllUsers();
                                            shadd.close();
                                        })
                                    )}
                                >
                                    <Trash2 className='h-4 w-4' />
                                    delete actor
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default Audit;