import fs from 'node:fs';
import path from 'node:path';

// this order is CRITICAL for dbv2 migration
// future migrations who need a different order MUST make a new array
const oldFiles = ['sites.db', 'users.db', 'config.db'];

// v0 -> v1
const dbRootPath = path.join(import.meta.dirname, '..', '..', 'db');
if (fs.existsSync(path.join(dbRootPath, 'users.db'))) oldFiles.forEach((filename) => {
    const v1FolderPath = path.join(dbRootPath, 'v1');
    if (!fs.existsSync(v1FolderPath)) fs.mkdirSync(v1FolderPath);

    const oldPath = path.join(import.meta.dirname, '..', '..', 'db', filename);
    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, path.join(v1FolderPath, filename));
});

// v1 -> v2
const v2Dir = path.join(dbRootPath, 'v2');
if (!fs.existsSync(v2Dir)) {
    fs.mkdirSync(v2Dir);

    let nextId: number = 0;
    let userSites: Record<number, string[]> = {};

    oldFiles.forEach((fileName) => {
        const v1Path = path.join(dbRootPath, 'v1', fileName);
        const v2Path = path.join(v2Dir, fileName);
        if (fs.existsSync(v1Path)) {
            fs.cpSync(v1Path, v2Path);

            const oldFile = JSON.parse(fs.readFileSync(v1Path, 'utf8'));

            if (fileName === 'config.db') {
                oldFile.nextUserId = nextId;
                oldFile.allowAPIKeys = true;
                fs.writeFileSync(v2Path, JSON.stringify(oldFile));
            }

            if (fileName === 'sites.db') {
                const db: any = {
                    target: {},
                    links: {}
                };

                Object.values(oldFile.sites).forEach((site: any) => {
                    db.target[site.domain] = {
                        id: site.domain,
                        readers: site.readers,
                        editors: site.editors,
                        keys: Object.fromEntries(site.keys.map((e: any) => [e.token, e.balance]))
                    }

                    site.readers.forEach((userId: number) => {
                        if (!userSites[userId]) userSites[userId] = [site.domain];
                        else userSites[userId].push(site.domain);
                    });

                    site.editors.forEach((userId: number) => {
                        if (!userSites[userId]) userSites[userId] = [site.domain];
                        else if (!userSites[userId].includes(site.domain)) userSites[userId].push(site.domain);
                    });
                });

                fs.writeFileSync(v2Path, JSON.stringify(db));
            }

            if (fileName === 'users.db') {
                nextId = oldFile.nextId;

                const userDB: any = {
                    target: {},
                    links: {
                        username: {},
                        code: {},
                        sessions: {}
                    }
                };

                oldFile.users.forEach((u: any) => {
                    // artifact from early drain. why did i even add this? who knows!
                    if ('key' in u) delete u.key;
                    if ('order' in u) delete u.order;

                    userDB.target[u.id] = u;
                    userDB.target[u.id].sessions = [];
                    userDB.target[u.id].passkeyIds = [];
                    userDB.target[u.id].sites = userSites[u.id] || [];
                    userDB.target[u.id].apiKeys = [];

                    userDB.links.username[u.username] = u.id;
                    if (u.code) userDB.links.code[u.code] = u.id;
                });

                Object.entries(oldFile.sessions).forEach(([value, info]: any) => {
                    if (userDB.target[info.userId]) {
                        userDB.target[info.userId].sessions.push(value);
                        userDB.links.sessions[value] = info.userId;
                    }
                });

                const passkeyDB: any = { target: {}, links: {} };

                // oldFile.passkeys was part of runDBMigrations, meaning it possibly does not exist
                if (oldFile.passkeys) oldFile.passkeys.forEach((pk: any) => {
                    if (userDB.target[pk.userId]) userDB.target[pk.userId].passkeyIds.push(pk.id);
                    passkeyDB.target[pk.id] = pk;
                });

                const apiKeyDB: any = { target: {}, links: { key: {} } };

                // oldFile.apiKeys was part of runDBMigrations, meaning it possibly does not exist
                if (oldFile.apiKeys) oldFile.apiKeys.forEach((key: any) => {
                    const identifier = `${key.userId} ${key.name}`;
                    apiKeyDB.target[identifier] = {
                        ...key,
                        id: identifier
                    }
                    apiKeyDB.links.key[key.key] = identifier;
                });

                fs.writeFileSync(path.join(v2Dir, 'apikeys.db'), JSON.stringify(apiKeyDB));
                fs.writeFileSync(path.join(v2Dir, 'passkeys.db'), JSON.stringify(passkeyDB));
                fs.writeFileSync(v2Path, JSON.stringify(userDB));
            }
        }
    });
}