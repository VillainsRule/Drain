import fs from 'node:fs';
import path from 'node:path';

import { GITHUB_CONFIG } from '../.config';

const combos = path.join(import.meta.dirname, 'combos.txt');

let generated: string[] = [];

const chars = GITHUB_CONFIG.combos.charSet.split('');

const generate = (current: string): any => {
    if (current.length === GITHUB_CONFIG.combos.numChars) return generated.push(GITHUB_CONFIG.combos.prefix + current);
    for (const char of chars) generate(current + char);
};

generate('');

fs.writeFileSync(combos, generated.join('\n'));
console.log(`Created ${combos.length} combos in ${combos}`);