import BasicDB from '../BasicDB';

import { DBConfig } from '../../../../types';

export class ConfigDB extends BasicDB<DBConfig> {
    constructor() {
        super('config.db', 2);
    }

    initializeData() {
        this.db = { balancerProxy: '', motd: '', allowAPIKeys: true, nextUserId: 2 };
    }

    runDBMigrations() {
        if (!('balancerProxy' in this.db)) {
            delete (this.db as any).useProxiesForBalancer;
            (this.db as any).balancerProxy = '';
        }

        if (!('motd' in this.db)) (this.db as any).motd = 'this is the boring default MOTD. the admin should put something silly here!';
    }

    updateConfig(newConfig: Partial<DBConfig>) {
        this.db = { ...this.db, ...newConfig };
        this.updateDB();
    }
}

const configDB = new ConfigDB();
export default configDB;