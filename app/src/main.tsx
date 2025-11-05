import { createRoot } from 'react-dom/client'
import { observer } from 'mobx-react-lite'

import authManager from './managers/AuthManager'

import Main from './pages/Main'
import Auth from './pages/Auth'
import Loading from './pages/Loading'

import './index.css'

const App = observer(function App() {
    return authManager.init ? (authManager.loggedIn ? <Main /> : <Auth />) : <Loading />;
});

createRoot(document.getElementById('root')!).render(<App />);