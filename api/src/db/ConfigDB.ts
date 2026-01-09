import BaseDB from './BaseDB';

import { IConfigDB } from '../types';

export class ConfigDB extends BaseDB<IConfigDB> {
    constructor() {
        super('config.db', 1);
    }

    initializeData() {
        this.db = { useProxiesForBalancer: false };
    }

    updateConfig(newConfig: Partial<IConfigDB>) {
        this.db = { ...this.db, ...newConfig };
        this.updateDB();
    }
}

const configDB = new ConfigDB();
export default configDB;