import fs from 'node:fs';
import path from 'node:path';

class SingleInvalidKeyDB {
    filePath = '';
    keys: Set<string> = new Set();

    constructor(platform: string) {
        this.filePath = path.join(import.meta.dirname, '..', '..', '..', 'db', 'invalidKeys', `${platform}.txt`);

        if (!fs.existsSync(this.filePath)) {
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
            Bun.write(this.filePath, '');
            this.keys = new Set();
        } else this.keys = new Set(fs.readFileSync(this.filePath, 'utf-8').split('\n').filter(line => line.trim()));
    }

    add(key: string) {
        if (!this.keys.has(key)) {
            this.keys.add(key);
            fs.appendFileSync(this.filePath, key + '\n');
        }
    }

    has(key: string): boolean {
        return this.keys.has(key);
    }
}

class InvalidKeyDB {
    sites: Record<string, SingleInvalidKeyDB> = {};

    add(platform: string, key: string) {
        if (!this.sites[platform]) this.sites[platform] = new SingleInvalidKeyDB(platform);
        this.sites[platform].add(key);
    }
    
    has(platform: string, key: string): boolean {
        if (!this.sites[platform]) return false;
        return this.sites[platform].has(key);
    }
}

const invalidKeyDB = new InvalidKeyDB();
export default invalidKeyDB;