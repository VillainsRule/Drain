import { Elysia } from 'elysia';

import fs from 'node:fs';
import path from 'node:path';

import auth from './endpoints/auth';
import api from './endpoints/api';
import sites from './endpoints/sites';
import admin from './endpoints/admin';

const app = new Elysia();

if (process.env.CORS === '1') {
    const cors = new Elysia().onRequest(({ set, request }) => {
        set.headers['access-control-allow-origin'] = request.headers.get('Origin') || '*'
        set.headers.vary = '*'

        if (request.method === 'OPTIONS') {
            set.headers['access-control-allow-methods'] = '*'
            set.headers['access-control-allow-headers'] = '*'
            return new Response(null, { status: 204 })
        }

        set.headers['access-control-allow-methods'] = request.method

        return;
    })

    app.use(cors)
}

const hasPasskeysSetUp = Bun.env.RP_ID && Bun.env.RP_NAME;

if (hasPasskeysSetUp) {
    if (Bun.env.RP_ID && Bun.env.RP_ID.startsWith('localhost')) throw new Error('RP_ID cannot start with localhost...localhost isn\'t supported');
}

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

app.get('/favicon.ico', ({ set }) => {
    set.headers['Cache-Control'] = 'public, max-age=31536000, immutable, no-transform';
    set.headers['Content-Type'] = 'image/x-icon';
    return getFile(['favicon.ico']);
});

app.get('/*', () => getFile(['index.html']));
app.get('/$/*', ({ params }) => getFile(['$', ...params['*'].split('/')]));

admin(app);
api(app);
auth(app);
sites(app);

app.listen(4422, () => console.log(`drain it up! ${hasPasskeysSetUp ? `https://${Bun.env.RP_ID}` : 'http://localhost:4422'}`));