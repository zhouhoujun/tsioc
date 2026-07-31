import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultAgentMemoryRetriever } from '../src/memory/AgentMemoryRetriever';
import { AgentMemoryRecord, MemoryStore } from '../src/memory/MemoryStore';

class CapturingMemoryStore extends MemoryStore {
    searches: Array<{ query: string; sessionId?: string }> = [];
    records: AgentMemoryRecord[];

    constructor(records: AgentMemoryRecord[]) {
        super();
        this.records = records;
    }

    async put(_record: AgentMemoryRecord): Promise<void> {
        return;
    }

    async search(query: string, sessionId?: string): Promise<AgentMemoryRecord[]> {
        this.searches.push({ query, sessionId });
        return this.records;
    }

    async getAll(_sessionId?: string): Promise<AgentMemoryRecord[]> {
        throw new Error('not needed');
    }

    async delete(_id: string, _sessionId?: string, _scope?: AgentMemoryRecord['scope']): Promise<number> {
        return 0;
    }

    async deleteBySession(_sessionId: string): Promise<number> {
        return 0;
    }
}

@Suite('Agent memory retriever')
export class AgentMemoryRetrieverTest {
    @Test('default memory retriever delegates to MemoryStore.search')
    async defaultRetrieverDelegatesToStoreSearch() {
        const records: AgentMemoryRecord[] = [{
            id: 'm1',
            sessionId: 's1',
            key: 'topic',
            value: 'router',
            scope: 'session',
            createdAt: 1
        }];
        const store = new CapturingMemoryStore(records);
        const retriever = new DefaultAgentMemoryRetriever(store);

        const result = await retriever.retrieve({ sessionId: 's1', query: 'router question' });

        expect(store.searches).toEqual([{ query: 'router question', sessionId: 's1' }]);
        expect(result).toEqual(records);
    }
}
