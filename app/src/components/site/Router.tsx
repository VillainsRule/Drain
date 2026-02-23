import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../shadcn/tabs';

import siteManager from '@/managers/SiteManager';

import SiteKeys from './Keys';
import SiteAccess from './Access';

const SiteRouter = observer(function SiteRouter() {
    const loc = useLocation();
    const navigate = useNavigate();

    const sects = loc.pathname.split('/');
    const section = sects[3];

    const willRedirect = typeof section === 'undefined';

    useEffect(() => {
        if (willRedirect) navigate(loc.pathname + '/keys');
    }, []);

    if (willRedirect) return <></>;

    const site = siteManager.site;

    if (!site) {
        return (
            <div className='flex justify-center items-center w-full h-full'>
                <span className='text-muted-foreground text-lg'>fetching site...</span>
            </div>
        );
    }

    return (
        <div className='flex justify-center w-full max-h-[calc(100vh-60px)] overflow-y-auto overflow-x-hidden drain-scrollbar'>
            <Tabs className='mt-5 md:w-8/9 w-11/12' defaultValue={section || 'keys'} value={section || 'keys'}>
                {site.editors && <TabsList className='w-full'>
                    <TabsTrigger value='keys' onClick={() => navigate(`/domain/${site.id}/keys`)}>keys</TabsTrigger>
                    <TabsTrigger value='access' onClick={() => navigate(`/domain/${site.id}/access`)}>access</TabsTrigger>
                </TabsList>}

                <TabsContent value='keys' className='flex flex-col flex-1'><SiteKeys /></TabsContent>
                <TabsContent value='access' className='flex flex-col flex-1'><SiteAccess /></TabsContent>
            </Tabs>
        </div>
    )
});

export default SiteRouter;