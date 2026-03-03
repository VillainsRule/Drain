import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Button } from '../shadcn/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../shadcn/context-menu';

import Plus from 'lucide-react/icons/plus';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const NavBox = observer(function NavBox() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    return (
        <div className='w-full h-[calc(100%-5rem)] flex flex-col items-center px-6 pt-8 pb-3 gap-4 fixed left-0 top-0 bottom-0 z-20'>
            <div className='flex flex-col items-center w-full gap-1 overflow-auto drain-scrollbar pr-2'>
                {siteManager.siteList.map((site, i) => <ContextMenu key={i}>
                    <ContextMenuTrigger asChild>
                        <span
                            className={`w-full rounded-lg px-7 py-2 transition-all duration-150 cursor-pointer text-lg ${pathname.startsWith('/domain/') && siteManager.site?.id === site && 'font-semibold tracking-tight'}`}
                            onClick={(e) => {
                                if (!(e.target as HTMLElement).classList.contains('no-click')) {
                                    siteManager.select(site);
                                    navigate(`/domain/${site}/keys`);
                                }
                            }}
                        >{site}</span>
                    </ContextMenuTrigger>

                    <ContextMenuContent>
                        <ContextMenuItem
                            className='no-click'
                            onClick={() => navigator.clipboard.writeText(`${location.origin}/domain/${site}/keys`)}
                        >
                            Copy URL
                        </ContextMenuItem>

                        {authManager.isAdmin() && (<ContextMenuItem className='text-red-500 no-click' onClick={() => {
                            api.sites.delete.post({ domain: site }).then((res) => {
                                if (res.data) {
                                    siteManager.getList();
                                    siteManager.select('');
                                    navigate('/');
                                } else alert(errorFrom(res));
                            });
                        }}>Delete Site</ContextMenuItem>)}
                    </ContextMenuContent>
                </ContextMenu>)}
            </div>

            {authManager.isAdmin() && (
                <Button variant='outline' className='flex items-center justify-center gap-2 w-full py-2 shadow-sm font-semibold text-lg' onClick={() => shadd.prompt(
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
                    <Plus className='w-6 h-6' />
                    <span>Add Site</span>
                </Button>
            )}
        </div>
    )
});

export default NavBox;