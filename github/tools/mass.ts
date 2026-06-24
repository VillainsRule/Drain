import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const combos = fs.readFileSync(path.join(import.meta.dirname, 'combos.txt'), 'utf-8')
    .split('\n').filter((line) => line.trim() !== '');

for (const combo of combos) {
    let start = Date.now();

    execSync(`bun ${path.join(import.meta.dirname, 'search.ts')} ${combo}`, { stdio: 'inherit' });

    if (Date.now() - start < 7000) {
        console.log(`waiting for the remainder of 7 seconds to avoid rate limit...`);
        await new Promise(resolve => setTimeout(resolve, 7500 - (Date.now() - start)));
    }
}

console.log('k done');