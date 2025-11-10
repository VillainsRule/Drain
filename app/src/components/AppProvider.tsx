import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';

import siteManager from '@/managers/SiteManager';

import { isScreen, type ScreensT } from '@/lib/screens';

type AppState = {
    hash: string;
    screen: ScreensT;
    domain: string;
    setScreen: (screen: ScreensT) => void;
    setDomain: (domain: string) => void;
    lastScreen: ScreensT;
};

const AppStateContext = createContext<AppState | undefined>(undefined);

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const initialHash = location.hash.slice(1);
    const initialHashIsScreen = isScreen(initialHash);
    // yuo never know...
    const initialHashProbablyIsDomain = !initialHashIsScreen && initialHash.length > 0 && initialHash.includes('.');
    const initialHashIsIllegalNavbox = initialHash === 'navbox' && window.innerWidth >= 768;

    const [screen, setScreen] = useState<ScreensT>(initialHashIsScreen && !initialHashIsIllegalNavbox ? initialHash : initialHashProbablyIsDomain ? 'site' : 'none');
    const [lastScreen, setLastScreen] = useState<ScreensT>('none');
    const [domain, setDomain] = useState<string>(initialHashProbablyIsDomain ? initialHash : '');

    useEffect(() => {
        const el = () => {
            if (window.innerWidth >= 768 && screen === 'navbox') setScreen(lastScreen);
        };

        window.addEventListener('resize', el);

        return () => window.removeEventListener('resize', el);
    }, [lastScreen, screen]);

    useEffect(() => {
        siteManager.domain = domain;
    }, [domain]);

    useEffect(() => {
        if (isScreen(screen) && screen !== 'site' && screen !== 'none') location.hash = screen;
        else if (screen === 'site' && domain && domain.includes('.')) location.hash = domain;
        else if (screen === 'none') location.hash = '';

        if (screen !== 'navbox') setLastScreen(screen);
    }, [domain, screen]);

    return (
        <AppStateContext.Provider value={{ hash: location.hash.slice(1), screen, domain, setScreen, setDomain, lastScreen }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => {
    const ctx = useContext(AppStateContext);
    if (!ctx) throw new Error('useAppState must be used within AppProvider');
    return ctx;
};