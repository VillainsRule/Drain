import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import GripVertical from 'lucide-react/icons/grip-vertical';
import Plus from 'lucide-react/icons/plus';

import { Button } from '../shadcn/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../shadcn/context-menu';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const getInsertIndex = (e: React.DragEvent, itemIndex: number): number => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? itemIndex : itemIndex + 1;
}

const DropBar = () => (
    <div className='w-full px-3 pointer-events-none'>
        <div className='h-0.5 rounded-full bg-primary w-full' />
    </div>
);

const SideBar = observer(function SideBar() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [showGradient, setShowGradient] = useState(false);
    const [localSites, setLocalSites] = useState<string[]>([]);
    const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const dragIndexRef = useRef<number | null>(null);

    useEffect(() => {
        setLocalSites([...siteManager.siteList]);
    }, [siteManager.siteList]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            setShowGradient(scrollTop + clientHeight < scrollHeight - 5);
        }
    };

    useEffect(() => {
        handleScroll();
    }, [localSites]);

    const handleDragStart = (index: number) => dragIndexRef.current = index;

    const handleDragOver = (e: React.DragEvent, itemIndex: number) => {
        e.preventDefault();
        setDropInsertIndex(getInsertIndex(e, itemIndex));
    };

    const handleDrop = (e: React.DragEvent, itemIndex: number) => {
        e.preventDefault();
        const dragIndex = dragIndexRef.current;
        const insertIndex = getInsertIndex(e, itemIndex);

        setDropInsertIndex(null);
        dragIndexRef.current = null;

        if (dragIndex === null) return;

        const effectiveInsert = insertIndex > dragIndex ? insertIndex - 1 : insertIndex;
        if (effectiveInsert === dragIndex) return;

        const reordered = [...localSites];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(effectiveInsert, 0, moved);
        setLocalSites(reordered);

        api.sites.reorder.post({ domain: moved, newIndex: effectiveInsert }).then((res) => {
            if (!res.data) {
                setLocalSites([...siteManager.siteList]);
                alert(errorFrom(res));
            }
        });
    };

    const handleDragEnd = () => {
        setDropInsertIndex(null);
        dragIndexRef.current = null;
    };

    return (
        <div className='border-neutral-200 min-w-72 max-w-72 h-full hidden md:flex flex-col items-center p-6 pr-4 z-20'>
            <h1 className='text-center mb-4 text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm cursor-pointer' onClick={() => navigate('/')}>drain!</h1>

            {localSites.length < 1 && <div className='flex flex-col items-center mt-3'>
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
                    {localSites.map((site, i) => (
                        <div key={site} className='w-full flex flex-col'>
                            {dropInsertIndex === i && <DropBar />}

                            <ContextMenu>
                                <ContextMenuTrigger asChild>
                                    <span
                                        className={[
                                            'group w-full rounded-lg px-3 py-2 pl-2 transition-all duration-150 cursor-pointer hover:translate-x-1 text-lg flex items-center gap-1',
                                            pathname.startsWith('/domain/') && siteManager.site?.id === site ? 'font-semibold tracking-tight' : '',
                                            dragIndexRef.current === i ? 'opacity-40' : '',
                                        ].join(' ')}
                                        draggable
                                        onDragStart={() => handleDragStart(i)}
                                        onDragOver={(e) => handleDragOver(e, i)}
                                        onDrop={(e) => handleDrop(e, i)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => {
                                            if (!(e.target as HTMLElement).classList.contains('no-click')) {
                                                siteManager.select(site);
                                                navigate(`/domain/${site}/keys`);
                                            }
                                        }}
                                    >
                                        <span className='no-click opacity-0 group-hover:opacity-40 hover:opacity-80! transition-opacity cursor-grab active:cursor-grabbing shrink-0'>
                                            <GripVertical className='no-click w-4 h-4' />
                                        </span>
                                        {site}
                                    </span>
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
                                    }}>Delete Site</ContextMenuItem>}
                                </ContextMenuContent>
                            </ContextMenu>

                            {i === localSites.length - 1 && dropInsertIndex === localSites.length && <DropBar />}
                        </div>
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