import fs from 'node:fs';
import path from 'node:path';

const dbRootPath = path.join(import.meta.dirname, '..', '..', 'db');

if (fs.existsSync(dbRootPath)) {
    // this order is CRITICAL for dbv2 migration
    // future migrations who need a different order MUST make a new array
    const v1Files = ['sites.db', 'users.db', 'config.db'];

    // v0 -> v1
    // 1/8 - moving to a v1 folder
    if (fs.existsSync(path.join(dbRootPath, 'users.db'))) v1Files.forEach((filename) => {
        const v1FolderPath = path.join(dbRootPath, 'v1');
        if (!fs.existsSync(v1FolderPath)) fs.mkdirSync(v1FolderPath);

        const oldPath = path.join(import.meta.dirname, '..', '..', 'db', filename);
        if (fs.existsSync(oldPath)) fs.renameSync(oldPath, path.join(v1FolderPath, filename));
    });

    // v1 -> v2
    // 2/14 - links, optimization, yummy stuff
    const v2Dir = path.join(dbRootPath, 'v2');
    if (!fs.existsSync(v2Dir)) {
        fs.mkdirSync(v2Dir);

        let nextId: number = 0;
        let userSites: Record<number, string[]> = {};

        v1Files.forEach((fileName) => {
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
                        userDB.target[key.userId].apiKeys.push(identifier);
                    });

                    fs.writeFileSync(path.join(v2Dir, 'apikeys.db'), JSON.stringify(apiKeyDB));
                    fs.writeFileSync(path.join(v2Dir, 'passkeys.db'), JSON.stringify(passkeyDB));
                    fs.writeFileSync(v2Path, JSON.stringify(userDB));
                }
            }
        });
    }

    // v2 -> v3
    // 3/18 - flattening of readers and editors
    const v3Files = ['users.db', 'apikeys.db', 'passkeys.db', 'config.db', 'sites.db'];
    const v3Dir = path.join(dbRootPath, 'v3');
    if (!fs.existsSync(v3Dir)) {
        fs.mkdirSync(v3Dir);

        v3Files.forEach((fileName) => {
            const v2Path = path.join(dbRootPath, 'v2', fileName);
            const v3Path = path.join(v3Dir, fileName);

            if (fileName === 'sites.db') {
                const v2File = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
                const siteDB: any = {
                    target: {},
                    links: {}
                };

                Object.values(v2File.target).forEach((site: any) => {
                    siteDB.target[site.id] = {
                        id: site.id,
                        keys: site.keys,
                        users: [...new Set([...site.readers, ...site.editors])]
                    }
                });

                fs.writeFileSync(v3Path, JSON.stringify(siteDB));
            } else if (fileName === 'apikeys.db') {
                const v2File = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
                Object.values(v2File.target).forEach((key: any) => {
                    delete key.lastUserAgent;
                });
                fs.writeFileSync(v3Path, JSON.stringify(v2File));
            } else if (fs.existsSync(v2Path)) fs.cpSync(v2Path, v3Path);
        });
    }

    // v3 -> v4
    // 3/28 - discovery feature
    const v4Files = ['users.db', 'apikeys.db', 'passkeys.db', 'config.db', 'sites.db'];
    const v4Dir = path.join(dbRootPath, 'v4');
    if (!fs.existsSync(v4Dir)) {
        fs.mkdirSync(v4Dir);

        v4Files.forEach((fileName) => {
            const v3Path = path.join(dbRootPath, 'v3', fileName);
            const v4Path = path.join(v4Dir, fileName);

            if (fileName === 'users.db') {
                const v3File = JSON.parse(fs.readFileSync(v3Path, 'utf8'));
                Object.values(v3File.target).forEach((user: any) => {
                    user.requests = [];
                });
                delete v3File.links;
                fs.writeFileSync(v4Path, JSON.stringify(v3File));
            } else if (fs.existsSync(v3Path)) {
                const v3File = JSON.parse(fs.readFileSync(v3Path, 'utf8'));
                if ('links' in v3File) delete v3File.links;
                fs.writeFileSync(v4Path, JSON.stringify(v3File));
            }
        });
    }

    // v4 -> v5
    // 3/29 - cleanup of old bugs from DB v2 (sob)
    let v5UserNumbers: number[] = [];
    const v5Dir = path.join(dbRootPath, 'v5');
    if (!fs.existsSync(v5Dir)) {
        fs.mkdirSync(v5Dir);

        const v4UserFile = JSON.parse(fs.readFileSync(path.join(dbRootPath, 'v4', 'users.db'), 'utf8'));
        Object.values(v4UserFile.target).forEach((user: any) => v5UserNumbers.push(user.id));

        v4Files.forEach((fileName) => {
            const v4Path = path.join(dbRootPath, 'v4', fileName);
            const v5Path = path.join(v5Dir, fileName);

            if (fileName === 'sites.db') {
                const contents = JSON.parse(fs.readFileSync(v4Path, 'utf8'));
                Object.values(contents.target).forEach((site: any) => site.users = site.users.filter((userId: number) => v5UserNumbers.includes(userId)));
                fs.writeFileSync(v5Path, JSON.stringify(contents));
            } else fs.cpSync(v4Path, v5Path);
        });
    };

    // v5 -> v6
    // 4/6 - add site settings, user invitedby (friendship update!!), audit logs
    const v6Dir = path.join(dbRootPath, 'v6');
    if (!fs.existsSync(v6Dir)) {
        fs.mkdirSync(v6Dir);

        v4Files.forEach((fileName) => {
            const v5Path = path.join(dbRootPath, 'v5', fileName);
            const v6Path = path.join(v6Dir, fileName);

            if (fileName === 'users.db') {
                const v5File = JSON.parse(fs.readFileSync(v5Path, 'utf8'));
                Object.values(v5File.target).forEach((user: any) => {
                    user.invitedBy = 1;
                });
                fs.writeFileSync(v6Path, JSON.stringify(v5File));
            } else if (fileName === 'sites.db') {
                const v5File = JSON.parse(fs.readFileSync(v5Path, 'utf8'));
                Object.values(v5File.target).forEach((site: any) => {
                    site.description = '';
                    site.public = false;
                    site.useProxy = false;
                });
                fs.writeFileSync(v6Path, JSON.stringify(v5File));
            } else if (fs.existsSync(v5Path)) fs.cpSync(v5Path, v6Path);
        });
    }

    // v6 -> v7 (haha 67)
    // 5/13 - the first step of voauth migration process
    const v7Dir = path.join(dbRootPath, 'v7');
    if (!fs.existsSync(v7Dir)) {
        fs.mkdirSync(v7Dir);

        v4Files.forEach((filename) => {
            const v6Path = path.join(dbRootPath, 'v6', filename);
            const v7Path = path.join(v7Dir, filename);

            if (filename === 'users.db') {
                const v6File = JSON.parse(fs.readFileSync(v6Path, 'utf8'));
                Object.values(v6File.target).forEach((user: any) => {
                    delete user.passkeyIds;
                });
                fs.writeFileSync(v7Path, JSON.stringify(v6File));
            } else if (filename === 'config.db') {
                const v6File = JSON.parse(fs.readFileSync(v6Path, 'utf8'));
                delete v6File.nextUserId;
                fs.writeFileSync(v7Path, JSON.stringify(v6File));
            } else if (fs.existsSync(v6Path)) fs.cpSync(v6Path, v7Path);
        })
    }

    // v7 -> v8
    // 5/18 - delete old passkey and password stuff
    const v8Dir = path.join(dbRootPath, 'v8');
    if (!fs.existsSync(v8Dir)) {
        fs.mkdirSync(v8Dir);

        v4Files.forEach((filename) => {
            const v7Path = path.join(dbRootPath, 'v7', filename);
            const v8Path = path.join(v8Dir, filename);

            if (filename === 'users.db') {
                const v7File = JSON.parse(fs.readFileSync(v7Path, 'utf8'));
                Object.values(v7File.target).forEach((user: any) => {
                    delete user.password;
                });
                fs.writeFileSync(v8Path, JSON.stringify(v7File));
            } else if (filename === 'passkeys.db') { }
            else if (fs.existsSync(v7Path)) fs.cpSync(v7Path, v8Path);
        })
    }
}