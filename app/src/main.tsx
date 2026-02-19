import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import authManager from './managers/AuthManager'

import Auth from './components/Auth'

import Main from './components/dash/Main'

import NavBox from './components/dash/navi/NavBox'
import SideBar from './components/dash/navi/SideBar'
import TopBar from './components/dash/navi/TopBar'

import AdminConfig from './components/dash/admin/Config'
import Labs from './components/dash/admin/Labs'
import Users from './components/dash/admin/Users'

import SiteRouter from './components/dash/site/Router'

import APIKeys from './components/dash/user/APIKeys'
import Passkeys from './components/dash/user/Passkeys'

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
        <div className='flex h-screen w-screen'>
            <SideBar />

            <div className='flex flex-col w-full md:pr-8'>
                {isNavboxOpen && <NavBox />}
                <TopBar setIsNavboxOpen={setIsNavboxOpen} />

                <div className='flex flex-col items-center'>{!isNavboxOpen && <Element />}</div>
            </div>
        </div>
    )
}

const App = observer(function App() {
    return authManager.hasInit ? <BrowserRouter>
        <Routes>
            <Route path='/auth' element={<Auth />} />

            <Route path='/' element={<Container element={Main} />} />

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

createRoot(document.getElementById('root')!).render(<App />);