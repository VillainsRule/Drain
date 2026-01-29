// i bricked admin on drain dev.
// it is depressing that one needs to do this.

import fs from 'node:fs';
import path from 'node:path';

import hasher from '../../api/src/hasher';

import { User } from '../../api/src/types.d';

fetch('http://localhost:4422').then(() => {
    console.error('please stop the drain server before running this script');
    process.exit(1);
}).catch(() => {
    const dbPath = path.join(import.meta.dirname, '..', '..', 'api', 'db', 'v1', 'users.db');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    dbData.users.find((u: User) => u.id === 1).password = hasher.encode('admin');

    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 4), 'utf-8');

    console.log('reset the admin password to "admin"');
});