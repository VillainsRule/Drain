import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { startRegistration } from '@simplewebauthn/browser';

import { Button } from '../../shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';

import authManager from '@/managers/AuthManager';

import Trash from 'lucide-react/icons/trash';

import api, { errorFrom } from '@/lib/eden';

const Passkeys = observer(function Passkeys() {
    const [passkeyNameModalOpen, setPasskeyNameModalOpen] = useState(false);
    const passkeyNameRef = useRef<HTMLInputElement>(null);
    const passkeyButtonRef = useRef<HTMLButtonElement>(null);
    const [passkeyError, setPasskeyError] = useState('');
    const [internalTransport, setInternalTransport] = useState(!!localStorage.getItem('internalTransport'));

    useEffect(() => {
        authManager.fetchPasskeys();
    }, []);

    return (
        <div className='flex flex-col items-center w-full h-full md:w-5/6 gap-5 overflow-y-auto drain-scrollbar mt-6'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <h2 className='text-2xl font-bold'>drain passkey manager</h2>

                <div className='flex gap-3'>
                    <Button className='w-56 py-2 rounded-md transition-colors duration-150' onClick={() => setPasskeyNameModalOpen(true)}>add passkey</Button>
                </div>
            </div>

            {authManager.passkeys.length < 1 && <span className='text-muted-foreground text-sm text-center'>you have no passkeys. <span className='underline cursor-pointer' onClick={() => setPasskeyNameModalOpen(true)}>create one!</span></span>}

            <div className='flex flex-col justify-center gap-5 w-full'>
                {authManager.passkeys.map((passkey) => (
                    <div className='flex justify-between items-center w-full py-3 px-6 border rounded-md'>
                        <span className='text-lg font-bold w-30'>{passkey.name}</span>
                        <span className='text-md text-muted-foreground'>{passkey.lastUsed === 'never' ? 'never used' : 'last used ' + passkey.lastUsed}</span>

                        <div className='flex gap-3'>
                            <Button variant='destructive' onClick={() => {
                                if (confirm(`are you sure you want to delete the passkey "${passkey.name}"? this action cannot be undone.\n\nplease also note that this does not delete the passkey from your passkey manager; that must be done by you separately.`))
                                    api.auth.passkeys.delete.post({ id: passkey.id }).then(() => authManager.fetchPasskeys());
                            }}>
                                <Trash className='h-4 w-4 md:hidden' />
                                <span className='hidden md:flex'>delete passkey</span>
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {authManager.passkeys.length >= 1 && <span className='flex gap-3 w-full'>
                <Checkbox id='forceIT' checked={internalTransport} onCheckedChange={(isChecked) => {
                    if (isChecked) localStorage.setItem('internalTransport', '1');
                    else localStorage.removeItem('internalTransport');
                    setInternalTransport(!!isChecked);
                }} />

                <Label htmlFor='forceIT'>i exclusively use apple touchID passkeys</Label>
            </span>}

            <Dialog open={passkeyNameModalOpen} onOpenChange={setPasskeyNameModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>add a new passkey</DialogTitle>
                        <DialogDescription>name your passkey something you'll remember later, such as your device's name.</DialogDescription>
                    </DialogHeader>

                    <Input placeholder='iCloud' className='w-full mb-4' maxLength={24} ref={passkeyNameRef} onKeyUp={(e) => (e.key === 'Enter') && passkeyButtonRef.current!.click()} />

                    {passkeyError && (<div className='text-red-500 mb-2'>{passkeyError}</div>)}

                    <Button className='w-3/4' ref={passkeyButtonRef} onClick={async () => {
                        const options = await api.auth.webauthn.register.options.post({
                            name: passkeyNameRef.current!.value
                        });

                        if (!options.data) return setPasskeyError(errorFrom(options));

                        let attResp;

                        try {
                            attResp = await startRegistration({ optionsJSON: options.data });
                        } catch (e) {
                            console.error(e);
                            return setPasskeyError('an error occurred during passkey registration. please try again.');
                        }

                        const verifyRes = await api.auth.webauthn.register.verify.post(attResp);
                        if (verifyRes.data) {
                            authManager.fetchPasskeys();
                            setPasskeyNameModalOpen(false);
                        } else setPasskeyError(errorFrom(verifyRes));
                    }}>submit</Button>
                </DialogContent>
            </Dialog>
        </div>
    )
});

export default Passkeys;