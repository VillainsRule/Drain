import LinkedDB from '../struct/LinkedDB';

import { DBRequest } from '../../../../types';

const linkedKeys = [{ prop: 'user', type: 'array' }, { prop: 'site', type: 'array' }] as const;

export class RequestDB extends LinkedDB<DBRequest, typeof linkedKeys> {
    constructor() {
        super('requests.db', linkedKeys);
    }
}

const requestDB = new RequestDB();
export default requestDB;