import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore, InMemoryMemoryStore } from '@tsdi/agent';
import { RandomUuidGenerator } from '@tsdi/core';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { EventHandler } from '../src/api/EventHandler';
import { SessionHandler } from '../src/api/SessionHandler';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

@Suite('Gateway session sections and message pagination (P107)')
export class SessionSectionsRpcTest {
    protected createHarness() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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
        return { store, owners, rpc };
    }

    protected async call(rpc: AppRpcServer, method: string, params: any, principalId = 'user-1') {
        const response = await rpc.handle({ jsonrpc: '2.0', id: 1, method, params }, { principalId });
        if ((response as any)?.error) {
            throw new Error(`${method} failed: ${(response as any).error.message}`);
        }
        return (response as any)?.result;
    }

    @Test('session.section.create and list honor manual ordering')
    async createAndList() {
        const { rpc } = this.createHarness();
        const first = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'Planning' });
        const second = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'Implementation' });
        const third = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'Review', beforeId: second.section.id });

        const sections = await this.call(rpc, 'session.section.list', { sessionId: 's1' });
        expect(sections.map((section: any) => section.label)).toEqual(['Planning', 'Review', 'Implementation']);
        expect(first.section.id).toBeTruthy();
    }

    @Test('session.section.rename updates the label')
    async rename() {
        const { rpc } = this.createHarness();
        const created = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'Planning' });
        await this.call(rpc, 'session.section.rename', { sessionId: 's1', sectionId: created.section.id, label: 'Planning & Design' });
        const sections = await this.call(rpc, 'session.section.list', { sessionId: 's1' });
        expect(sections[0].label).toEqual('Planning & Design');
    }

    @Test('session.section.move reorders sections')
    async move() {
        const { rpc } = this.createHarness();
        const a = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'A' });
        const b = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'B' });
        const c = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'C' });
        await this.call(rpc, 'session.section.move', { sessionId: 's1', sectionId: c.section.id, beforeId: a.section.id });
        let sections = await this.call(rpc, 'session.section.list', { sessionId: 's1' });
        expect(sections.map((section: any) => section.id)).toEqual([c.section.id, a.section.id, b.section.id]);
        await this.call(rpc, 'session.section.move', { sessionId: 's1', sectionId: a.section.id });
        sections = await this.call(rpc, 'session.section.list', { sessionId: 's1' });
        expect(sections.map((section: any) => section.id)).toEqual([c.section.id, b.section.id, a.section.id]);
    }

    @Test('session.section.delete clears message attribution')
    async deleteClearsAttribution() {
        const { store, rpc } = this.createHarness();
        const created = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'Workers' });
        await store.appendRaw('s1', { id: 'm1', role: 'assistant', content: 'done', createdAt: 1, sectionId: created.section.id });
        await this.call(rpc, 'session.section.delete', { sessionId: 's1', sectionId: created.section.id });

        expect(await this.call(rpc, 'session.section.list', { sessionId: 's1' })).toEqual([]);
        const state = await store.get('s1');
        expect(state.messages[0].sectionId).toBeUndefined();
    }

    @Test('session.section.create rejects empty label')
    async rejectsEmptyLabel() {
        const { rpc } = this.createHarness();
        const response = await rpc.handle(
            { jsonrpc: '2.0', id: 1, method: 'session.section.create', params: { sessionId: 's1', label: '  ' } },
            { principalId: 'user-1' }
        );
        expect((response as any).error.code).toEqual(-32602);
    }

    @Test('session.messages returns tail page with nextCursor and hasMore')
    async paginatesTail() {
        const { store, rpc } = this.createHarness();
        for (let index = 0; index < 10; index++) {
            await store.append('s1', { id: `m${index}`, role: 'assistant', content: `msg-${index}`, createdAt: index });
        }
        const page = await this.call(rpc, 'session.messages', { sessionId: 's1', limit: 3 });
        expect(page.messages.map((message: any) => message.id)).toEqual(['m7', 'm8', 'm9']);
        expect(page.nextCursor).toEqual('m9');
        expect(page.hasMore).toEqual(true);
        expect(page.sections).toEqual([]);
    }

    @Test('session.messages paginates before a cursor')
    async paginatesBefore() {
        const { store, rpc } = this.createHarness();
        for (let index = 0; index < 10; index++) {
            await store.append('s1', { id: `m${index}`, role: 'assistant', content: `msg-${index}`, createdAt: index });
        }
        const page = await this.call(rpc, 'session.messages', { sessionId: 's1', cursor: 'm9', before: true, limit: 4 });
        expect(page.messages.map((message: any) => message.id)).toEqual(['m5', 'm6', 'm7', 'm8']);
        expect(page.nextCursor).toEqual('m8');
        expect(page.hasMore).toEqual(true);
    }

    @Test('session.messages returns incremental messages after a cursor')
    async paginatesAfter() {
        const { store, rpc } = this.createHarness();
        for (let index = 0; index < 4; index++) {
            await store.append('s1', { id: `m${index}`, role: 'assistant', content: `msg-${index}`, createdAt: index });
        }
        const first = await this.call(rpc, 'session.messages', { sessionId: 's1' });
        await store.append('s1', { id: 'm4', role: 'assistant', content: 'msg-4', createdAt: 4 });
        await store.append('s1', { id: 'm5', role: 'assistant', content: 'msg-5', createdAt: 5 });

        const page = await this.call(rpc, 'session.messages', { sessionId: 's1', cursor: first.nextCursor, limit: 10 });
        expect(page.messages.map((message: any) => message.id)).toEqual(['m4', 'm5']);
        expect(page.hasMore).toEqual(false);
        expect(page.nextCursor).toEqual('m5');
    }

    @Test('session.messages rejects unknown cursor')
    async rejectsUnknownCursor() {
        const { store, rpc } = this.createHarness();
        await store.append('s1', { id: 'm0', role: 'assistant', content: 'x', createdAt: 0 });
        const response = await rpc.handle(
            { jsonrpc: '2.0', id: 1, method: 'session.messages', params: { sessionId: 's1', cursor: 'nope' } },
            { principalId: 'user-1' }
        );
        expect((response as any).error.code).toEqual(-32602);
    }

    @Test('session.messages returns sections with message attribution')
    async messagesCarrySections() {
        const { store, rpc } = this.createHarness();
        await store.append('s1', {
            id: 'm0',
            role: 'assistant',
            content: 'worker result',
            createdAt: 0,
            metadata: { originThreadId: 'thread-w', originThreadLabel: 'Research' }
        });
        const page = await this.call(rpc, 'session.messages', { sessionId: 's1' });
        expect(page.sections.length).toEqual(1);
        expect(page.sections[0].id).toEqual('section:thread-w');
        expect(page.sections[0].label).toEqual('Research');
        expect(page.messages[0].sectionId).toEqual('section:thread-w');
    }

    @Test('session.list_threads exposes thread sections')
    async threadsExposeSections() {
        const { store, rpc } = this.createHarness();
        await store.setProjectMetadata('s1', { primaryThreadId: 'thread-1', sessionRole: 'main' });
        const section = await this.call(rpc, 'session.section.create', { sessionId: 's1', label: 'Workers' });
        await store.appendRaw('s1', { id: 'm0', role: 'assistant', content: 'done', createdAt: 0, sectionId: section.section.id });

        const threads = await this.call(rpc, 'session.list_threads', { sessionId: 's1' });
        expect(threads.length).toEqual(1);
        expect(threads[0].sections).toEqual([{ id: section.section.id, label: 'Workers', messageCount: 1 }]);
    }
}
