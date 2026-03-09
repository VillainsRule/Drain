import { makeAutoObservable } from 'mobx';

import api, { errorFrom } from '@/lib/eden';

import type { PublicSite } from '@/types';

const fixMoneyFloatingPoint = (num: number): string => {
    const rounded = Math.round(num * 100) / 100;
    return rounded.toFixed(2);
}

class SiteManager {
    siteList: string[] = [];
    site: PublicSite | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    async getList() {
        const res = await api.sites.list.post();
        if (res.data) this.siteList = res.data.sites || [];
        else alert(errorFrom(res));
    }

    async select(domain: string, dontNullify = false) {
        if (!dontNullify) this.site = null;

        if (domain) {
            const res = await api.sites.info.post({ domain });
            if (res.data) this.site = {
                ...res.data.site,
                supportsBalancer: !!res.data.site.supportsBalancer,
                sortable: Object.values(res.data.site.keys).some((s: any) => s && (s.startsWith('Paid') || s.includes('Tier') || s.startsWith('$'))),
                totalBalance: fixMoneyFloatingPoint(Object.values(res.data.site.keys)[0]?.startsWith('$') && Object.values(res.data.site.keys).reduce((acc: number, s: any) => {
                    if (s && s.startsWith('$')) {
                        const num = parseFloat(s.replace('$', ''));
                        if (!isNaN(num) && num >= 0) return acc + num;
                    }
                    return acc;
                }, 0) || 0)
            }
            else alert(errorFrom(res));
        }
    }

    refreshCurrent(dontNullify = true) {
        if (this.site) this.select(this.site.id, dontNullify);
    }
}

const siteManager = new SiteManager();
export default siteManager;