import './db/migrator';

import Elysia from 'elysia';
import openapi from '@elysiajs/openapi';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import admin from './endpoints/admin';
import auth from './endpoints/auth';
import discovery from './endpoints/discovery';
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

const certDir = path.resolve(import.meta.dirname, '../cert');
const certExists = fs.existsSync(certDir);

const distDir = path.resolve(import.meta.dirname, '../../app/dist');

const cachedIndex = Bun.file(path.join(distDir, 'index.html'));

const assetDir = path.join(distDir, 'a');
const assets = fs.readdirSync(assetDir);

for (const a of assets) files.get(`/a/${a}`, () => {
    const f = Bun.file(path.join(assetDir, a));
    return new Response(f, { headers: { 'content-type': f.type } });
});

const app = new Elysia({ serve: { maxRequestBodySize: 1024 * 1024 * 0.05 /* 50kb */ } })
    .use(openapi({
        path: '/docs',
        documentation: {
            info: {
                title: 'Drain Docs',
                version: 'v1'
            },
            tags: [
                { name: 'Sites', description: 'create, get, and manage your sites' },
                { name: 'Site Keys', description: 'manage site keys' },
                { name: 'Site Access', description: 'manage site access' }
            ]
        },
        provider: 'scalar',
        scalar: {
            agent: { disabled: true },
            mcp: { disabled: true },
            hideClientButton: true,
            telemetry: false,
            withDefaultFonts: false,
            metaData: {
                title: 'Drain Docs',
                description: 'Documentation for this Drain instance',
                ogDescription: 'Documentation for this Drain instance'
            },
            defaultHttpClient: {
                targetKey: 'shell',
                clientKey: 'curl',
            },
            expandAllResponses: true,
            documentDownloadType: 'json',
            persistAuth: true,
            theme: 'none',
            customCss: fs.readFileSync(path.join(distDir, '..', 'public', 'openapi.css'), 'utf8')
        }
    }))
    .get('/*', () => new Response(cachedIndex), { detail: { hide: true } })
    .get('/favicon.ico', ({ set }) => {
        set.headers['Cache-Control'] = 'public, max-age=31536000, immutable, no-transform';
        set.headers['Content-Type'] = 'image/x-icon';
        return Bun.file(path.join(distDir, 'favicon.ico'));
    }, { detail: { hide: true } })
    .get('/robots.txt', () => new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } }), { detail: { hide: true } })
    .use(files)
    .use(admin)
    .use(auth)
    .use(discovery)
    .use(sites)
    .listen(4422, () => console.log(`drain it up! ${Bun.env.RP_ID !== 'localhost' ? `https://${Bun.env.RP_ID}` : 'http://localhost:4422'}`)); 2

if (certExists) app.listen({
    port: 4423,
    tls: {
        cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
        key: fs.readFileSync(path.join(certDir, 'cert-key.pem'))
    }
}, () => console.log(`your self-signed cert is on https://${os.hostname()}.local:4423`))

export type App = typeof app;