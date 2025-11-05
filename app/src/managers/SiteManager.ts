import { makeAutoObservable } from 'mobx';

import axios from '@/lib/axiosLike';

import type { FrontendSite } from '@/types';
import authManager from './AuthManager';

class SiteManager {
    sites: FrontendSite[] = [];

    currentSiteId = '';
    hash = '';

    constructor() {
        makeAutoObservable(this);

        window.onfocus = () => this.getSites();
    }

    currentSite = {
        isCurrent: () => !!this.currentSite.get(),
        get: () => this.sites.find(site => site.domain === this.currentSiteId)!,
        canBeSorted: () => this.currentSite.get().keys.find(s => s.balance.startsWith('Paid') || s.balance.includes('Tier') || s.balance.startsWith('$')),
        hasAccess: (userId: number) => this.currentSite.get().readers.some((reader) => reader.id == userId) || this.currentSite.get().editors.some((editor) => editor.id == userId),
        isEditor: (userId: number) => this.currentSite.get().editors.some((editor) => editor.id == userId) || authManager.isAdmin()
    }

    async getSites(doHashCheck = false) {
        try {
            const { data } = await axios.post('/$/sites/index');
            this.sites = data.sites || [];

            if (doHashCheck) {
                const siteData = this.sites.find(s => s.domain === this.hash);
                this.currentSiteId = siteData ? siteData.domain : '';
            }
        } catch (error) {
            console.error(error);
            alert('Error fetching sites. Check the console for details.');
        }
    }
}

const siteManager = new SiteManager();
export default siteManager;