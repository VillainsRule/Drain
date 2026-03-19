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
        const res = await api.v1.sites.list.get();
        if (res.data) this.siteList = res.data.sites || [];
        else alert(errorFrom(res));
    }

    async select(domain: string, dontNullify = false) {
        if (!dontNullify) this.site = null;

        if (domain) {
            const res = await api.v1.sites.info.post({ domain });
            if (res.data) {
                const keyValues: (string | null)[] = Object.values(res.data.keys);
                const isMoneyBased = keyValues[0]?.startsWith('$');

                this.site = {
                    ...res.data,
                    supportsBalancer: !!res.data.supportsBalancer,
                    sortable: (keyValues[0] && (keyValues[0].startsWith('Paid') || keyValues[0].startsWith('Free') || keyValues[0].startsWith('Tier') || isMoneyBased)) || false,
                    totalBalance: fixMoneyFloatingPoint(isMoneyBased ? keyValues.reduce((acc: number, s: any) => {
                        if (!s?.startsWith('$')) return acc;
                        const num = parseFloat(s.slice(1));
                        return (!isNaN(num) && num >= 0) ? acc + num : acc;
                    }, 0) : 0)
                };
            } else alert(errorFrom(res));
        }
    }

    refreshCurrent(dontNullify = true) {
        if (this.site) this.select(this.site.id, dontNullify);
    }
}

const siteManager = new SiteManager();
export default siteManager;