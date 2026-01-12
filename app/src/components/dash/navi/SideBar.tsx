import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import Plus from 'lucide-react/icons/plus';

import { Button } from '../../shadcn/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../../shadcn/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../shadcn/dialog';
import { Input } from '../../shadcn/input';

import axios from '@/lib/axiosLike';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

import Logo from '@/assets/Logo'

const SiteItem = observer(function SiteItem({ site }: { site: any }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: site.domain });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return (
        <div ref={setNodeRef} style={style} className='w-full'>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className={`w-full max-w-full rounded-lg px-7 py-2 transition-all duration-150 cursor-grab active:cursor-grabbing overflow-hidden
                        ${isDragging ? 'bg-blue-500/50 shadow-lg' : pathname.startsWith('/domain/') && siteManager.domain === site.domain ? 'bg-blue-100 border border-blue-300 shadow' : 'hover:bg-neutral-100'}`}
                        onClick={e => {
                            if (!(e.target as HTMLElement).classList.contains('no-click')) {
                                siteManager.domain = site.domain;
                                navigate('/domain/' + site.domain);
                            }
                        }}
                        {...attributes}
                        {...listeners}
                    >
                        <span className={`text-lg font-medium ${pathname.startsWith('/domain/') && siteManager.domain === site.domain ? 'text-blue-700' : 'text-neutral-800'}`}>{site.domain}</span>
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
                                        siteManager.domain = '';
                                        navigate('/');
                                    }
                                });
                            }}
                        >
                            Delete Site
                        </ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenu>
        </div>
    );
});

const SideBar = observer(function SideBar() {
    const navigate = useNavigate();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [siteAddError, setSiteAddError] = useState('');

    const buttonRef = useRef<HTMLButtonElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const getOrderedSites = () => {
        if (Array.isArray(authManager.user?.order) && authManager.user.order.length >= 1) {
            return authManager.user.order
                .map(domain => siteManager.sites.find(s => s.domain === domain))
                .filter(site => site !== undefined);
        }

        return siteManager.sites;
    };

    const orderedSites = getOrderedSites();

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = orderedSites.findIndex(s => s.domain === active.id);
            const newIndex = orderedSites.findIndex(s => s.domain === over.id);

            const newOrder = arrayMove(orderedSites, oldIndex, newIndex);

            axios.post('/$/sites/order', {
                order: newOrder.map(site => site.domain)
            }).then(() => {
                authManager.checkAuth(false);
            }).catch((err) => {
                console.error('Failed to reorder sites:', err);
            });
        }
    };

    return (
        <>
            <div className='border-neutral-200 w-72 h-full flex flex-col px-6 py-8 fixed left-0 top-0 bottom-0 z-20'>
                <div className='flex flex-col justify-between h-full w-full items-center'>
                    <div className='flex flex-col items-center gap-4 mb-4 w-full h-full'>
                        <div className='flex justify-center gap-3 cursor-pointer items-center mb-2 select-none' onClick={() => navigate('/')}>
                            <Logo className='w-12 h-12 rounded-xl shadow-md border border-neutral-300 p-2' />
                            <h1 className='text-4xl font-extrabold tracking-tight text-neutral-800 drop-shadow-sm'>drain</h1>
                        </div>

                        {siteManager.sites.length > 0 && <div className='w-full border-b border-neutral-300'></div>}

                        {authManager.isAdmin() && (
                            <div
                                className='flex items-center justify-center gap-2 bg-blue-600 w-full py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-125 cursor-pointer font-semibold text-lg'
                                onClick={() => setDialogOpen(true)}
                            >
                                <Plus className='w-6 h-6 text-white' />
                                <span className='text-white'>Add Site</span>
                            </div>
                        )}

                        <div className='w-full h-full max-w-screen max-h-screen overflow-hidden flex flex-col'>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                                modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                            >
                                <SortableContext
                                    items={orderedSites.map(site => site.domain)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className='flex flex-col items-center w-full gap-1 overflow-y-auto overflow-x-hidden drain-scrollbar pr-2'>
                                        {orderedSites.map((site) => <SiteItem key={site.domain} site={site} />)}
                                    </div>
                                </SortableContext>

                                <DragOverlay modifiers={[restrictToWindowEdges]}>{null}</DragOverlay>
                            </DndContext>
                        </div>
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

export default SideBar;