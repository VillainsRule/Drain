import LinkedDB from '../LinkedDB';

import { DBSite } from '../../../../types';

export class SiteDB extends LinkedDB<DBSite> {
    constructor() {
        super('sites.db');
    }
}

const siteDB = new SiteDB();
export default siteDB;