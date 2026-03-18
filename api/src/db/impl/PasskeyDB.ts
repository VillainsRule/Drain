import LinkedDB from '../LinkedDB';

import { DBPasskey } from '../../../../types';

export class PasskeyDB extends LinkedDB<DBPasskey> {
    constructor() {
        super('passkeys.db');
    }
}

const passkeyDB = new PasskeyDB();
export default passkeyDB;