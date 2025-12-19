import path from 'node:path';

import BaseDB from './BaseDB';

import { IConfigDB } from '../types';

export class ConfigDB extends BaseDB<IConfigDB> {
    constructor() {
        super(path.join(import.meta.dirname, '..', '..', 'db', 'config.db'));
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