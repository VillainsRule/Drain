import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import Globe from 'lucide-react/icons/globe';
import Plus from 'lucide-react/icons/plus';

import { Button } from '../ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../ui/context-menu';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import authStore from '@/store/AuthStore';
import siteStore from '@/store/SiteStore';

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
    }, [siteStore.siteList]);

    return (
        <div className='border-neutral-200 min-w-72 max-w-72 h-full hidden md:flex flex-col items-center p-6 pr-4 z-20'>
            <h1 className='text-center mb-4 text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm cursor-pointer' onClick={() => navigate('/')}>drain!</h1>

            {siteStore.siteList.length < 1 && <div className='flex flex-col items-center mt-3'>
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
                    {siteStore.siteList.map((site, i) => (
                        <ContextMenu key={i}>
                            <ContextMenuTrigger asChild>
                                <span className={`w-full rounded-lg px-7 py-2 transition-all duration-150 cursor-pointer hover:translate-x-1 text-lg ${pathname.startsWith('/domain/') && siteStore.site?.id === site && 'font-semibold tracking-tight'}`} onClick={(e) => {
                                    if (!(e.target as HTMLElement).classList.contains('no-click')) {
                                        siteStore.select(site);
                                        navigate(`/domain/${site}`);
                                    }
                                }}>{site}</span>
                            </ContextMenuTrigger>

                            <ContextMenuContent>
                                <ContextMenuItem
                                    className='no-click'
                                    onClick={() => navigator.clipboard.writeText(`${location.origin}/domain/${site}`)}
                                >Copy URL</ContextMenuItem>

                                {!!authStore.admin && <ContextMenuItem className='text-red-500 no-click' onClick={() => {
                                    api.v1.sites.delete.post({ domain: site }).then((res) => {
                                        if (res.data) {
                                            siteStore.getList();
                                            siteStore.select('');
                                            navigate('/');
                                        } else alert(errorFrom(res));
                                    });
                                }}>Delete Site</ContextMenuItem>}
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}
                </div>

                {showGradient && <div className='absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-white dark:from-gray-950 to-transparent pointer-events-none' />}
            </div>

            {!!authStore.admin && (
                <Button variant='outline' className='w-full' onClick={() => shadd.prompt(
                    'add a new site',
                    'enter the domain of the site you want to add. for example, "my-cool-app.com".',
                    { placeholder: 'my-cool-app.com', maxLength: 64, minLength: 1 },
                    async (value: string) => {
                        const options = await api.v1.sites.create.post({ url: value });

                        if (options.data) {
                            siteStore.getList();
                            shadd.close();
                        } else shadd.setError(errorFrom(options));
                    }
                )}>
                    <Plus className='w-6 h-6' />
                    <span>create site</span>
                </Button>
            )}

            <Button variant='outline' className='mt-2.5 w-full' onClick={() => navigate('/discovery')}>
                <Globe className='w-6 h-6' />
                <span>discovery</span>
            </Button>
        </div>
    )
});

export default SideBar;