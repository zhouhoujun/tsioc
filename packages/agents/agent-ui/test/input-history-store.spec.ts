import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleInputHistoryStore } from '../src/AgentConsoleInputHistoryStore';

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

@Suite('input history store keeps one record per workspace')
export class InputHistoryStoreTest {

    @Test('saving from two sessions of one workspace keeps a single merged record')
    async oneRecordPerWorkspace() {
        const memory = new FakeMemoryStore();
        const store = new AgentConsoleInputHistoryStore(null, memory as any);
        await store.save(['alpha'], '/work/app', 's1');
        await store.save(['beta'], '/work/app', 's2');

        expect(memory.history().length).toEqual(1);
        expect(JSON.parse(memory.history()[0].value)).toEqual(['beta', 'alpha']);
        expect(await store.load('/work/app')).toEqual(['beta', 'alpha']);
    }

    @Test('a legacy per-session record is absorbed')
    async absorbsLegacyRecord() {
        const memory = new FakeMemoryStore();
        memory.records.push({
            id: 'agent-ui:console-input-history:%2Fwork%2Fapp:old',
            key: KEY,
            scope: 'global',
            value: JSON.stringify(['legacy']),
            metadata: { workspace: '/work/app', kind: 'console-input-history' },
            createdAt: 1,
            updatedAt: 2
        });
        const store = new AgentConsoleInputHistoryStore(null, memory as any);
        await store.save(['fresh'], '/work/app', 's1');

        expect(memory.history().length).toEqual(1);
        expect(await store.load('/work/app')).toEqual(['fresh', 'legacy']);
    }
}
