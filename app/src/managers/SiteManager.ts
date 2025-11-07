import { makeAutoObservable } from 'mobx';

import axios from '@/lib/axiosLike';

import type { FrontendSite } from '@/types';
import authManager from './AuthManager';

class SiteManager {
    sites: FrontendSite[] = [];

    domain = '';

    constructor() {
        makeAutoObservable(this);

        window.onfocus = () => this.getSites();
    }

    site = {
        get: () => this.sites.find(site => site.domain === this.domain)!,
        canBeSorted: () => this.site.get().keys.find(s => s.balance.startsWith('Paid') || s.balance.includes('Tier') || s.balance.startsWith('$')),
        isReader: (userId: number) => this.site.get().readers.some((reader) => reader.id == userId) || this.site.get().editors.some((editor) => editor.id == userId),
        isEditor: (userId: number) => this.site.get().editors.some((editor) => editor.id == userId) || authManager.isAdmin()
    }

    async getSites() {
        try {
            const { data } = await axios.post('/$/sites/index');
            this.sites = data.sites || [];
        } catch (error) {
            console.error(error);
            alert('Error fetching sites. Check the console for details.');
        }
    }
}

const siteManager = new SiteManager();
(window as any).sm = siteManager;
export default siteManager;