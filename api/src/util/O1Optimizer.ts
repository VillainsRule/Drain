import type { SiteDB } from '../db/impl/SiteDB';

const fixFloatingPoint = (num: number): number => {
    const rounded = Math.round(num * 100) / 100;
    return Number(rounded.toFixed(2));
}

class O1Optimizer {
    private keyCountCache: Record<string, number> = {};
    private balanceCache: Record<string, number> = {};

    init(db: SiteDB) {
        for (const site of db.getAll()) {
            this.keyCountCache[site.id] = Object.keys(site.keys).length;
            const firstKey = site.keys[Object.keys(site.keys)[0]];
            if (firstKey?.startsWith('$')) {
                const allKeyValues = Object.values(site.keys);
                const balance = allKeyValues.reduce((sum, val) => {
                    if (val && val.startsWith('$')) {
                        const num = parseFloat(val.slice(1));
                        return sum + (isNaN(num) ? 0 : num);
                    }
                    return sum;
                }, 0);
                this.balanceCache[site.id] = fixFloatingPoint(balance);
            }
        }
    }

    getKeyCount(siteId: string): number {
        return this.keyCountCache[siteId] ?? 0;
    }

    incrementKeys(siteId: string, amount: number = 1): void {
        this.keyCountCache[siteId] = (this.keyCountCache[siteId] ?? 0) + amount;
    }

    decrementKeys(siteId: string, amount: number = 1): void {
        this.keyCountCache[siteId] = Math.max((this.keyCountCache[siteId] ?? 0) - amount, 0);
    }

    getBalance(siteId: string): number | undefined {
        return this.balanceCache[siteId];
    }

    addToBalance(siteId: string, amount: number): void {
        if (typeof amount === 'number')
            this.balanceCache[siteId] = fixFloatingPoint((this.balanceCache[siteId] ?? 0) + amount);
    }

    subtractFromBalance(siteId: string, amount: number): void {
        if (typeof amount === 'number')
            this.balanceCache[siteId] = fixFloatingPoint(Math.max((this.balanceCache[siteId] ?? 0) - amount, 0));
    }
}

const o1Optimizer = new O1Optimizer();
export default o1Optimizer;