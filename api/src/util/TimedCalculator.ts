import type { SiteDB } from '../db/impl/SiteDB';

const fixFloatingPoint = (num: number): number => {
    const rounded = Math.round(num * 100) / 100;
    return Number(rounded.toFixed(2));
}

class TimedCalculator {
    private keyCountCache: Record<string, number> = {};
    private balanceCache: Record<string, number> = {};

    init(db: SiteDB) {
        this.calculate(db);
        setInterval(() => this.calculate(db), 15 * 60 * 1000);
    }

    calculate(db: SiteDB) {
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

    getKeyCount(domain: string): number {
        return this.keyCountCache[domain] || 0;
    }

    getBalance(domain: string): number {
        return this.balanceCache[domain] || 0;
    }
}

const timedCalculator = new TimedCalculator();
export default timedCalculator;