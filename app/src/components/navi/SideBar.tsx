import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import Plus from 'lucide-react/icons/plus';

import { Button } from '../shadcn/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../shadcn/context-menu';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const SideBar = observer(function SideBar() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [showGradient, setShowGradient] = useState(false);

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
        <div className='border-neutral-200 min-w-72 max-w-72 h-full hidden md:flex flex-col items-center p-6 pr-4 z-20'>
            <h1 className='text-center mb-4 text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm cursor-pointer' onClick={() => navigate('/')}>drain!</h1>

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

                {showGradient && <div className='absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-white dark:from-gray-950 to-transparent pointer-events-none' />}
            </div>

            {authManager.isAdmin() && (
                <Button className='flex items-center justify-center gap-2 w-full py-5 rounded-lg shadow-lg transition-colors duration-125 cursor-pointer font-semibold text-lg' onClick={() => shadd.prompt(
                    'add a new site',
                    'enter the domain of the site you want to add. for example, "my-cool-app.com".',
                    { placeholder: 'my-cool-app.com', maxLength: 64, minLength: 1 },
                    async (value) => {
                        const options = await api.sites.create.post({ url: value });

                        if (options.data) {
                            siteManager.getList();
                            shadd.close();
                        } else shadd.setError(errorFrom(options));
                    }
                )}>
                    <Plus className='w-6 h-6 text-primary-foreground' />
                    <span className='text-primary-foreground'>add site</span>
                </Button>
            )}
        </div>
    )
});

export default SideBar;