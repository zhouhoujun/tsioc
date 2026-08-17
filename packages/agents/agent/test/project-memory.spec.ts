import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultAgentMemoryRetriever, InMemoryMemoryStore, ProjectMemoryService, SemanticMemoryRanker } from '../src';

@Suite('Project memory service (P153)')
export class ProjectMemoryServiceTest {
    private create() {
        const store = new InMemoryMemoryStore();
        const service = new ProjectMemoryService(store, new SemanticMemoryRanker());
        return { store, service };
    }

    @Test('persists project memory across sessions without leaking to other projects')
    async isolatesProjects() {
        const { service } = this.create();
        await service.add({ projectId: '/work/alpha', key: 'language', value: 'TypeScript' });
        expect((await service.list('/work/alpha')).map(item => item.value)).toEqual(['TypeScript']);
        expect(await service.list('/work/beta')).toEqual([]);
    }

    @Test('replaces conflicting keys and supports keep-newest and append policies')
    async resolvesConflicts() {
        const { service } = this.create();
        await service.add({ projectId: 'alpha', key: 'style', value: 'compact' });
        await service.add({ projectId: 'alpha', key: 'style', value: 'detailed', conflict: 'replace' });
        expect((await service.list('alpha')).map(item => item.value)).toEqual(['detailed']);
        const kept = await service.add({ projectId: 'alpha', key: 'style', value: 'ignored', conflict: 'keep-newest' });
        expect(kept.value).toEqual('detailed');
        await service.add({ projectId: 'alpha', key: 'style', value: 'alternative', conflict: 'append' });
        expect((await service.list('alpha')).length).toEqual(2);
    }

    @Test('filters expired records and removes by key')
    async freshnessAndRemoval() {
        const { service } = this.create();
        const record = await service.add({ projectId: 'alpha', key: 'branch', value: 'main', ttlMs: 10 });
        expect(service.isFresh(record, record.createdAt + 5)).toBe(true);
        expect(await service.search('alpha', 'branch', { now: record.createdAt + 20 })).toEqual([]);
        expect(await service.remove('alpha', 'branch')).toEqual(1);
        const durable = await service.add({ projectId: 'alpha', key: 'branch', value: 'main' });
        expect(await service.remove('alpha', durable.id)).toEqual(1);
    }

    @Test('default retrieval includes only the current project namespace')
    async retrievalIsolation() {
        const { store, service } = this.create();
        await service.add({ projectId: 'alpha', key: 'framework', value: 'TSDI' });
        await service.add({ projectId: 'beta', key: 'framework', value: 'Other' });
        await store.put({ id: 'global', key: 'framework', value: 'shared', scope: 'global', createdAt: 1 });
        const retriever = new DefaultAgentMemoryRetriever(store, undefined, undefined, service);
        const records = await retriever.retrieve({ sessionId: 's1', projectId: 'alpha', query: 'framework' });
        expect(records.map(item => item.value)).toEqual(['TSDI', 'shared']);
    }
}
