import fs from 'node:fs';
import path from 'node:path';

class BaseDB<DBType> {
    path: string;
    db: DBType;

    constructor(dbPath: string) {
        this.path = dbPath;

        let mustRunMigrations = false;

        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
            fs.writeFileSync(dbPath, '');
            this.initializeData();
            this.updateDB();
        } else mustRunMigrations = true;

        this.getDB();

        if (mustRunMigrations) this.runDBMigrations();

        setInterval(() => this.updateDB(), 5000);
        process.on('exit', () => this.updateDB());
    }

    initializeData() { }
    runDBMigrations() { }

    getDB() {
        let file = fs.readFileSync(this.path, 'utf-8');
        this.db = JSON.parse(file);
    }

    updateDB() {
        fs.writeFileSync(this.path, JSON.stringify(this.db, null, 4));
    }
}

export default BaseDB;