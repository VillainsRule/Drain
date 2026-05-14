import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '@/components/ui/button';

import api, { errorFrom } from '@/lib/eden';

import CheckCircle from 'lucide-react/icons/check-circle';
import XCircle from 'lucide-react/icons/x-circle';
import Clock from 'lucide-react/icons/clock';
import Users from 'lucide-react/icons/users';

import adminStore from '@/store/AdminStore';
import authStore from '@/store/AuthStore';

import { getRelativeTime } from '@/lib/utils';

import type { DBRequest } from '@/types';

interface EnrichedRequest extends DBRequest {
    username: string;
}

const Requests = observer(function Requests() {
    const [requests, setRequests] = useState<EnrichedRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const getRequests = () => api.v1.discovery.requests.get().then((res) => {
        if (res.data) {
            const enriched = res.data.requests.map((r) => ({
                ...r,
                username: adminStore.users.find(u => u.id === r.user)?.username ?? `user#${r.user}`
            }));
            authStore.instance.numRequests = enriched.length;
            setRequests(enriched.sort((a: EnrichedRequest, b: EnrichedRequest) => b.timestamp - a.timestamp));
        }
        setLoading(false);
    });

    useEffect(() => {
        getRequests();
    }, []);

    const act = (id: string, action: 'approve' | 'deny') => {
        const endpoint = api.v1.discovery.requests[action].post({ id });

        endpoint.then((res) => {
            if (res.data) getRequests();
            else alert(errorFrom(res));
        });
    };

    return (
        <div className='flex flex-col h-full w-5/6 gap-6 overflow-y-auto drain-scrollbar mt-6 pr-2.5'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <div>
                    <h2 className='text-2xl font-bold text-center md:text-left'>requests</h2>
                    <p className='text-sm text-muted-foreground mt-0.5'>manage pending access requests</p>
                </div>

                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Users className='h-4 w-4' />
                    <span>{requests.length} pending</span>
                </div>
            </div>

            {loading ? (
                <div className='flex flex-col gap-3 w-full'>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className='flex items-center gap-4 px-5 py-4 border rounded-xl animate-pulse'>
                            <div className='flex flex-col gap-2 flex-1'>
                                <div className='h-4 w-40 rounded bg-muted' />
                                <div className='h-3 w-24 rounded bg-muted' />
                            </div>

                            <div className='h-8 w-20 rounded-md bg-muted shrink-0' />
                            <div className='h-8 w-16 rounded-md bg-muted shrink-0' />
                        </div>
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-16'>no requests, <span className='underline cursor-pointer' onClick={() => getRequests()}>refresh?</span></p>
            ) : (
                <div className='flex flex-col gap-3 pb-6'>
                    {requests.map(req => (
                        <div className='flex items-center gap-4 px-5 py-4 border rounded-xl transition-colors duration-150 hover:border-border'>
                            <div className='flex flex-col gap-0.5 flex-1 min-w-0'>
                                <span className='text-sm font-semibold truncate'>{req.site}</span>

                                <span className='text-xs text-muted-foreground flex items-center gap-1.5'>
                                    <Clock className='h-3 w-3 shrink-0' />
                                    {req.username} · {getRelativeTime(req.timestamp)}
                                </span>
                            </div>

                            <div className='shrink-0 flex items-center gap-2'>
                                <Button
                                    size='sm'
                                    variant='outline'
                                    className='gap-1.5 text-green-600 border-green-500/40 hover:bg-green-500/10 hover:text-green-600 transition-colors'
                                    onClick={() => act(req.id, 'approve')}
                                >
                                    <CheckCircle className='h-3.5 w-3.5' />
                                    approve
                                </Button>

                                <Button
                                    size='sm'
                                    variant='outline'
                                    className='gap-1.5 text-red-500 border-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-colors'
                                    onClick={() => act(req.id, 'deny')}
                                >
                                    <XCircle className='h-3.5 w-3.5' />
                                    deny
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default Requests;