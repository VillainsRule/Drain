import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import Plus from 'lucide-react/icons/plus';

import { Button } from '../../shadcn/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../../shadcn/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../shadcn/dialog';
import { Input } from '../../shadcn/input';

import axios from '@/lib/axiosLike';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

import { useAppState } from '@/components/AppProvider';

const NavBox = observer(function NavBox() {
    const { screen, setScreen, setDomain } = useAppState();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [siteAddError, setSiteAddError] = useState('');

    const buttonRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <div className='border-neutral-200 w-full h-[calc(100%-5.25rem)] flex flex-col px-6 py-8 pb-6 fixed left-0 top-0 bottom-0 z-20'>
                <div className='flex flex-col justify-between h-full w-full items-center'>
                    <div className='flex flex-col items-center gap-4 w-full h-full'>
                        <div className='flex flex-col items-center w-full gap-1 overflow-auto drain-scrollbar pr-2'>
                            {siteManager.sites.map((site, i) => (
                                <ContextMenu key={i}>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            className={`w-full rounded-lg px-7 py-2 transition-all duration-150 cursor-pointer
                                            ${screen === 'site' && siteManager.domain === site.domain ? 'bg-blue-100 border border-blue-300 shadow' : 'hover:bg-neutral-100'}`}
                                            onClick={e => {
                                                if (!(e.target as HTMLElement).classList.contains('no-click')) {
                                                    setDomain(site.domain);
                                                    setScreen('site');
                                                }
                                            }}
                                        >
                                            <span className={`text-lg font-medium ${screen === 'site' && siteManager.domain === site.domain ? 'text-blue-700' : 'text-neutral-800'}`}>{site.domain}</span>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem
                                            className='no-click'
                                            onClick={() => navigator.clipboard.writeText(location.origin + '#' + site.domain)}
                                        >
                                            Copy URL
                                        </ContextMenuItem>
                                        {authManager.isAdmin() && (
                                            <ContextMenuItem
                                                className='text-red-500 no-click'
                                                onClick={() => {
                                                    axios.post('/$/sites/delete', { domain: site.domain }).then(resp => {
                                                        if (resp.data.error) {
                                                            alert(resp.data.error);
                                                        } else {
                                                            siteManager.getSites();
                                                            setDomain('');
                                                            setScreen('none');
                                                        }
                                                    });
                                                }}
                                            >
                                                Delete Site
                                            </ContextMenuItem>
                                        )}
                                    </ContextMenuContent>
                                </ContextMenu>
                            ))}
                        </div>

                        {authManager.isAdmin() && (
                            <div
                                className='flex items-center justify-center gap-2 bg-blue-600 w-full py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-125 cursor-pointer font-semibold text-lg'
                                onClick={() => setDialogOpen(true)}
                            >
                                <Plus className='w-6 h-6 text-white' />
                                <span className='text-white'>Add Site</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>add site</DialogTitle>
                        <DialogDescription>add a site to our database. keys can be added later.</DialogDescription>
                    </DialogHeader>

                    <Input placeholder='my-cool-app.com' id='domainAddInput' className='w-full mb-4' onKeyUp={(e) => (e.key === 'Enter') && buttonRef.current!.click()} />

                    {siteAddError && (<div className='text-red-500 mb-2'>{siteAddError}</div>)}

                    <Button className='w-3/4' ref={buttonRef} onClick={() => {
                        axios.post('/$/sites/create', {
                            url: (document.getElementById('domainAddInput') as HTMLInputElement).value
                        }).then((resp) => {
                            if (resp.data.error) setSiteAddError(resp.data.error);
                            else {
                                siteManager.getSites();
                                setSiteAddError('');
                                setDialogOpen(false);
                            }
                        }).catch((err) => {
                            console.error(err);
                        });
                    }}>submit</Button>
                </DialogContent>
            </Dialog>
        </>
    )
});

export default NavBox;