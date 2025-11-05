import crypto from 'node:crypto';

export class JSONResponse extends Response {
    constructor(body: any, init?: ResponseInit) {
        super(JSON.stringify(body), {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...init?.headers,
            },
        });
    }
}

export const hasher = {
    encode: (string: string): string => {
        const salt = crypto.randomBytes(16).toString('hex');
        const derivedKey = crypto.scryptSync(string, salt, 64);
        return salt + ':' + derivedKey.toString('hex');
    },
    matches: (input: string, against: string): boolean => {
        const [salt, key] = against.split(':');
        const derivedKey = crypto.scryptSync(input, salt, 64);
        return derivedKey.toString('hex') === key;
    }
}