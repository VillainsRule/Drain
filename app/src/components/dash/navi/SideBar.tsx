import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import Plus from 'lucide-react/icons/plus';

import { Button } from '../../shadcn/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../../shadcn/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../shadcn/dialog';
import { Input } from '../../shadcn/input';

import api, { errorFrom } from '@/lib/eden';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const SideBar = observer(function SideBar() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [siteAddError, setSiteAddError] = useState('');
    const [showGradient, setShowGradient] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            setShowGradient(scrollTop + clientHeight < scrollHeight - 5);
        }
    };

    useEffect(() => {
        handleScroll();
    }, [siteManager.siteList]);

    return (
        <div className='border-neutral-200 w-72 h-full flex flex-col items-center px-6 py-6 fixed left-0 top-0 bottom-0 z-20'>
            <div className='flex justify-center cursor-pointer items-center mb-4 select-none' onClick={() => navigate('/')}>
                <h1 className='text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm'>drain!</h1>
            </div>

            {siteManager.siteList.length < 1 && <div className='flex flex-col items-center mt-3'>
                <span className='text-accent-foreground'>you have no sites</span>
                <span className='text-accent-foreground'>contact an admin</span>
                <span className='text-accent-foreground'>and pray for some</span>
            </div>}

            <div className='relative w-full flex-1 min-h-0 mb-4'>
                <div
                    ref={scrollRef}
                    className='flex flex-col items-center w-full gap-1 overflow-auto drain-scrollbar pr-2 h-full'
                    onScroll={handleScroll}
                >
                    {siteManager.siteList.map((site, i) => (
                        <ContextMenu key={i}>
                            <ContextMenuTrigger asChild>
                                <div
                                    className='w-full rounded-lg px-7 py-2 transition-all duration-150 cursor-pointer hover:translate-x-1'
                                    onClick={(e) => {
                                        if (!(e.target as HTMLElement).classList.contains('no-click')) {
                                            siteManager.select(site);
                                            navigate(`/domain/${site}/keys`);
                                        }
                                    }}
                                >
                                    <span className={`text-lg font-medium ${pathname.startsWith('/domain/') && siteManager.site?.id === site ? 'text-sky-600' : 'text-primary'}`}>{site}</span>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem
                                    className='no-click'
                                    onClick={() => navigator.clipboard.writeText(`${location.origin}/domain/${site}/keys`)}
                                >Copy URL</ContextMenuItem>

                                {authManager.isAdmin() && <ContextMenuItem className='text-red-500 no-click' onClick={() => {
                                    api.sites.delete.post({ domain: site }).then((res) => {
                                        if (res.data) {
                                            siteManager.getList();
                                            siteManager.select('');
                                            navigate('/');
                                        } else alert(errorFrom(res));
                                    });
                                }}
                                >Delete Site</ContextMenuItem>}
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}
                </div>

                {showGradient && (
                    <div className='absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-white dark:from-gray-950 to-transparent pointer-events-none' />
                )}
            </div>

            {authManager.isAdmin() && (
                <Button
                    className='flex items-center justify-center gap-2 w-full py-5 rounded-lg shadow-lg transition-colors duration-125 cursor-pointer font-semibold text-lg'
                    onClick={() => setDialogOpen(true)}
                >
                    <Plus className='w-6 h-6 text-primary-foreground' />
                    <span className='text-primary-foreground'>add site</span>
                </Button>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>add site</DialogTitle>
                        <DialogDescription>add a site to our database. keys can be added later.</DialogDescription>
                    </DialogHeader>

                    <Input placeholder='my-cool-app.com' maxLength={32} id='domainAddInput' className='w-full mb-4' onKeyUp={(e) => (e.key === 'Enter') && buttonRef.current!.click()} />

                    {siteAddError && (<div className='text-red-500 mb-2'>{siteAddError}</div>)}

                    <Button className='w-3/4' ref={buttonRef} onClick={() => {
                        api.sites.create.post({
                            url: (document.getElementById('domainAddInput') as HTMLInputElement).value
                        }).then((res) => {
                            if (res.data) {
                                siteManager.getList();
                                setSiteAddError('');
                                setDialogOpen(false);
                            } else setSiteAddError(errorFrom(res));
                        });
                    }}>submit</Button>
                </DialogContent>
            </Dialog>
        </div>
    )
});

export default SideBar;