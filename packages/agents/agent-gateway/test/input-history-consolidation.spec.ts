import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

const KEY = 'agent-ui.console.input-history';

class FakeMemoryStore {
    records: any[] = [];

    async getAll(sessionId?: string): Promise<any[]> {
        return this.records.filter(record =>
            record.scope === 'global' || !sessionId || record.sessionId === sessionId);
    }

    async put(record: any): Promise<void> {
        this.records = this.records.filter(item => item.id !== record.id);
        this.records.push(record);
    }

    async delete(id: string): Promise<number> {
        const before = this.records.length;
        this.records = this.records.filter(record => record.id !== id);
        return before - this.records.length;
    }

    history(): any[] {
        return this.records.filter(record => record.key === KEY);
    }
}

function buildServer(memory: FakeMemoryStore) {
    const owners = { authorize: async () => 'anonymous', listOwned: async () => [] };
    const sessionHandler = { track: () => undefined };
    const server = new AppRpcServer(
        {} as any,
        new RandomUuidGenerator(),
        {
            has: async () => true,
            listProjects: async () => [],
            get: async () => ({ messages: [] }),
            listUserMessages: async () => []
        } as any,
        memory as any,
        {} as any,
        owners as any,
        sessionHandler as any,
        {} as any
    );
    return {
        put: (params: any, context: any = {}) => (server as any).putInputHistory(params, context),
        get: (params: any, context: any = {}) => (server as any).getInputHistory(params, context)
    };
}

@Suite('console input history is workspace-scoped')
export class InputHistoryConsolidationTest {

    @Test('two sessions of one workspace share a single record and merge their entries')
    async oneRecordPerWorkspace() {
        const memory = new FakeMemoryStore();
        const server = buildServer(memory);
        const workspace = '/work/app';

        const first = await server.put({ workspace, sessionId: 's1', entries: ['alpha'] });
        expect(first.entries).toEqual(['alpha']);
        const second = await server.put({ workspace, sessionId: 's2', entries: ['beta'] });

        expect(second.entries).toEqual(['beta', 'alpha']);
        expect(memory.history().length).toEqual(1);
        expect(memory.history()[0].metadata.sessionId).toBeUndefined();
        expect(JSON.parse(memory.history()[0].value)).toEqual(['beta', 'alpha']);
    }

    @Test('legacy per-session records are absorbed on the next save')
    async absorbsLegacyRecords() {
        const memory = new FakeMemoryStore();
        const workspace = '/work/app';
        memory.records.push({
            id: `agent-ui:console-input-history:${encodeURIComponent('anonymous')}:${encodeURIComponent(workspace)}:old-session`,
            key: KEY,
            scope: 'global',
            value: JSON.stringify(['legacy']),
            metadata: { workspace, principalId: 'anonymous', sessionId: 'old-session', kind: 'console-input-history' },
            createdAt: 1,
            updatedAt: 2
        });
        const server = buildServer(memory);
        const saved = await server.put({ workspace, sessionId: 'new-session', entries: ['fresh'] });

        expect(saved.entries).toEqual(['fresh', 'legacy']);
        expect(memory.history().length).toEqual(1);
        expect(memory.history()[0].id).toContain(':default');
    }

    @Test('a different workspace keeps its own record')
    async workspacesStaySeparate() {
        const memory = new FakeMemoryStore();
        const server = buildServer(memory);
        await server.put({ workspace: '/work/a', entries: ['a'] });
        await server.put({ workspace: '/work/b', entries: ['b'] });
        expect(memory.history().length).toEqual(2);
    }

    @Test('reading history returns the stored entries and caps duplicates')
    async readMergesStoredEntries() {
        const memory = new FakeMemoryStore();
        const server = buildServer(memory);
        await server.put({ workspace: '/work/app', entries: ['one', 'two'] });
        const entries = await server.get({ workspace: '/work/app' });
        expect(entries).toContain('one');
        expect(entries).toContain('two');
    }
}
