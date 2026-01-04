import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import authManager from './managers/AuthManager'
import siteManager from './managers/SiteManager'

import Auth from './components/Auth'

import Main from './components/dash/Main'
import Site from './components/dash/Site'

import NavBox from './components/dash/navi/NavBox'
import SideBar from './components/dash/navi/SideBar'
import TopBar from './components/dash/navi/TopBar'

import AdminConfig from './components/dash/admin/Config'
import Users from './components/dash/admin/Users'

import APIKeys from './components/dash/user/APIKeys'
import Passkeys from './components/dash/user/Passkeys'

import Logo from './assets/Logo'

import './index.css'

function Container({ element: Element }: { element: React.ComponentType<any> }) {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!location.pathname.includes('auth') && !authManager.user.id) navigate('/auth');
    }, [authManager.user.id]);

    const [isNavboxOpen, setIsNavboxOpen] = useState(false);

    useEffect(() => {
        setIsNavboxOpen(false);
    }, [location.pathname]);

    return (
        <div className='bg-blue-200/10 flex gap-5 p-5 h-screen w-screen'>
            <div className='hidden md:flex'><SideBar /></div>

            <div className='absolute flex flex-col md:top-16 md:left-72 w-[calc(100%-2.5rem)] md:w-[calc(100%-20rem)] h-[calc(100%-6.5rem)] md:h-[calc(100%-4rem)]'>
                {isNavboxOpen && <NavBox />}
                <TopBar setIsNavboxOpen={setIsNavboxOpen} />
                {!isNavboxOpen && <Element />}
            </div>
        </div>
    )
}

const App = observer(function App() {
    useEffect(() => {
        if (location.pathname.startsWith('/domain/')) {
            const domain = location.pathname.split('/domain/')[1].split('/')[0];
            siteManager.domain = domain;
        }
    }, []);

    return authManager.hasInit ? <BrowserRouter>
        <Routes>
            <Route path='/auth' element={<Auth />} />

            <Route path='/' element={<Container element={Main} />} />
            <Route path='/domain/*' element={<Container element={Site} />} />

            <Route path='/user/apiKeys' element={<Container element={APIKeys} />} />
            <Route path='/user/passkeys' element={<Container element={Passkeys} />} />

            <Route path='/admin/config' element={<Container element={AdminConfig} />} />
            <Route path='/admin/users' element={<Container element={Users} />} />

            <Route path='*' element={<div className='flex justify-center items-center gap-10 h-screen w-screen'>
                <Logo className='w-36 h-36' />
                <h1 className='text-4xl font-bold mb-1.5'>drain | 404 not found</h1>
            </div>} />
        </Routes>
    </BrowserRouter> : <div className='flex justify-center items-center gap-10 h-screen w-screen'>
        <Logo className='w-36 h-36' />
        <h1 className='text-4xl font-bold mb-1.5'>loading drain...</h1>
    </div>
});

createRoot(document.getElementById('root')!).render(<App />);