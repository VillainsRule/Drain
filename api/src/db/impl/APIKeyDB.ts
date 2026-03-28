import LinkedDB from '../struct/LinkedDB';

import { DBAPIKey } from '../../../../types';

const linkedKeys = [{ prop: 'key', type: 'string' }] as const;

export class APIKeyDB extends LinkedDB<DBAPIKey, typeof linkedKeys> {
    constructor() {
        super('apikeys.db', linkedKeys);
    }
}

const apiKeyDB = new APIKeyDB();
export default apiKeyDB;