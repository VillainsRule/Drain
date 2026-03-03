import fs from 'node:fs';
import path from 'node:path';

import { DBId } from '../../../types';

const dbRootPath = path.join(import.meta.dirname, '..', '..', 'db');
const isDebug = !!Bun.env.DEBUG;

/*
    linked db basic philosophy:

    basic db structure:
        {
            target: [...items],
            links: {}
        }

    "links" are identifiers that "link" values to an id
    target has what's called an "id" assigned to every item that is its "unique identifier", this doesn't change
    for speed lookups, we can create "links" that point a certain key value to an id in target
    for example, if we have a user db, target would be the list of users, each with an "id"
    we could create a link on "username" that points to the "id" of the user with that username

    link object structure:
        {
            [linkKey: string]: {
                [linkValue: string]: targetId
            }
        }
*/

export type LinkedDBTarget<T> = { [id: DBId]: T };

interface LinkedDBStructure<T> {
    target: LinkedDBTarget<T>;
    links: {
        [linkKey: string]: {
            [linkValue: string]: DBId;
        };
    };
}

class LinkedDB<T extends { id: DBId }> {
    path: string;
    db: LinkedDBStructure<T>;
    linkedKeys: string[];

    constructor(filename: string, version: number, linkedKeys: string[] = []) {
        const startTime = isDebug ? performance.now() : 0;

        this.path = path.join(dbRootPath, `v${version}`, filename);
        this.linkedKeys = linkedKeys;

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

        this.afterInit();

        if (isDebug) console.log(`[LinkedDB] constructor(${filename}) took ${(performance.now() - startTime).toFixed(2)}ms`);
    }

    afterInit() { }

    getBaseItems(): LinkedDBTarget<T> {
        return {};
    }

    initializeData(): void {
        const startTime = isDebug ? performance.now() : 0;

        this.db = {
            target: this.getBaseItems(),
            links: {}
        };

        for (const key of this.linkedKeys) this.db.links[key] = {};

        if (isDebug) console.log(`[LinkedDB] initializeData() took ${(performance.now() - startTime).toFixed(2)}ms`);
    }

    runDBMigrations(): void { }

    getDB(): void {
        const startTime = isDebug ? performance.now() : 0;

        let file = fs.readFileSync(this.path, 'utf-8');
        this.db = JSON.parse(file) as LinkedDBStructure<T>;

        if (isDebug) console.log(`[LinkedDB] getDB() took ${(performance.now() - startTime).toFixed(2)}ms`);
    }

    /**
     * Updates the database file with the current in-memory data
     */
    updateDB(): void {
        const startTime = isDebug ? performance.now() : 0;
        const stringified = JSON.stringify(this.db);
        if (isDebug) console.log(`[LinkedDB] updateDB() stringifying took ${(performance.now() - startTime).toFixed(2)}ms`);

        const startTime2 = isDebug ? performance.now() : 0;
        Bun.write(this.path, stringified);
        if (isDebug) console.log(`[LinkedDB] updateDB() writing took ${(performance.now() - startTime2).toFixed(2)}ms`);
    }

    /**
     * Adds an item to the LinkedDB
     * @param item The item to add
     */
    add(item: T): void {
        const startTime = isDebug ? performance.now() : 0;

        if (!item.id) throw new Error('items in LinkedDB must have an id property');

        this.db.target[item.id] = item;
        this.updateLinks(item);
        this.updateDB();

        if (isDebug) console.log(`[LinkedDB] add(${item.id}) took ${(performance.now() - startTime).toFixed(2)}ms`);
    }

    private updateLinks(item: T): void {
        const startTime = isDebug ? performance.now() : 0;

        for (const key of this.linkedKeys) {
            if (key in item) {
                const value = (item as any)[key];
                if (value !== undefined && value !== null) {
                    if (!this.db.links[key]) this.db.links[key] = {};

                    if (Array.isArray(value))
                        for (const arrayItem of value)
                            this.db.links[key][String(arrayItem)] = item.id;
                    else this.db.links[key][String(value)] = item.id;
                }
            }
        }

        if (isDebug) console.log(`[LinkedDB] updateLinks() took ${(performance.now() - startTime).toFixed(2)}ms`);
    }

    private removeLinks(item: T): void {
        const startTime = isDebug ? performance.now() : 0;

        for (const key of this.linkedKeys) {
            if (key in item) {
                const value = (item as any)[key];
                if (value !== undefined && value !== null && this.db.links[key]) {
                    if (Array.isArray(value))
                        for (const arrayItem of value)
                            delete this.db.links[key][String(arrayItem)];
                    else delete this.db.links[key][String(value)];
                }
            }
        }

        if (isDebug) console.log(`[LinkedDB] removeLinks() took ${(performance.now() - startTime).toFixed(2)}ms`);
    }

    /**
     * Get an item by its id
     * @param id The id of the item
     * @returns {T | undefined} The item, or undefined if not found
     */
    get(id: DBId): T | undefined {
        const startTime = isDebug ? performance.now() : 0;

        const result = this.db.target[id];

        if (isDebug) console.log(`[LinkedDB] get(${id}) took ${(performance.now() - startTime).toFixed(2)}ms`);

        return result;
    }

    /**
     * Get a linked item by its link key and value
     * @param linkKey The key, e.g. "username"
     * @param linkValue The value, e.g. "johndoe"
     * @returns The item, or undefined if not found
     */
    getLink(linkKey: string, linkValue: string): T | undefined {
        const startTime = isDebug ? performance.now() : 0;

        const id = this.db.links[linkKey]?.[linkValue];
        const result = !id ? undefined : this.get(id);

        if (isDebug) console.log(`[LinkedDB] getLink(${linkKey}, ${linkValue}) took ${(performance.now() - startTime).toFixed(2)}ms`);

        return result;
    }

    /**
     * Updates an item by its id
     * @param id The id of the item
     * @param updates The updates to apply (e.g. { username: "newname" })
     * @returns True if the item was updated, false if not found
     */
    update(id: DBId, updates: Partial<T>): boolean {
        const startTime = isDebug ? performance.now() : 0;

        const item = this.get(id);
        if (!item) {
            if (isDebug) console.log(`[LinkedDB] update(${id}) took ${(performance.now() - startTime).toFixed(2)}ms (item not found)`);
            return false;
        }

        this.removeLinks(item);
        Object.assign(item, updates);
        this.updateLinks(item);

        this.updateDB();

        if (isDebug) console.log(`[LinkedDB] update(${id}) took ${(performance.now() - startTime).toFixed(2)}ms`);

        return true;
    }

    /**
     * Removes an item by its id
     * @param id The id of the item
     */
    remove(id: DBId): void {
        const startTime = isDebug ? performance.now() : 0;

        const item = this.db.target[id];
        this.removeLinks(item);
        delete this.db.target[id];

        this.updateDB();

        if (isDebug) console.log(`[LinkedDB] remove(${id}) took ${(performance.now() - startTime).toFixed(2)}ms`);
    }

    /**
     * Gets all items in the database
     * @returns An array of all items
     */
    getAll(): T[] {
        const startTime = isDebug ? performance.now() : 0;

        const result = Object.values(this.db.target);

        if (isDebug) console.log(`[LinkedDB] getAll() took ${(performance.now() - startTime).toFixed(2)}ms (${result.length} items)`);

        return result;
    }

    /**
     * Gets all IDs in the database
     * @returns An array of all IDs
     */
    getIDs(): DBId[] {
        const startTime = isDebug ? performance.now() : 0;

        const result = Object.keys(this.db.target).map(id => {
            const numId = Number(id);
            return isNaN(numId) ? id : numId;
        }) as DBId[];

        if (isDebug) console.log(`[LinkedDB] getIDs() took ${(performance.now() - startTime).toFixed(2)}ms (${result.length} ids)`);

        return result;
    }

    /**
     * Check if an item exists by its id
     * @param id The id of the item
     * @returns True if the item exists, false otherwise
     */
    has(id: DBId): boolean {
        const startTime = isDebug ? performance.now() : 0;

        const result = !!this.db.target[id];

        if (isDebug) console.log(`[LinkedDB] has(${id}) took ${(performance.now() - startTime).toFixed(2)}ms`);

        return result;
    }
}

export default LinkedDB;