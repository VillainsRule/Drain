import Elysia from 'elysia';

import fs from 'node:fs';
import path from 'node:path';

import auth from './endpoints/auth';
import sites from './endpoints/sites';
import admin from './endpoints/admin';

const app = new Elysia();

const distDir = path.resolve(import.meta.dirname, '../../app/dist');

const safeJoin = (...segments: string[]) => {
    const resolved = path.resolve(distDir, ...segments);
    if (resolved.startsWith(distDir)) return resolved;
    else return path.join(distDir, 'index.html');
};

const getFile = (segments: string[]) => {
    const filePath = safeJoin(...segments);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return Bun.file(safeJoin(...segments));
    else return new Response('not found', { status: 404 });
}

app.get('/', () => getFile(['index.html']));
app.get('/favicon.ico', () => getFile(['favicon.ico']));
app.get('/$/*', ({ params }) => getFile(['$', ...params['*'].split('/')]));

admin(app);
auth(app);
sites(app);

app.listen(4422, () => console.log('drain it up! http://localhost:4422'));