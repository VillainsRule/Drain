import LinkedDB from '../struct/LinkedDB';

import { DBAuditEntry } from '../../../../types';

const linkedKeys = [] as const;

export class AuditDB extends LinkedDB<DBAuditEntry, typeof linkedKeys> {
    constructor() {
        super('audit.db', linkedKeys);
    }

    log(action: string, actor: number, details: string) {
        this.add({
            id: crypto.randomUUID(),
            action,
            user: actor,
            timestamp: Date.now(),
            details
        })
    }
}

const auditDB = new AuditDB();
export default auditDB;