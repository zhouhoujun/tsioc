import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore } from '@tsdi/agent';
import { setRequestAuth } from '../src/auth/AuthMiddleware';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { ShareHandler } from '../src/api/ShareHandler';
import { SessionShareStore, redactSharedValue } from '../src/share/SessionShareStore';

function response() {
    const result: any = { status: 0, body: '', headers: {} };
    result.writeHead = (status: number, headers?: any) => { result.status = status; result.headers = headers || {}; return result; };
    result.end = (body?: string) => { result.body = body || ''; return result; };
    return result;
}

@Suite('Session sharing (P86)')
export class SessionShareTest {
    @Test('redacts secrets, workspace paths, and media recursively')
    async redactsSnapshot() {
        const value = redactSharedValue({ content: 'Bearer abc.def and sk-abcdefgh at /repo/private', metadata: { apiKey: 'secret' }, parts: [{ imageUrl: 'data:image/png;base64,abc' }] }, '/repo/private');
        expect(JSON.stringify(value)).not.toContain('abc.def'); expect(JSON.stringify(value)).not.toContain('sk-abcdefgh');
        expect(JSON.stringify(value)).not.toContain('/repo/private'); expect(value.parts[0].imageUrl).toEqual('[MEDIA REMOVED]');
    }

    @Test('generates unique high-entropy access tokens')
    async generatesTokens() {
        const store = new SessionShareStore();
        const first = store.create({ sessionId: 's1', messages: [] });
        const second = store.create({ sessionId: 's1', messages: [] });
        expect(first.token.length).toBeGreaterThanOrEqual(32); expect(first.token).not.toEqual(second.token);
        expect(store.get(first.token)?.id).toEqual(first.id);
    }

    @Test('creates an owner-only snapshot and reads it with a public token')
    async createsAndReads() {
        const sessions = new InMemorySessionStore(); const owners = new SessionOwnerStore(sessions); const shares = new SessionShareStore();
        await sessions.append('s1', { id: 'm1', role: 'user', content: 'open /workspace/app with token=secret', createdAt: 1 });
        await sessions.setWorkspace('s1', '/workspace/app'); await owners.create('s1', 'owner');
        const handler = new ShareHandler({ getMessages: async () => (await sessions.get('s1')).messages } as any, sessions, owners, shares);
        const create = handler.getRoutes().find(route => route.method === 'POST')!; const req = {} as any; setRequestAuth(req, { token: 'main', principalId: 'owner' });
        const created = response(); await create.handler(req, created, { id: 's1' });
        expect(created.status).toEqual(201); const token = JSON.parse(created.body).token;
        const get = handler.getRoutes().find(route => route.method === 'GET')!; const viewed = response(); await get.handler({} as any, viewed, { token });
        expect(viewed.status).toEqual(200); expect(viewed.body).toContain('[WORKSPACE]'); expect(viewed.body).not.toContain('/workspace/app'); expect(viewed.body).not.toContain(`"token":"${token}"`);
    }

    @Test('rejects foreign creation and supports owner revocation')
    async authorizesAndRevokes() {
        const sessions = new InMemorySessionStore(); const owners = new SessionOwnerStore(sessions); const shares = new SessionShareStore();
        await sessions.append('s1', { id: 'm1', role: 'user', content: 'hello', createdAt: 1 }); await owners.create('s1', 'owner');
        const handler = new ShareHandler({ getMessages: async () => [] } as any, sessions, owners, shares); const routes = handler.getRoutes();
        const foreign = {} as any; setRequestAuth(foreign, { token: 'x', principalId: 'other' }); const denied = response(); await routes[0].handler(foreign, denied, { id: 's1' }); expect(denied.status).toEqual(403);
        const snapshot = shares.create({ sessionId: 's1', messages: [] }); const owner = {} as any; setRequestAuth(owner, { token: 'x', principalId: 'owner' });
        const revoked = response(); await routes[2].handler(owner, revoked, { token: snapshot.token }); expect(revoked.status).toEqual(200); expect(shares.get(snapshot.token)).toBeUndefined();
    }
}
