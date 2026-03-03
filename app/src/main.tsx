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

import AdminConfig from './components/admin/Config'
import Labs from './components/admin/Labs'
import Users from './components/admin/Users'

import SiteRouter from './components/site/Router'

import APIKeys from './components/user/APIKeys'
import Passkeys from './components/user/Passkeys'

import { ShaddProvider } from './lib/shadd'

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

    const [dark, setDark] = useState<boolean>(false);

    useEffect(() => {
        if (localStorage.getItem('dark')) {
            document.body.classList.add('dark');
            setDark(true);
        }

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
                <TopBar dark={dark} setDark={setDark} />
                <div className='flex-1 flex flex-col items-center overflow-auto'>{isNavboxOpen ? <NavBox /> : <Element />}</div>
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

            <Route path='/domain/*' element={<Container element={SiteRouter} />} />

            <Route path='/user/apiKeys' element={<Container element={APIKeys} />} />
            <Route path='/user/passkeys' element={<Container element={Passkeys} />} />

            <Route path='/admin/config' element={<Container element={AdminConfig} />} />
            <Route path='/admin/labs' element={<Container element={Labs} />} />
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