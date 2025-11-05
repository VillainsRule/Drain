import Elysia from 'elysia';

import path from 'node:path';

import auth from './endpoints/auth';
import sites from './endpoints/sites';
import admin from './endpoints/admin';

const app = new Elysia();

const distDir = path.join(import.meta.dirname, '..', '..', 'app', 'dist');
const getFile = (p: string[]) => p.includes('..') ? Bun.file(path.join(distDir, 'index.html')) : Bun.file(path.join(distDir, ...p));

app.get('/', () => getFile(['index.html']));
app.get('/favicon.ico', () => getFile(['favicon.ico']));
app.get('/$/*', ({ params }) => getFile(['$', ...params['*'].split('/')]));

admin(app);
auth(app);
sites(app);

app.listen(4422, () => console.log('drain it up! http://localhost:4422'));