import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentModule } from '../src/agent.module';
import { AgentOrmModule } from '../src/orm.module';
import { DelegationEdgeInput, DelegationEdgeRecord, DelegationGraphStore, buildDelegationLineage, buildDelegationTree } from '../src/harness/DelegationGraphStore';
import { InMemoryDelegationGraphStore } from '../src/harness/InMemoryDelegationGraphStore';
import { TypeOrmDelegationGraphStore } from '../src/harness/TypeOrmDelegationGraphStore';
import { AgentDelegationEdgeEntity } from '../src/memory/entities';

@Module({
    imports: [
        AgentOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            autoSave: false,
            entities: []
        } as any)
    ],
    providers: [
        { provide: ModuleLoader, useValue: new DefaultModuleLoader() }
    ]
})
class DelegationGraphOrmTestModule {}

@Module({
    imports: [
        AgentModule,
        AgentOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            autoSave: false,
            entities: []
        } as any)
    ],
    providers: [
        { provide: ModuleLoader, useValue: new DefaultModuleLoader() }
    ]
})
class AgentDelegationGraphOrmTestModule {}

function makeEdge(partial: Partial<DelegationEdgeInput> = {}): DelegationEdgeInput {
    return {
        parentSessionId: 'p1',
        childSessionId: 'c1',
        kind: 'nested',
        metadata: { goal: 'delegate work' },
        ...partial
    };
}

@Suite('Delegation graph stores')
export class DelegationGraphStoreTest {
    @Test('in-memory delegation store appends edges with generated ids and timestamps')
    async inMemoryAppends() {
        const store = new InMemoryDelegationGraphStore();
        const record = await store.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c1' }));
        expect(record.id).toBeTruthy();
        expect(record.status).toEqual('active');
        expect(record.createdAt).toBeGreaterThan(0);
        expect(record.completedAt).toBeUndefined();

        const stored = await store.list();
        expect(stored.length).toEqual(1);
        expect(stored[0].parentSessionId).toEqual('p1');
        expect(stored[0].childSessionId).toEqual('c1');
        expect(stored[0].kind).toEqual('nested');
    }

    @Test('in-memory delegation store snapshots metadata immutably')
    async inMemorySnapshotsMetadata() {
        const store = new InMemoryDelegationGraphStore();
        const metadata = { goal: 'original', toolsets: ['shell'] };
        await store.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c1', metadata }));
        metadata.goal = 'mutated';
        const records = await store.list();
        expect(records[0].metadata?.goal).toEqual('original');
    }

    @Test('markClosed is idempotent and first close wins')
    async markClosedFirstCloseWins() {
        const store = new InMemoryDelegationGraphStore();
        await store.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c1', createdAt: 1 }));
        await store.markClosed('p1', 'c1', 'cancelled', 10);
        await store.markClosed('p1', 'c1', 'failed', 20);
        const records = await store.list();
        expect(records.length).toEqual(1);
        expect(records[0].status).toEqual('cancelled');
        expect(records[0].completedAt).toEqual(10);
    }

    @Test('children filters by status and orders oldest first')
    async childrenFilterAndOrder() {
        const store = new InMemoryDelegationGraphStore();
        await store.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c1', createdAt: 3 }));
        await store.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c2', createdAt: 1 }));
        await store.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c3', createdAt: 2, status: 'failed' }));
        await store.append(makeEdge({ parentSessionId: 'other', childSessionId: 'x', createdAt: 0 }));
        const all = await store.children('p1');
        expect(all.map(edge => edge.childSessionId)).toEqual(['c2', 'c3', 'c1']);
        const active = await store.children('p1', { status: 'active' });
        expect(active.map(edge => edge.childSessionId)).toEqual(['c2', 'c1']);
        const both = await store.children('p1', { status: ['active', 'failed'] });
        expect(both.length).toEqual(3);
    }

    @Test('ancestors walks to the root and protects against cycles')
    async ancestorsWalkToRoot() {
        const store = new InMemoryDelegationGraphStore();
        await store.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c1', createdAt: 1 }));
        await store.append(makeEdge({ parentSessionId: 'root', childSessionId: 'p1', createdAt: 2 }));
        const lineage = await store.ancestors('c1');
        expect(lineage.map(edge => edge.parentSessionId)).toEqual(['p1', 'root']);

        // cycle: c1 -> p1 -> c1
        const cyclic = new InMemoryDelegationGraphStore();
        await cyclic.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c1', createdAt: 1 }));
        await cyclic.append(makeEdge({ parentSessionId: 'c1', childSessionId: 'p1', createdAt: 2 }));
        const cyclicLineage = await cyclic.ancestors('c1');
        expect(cyclicLineage.length).toBeLessThanOrEqual(2);
    }

    @Test('tree renders nested delegation hierarchy')
    async treeRendersNestedHierarchy() {
        const store = new InMemoryDelegationGraphStore();
        await store.append(makeEdge({ parentSessionId: 'root', childSessionId: 'a', kind: 'nested', createdAt: 1 }));
        await store.append(makeEdge({ parentSessionId: 'root', childSessionId: 'b', kind: 'parallel', createdAt: 2, status: 'failed' }));
        await store.append(makeEdge({ parentSessionId: 'a', childSessionId: 'a1', kind: 'spawn_agent', createdAt: 3 }));
        const tree = await store.tree('root');
        expect(tree.sessionId).toEqual('root');
        expect(tree.children.length).toEqual(2);
        expect(tree.children[0].sessionId).toEqual('a');
        expect(tree.children[0].kind).toEqual('nested');
        expect(tree.children[1].sessionId).toEqual('b');
        expect(tree.children[1].status).toEqual('failed');
        expect(tree.children[0].children[0].sessionId).toEqual('a1');
        expect(tree.children[0].children[0].edgeId).toBeTruthy();
    }

    @Test('tree filters by status and depth')
    async treeFiltersStatusAndDepth() {
        const store = new InMemoryDelegationGraphStore();
        await store.append(makeEdge({ parentSessionId: 'root', childSessionId: 'a', createdAt: 1 }));
        await store.append(makeEdge({ parentSessionId: 'root', childSessionId: 'b', createdAt: 2, status: 'failed' }));
        await store.append(makeEdge({ parentSessionId: 'a', childSessionId: 'a1', createdAt: 3 }));

        const activeOnly = await store.tree('root', { status: 'active' });
        expect(activeOnly.children.map(child => child.sessionId)).toEqual(['a']);

        const depthOne = await store.tree('root', { depth: 1 });
        expect(depthOne.children.length).toEqual(2);
        expect(depthOne.children.every(child => child.children.length === 0)).toEqual(true);
    }

    @Test('list scopes to edges touching a session')
    async listScopesToSession() {
        const store = new InMemoryDelegationGraphStore();
        await store.append(makeEdge({ parentSessionId: 'p1', childSessionId: 'c1', createdAt: 1 }));
        await store.append(makeEdge({ parentSessionId: 'c1', childSessionId: 'c2', createdAt: 2 }));
        await store.append(makeEdge({ parentSessionId: 'other', childSessionId: 'x', createdAt: 3 }));
        const scoped = await store.list({ sessionId: 'c1' });
        expect(scoped.length).toEqual(2);
        const all = await store.list();
        expect(all.length).toEqual(3);
    }

    @Test('build delegation tree is cycle safe')
    async sharedTreeBuilderCycleSafe() {
        const edges: DelegationEdgeRecord[] = [
            {
                id: 'e1', parentSessionId: 'a', childSessionId: 'b', status: 'active', createdAt: 1
            },
            {
                id: 'e2', parentSessionId: 'b', childSessionId: 'a', status: 'active', createdAt: 2
            }
        ];
        const tree = buildDelegationTree(edges, 'a');
        expect(tree.sessionId).toEqual('a');
        expect(tree.children.length).toEqual(1);
        expect(tree.children[0].children.length).toEqual(0);
    }

    @Test('build delegation lineage stops at the root')
    async sharedLineageBuilderStopsAtRoot() {
        const edges: DelegationEdgeRecord[] = [
            { id: 'e1', parentSessionId: 'p1', childSessionId: 'c1', status: 'completed', createdAt: 1 },
            { id: 'e2', parentSessionId: 'root', childSessionId: 'p1', status: 'completed', createdAt: 2 },
            { id: 'e3', parentSessionId: 'root', childSessionId: 'unrelated', status: 'completed', createdAt: 3 }
        ];
        const lineage = buildDelegationLineage(edges, 'c1');
        expect(lineage.map(edge => edge.id)).toEqual(['e1', 'e2']);
        expect(buildDelegationLineage(edges, 'unknown')).toEqual([]);
    }

    @Test('typeorm delegation store persists reloads and closes edges')
    async typeOrmPersistsAndCloses() {
        const ctx = await Application.run(DelegationGraphOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = new TypeOrmDelegationGraphStore(adapter);
            await store.append(makeEdge({ parentSessionId: 'p-db', childSessionId: 'c-db', kind: 'nested', metadata: { goal: 'db goal' }, createdAt: 10 }));
            await store.markClosed('p-db', 'c-db', 'completed', 20);

            const records = await store.list();
            expect(records.length).toEqual(1);
            expect(records[0].parentSessionId).toEqual('p-db');
            expect(records[0].childSessionId).toEqual('c-db');
            expect(records[0].status).toEqual('completed');
            expect(records[0].completedAt).toEqual(20);
            expect(records[0].metadata?.goal).toEqual('db goal');

            const stored = await adapter.getRepository(AgentDelegationEdgeEntity).findOne({ where: { parentSessionId: 'p-db' } as any });
            expect(stored?.childSessionId).toEqual('c-db');
            expect(stored?.status).toEqual('completed');
        } finally {
            await ctx.close();
        }
    }

    @Test('typeorm delegation store builds trees and lineages')
    async typeOrmBuildsTreesAndLineages() {
        const ctx = await Application.run(DelegationGraphOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = new TypeOrmDelegationGraphStore(adapter);
            await store.append(makeEdge({ parentSessionId: 'root-db', childSessionId: 'a-db', createdAt: 1 }));
            await store.append(makeEdge({ parentSessionId: 'root-db', childSessionId: 'b-db', createdAt: 2, status: 'failed' }));
            await store.append(makeEdge({ parentSessionId: 'a-db', childSessionId: 'a1-db', createdAt: 3 }));

            const tree = await store.tree('root-db');
            expect(tree.children.length).toEqual(2);
            expect(tree.children[0].sessionId).toEqual('a-db');
            expect(tree.children[0].children[0].sessionId).toEqual('a1-db');

            const children = await store.children('root-db');
            expect(children.map(edge => edge.childSessionId)).toEqual(['a-db', 'b-db']);

            const lineage = await store.ancestors('a1-db');
            expect(lineage.map(edge => edge.parentSessionId)).toEqual(['a-db', 'root-db']);
        } finally {
            await ctx.close();
        }
    }

    @Test('agent module falls back to usable in-memory delegation graph store without orm adapter')
    async agentModuleFallsBackToInMemory() {
        const ctx = await Application.run(AgentModule);
        try {
            const store = ctx.get(DelegationGraphStore);
            await store.append(makeEdge({ parentSessionId: 'fallback-p', childSessionId: 'fallback-c' }));
            const records = await store.list();
            expect(records.length).toEqual(1);
            expect(records[0].parentSessionId).toEqual('fallback-p');
        } finally {
            await ctx.close();
        }
    }

    @Test('agent module resolves durable delegation graph store behavior when orm adapter exists')
    async agentModuleResolvesDurableStore() {
        const ctx = await Application.run(AgentDelegationGraphOrmTestModule);
        try {
            const store = ctx.get(DelegationGraphStore);
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            await store.append(makeEdge({ parentSessionId: 'wired-p', childSessionId: 'wired-c' }));
            const stored = await adapter.getRepository(AgentDelegationEdgeEntity).findOne({ where: { parentSessionId: 'wired-p' } as any });
            expect(stored?.childSessionId).toEqual('wired-c');
        } finally {
            await ctx.close();
        }
    }
}
