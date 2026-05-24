import { makeAutoObservable } from 'mobx';

import api, { errorFrom } from '@/lib/eden';

import type { PublicSite } from '@/types';

const SORTABLE_KEYWORDS = ['paid', 'premium', 'prod', 'trial', 'tier', 'free', '$', 'valid', 'empty', 'credits'];

class SiteStore {
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
                const firstKey = res.data.keys[Object.keys(res.data.keys)[0]] ?? '';

                this.site = {
                    ...res.data,
                    supportsBalancer: !!res.data.supportsBalancer,
                    sortable: (firstKey && SORTABLE_KEYWORDS.some(k => firstKey.toLowerCase().includes(k))) || false
                };
            } else alert(errorFrom(res));
        }
    }

    refreshCurrent(dontNullify = true) {
        if (this.site) this.select(this.site.id, dontNullify);
    }
}

const siteStore = new SiteStore();
export default siteStore;