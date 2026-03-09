import BasicDB from '../BasicDB';

import { DBConfig } from '../../../../types';

export class ConfigDB extends BasicDB<DBConfig> {
    constructor() {
        super('config.db', 2);
    }

    initializeData() {
        this.db = { balancerProxy: '', allowAPIKeys: true, nextUserId: 2 };
    }

    runDBMigrations() {
        if (!('balancerProxy' in this.db)) {
            delete (this.db as any).useProxiesForBalancer;
            (this.db as any).balancerProxy = '';
        }
    }

    updateConfig(newConfig: Partial<DBConfig>) {
        this.db = { ...this.db, ...newConfig };
        this.updateDB();
    }
}

const configDB = new ConfigDB();
export default configDB;