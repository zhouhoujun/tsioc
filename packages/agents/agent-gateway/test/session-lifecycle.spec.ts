import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentModule, MemoryStore, provideAgentOrm, SessionStore } from '@tsdi/agent';
import { Application, RandomUuidGenerator } from '@tsdi/core';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { EventHandler } from '../src/api/EventHandler';
import { SessionHandler } from '../src/api/SessionHandler';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

@Suite('Gateway session lifecycle RPCs (P124)')
export class SessionLifecycleRpcTest {
    @Test('SessionOwnerStore authorize enforces create, anonymous, owner and forbidden semantics')
    async ownerAuthorizeSemantics() {
        const records = new Map<string, any>();
        const store = {
            async has(id: string) { return records.has(id); },
            async get(id: string) { return records.get(id); },
            async setOwner(id: string, owner?: string) { const value = records.get(id) || { id }; value.ownerPrincipalId = owner; records.set(id, value); }
        } as any;
        const owners = new SessionOwnerStore(store);
        expect(await owners.authorize('new', 'alice', { createIfMissing: true })).toEqual('created');
        expect(await owners.authorize('new')).toEqual('anonymous');
        expect(await owners.authorize('new', 'alice')).toEqual('owned');
        let forbidden = false;
        try { await owners.authorize('new', 'bob'); } catch { forbidden = true; }
        expect(forbidden).toEqual(true);
    }

    protected async createHarness() {
        const context = await Application.run({ module: AgentModule, providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const store = context.get(SessionStore);
        const memory = context.get(MemoryStore);
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);
        return { store, owners, rpc, context };
    }

    protected async call(rpc: AppRpcServer, method: string, params: any, principalId = 'user-1') {
        const response = await rpc.handle({ jsonrpc: '2.0', id: 1, method, params }, { principalId });
        if ((response as any)?.error) {
            throw new Error(`${method} failed: ${(response as any).error.message}`);
        }
        return (response as any)?.result;
    }

    @Test('session.set_archived toggles the archived flag and filters session.list')
    async archiveTogglesAndFiltersList() {
        const { store, owners, rpc } = await this.createHarness();
        await store.append('s1', { id: 'u1', role: 'user', content: 'one', createdAt: 1 } as any);
        await store.append('s2', { id: 'u2', role: 'user', content: 'two', createdAt: 2 } as any);
        await store.append('s3', { id: 'u3', role: 'user', content: 'three', createdAt: 3 } as any);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-1');
        await owners.create('s3', 'user-1');

        const archived = await this.call(rpc, 'session.set_archived', { sessionId: 's2', archived: true });
        expect(archived).toEqual({ updated: true, sessionId: 's2', archived: true });

        const defaultList = await this.call(rpc, 'session.list', {});
        const ids = (defaultList as any[]).map(item => item.id);
        expect(ids).toContain('s1');
        expect(ids).toContain('s3');
        expect(ids).not.toContain('s2');

        const archivedList = await this.call(rpc, 'session.list', { includeArchived: true });
        const archivedIds = (archivedList as any[]).map(item => item.id);
        expect(archivedIds).toContain('s2');
        const archivedEntry = (archivedList as any[]).find(item => item.id === 's2');
        expect(archivedEntry.archived).toEqual(true);
    }

    @Test('session.set_archived unarchives and surfaces in default list again')
    async archiveUnarchiveRoundTrip() {
        const { store, owners, rpc } = await this.createHarness();
        await store.append('s1', { id: 'u1', role: 'user', content: 'one', createdAt: 1 } as any);
        await owners.create('s1', 'user-1');

        await this.call(rpc, 'session.set_archived', { sessionId: 's1', archived: true });
        let list = await this.call(rpc, 'session.list', {});
        expect((list as any[]).map(item => item.id)).not.toContain('s1');

        await this.call(rpc, 'session.set_archived', { sessionId: 's1', archived: false });
        list = await this.call(rpc, 'session.list', {});
        expect((list as any[]).map(item => item.id)).toContain('s1');
        expect((list as any[]).find(item => item.id === 's1').archived).toEqual(false);
    }

    @Test('session.fork creates a branch session visible to the owner')
    async forkCreatesBranch() {
        const { store, owners, rpc } = await this.createHarness();
        await store.append('source', { id: 'u1', role: 'user', content: 'one', createdAt: 1 } as any);
        await store.append('source', { id: 'a1', role: 'assistant', content: 'two', createdAt: 2 } as any);
        await owners.create('source', 'user-1');

        const result = await this.call(rpc, 'session.fork', { sessionId: 'source', messageId: 'u1' });
        expect(result.sourceSessionId).toEqual('source');
        expect(result.messageCount).toEqual(1);

        const list = await this.call(rpc, 'session.list', {});
        expect((list as any[]).map(item => item.id)).toContain(result.sessionId);
        const state = await store.get(result.sessionId);
        expect(state.sessionRole).toEqual('branch');
    }

    @Test('session.set_archived rejects a session owned by another principal')
    async archiveRejectsForeignOwner() {
        const { store, owners, rpc } = await this.createHarness();
        await store.append('s1', { id: 'u1', role: 'user', content: 'one', createdAt: 1 } as any);
        await owners.create('s1', 'user-1');

        const response = await rpc.handle(
            { jsonrpc: '2.0', id: 1, method: 'session.set_archived', params: { sessionId: 's1', archived: true } },
            { principalId: 'intruder' }
        );
        expect((response as any).error?.code).toEqual(-32003);
    }
}
