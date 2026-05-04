import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import authManager from './managers/AuthManager'

import Auth from './components/Auth'

import Hub from './components/Hub'

import MobileBar from './components/navi/MobileBar'
import NavBox from './components/navi/NavBox'
import SideBar from './components/navi/SideBar'
import TopBar from './components/navi/TopBar'

import Audit from './components/admin/Audit'
import AdminConfig from './components/admin/Config'
import Users from './components/admin/Users'

import Discovery from './components/discovery/Discovery'
import Requests from './components/discovery/Requests'

import Site from './components/Site'

import APIKeys from './components/user/APIKeys'
import Invites from './components/user/Invites'

import { ShaddProvider } from './lib/shadd'

import './index.css'

function Container({ element: Element }: { element: React.ComponentType<any> }) {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!location.pathname.includes('auth') && !authManager.id) navigate('/auth');
    }, [authManager.id]);

    const [isNavboxOpen, setIsNavboxOpen] = useState(false);

    useEffect(() => {
        setIsNavboxOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const listener = () => (window.innerWidth >= 768 && setIsNavboxOpen(false));

        window.addEventListener('resize', listener);

        return () => {
            window.removeEventListener('resize', listener);
        };
    }, []);

    return (
        <div className='flex h-screen w-screen'>
            <SideBar />

            <div className='flex flex-col w-full md:pr-8 h-screen'>
                <TopBar />
                <div className='flex-1 flex flex-col items-center overflow-auto drain-scrollbar'>{isNavboxOpen ? <NavBox /> : <Element />}</div>
                <MobileBar setIsNavboxOpen={setIsNavboxOpen} />
            </div>
        </div>
    )
}

const App = observer(function App() {
    return authManager.hasInit ? <BrowserRouter>
        <Routes>
            <Route path='/auth' element={<Auth />} />

            <Route path='/' element={<Container element={Hub} />} />

            <Route path='/domain/*' element={<Container element={Site} />} />

            <Route path='/discovery' element={<Container element={Discovery} />} />
            <Route path='/discovery/requests' element={<Container element={Requests} />} />

            <Route path='/user/apiKeys' element={<Container element={APIKeys} />} />
            <Route path='/user/invites' element={<Container element={Invites} />} />

            <Route path='/admin/audit' element={<Container element={Audit} />} />
            <Route path='/admin/config' element={<Container element={AdminConfig} />} />
            <Route path='/admin/users' element={<Container element={Users} />} />

            <Route path='*' element={<div className='flex flex-col justify-center items-center gap-2 h-screen w-screen'>
                <h1 className='text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm'>drain</h1>
                <h2>404 not found</h2>
            </div>} />
        </Routes>
    </BrowserRouter> : <div className='flex flex-col justify-center items-center gap-2 h-screen w-screen'>
        <h1 className='text-4xl font-extrabold tracking-tight text-primary drop-shadow-sm'>drain</h1>
        <h2>is loading...</h2>
    </div>
});

createRoot(document.getElementById('root')!).render(<><App /><ShaddProvider /></>);