import LinkedDB from '../struct/LinkedDB';

import o1Optimizer from '../../util/O1Optimizer';

import { DBSite } from '../../../../types';

export class SiteDB extends LinkedDB<DBSite> {
    constructor() {
        super('sites.db', []);
    }

    afterInit() {
        o1Optimizer.init(this);
    }
}

const siteDB = new SiteDB();
export default siteDB;