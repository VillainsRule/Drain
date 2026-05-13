import BasicDB from '../struct/BasicDB';

import { DBConfig } from '../../../../types';

const defaultMOTD = 'this is the boring default MOTD. the admin should put something silly here!';

export class ConfigDB extends BasicDB<DBConfig> {
    constructor() {
        super('config.db');
    }

    initializeData() {
        this.db = { balancerProxy: '', motd: defaultMOTD, allowAPIKeys: true };
    }

    runDBMigrations() {
        if (!('balancerProxy' in this.db)) {
            delete (this.db as any).useProxiesForBalancer;
            (this.db as any).balancerProxy = '';
        }

        if (!('motd' in this.db)) (this.db as any).motd = defaultMOTD;
    }

    updateConfig(newConfig: Partial<DBConfig>) {
        this.db = { ...this.db, ...newConfig };
        this.updateDB();
    }
}

const configDB = new ConfigDB();
export default configDB;