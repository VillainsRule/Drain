import fs from 'node:fs';
import path from 'node:path';

const dbRootPath = path.join(import.meta.dirname, '..', '..', 'db');

// START V0 TO V1 MIGRATION
const oldFiles = ['config.db', 'sites.db', 'users.db'];
if (fs.existsSync(path.join(dbRootPath, 'users.db'))) oldFiles.forEach((filename) => {
    const v1FolderPath = path.join(dbRootPath, 'v1');
    if (!fs.existsSync(v1FolderPath)) fs.mkdirSync(v1FolderPath);

    const oldPath = path.join(import.meta.dirname, '..', '..', 'db', filename);
    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, path.join(v1FolderPath, filename));
});
// END V0 TO V1 MIGRATION

class BaseDB<DBType> {
    path: string;
    db: DBType;

    disableProxy: boolean;

    private dbHandler = {
        set: (target: any, prop: string | symbol, value: any) => {
            target[prop] = value;
            this.updateDB();
            return true;
        },
        get: (target: any, prop: string | symbol) => {
            const value = target[prop];

            if (value !== null && typeof value === 'object')
                return new Proxy(value, this.dbHandler);

            return value;
        }
    };

    // proxies are something i may decide to use later
    // right now i'm not sure how many cases they cover
    // stuff may not save, i'm happy w/ updateDB for now
    constructor(filename: string, version: number = 1, disableProxy: boolean = true) {
        if (disableProxy) this.disableProxy = true;

        this.path = path.join(dbRootPath, `v${version}`, filename);

        let alreadyExisted = false;

        if (!fs.existsSync(this.path)) {
            fs.mkdirSync(path.dirname(this.path), { recursive: true });
            fs.writeFileSync(this.path, '');
            this.initializeData();
            this.updateDB();
        } else alreadyExisted = true;

        this.getDB();

        if (alreadyExisted) this.runDBMigrations();

        setInterval(() => this.updateDB(), 15000);
        process.on('exit', () => this.updateDB());
    }

    initializeData() { }
    runDBMigrations() { }

    getDB() {
        let file = fs.readFileSync(this.path, 'utf-8');
        const parsedData = JSON.parse(file);
        this.db = this.disableProxy ? parsedData : new Proxy(parsedData, this.dbHandler) as DBType;
    }

    updateDB() {
        fs.writeFileSync(this.path, JSON.stringify(this.db, null, 4));
    }
}

export default BaseDB;