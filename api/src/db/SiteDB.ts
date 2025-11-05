import path from 'node:path';

import BaseDB from './BaseDB';
import userDB from './UserDB';

import getBalancer from '../balancer';

import { BackendSite } from '../types';

export class SiteDB extends BaseDB<{ sites: Record<string, BackendSite> }> {
    constructor() {
        super(path.join(import.meta.dirname, '..', '..', 'db', 'sites.db'));
    }

    initializeData() {
        this.db = { sites: {} };
    }

    addSite(domain: string): { error?: string } {
        if (typeof domain !== 'string' || !domain.trim()) return { error: 'Invalid domain' };
        if (this.db.sites[domain]) return { error: 'Site already exists' };

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
        const allSites = Object.values(this.db.sites);
        if (userDB.getPublicUser(userId)!.admin) return allSites;

        const sites = allSites.filter(site => site.readers.includes(userId) || site.editors.includes(userId)).map(site => ({ ...site }));
        return sites;
    }

    async addKeyToSite(domain: string, token: string): Promise<{ error?: string }> {
        if (!this.db.sites[domain]) return { error: 'Site not found' };
        if (this.db.sites[domain].keys.some(key => key.token === token)) return { error: 'Key already exists' };

        const balancer = getBalancer(domain);
        if (balancer) {
            const balance = await balancer(token);
            if (balance === 'invalid_key') return { error: 'Balancer has determined the key is invalid.' };
            this.db.sites[domain].keys.push({ token, balance: isNaN(Number(balance)) ? balance : `$${balance}` });
        } else this.db.sites[domain].keys.push({ token, balance: '?' });

        this.updateDB();

        return {};
    }

    setKeyBalance(domain: string, token: string, balance: string): { error?: string } {
        if (!this.db.sites[domain]) return { error: 'Site not found' };
        const key = this.db.sites[domain].keys.find(k => k.token === token);
        if (!key) return { error: 'Key not found' };

        key.balance = balance;
        this.updateDB();

        return {};
    }

    removeKeyFromSite(domain: string, token: string): { error?: string } {
        if (!this.db.sites[domain]) return { error: 'Site not found' };

        const keyIndex = this.db.sites[domain].keys.findIndex(k => k.token === token);
        if (keyIndex === -1) return { error: 'Key not found' };

        this.db.sites[domain].keys.splice(keyIndex, 1);
        this.updateDB();

        return {};
    }

    sortKeys(domain: string): { error?: string } {
        if (!this.db.sites[domain]) return { error: 'Site not found' };

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

    addUserToSite(domain: string, userId: number): { error?: string } {
        if (!this.db.sites[domain]) return { error: 'Site not found' };

        const site = this.db.sites[domain];
        if (!site.readers.includes(userId)) site.readers.push(userId);
        else return { error: 'User already has this role' };

        this.updateDB();

        return {};
    }

    deleteSite(domain: string): { error?: string } {
        if (!this.db.sites[domain]) return { error: 'Site not found' };

        delete this.db.sites[domain];
        this.updateDB();

        return {};
    }

    removeUserFromAllSites(userId: number): void {
        for (const domain in this.db.sites) {
            const site = this.db.sites[domain];

            site.readers = site.readers.filter(id => id !== userId);
            site.editors = site.editors.filter(id => id !== userId);
        }

        this.updateDB();
    }
}

const siteDB = new SiteDB();
export default siteDB;