// i bricked admin on drain dev.
// it is depressing that one needs to do this.

import fs from 'node:fs';
import path from 'node:path';

import Hasher from '../../api/src/util/hasher';

fetch('http://localhost:4422').then(() => {
    console.error('please stop the drain server before running this script');
    process.exit(1);
}).catch(() => {
    const dbPath = path.join(import.meta.dirname, '..', '..', 'api', 'db', 'v2', 'users.db');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    dbData.target[1].password = Hasher.encode('admin');

    fs.writeFileSync(dbPath, JSON.stringify(dbData), 'utf-8');

    console.log('reset the admin password to "admin"');
});