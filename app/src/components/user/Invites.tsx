import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Badge } from '../ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import Trash2 from 'lucide-react/icons/trash-2';
import UserPlus from 'lucide-react/icons/user-plus';

import adminManager from '@/managers/AdminManager';
import authManager from '@/managers/AuthManager';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import type { PublicInvite } from '@/types';

const Invites = observer(function Invites() {
    const [params, setParams] = useSearchParams();
    const [invites, setInvites] = useState<PublicInvite[]>([]);

    const fetchInvites = async () => {
        const { data } = await api.auth.invites.get();
        if (data) setInvites(data.invites);
    }

    const createInvite = () => shadd.prompt(
        'create a new user',
        `enter a username for the new user. they will be able to set their password and site access after the account is created. ${!authManager.admin ? 'you can only invite 3 users at once.' : ''}`,
        { placeholder: 'username', maxLength: 16, minLength: 1 },
        (value: string) => {
            api.auth.invites.create.post({ username: value }).then((res) => {
                if (res.data) {
                    fetchInvites();

                    shadd.copy(
                        'user created!',
                        'the user has been created! give them this invite code to set their password and log in:',
                        res.data.inviteCode
                    );

                    if (authManager.admin) adminManager.fetchAllUsers();
                } else shadd.setError(errorFrom(res));
            });
        }
    );

    useEffect(() => {
        fetchInvites();

        if (params.has('op') && params.get('op') === 'invite') {
            setParams({});
            createInvite();
        }
    }, []);

    return (
        <div className='flex flex-col items-center w-full h-full md:w-5/6 gap-5 overflow-y-auto drain-scrollbar mt-6'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <h2 className='text-2xl font-bold'>invite drainers!</h2>
                {invites.filter(i => !i.accepted).length < 3 && <Button className='flex items-center gap-2 w-48 py-2 rounded-md transition-colors duration-150' onClick={createInvite}>
                    <UserPlus className='h-4 w-4' />
                    invite user
                </Button>}
            </div>

            <div className='flex flex-col gap-2 w-full'>
                {invites.length < 1
                    ? <p className='text-center text-muted-foreground text-sm py-4'>you haven't invited anyone.<br /><br />if you abuse this, since i haven't written a restriction system yet, i'll lowkey delete your account :D</p>
                    : invites.map((invite) => (
                        <div key={invite.username} className='flex items-center justify-between w-full py-3 px-4 border rounded-md gap-4'>
                            <div className='flex items-center gap-3'>
                                <span className='font-medium shrink-0 truncate'>{invite.username}</span>
                                <Badge variant={invite.accepted ? 'outline' : 'secondary'}>{invite.accepted ? 'accepted' : 'pending'}</Badge>
                            </div>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        disabled={invite.accepted}
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => shadd.confirm(
                                            'revoke invite?',
                                            `are you sure you want to revoke the invite for @${invite.username}?`,
                                            () => api.auth.invites.revoke.post({ username: invite.username }).then((res) => {
                                                if (res.data) {
                                                    fetchInvites();
                                                    shadd.close();
                                                } else shadd.setError(errorFrom(res));
                                            })
                                        )}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </TooltipTrigger>

                                <TooltipContent>{invite.accepted ? 'you cannot revoke accepted invites' : 'revoke invite'}</TooltipContent>
                            </Tooltip>
                        </div>
                    ))
                }
            </div>

            {invites.filter(i => !i.accepted).length >= 3 && <p className='text-center text-muted-foreground text-sm py-4'>you have reached the maximum number of pending invites. please wait for someone to accept their invite before creating more.</p>}
        </div>
    );
});

export default Invites;