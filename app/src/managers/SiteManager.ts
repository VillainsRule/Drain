import { autorun, makeAutoObservable } from 'mobx';

import axios from '@/lib/axiosLike';

import type { FrontendSite } from '@/types';
import authManager from './AuthManager';

class SiteManager {
    sites: FrontendSite[] = [];

    domain = '';

    constructor() {
        makeAutoObservable(this);

        let actuallyBlurred = false;
        window.onblur = () => actuallyBlurred = true;
        window.onfocus = () => {
            if (actuallyBlurred && authManager.loggedIn) {
                this.getSites();
                actuallyBlurred = false;
            }
        };

        autorun(() => {
            this.siteRef = this.sites.find(site => site.domain === this.domain)!;
        });
    }

    siteRef: FrontendSite = {} as FrontendSite;

    current = {
        site: this.siteRef,
        isReader: (userId: number) => this.siteRef.readers.includes(userId) || this.siteRef.editors.includes(userId),
        isEditor: (userId: number) => this.siteRef.editors.includes(userId),
        sortable: () => this.siteRef.keys.find(s => s.balance.startsWith('Paid') || s.balance.includes('Tier') || s.balance.startsWith('$')),
    }

    async getSites() {
        try {
            const { data } = await axios.post('/$/sites/dump');
            this.sites = data.sites || [];
        } catch (error) {
            console.error(error);
            alert('Error fetching sites. Check the console for details.');
        }
    }

    siteExists(domain: string) {
        return this.sites.some(site => site.domain === domain);
    }
}

const siteManager = new SiteManager();
export default siteManager;