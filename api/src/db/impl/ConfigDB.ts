import BasicDB from '../BasicDB';

import { DBConfig } from '../../../../types';

export class ConfigDB extends BasicDB<DBConfig> {
    constructor() {
        super('config.db', 2);
    }

    initializeData() {
        this.db = { useProxiesForBalancer: false, allowAPIKeys: true, nextUserId: 2 };
    }

    updateConfig(newConfig: Partial<DBConfig>) {
        this.db = { ...this.db, ...newConfig };
        this.updateDB();
    }
}

const configDB = new ConfigDB();
export default configDB;