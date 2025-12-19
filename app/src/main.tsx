import { createRoot } from 'react-dom/client'
import { observer } from 'mobx-react-lite'

import authManager from './managers/AuthManager'

import Main from './components/dash/Main'
import Auth from './components/Auth'

import { AppProvider } from './components/AppProvider'

import Logo from './assets/Logo'

import './index.css'

const App = observer(function App() {
    if (authManager.hasInit) {
        if (authManager.loggedIn) return <Main />;
        else return <Auth />;
    }

    return (
        <div className='flex justify-center items-center gap-10 h-screen w-screen'>
            <Logo className='w-50 h-50' />
            <h1 className='text-7xl font-bold mb-1.5'>loading drain...</h1>
        </div>
    )
});

createRoot(document.getElementById('root')!).render(
    <AppProvider>
        <App />
    </AppProvider>
);