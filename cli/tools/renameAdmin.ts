import fs from 'node:fs';
import path from 'node:path';

if (typeof process.argv[2] !== 'string') throw new Error('usage: bun cli/tools/renameAdmin ADMINNAME');
if (process.argv[2].length > 16) throw new Error('admin name must be <=16 chars');

fetch('http://localhost:4422').then(() => {
    console.error('please stop the drain server before running this script');
    process.exit(1);
}).catch(() => {
    const dbPath = path.join(import.meta.dirname, '..', '..', 'api', 'db', 'v2', 'users.db');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    if (dbData.links.username[process.argv[2]]) throw new Error('that username is already taken on the instance');

    const oAdmin = dbData.target[1];
    delete dbData.links.username[oAdmin.username];

    dbData.target[1].username = process.argv[2];
    dbData.links.username[process.argv[2]] = 1;

    fs.writeFileSync(dbPath, JSON.stringify(dbData), 'utf-8');

    console.log(`renamed the primary admin to "${process.argv[2]}"`);
});