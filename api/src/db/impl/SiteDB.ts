import LinkedDB from '../struct/LinkedDB';

import timedCalculator from '../../util/TimedCalculator';

import { DBSite } from '../../../../types';

export class SiteDB extends LinkedDB<DBSite> {
    constructor() {
        super('sites.db', []);
    }

    afterInit() {
        timedCalculator.init(this);
    }
}

const siteDB = new SiteDB();
export default siteDB;