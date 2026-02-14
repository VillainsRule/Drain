import LinkedDB from '../LinkedDB';

import { DBSite } from '../../../../types';

export class SiteDB extends LinkedDB<DBSite> {
    constructor() {
        super('sites.db', 2);
    }
}

const siteDB = new SiteDB();
export default siteDB;