import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { startRegistration } from '@simplewebauthn/browser';

import { Button } from '../../shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';

import authManager from '@/managers/AuthManager';

import Trash from 'lucide-react/icons/trash';

import axios from '@/lib/axiosLike';

const Passkeys = observer(function Passkeys() {
    const [passkeyNameModalOpen, setPasskeyNameModalOpen] = useState(false);
    const passkeyNameRef = useRef<HTMLInputElement>(null);
    const passkeyButtonRef = useRef<HTMLButtonElement>(null);
    const [passkeyError, setPasskeyError] = useState('');

    return (
        <>
            <div className='flex flex-col items-center w-full h-full overflow-y-auto drain-scrollbar mt-6'>
                <div className='flex flex-col items-center h-full w-full md:w-5/6 gap-5'>
                    <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                        <h2 className='text-2xl font-bold'>drain passkey manager</h2>

                        <div className='flex gap-3'>
                            <Button className='w-56 py-2 rounded-md transition-colors duration-150' onClick={() => setPasskeyNameModalOpen(true)}>add passkey</Button>
                        </div>
                    </div>

                    <div className='flex flex-col justify-center gap-5 w-full'>
                        {authManager.passkeys.map((passkey) => (
                            <div className='flex justify-between items-center w-full py-3 px-6 border rounded-md'>
                                <span className='text-lg font-bold'>{passkey.name}</span>
                                <span className='text-md text-muted-foreground'>{passkey.lastUsed}</span>

                                <div className='flex gap-3'>
                                    <Button variant='destructive' onClick={() => {
                                        if (confirm(`are you sure you want to delete the passkey "${passkey.name}"? this action cannot be undone.\n\nplease also note that this does not delete the passkey from your passkey manager; that must be done by you separately.`))
                                            axios.post('/$/auth/passkeys/delete', { name: passkey.name }).then(() => authManager.fetchPasskeys());
                                    }}>
                                        <Trash className='h-4 w-4 md:hidden' />
                                        <span className='hidden md:flex'>delete passkey</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Dialog open={passkeyNameModalOpen} onOpenChange={setPasskeyNameModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>add a new passkey</DialogTitle>
                        <DialogDescription>name your passkey something you'll remember later, such as your device's name.</DialogDescription>
                    </DialogHeader>

                    <Input placeholder='my iPhone' className='w-full mb-4' ref={passkeyNameRef} onKeyUp={(e) => (e.key === 'Enter') && passkeyButtonRef.current!.click()} />

                    {passkeyError && (<div className='text-red-500 mb-2'>{passkeyError}</div>)}

                    <Button className='w-3/4' ref={passkeyButtonRef} onClick={async () => {
                        const options = await axios.post('/$/auth/secure/webauthn/register/options', {
                            name: passkeyNameRef.current!.value
                        });

                        if (options.data.error) return setPasskeyError(options.data.error);

                        let attResp;

                        try {
                            attResp = await startRegistration({ optionsJSON: options.data });
                        } catch {
                            return setPasskeyError('an error occurred during passkey registration. please try again.');
                        }

                        const attestationResponse = await axios.post('/$/auth/secure/webauthn/register/verify', {
                            ...attResp,
                            name: passkeyNameRef.current!.value
                        });

                        if (attestationResponse.data.error) setPasskeyError(attestationResponse.data.error);
                        else {
                            authManager.fetchPasskeys();
                            setPasskeyNameModalOpen(false);
                        }
                    }}>submit</Button>
                </DialogContent>
            </Dialog>
        </>
    )
});

export default Passkeys;