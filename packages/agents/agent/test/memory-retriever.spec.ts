import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultAgentMemoryRetriever } from '../src/memory/AgentMemoryRetriever';
import { AgentMemoryRecord, MemoryStore } from '../src/memory/MemoryStore';
import { MemoryEmbedder, SemanticMemoryRanker, cosineSimilarity } from '../src/memory/MemoryEmbedder';
import { MemorySearchService } from '../src/memory/MemorySearchService';

class CapturingMemoryStore extends MemoryStore {
    searches: Array<{ query: string; sessionId?: string }> = [];
    getAllCalls = 0;
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
        const lower = query.toLowerCase();
        return this.records.filter(record => {
            const scoped = record.scope === 'global' || !sessionId || record.sessionId === sessionId;
            return scoped && (record.key.toLowerCase().includes(lower) || record.value.toLowerCase().includes(lower));
        });
    }

    async getAll(sessionId?: string): Promise<AgentMemoryRecord[]> {
        this.getAllCalls++;
        return this.records.filter(record => record.scope === 'global' || !sessionId || record.sessionId === sessionId);
    }

    async delete(_id: string, _sessionId?: string, _scope?: AgentMemoryRecord['scope']): Promise<number> {
        return 0;
    }

    async deleteBySession(_sessionId: string): Promise<number> {
        return 0;
    }
}

const VOCAB = ['router', 'cache', 'network', 'policy', 'memory', 'shared'];

class TestEmbedder extends MemoryEmbedder {
    async embed(text: string): Promise<number[]> {
        const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        return VOCAB.map(word => tokens.filter(token => token === word).length);
    }
}

function record(id: string, sessionId: string, key: string, value: string): AgentMemoryRecord {
    return { id, sessionId, key, value, scope: 'session', createdAt: 1 };
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

        const result = await retriever.retrieve({ sessionId: 's1', query: 'router' });

        expect(store.searches).toEqual([{ query: 'router', sessionId: 's1' }]);
        expect(result).toEqual(records);
        expect(store.getAllCalls).toEqual(0);
    }
}

@Suite('cosine similarity')
export class CosineSimilarityTest {
    @Test('identical unit vectors score 1')
    async identicalVectors() {
        expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toEqual(1);
    }

    @Test('orthogonal vectors score 0')
    async orthogonalVectors() {
        expect(cosineSimilarity([1, 0], [0, 1])).toEqual(0);
    }

    @Test('proportional vectors score 1')
    async proportionalVectors() {
        expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
    }

    @Test('degraded inputs score 0')
    async degradedInputs() {
        expect(cosineSimilarity([], [])).toEqual(0);
        expect(cosineSimilarity([1, 2], [1])).toEqual(0);
        expect(cosineSimilarity([0, 0], [0, 0])).toEqual(0);
    }
}

@Suite('semantic memory ranker')
export class SemanticMemoryRankerTest {
    @Test('ranks records by cosine similarity to the query')
    async ranksBySimilarity() {
        const ranker = new SemanticMemoryRanker();
        const records = [
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'note', 'cache network'),
            record('r3', 's1', 'policy', 'shared policy')
        ];

        const ranked = await ranker.rank({ query: 'router cache', records, embedder: new TestEmbedder() });

        expect(ranked.map(entry => entry.record.id)).toEqual(['r1', 'r2', 'r3']);
        expect(ranked[0].score).toBeCloseTo(1, 10);
        expect(ranked[1].score).toBeCloseTo(0.5, 10);
        expect(ranked[2].score).toEqual(0);
    }

    @Test('filters below minScore and honors topK')
    async filtersAndCaps() {
        const ranker = new SemanticMemoryRanker();
        const records = [
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'note', 'cache network')
        ];

        const strict = await ranker.rank({ query: 'router cache', records, embedder: new TestEmbedder(), minScore: 0.9 });
        expect(strict.map(entry => entry.record.id)).toEqual(['r1']);

        const capped = await ranker.rank({ query: 'router cache', records, embedder: new TestEmbedder(), topK: 1 });
        expect(capped.map(entry => entry.record.id)).toEqual(['r1']);
    }
}

@Suite('memory search service')
export class MemorySearchServiceTest {
    @Test('semantic mode ranks and returns records without keyword calls')
    async semanticModeRanks() {
        const store = new CapturingMemoryStore([
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'note', 'cache network'),
            record('r3', 's1', 'policy', 'shared policy')
        ]);
        const service = new MemorySearchService(store, new SemanticMemoryRanker(), new TestEmbedder());

        const result = await service.search('router cache', { sessionId: 's1', mode: 'semantic' });

        expect(result.map(r => r.id)).toEqual(['r1', 'r2', 'r3']);
        expect(store.getAllCalls).toEqual(1);
        expect(store.searches.length).toEqual(0);
    }

    @Test('semantic mode without embedder degrades to keyword')
    async semanticDegradesToKeyword() {
        const store = new CapturingMemoryStore([
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'policy', 'shared policy')
        ]);
        const service = new MemorySearchService(store, new SemanticMemoryRanker());

        const result = await service.search('cache', { sessionId: 's1', mode: 'semantic' });

        expect(store.searches).toEqual([{ query: 'cache', sessionId: 's1' }]);
        expect(result.map(r => r.id)).toEqual(['r1']);
        expect(store.getAllCalls).toEqual(0);
    }

    @Test('hybrid mode merges semantic and keyword results without duplicates')
    async hybridMergesWithoutDuplicates() {
        const store = new CapturingMemoryStore([
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'note', 'cache network'),
            record('r3', 's1', 'policy', 'shared policy')
        ]);
        const service = new MemorySearchService(store, new SemanticMemoryRanker(), new TestEmbedder());

        const result = await service.search('cache', { sessionId: 's1', mode: 'hybrid' });

        expect(result.map(r => r.id)).toEqual(['r1', 'r2', 'r3']);
        expect(new Set(result.map(r => r.id)).size).toEqual(result.length);
    }

    @Test('hybrid appends keyword-only records after semantic matches')
    async hybridAppendsKeywordOnlyRecords() {
        const store = new CapturingMemoryStore([
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'policy', 'shared policy')
        ]);
        const service = new MemorySearchService(store, new SemanticMemoryRanker(), new TestEmbedder());

        const result = await service.search('cache', { sessionId: 's1', mode: 'hybrid' });

        expect(result[0].id).toEqual('r1');
        expect(result.map(r => r.id)).toEqual(['r1', 'r2']);
    }

    @Test('limit caps keyword results')
    async limitCapsKeywordResults() {
        const store = new CapturingMemoryStore([
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'policy', 'shared policy')
        ]);
        const service = new MemorySearchService(store, new SemanticMemoryRanker());

        const result = await service.search('cache', { sessionId: 's1', mode: 'keyword', limit: 1 });

        expect(result.map(r => r.id)).toEqual(['r1']);
    }
}

@Suite('agent memory retriever with embedder')
export class AgentMemoryRetrieverWithEmbedderTest {
    @Test('semantic mode uses the embedder ranking')
    async semanticModeUsesEmbedder() {
        const store = new CapturingMemoryStore([
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'policy', 'shared policy')
        ]);
        const retriever = new DefaultAgentMemoryRetriever(store, undefined, new TestEmbedder());

        const result = await retriever.retrieve({ sessionId: 's1', query: 'router cache', mode: 'semantic' });

        expect(result.map(r => r.id)).toEqual(['r1', 'r2']);
        expect(result[0].id).toEqual('r1');
    }

    @Test('mode and limit flow into the search')
    async modeAndLimitFlowThrough() {
        const store = new CapturingMemoryStore([
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'policy', 'shared policy'),
            record('r3', 's1', 'network', 'network config')
        ]);
        const retriever = new DefaultAgentMemoryRetriever(store, undefined, new TestEmbedder());

        const result = await retriever.retrieve({ sessionId: 's1', query: 'router cache', mode: 'semantic', limit: 1 });

        expect(result.map(r => r.id)).toEqual(['r1']);
    }

    @Test('without embedder semantic mode degrades to keyword search')
    async withoutEmbedderSemanticDegrades() {
        const store = new CapturingMemoryStore([
            record('r1', 's1', 'topic', 'router cache'),
            record('r2', 's1', 'policy', 'shared policy')
        ]);
        const retriever = new DefaultAgentMemoryRetriever(store);

        const result = await retriever.retrieve({ sessionId: 's1', query: 'cache', mode: 'semantic' });

        expect(store.searches).toEqual([{ query: 'cache', sessionId: 's1' }]);
        expect(result.map(r => r.id)).toEqual(['r1']);
    }
}