import './db/migrator';

import { Elysia } from 'elysia';

import fs from 'node:fs';
import path from 'node:path';

import admin from './endpoints/admin';
import auth from './endpoints/auth';
import api from './endpoints/api';
import sites from './endpoints/sites';

const files = new Elysia({ name: 'files' });

if (Bun.env.DD === '1') files.onRequest(({ set, request }) => {
    set.headers['access-control-allow-origin'] = request.headers.get('Origin') || '*';
    set.headers.vary = '*';

    if (request.method === 'OPTIONS') {
        set.headers['access-control-allow-methods'] = '*';
        set.headers['access-control-allow-headers'] = '*';
        return new Response(null, { status: 204 });
    }

    set.headers['access-control-allow-methods'] = request.method;

    return;
});

const distDir = path.resolve(import.meta.dirname, '../../app/dist');

const cachedIndex = Bun.file(path.join(distDir, 'index.html'));

const assetDir = path.join(distDir, 'a');
const assets = fs.readdirSync(assetDir);

for (const a of assets) files.get(`/a/${a}`, () => {
    const f = Bun.file(path.join(assetDir, a));
    return new Response(f, { headers: { 'content-type': f.type } });
});

const app = new Elysia({ serve: { maxRequestBodySize: 1024 * 1024 * 0.05 /* 50kb */ } })
    .get('/*', () => new Response(cachedIndex))
    .get('/favicon.ico', ({ set }) => {
        set.headers['Cache-Control'] = 'public, max-age=31536000, immutable, no-transform';
        set.headers['Content-Type'] = 'image/x-icon';
        return Bun.file(path.join(distDir, 'favicon.ico'));
    })
    .use(files)
    .use(admin)
    .use(api)
    .use(auth)
    .use(sites)
    .listen(4422, () => console.log(`drain it up! ${Bun.env.RP_ID !== 'localhost' ? `https://${Bun.env.RP_ID}` : 'http://localhost:4422'}`)); 2

export type App = typeof app;