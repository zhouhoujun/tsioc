import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore, InMemoryMemoryStore } from '@tsdi/agent';
import { RandomUuidGenerator } from '@tsdi/core';
import { setRequestAuth } from '../src/auth/AuthMiddleware';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { ShareHandler } from '../src/api/ShareHandler';
import { SessionShareStore, redactSharedValue } from '../src/share/SessionShareStore';
import { EventHandler } from '../src/api/EventHandler';
import { SessionHandler } from '../src/api/SessionHandler';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

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

@Suite('Gateway session share RPCs (P145)')
export class SessionShareRpcTest {
    protected createHarness() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const shares = new SessionShareStore();
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, shares);
        return { store, owners, shares, rpc };
    }

    protected async call(rpc: AppRpcServer, method: string, params: any, principalId = 'user-1') {
        const response = await rpc.handle({ jsonrpc: '2.0', id: 1, method, params }, { principalId });
        if ((response as any)?.error) {
            throw new Error(`${method} failed: ${(response as any).error.message}`);
        }
        return (response as any)?.result;
    }

    @Test('session.share.create produces a token and a share url')
    async createProducesTokenAndUrl() {
        const { store, owners, rpc } = this.createHarness();
        await store.append('s1', { id: 'u1', role: 'user', content: 'hello', createdAt: 1 } as any);
        await owners.create('s1', 'user-1');

        const share = await this.call(rpc, 'session.share.create', { sessionId: 's1' });

        expect(share.token).toBeTruthy();
        expect(String(share.url)).toContain('/api/share/');
        const snapshot = await rpc.handle({
            jsonrpc: '2.0', id: 2, method: 'session.share.list', params: { sessionId: 's1' }
        }, { principalId: 'user-1' });
        const listed = (snapshot as any)?.result as any[];
        expect(listed.length).toEqual(1);
        expect(listed[0].token).toEqual(share.token);
    }

    @Test('session.share.create redacts secrets from the stored messages')
    async createRedactsSecrets() {
        const { store, owners, rpc, shares } = this.createHarness();
        await store.append('s1', { id: 'u1', role: 'user', content: 'api key sk-abcdefgh12345678 and Bearer tok1234567890', createdAt: 1 } as any);
        await owners.create('s1', 'user-1');

        await this.call(rpc, 'session.share.create', { sessionId: 's1' });

        const listed = shares.listBySession('s1');
        const messages = listed[0].messages as Array<{ content: string }>;
        expect(messages[0].content).not.toContain('sk-abcdefgh12345678');
        expect(messages[0].content).not.toContain('tok1234567890');
    }

    @Test('session.share.revoke removes the share and rejects foreign owners')
    async revokeRemovesShare() {
        const { store, owners, rpc } = this.createHarness();
        await store.append('s1', { id: 'u1', role: 'user', content: 'hello', createdAt: 1 } as any);
        await owners.create('s1', 'user-1');

        const share = await this.call(rpc, 'session.share.create', { sessionId: 's1' });
        const revoked = await this.call(rpc, 'session.share.revoke', { token: share.token });
        expect(revoked.revoked).toEqual(true);

        const again = await this.call(rpc, 'session.share.revoke', { token: share.token });
        expect(again.revoked).toEqual(false);

        const other = await this.call(rpc, 'session.share.create', { sessionId: 's1' });
        const response = await rpc.handle({
            jsonrpc: '2.0', id: 3, method: 'session.share.revoke', params: { token: other.token }
        }, { principalId: 'user-2' });
        expect((response as any)?.error).toBeTruthy();
    }
}
