import { Elysia, status, t } from 'elysia';

import term from 'node:child_process';
import path from 'node:path';

import auditDB from '../db/impl/AuditDB';
import configDB from '../db/impl/ConfigDB';
import siteDB from '../db/impl/SiteDB';
import userDB from '../db/impl/UserDB';

const drainHome = path.join(import.meta.dirname, '..', '..', '..');

const commit = term.execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: drainHome }).toString().trim();
const localChanges = term.execSync('git status --porcelain', { encoding: 'utf8', cwd: drainHome }).trim().length > 0;
const commitsBehind = term.execSync('git rev-list --count HEAD..origin/master', { encoding: 'utf8', cwd: drainHome }).toString().trim();

const admin = new Elysia({ name: 'admin' })
    .guard({ detail: { hide: true } })

    .post('/api/admin/users', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        const users = userDB.getAll().map((u) => ({ id: u.id, username: u.username, admin: u.admin, pendingLogin: !!u.code, invitedBy: u.invitedBy, sites: u.sites, voauthed: typeof u.voauthId === 'number' && u.voauthId > -1 }));
        return { users };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/users/delete', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (body.userId === 1) return status(403, { error: 'cannot modify primary admin' });

        const target = userDB.get(body.userId);
        if (!target) return status(404, { error: 'user not found' });

        if (user.id !== 1 && target.admin && target.id !== user.id)
            return status(403, { error: 'cannot delete other admins' });

        user.sites.forEach((siteId) => {
            const site = siteDB.get(siteId);
            if (site) siteDB.update(siteId, { users: site.users.filter(u => u !== body.userId) });
        });

        userDB.remove(body.userId);

        return {};
    }, { body: t.Object({ userId: t.Number() }), cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/users/setRole', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || !user.admin) return status(401, { error: 'not logged in' });

        if (body.userId === 1) return status(403, { error: 'cannot modify primary admin' });

        const doesTargetExist = userDB.has(body.userId);
        if (!doesTargetExist) return status(404, { error: 'user not found' });

        userDB.update(body.userId, { admin: body.isAdmin ? 1 : 0 });

        return {};
    }, { body: t.Object({ userId: t.Number(), isAdmin: t.Boolean() }), cookie: t.Cookie({ session: t.String() }) })

    .get('/api/admin/instance', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        return { commit, localChanges, commitsBehind, config: configDB.db };
    }, { cookie: t.Cookie({ session: t.String() }) })

    .post('/api/admin/instance', async ({ body, cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        configDB.updateConfig(body.config);

        return {};
    }, { body: t.Object({ config: t.Any() }), cookie: t.Cookie({ session: t.String() }) })

    .get('/api/admin/audit', async ({ cookie: { session } }) => {
        const user = userDB.getLink('sessions', session.value);
        if (!user || user.id !== 1) return status(401, { error: 'not logged in' });

        return auditDB.getAll();
    }, { cookie: t.Cookie({ session: t.String() }) });

export default admin;