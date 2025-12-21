import path from 'node:path';

import BaseDB from './BaseDB';
import userDB from './UserDB';

import { BackendSite } from '../types';

export class SiteDB extends BaseDB<{ sites: Record<string, BackendSite> }> {
    constructor() {
        super(path.join(import.meta.dirname, '..', '..', 'db', 'sites.db'));
    }

    initializeData() {
        this.db = { sites: {} };
    }

    siteExists(domain: string): boolean {
        return !!this.db.sites[domain];
    }

    userAccessLevel(domain: string, userId: number): 'none' | 'reader' | 'editor' {
        const site = this.db.sites[domain];
        if (!site) return 'none';

        if (site.editors.includes(userId)) return 'editor';
        if (site.readers.includes(userId)) return 'reader';
        return 'none';
    }

    keyExistsOn(domain: string, token: string): boolean {
        const site = this.db.sites[domain];
        if (!site) return false;

        return site.keys.some(key => key.token === token);
    }

    addSite(domain: string): { error?: string } {
        this.db.sites[domain] = {
            domain,
            public: false,
            readers: [],
            editors: [],
            keys: []
        };

        this.updateDB();

        return {};
    }

    getUserSites(userId: number): BackendSite[] {
        const user = userDB.getPublicUser(userId);
        if (!user) return [];

        const allSites = Object.values(this.db.sites);
        if (user.admin) return allSites;

        const sites = allSites.filter(site => site.readers.includes(userId) || site.editors.includes(userId)).map(site => ({ ...site }));
        return sites;
    }

    async addKeyToSite(domain: string, token: string, balance: string = '?') {
        this.db.sites[domain].keys.push({ token, balance });
        this.updateDB();
    }

    setKeyBalance(domain: string, token: string, balance: string) {
        const key = this.db.sites[domain].keys.find(k => k.token === token);
        if (key) key.balance = balance;
        this.updateDB();
    }

    removeKeyFromSite(domain: string, token: string) {
        const keyIndex = this.db.sites[domain].keys.findIndex(k => k.token === token);
        this.db.sites[domain].keys.splice(keyIndex, 1);
        this.updateDB();
    }

    sortKeys(domain: string): { error?: string } {
        const uniqueKeys = new Set<string>();
        this.db.sites[domain].keys = this.db.sites[domain].keys.filter((key) => {
            if (uniqueKeys.has(key.token)) return false;
            uniqueKeys.add(key.token);
            return true;
        });

        if (this.db.sites[domain].keys.find(s => s.balance.startsWith('$'))) {
            const parseBalance = (balance: string) => {
                const num = parseFloat(balance.replace(/^\$/, ''));
                return isNaN(num) ? 0 : num;
            };

            this.db.sites[domain].keys.sort((a, b) => parseBalance(b.balance) - parseBalance(a.balance));
        } else if (this.db.sites[domain].keys.find(s => s.balance.startsWith('Paid '))) {
            this.db.sites[domain].keys.sort((a, b) => {
                if (a.balance.startsWith('Paid ') && !b.balance.startsWith('Paid ')) return -1;
                if (!a.balance.startsWith('Paid ') && b.balance.startsWith('Paid ')) return 1;
                return 0;
            });
        } else if (this.db.sites[domain].keys.find(s => s.balance.includes('Tier'))) {
            const tierOrder = (balance: string) => {
                if (balance === 'Free Tier' || balance === 'Free Key') return 0;
                const match = balance.match(/^T(\d+)/) || balance.match(/^Tier (\d+)/);
                return match ? parseInt(match[1], 10) : -1;
            };

            this.db.sites[domain].keys.sort((a, b) => tierOrder(b.balance) - tierOrder(a.balance));
        } else return { error: 'No keys with balance to sort' };

        this.updateDB();

        return {};
    }

    deleteSite(domain: string) {
        delete this.db.sites[domain];
        this.updateDB();
    }

    removeUserFromAllSites(userId: number) {
        for (const domain in this.db.sites) {
            const site = this.db.sites[domain];

            site.readers = site.readers.filter(id => id !== userId);
            site.editors = site.editors.filter(id => id !== userId);
        }

        this.updateDB();
    }

    getSiteKeys(domain: string): string[] {
        const site = this.db.sites[domain];
        if (!site) return [];

        return site.keys.map(k => k.token);
    }
}

const siteDB = new SiteDB();
export default siteDB;