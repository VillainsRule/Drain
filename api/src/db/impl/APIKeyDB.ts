import LinkedDB from '../LinkedDB';

import { DBAPIKey } from '../../../../types';

export class APIKeyDB extends LinkedDB<DBAPIKey> {
    constructor() {
        super('apikeys.db', ['key']);
    }
}

const apiKeyDB = new APIKeyDB();
export default apiKeyDB;