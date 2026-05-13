import fs from 'node:fs';
import path from 'node:path';

import { DBVersion } from '../version';

import { DBId } from '../../../../types';

const dbRootPath = path.join(import.meta.dirname, '..', '..', '..', 'db');

export type LinkedDBTarget<T> = { [id: DBId]: T };

interface LinkedDBStructure<T extends { id: DBId }> {
    target: LinkedDBTarget<T>;
    meta?: Record<string, unknown>;
}

type LinkedDBLinks<T extends { id: DBId }> = {
    [linkKey: string]: {
        [linkValue: string | number]: T['id'] | T['id'][];
    };
};

export type LinkedKeyDescriptor = {
    prop: string;
    type: 'string' | 'array' | 'number';
};

type LinkedKeyProps<Keys extends readonly LinkedKeyDescriptor[]> = Keys[number]['prop'];

class LinkedDB<
    T extends { id: DBId },
    Keys extends readonly LinkedKeyDescriptor[] = LinkedKeyDescriptor[]
> {
    path: string;
    filename: string;
    linkedKeys: Keys;

    db: LinkedDBStructure<T>;
    links: LinkedDBLinks<T>;
    keys: T['id'][];

    constructor(filename: string, linkedKeys: Keys, baseItems?: LinkedDBTarget<T>) {
        this.filename = filename;
        this.linkedKeys = linkedKeys;
        this.path = path.join(dbRootPath, `v${DBVersion}`, filename);

        if (!fs.existsSync(this.path)) {
            fs.mkdirSync(path.dirname(this.path), { recursive: true });
            fs.writeFileSync(this.path, '');
            this.initializeData(baseItems);
            this.updateDB();
        }

        this.getDB();
        this.afterInit();
    }

    afterInit(): void { }

    initializeData(baseItems: LinkedDBTarget<T> = {}): void {
        this.db = { target: baseItems };
        this.links = {};
        for (const { prop } of this.linkedKeys) this.links[prop] = {};
    }

    private rebuildLinks(): void {
        this.links = {};
        for (const { prop } of this.linkedKeys) this.links[prop] = {};
        for (const item of Object.values(this.db.target) as T[]) this.updateLinks(item);
    }

    getDB(): void {
        const file = fs.readFileSync(this.path, 'utf-8');
        this.db = JSON.parse(file) as LinkedDBStructure<T>;
        this.keys = Object.keys(this.db.target);
        this.rebuildLinks();
    }

    updateDB(): void {
        const stringified = JSON.stringify(this.db);
        Bun.write(this.path, stringified);
    }

    add(item: T): void {
        if (!item.id) throw new Error('items in LinkedDB must have an id property');

        this.db.target[item.id] = item;
        this.updateLinks(item);
        this.keys.push(item.id);
        this.updateDB();
    }

    private updateLinks(item: T): void {
        for (const { prop, type } of this.linkedKeys) {
            if (!(prop in item)) continue;
            const value = (item as any)[prop];
            if (value == null) continue;

            if (type === 'array') {
                if (!this.links[prop]) this.links[prop] = {};
                if (!this.links[prop][value]) this.links[prop][value] = [] as T['id'][];
                if (Array.isArray(this.links[prop][value])) (this.links[prop][value] as T['id'][]).push(item.id);
                else throw new Error('whelp its over. linkeddb has OFFICIALLY gone off the rocker.');
            } else {
                if (!this.links[prop]) this.links[prop] = {};
                if (Array.isArray(value)) value.forEach(v => this.links[prop][String(v)] = item.id);
                else this.links[prop][String(value)] = item.id;
            }
        }
    }

    private removeLinks(item: T): void {
        for (const { prop, type } of this.linkedKeys) {
            if (!(prop in item) || !this.links[prop]) continue;
            const value = (item as any)[prop];
            if (value == null) continue;

            if (type === 'array') {
                const cat = this.links[prop][String(value)] as T['id'][];
                if (Array.isArray(cat)) {
                    if (cat.includes(item.id)) cat.splice(cat.indexOf(item.id), 1);
                    if (cat.length === 0) delete this.links[prop][String(value)];
                }
            } else {
                if (Array.isArray(value)) value.forEach(v => delete this.links[prop][String(v)]);
                else delete this.links[prop][String(value)];
            }
        }
    }

    get(id: T['id']): T | undefined {
        return this.db.target[id];
    }

    getLink<K extends LinkedKeyProps<Keys>>(linkKey: K, linkValue: string | number): T | undefined {
        const id = this.links[linkKey as string]?.[String(linkValue)] as T['id'] | undefined;
        return id === undefined ? undefined : this.get(id);
    }

    getLinks<K extends LinkedKeyProps<Keys>>(linkKey: K, linkValue: string | number): T[] {
        const ids = this.links[linkKey as string]?.[String(linkValue)] as T['id'][] | undefined;
        return ids === undefined ? [] : ids.map(id => this.get(id)!);
    }

    update(id: T['id'], updates: Partial<T>): boolean {
        const item = this.get(id);
        if (!item) return false;

        this.removeLinks(item);
        Object.assign(item, updates);
        this.updateLinks(item);
        this.updateDB();
        return true;
    }

    remove(id: T['id']): void {
        const item = this.db.target[id];
        this.removeLinks(item);
        this.keys.splice(this.keys.indexOf(id), 1);
        delete this.db.target[id];
        this.updateDB();
    }

    getAll(): T[] {
        return Object.values(this.db.target) as T[];
    }

    getIDs(): T['id'][] {
        return this.keys;
    }

    has(id: T['id']): boolean {
        return !!this.db.target[id];
    }

    getSize(): number {
        return this.keys.length;
    }
}

export default LinkedDB;