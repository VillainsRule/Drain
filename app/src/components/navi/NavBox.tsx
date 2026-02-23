import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import Plus from 'lucide-react/icons/plus';

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../shadcn/context-menu';

import api, { errorFrom } from '@/lib/eden';
import { shadd } from '@/lib/shadd';

import authManager from '@/managers/AuthManager';
import siteManager from '@/managers/SiteManager';

const NavBox = observer(function NavBox() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    return (
        <div className='border-neutral-200 w-full h-[calc(100%-5.25rem)] flex flex-col items-center px-6 pt-8 pb-6 gap-4 fixed left-0 top-0 bottom-0 z-20'>
            <div className='flex flex-col items-center w-full gap-1 overflow-auto drain-scrollbar pr-2'>
                {siteManager.siteList.map((site, i) => <ContextMenu key={i}>
                    <ContextMenuTrigger asChild>
                        <div
                            className={`w-full rounded-lg px-7 py-2 transition-all duration-150 cursor-pointer ${pathname.startsWith('/domain/') && siteManager.site?.id === site ? 'bg-blue-100 border border-blue-300 shadow' : 'hover:bg-neutral-100'}`}
                            onClick={(e) => {
                                if (!(e.target as HTMLElement).classList.contains('no-click')) {
                                    siteManager.select(site);
                                    navigate(`/domain/${site}/keys`);
                                }
                            }}
                        >
                            <span className={`text-lg font-medium ${pathname.startsWith('/domain/') && siteManager.site?.id === site ? 'text-blue-700' : 'text-primary'}`}>{site}</span>
                        </div>
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
                <div className='flex items-center justify-center gap-2 bg-blue-600 w-full py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-125 cursor-pointer font-semibold text-lg' onClick={() => shadd.prompt(
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
                    <Plus className='w-6 h-6 text-white' />
                    <span className='text-white'>Add Site</span>
                </div>
            )}
        </div>
    )
});

export default NavBox;