import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentModule } from '../src/agent.module';
import { AgentOrmModule } from '../src/orm.module';
import { TurnDiagnosticsRecord, TurnDiagnosticsStore, buildTurnDiagnosticsTrend } from '../src/harness/TurnDiagnosticsStore';
import { InMemoryTurnDiagnosticsStore } from '../src/harness/InMemoryTurnDiagnosticsStore';
import { TypeOrmTurnDiagnosticsStore } from '../src/harness/TypeOrmTurnDiagnosticsStore';
import { AgentTurnDiagnosticsEntity } from '../src/memory/entities';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';

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
class TurnDiagnosticsOrmTestModule {}

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
class AgentTurnDiagnosticsOrmTestModule {}

class StaticModelAdapter extends EchoModelAdapter {
    constructor(private content: string) {
        super();
    }

    async complete(): Promise<any> {
        return {
            message: this.content,
            stopReason: 'end'
        };
    }
}

class EmptyToolRegistry extends ToolRegistry {
    getTools() { return []; }
    getTool() { return undefined; }
    async invoke(): Promise<any> { return null; }
}

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

function makeRecord(partial: Partial<TurnDiagnosticsRecord> = {}): TurnDiagnosticsRecord {
    return {
        id: 't1',
        sessionId: 's1',
        createdAt: 1,
        emptyResponseRetryCount: 0,
        followUpRecoveryCount: 0,
        followUpContextRewritten: false,
        finalAssistantWasClarification: false,
        repeatedClarificationDetected: false,
        compactionCount: 0,
        totalTokenSavings: 0,
        compressionRatio: undefined,
        compactionLevel: undefined,
        promptCache: undefined,
        ...partial
    };
}

@Suite('Turn diagnostics stores')
export class TurnDiagnosticsStoreTest {
    @Test('in-memory turn diagnostics store snapshots promptCache immutably')
    async inMemorySnapshotsRecords() {
        const store = new InMemoryTurnDiagnosticsStore();
        const promptCache = {
            provider: 'deepseek',
            supported: 'full',
            applied: true,
            appliedStrategy: 'partial'
        } as any;
        await store.append(makeRecord({ id: 't-in-mem', promptCache }));
        promptCache.provider = 'mutated';
        const records = await store.list('s1');
        expect(records.length).toEqual(1);
        expect(records[0].promptCache?.provider).toEqual('deepseek');
    }

    @Test('in-memory turn diagnostics store filters by session and applies limit')
    async inMemoryFiltersAndLimits() {
        const store = new InMemoryTurnDiagnosticsStore();
        await store.append(makeRecord({ id: 't-a', sessionId: 's1', createdAt: 1 }));
        await store.append(makeRecord({ id: 't-b', sessionId: 's1', createdAt: 2 }));
        await store.append(makeRecord({ id: 't-c', sessionId: 's2', createdAt: 3 }));
        expect((await store.list('s1')).length).toEqual(2);
        expect((await store.list()).length).toEqual(3);
        expect((await store.list('s1', { limit: 1, offset: 1 }))[0].id).toEqual('t-b');
    }

    @Test('aggregate turn diagnostics computes rates and totals across sessions')
    async aggregateComputesRates() {
        const store = new InMemoryTurnDiagnosticsStore();
        await store.append(makeRecord({
            id: 't-1', sessionId: 's1',
            emptyResponseRetryCount: 2, repeatedClarificationDetected: true,
            finalAssistantWasClarification: true, followUpRecoveryCount: 1,
            compactionCount: 1, totalTokenSavings: 4000, createdAt: 1
        }));
        await store.append(makeRecord({
            id: 't-2', sessionId: 's1',
            emptyResponseRetryCount: 0, repeatedClarificationDetected: false,
            finalAssistantWasClarification: false, followUpRecoveryCount: 0,
            compactionCount: 0, totalTokenSavings: 0, createdAt: 2
        }));
        await store.append(makeRecord({
            id: 't-3', sessionId: 's2',
            emptyResponseRetryCount: 0, repeatedClarificationDetected: false,
            finalAssistantWasClarification: false, followUpRecoveryCount: 3,
            compactionCount: 0, totalTokenSavings: 0, createdAt: 3
        }));

        const all = await store.aggregate();
        expect(all.totalTurns).toEqual(3);
        expect(all.emptyResponseCount).toEqual(1);
        expect(all.emptyResponseRate).toEqual(33.3);
        expect(all.repeatedClarificationCount).toEqual(1);
        expect(all.repeatedQuestionRate).toEqual(33.3);
        expect(all.finalClarificationCount).toEqual(1);
        expect(all.clarificationRate).toEqual(33.3);
        expect(all.followUpRecoveryCount).toEqual(4);
        expect(all.followUpRecoveryRate).toEqual(133.3);
        expect(all.compactionCount).toEqual(1);
        expect(all.totalTokenSavings).toEqual(4000);
        expect(all.timeRange).toEqual({ from: 1, to: 3 });

        const scoped = await store.aggregate(['s1']);
        expect(scoped.totalTurns).toEqual(2);
        expect(scoped.followUpRecoveryCount).toEqual(1);
        expect(scoped.followUpRecoveryRate).toEqual(50);
        expect(scoped.timeRange).toEqual({ from: 1, to: 2 });

        const empty = new InMemoryTurnDiagnosticsStore();
        const emptyAggregate = await empty.aggregate();
        expect(emptyAggregate.totalTurns).toEqual(0);
        expect(emptyAggregate.emptyResponseRate).toEqual(0);
        expect(emptyAggregate.timeRange).toBeUndefined();
    }

    @Test('build turn diagnostics trend buckets records by time per session')
    async trendBucketsByTimePerSession() {
        const day = 24 * 60 * 60 * 1000;
        const records = [
            makeRecord({ id: 't-1', sessionId: 's1', createdAt: day, totalTokenSavings: 3000, compactionCount: 1, emptyResponseRetryCount: 1 }),
            makeRecord({ id: 't-2', sessionId: 's1', createdAt: day + 1, totalTokenSavings: 2000, compressionRatio: 60 }),
            makeRecord({ id: 't-3', sessionId: 's1', createdAt: day * 2, totalTokenSavings: 5000, compactionCount: 2, repeatedClarificationDetected: true }),
            makeRecord({ id: 't-4', sessionId: 's2', createdAt: day, totalTokenSavings: 1000 })
        ];
        const points = buildTurnDiagnosticsTrend(records);
        const s1 = points.filter(point => point.sessionId === 's1').sort((a, b) => a.bucketStart - b.bucketStart);
        const s2 = points.filter(point => point.sessionId === 's2');
        expect(s1.length).toEqual(2);
        expect(s1[0].bucketStart).toEqual(day);
        expect(s1[0].recordCount).toEqual(2);
        expect(s1[0].emptyResponseCount).toEqual(1);
        expect(s1[0].compactionCount).toEqual(1);
        expect(s1[0].totalTokenSavings).toEqual(5000);
        expect(s1[0].avgCompressionRatio).toEqual(60);
        expect(s1[1].bucketStart).toEqual(day * 2);
        expect(s1[1].recordCount).toEqual(1);
        expect(s1[1].repeatedClarificationCount).toEqual(1);
        expect(s1[1].totalTokenSavings).toEqual(5000);
        expect(s2.length).toEqual(1);
        expect(s2[0].totalTokenSavings).toEqual(1000);
    }

    @Test('build turn diagnostics trend honors bucket size and max buckets cap')
    async trendHonorsBucketSizeAndCap() {
        const day = 24 * 60 * 60 * 1000;
        const records = Array.from({ length: 5 }, (_, index) => makeRecord({
            id: `t-${index}`,
            sessionId: 's1',
            createdAt: day * (index + 1),
            totalTokenSavings: 1000
        }));
        const fine = buildTurnDiagnosticsTrend(records, { bucketSize: day / 2 });
        expect(fine.length).toEqual(5);
        expect(fine.every(point => point.recordCount === 1)).toEqual(true);
        const capped = buildTurnDiagnosticsTrend(records, { maxBuckets: 2 });
        const starts = capped.map(point => point.bucketStart).sort((a, b) => a - b);
        expect(capped.length).toEqual(2);
        expect(starts[0]).toEqual(day * 4);
        expect(starts[1]).toEqual(day * 5);
        const coerced = buildTurnDiagnosticsTrend(records, { maxBuckets: 500 });
        expect(coerced.length).toEqual(5);
    }

    @Test('build turn diagnostics trend scopes to session ids')
    async trendScopesToSessionIds() {
        const day = 24 * 60 * 60 * 1000;
        const records = [
            makeRecord({ id: 't-1', sessionId: 's1', createdAt: day, totalTokenSavings: 1000 }),
            makeRecord({ id: 't-2', sessionId: 's2', createdAt: day, totalTokenSavings: 2000 }),
            makeRecord({ id: 't-3', sessionId: 's3', createdAt: day, totalTokenSavings: 3000 })
        ];
        const points = buildTurnDiagnosticsTrend(records, { sessionIds: ['s1', 's3'] });
        expect(points.map(point => point.sessionId).sort()).toEqual(['s1', 's3']);
        expect(points.find(point => point.sessionId === 's3')?.totalTokenSavings).toEqual(3000);
    }

    @Test('in-memory turn diagnostics store exposes trend')
    async inMemoryTrends() {
        const day = 24 * 60 * 60 * 1000;
        const store = new InMemoryTurnDiagnosticsStore();
        await store.append(makeRecord({ id: 't-1', sessionId: 's1', createdAt: day, totalTokenSavings: 1000 }));
        await store.append(makeRecord({ id: 't-2', sessionId: 's1', createdAt: day + 1, totalTokenSavings: 2000 }));
        await store.append(makeRecord({ id: 't-3', sessionId: 's2', createdAt: day, totalTokenSavings: 500 }));
        const all = await store.trend();
        expect(all.filter(point => point.sessionId === 's1').length).toEqual(1);
        expect(all.find(point => point.sessionId === 's1')?.totalTokenSavings).toEqual(3000);
        const scoped = await store.trend(['s2']);
        expect(scoped.length).toEqual(1);
        expect(scoped[0].sessionId).toEqual('s2');
        expect(scoped[0].totalTokenSavings).toEqual(500);
    }

    @Test('typeorm turn diagnostics store exposes trend')
    async typeOrmTrends() {
        const ctx = await Application.run(TurnDiagnosticsOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = new TypeOrmTurnDiagnosticsStore(adapter);
            const day = 24 * 60 * 60 * 1000;
            await store.append(makeRecord({ id: 'db-tr-1', sessionId: 's-db', createdAt: 10, totalTokenSavings: 4000, compressionRatio: 50 }));
            await store.append(makeRecord({ id: 'db-tr-2', sessionId: 's-db', createdAt: 20, totalTokenSavings: 2000 }));
            const all = await store.trend();
            expect(all.length).toEqual(1);
            expect(all[0].sessionId).toEqual('s-db');
            expect(all[0].recordCount).toEqual(2);
            expect(all[0].totalTokenSavings).toEqual(6000);
            expect(all[0].avgCompressionRatio).toEqual(50);
            const scoped = await store.trend(['other']);
            expect(scoped.length).toEqual(0);
        } finally {
            await ctx.close();
        }
    }

    @Test('typeorm turn diagnostics store persists reloads and aggregates records')
    async typeOrmPersistsAndAggregates() {
        const ctx = await Application.run(TurnDiagnosticsOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = new TypeOrmTurnDiagnosticsStore(adapter);
            await store.append(makeRecord({
                id: 'db-t1', sessionId: 's-db',
                emptyResponseRetryCount: 1, repeatedClarificationDetected: true,
                compactionCount: 2, totalTokenSavings: 6000, createdAt: 10
            }));
            await store.append(makeRecord({
                id: 'db-t2', sessionId: 's-db',
                emptyResponseRetryCount: 0, repeatedClarificationDetected: false,
                compactionCount: 0, totalTokenSavings: 0, createdAt: 20
            }));
            const records = await store.list('s-db');
            expect(records.length).toEqual(2);
            expect(records[0].totalTokenSavings).toEqual(6000);
            expect(records[0].createdAt).toEqual(10);

            const aggregate = await store.aggregate(['s-db']);
            expect(aggregate.totalTurns).toEqual(2);
            expect(aggregate.emptyResponseCount).toEqual(1);
            expect(aggregate.emptyResponseRate).toEqual(50);
            expect(aggregate.repeatedClarificationCount).toEqual(1);
            expect(aggregate.compactionCount).toEqual(2);
            expect(aggregate.totalTokenSavings).toEqual(6000);

            const stored = await adapter.getRepository(AgentTurnDiagnosticsEntity).findOne({ where: { id: 'db-t1' } as any });
            expect(stored?.repeatedClarificationDetected).toEqual(true);
            expect(Number(stored?.createdAt)).toEqual(10);
        } finally {
            await ctx.close();
        }
    }

    @Test('agent module falls back to usable in-memory turn diagnostics store without orm adapter')
    async agentModuleFallsBackToInMemory() {
        const ctx = await Application.run(AgentModule);
        try {
            const store = ctx.get(TurnDiagnosticsStore);
            await store.append(makeRecord({ id: 'fallback-t1', sessionId: 'fallback-session' }));
            const records = await store.list('fallback-session');
            expect(records.length).toEqual(1);
            expect(records[0].id).toEqual('fallback-t1');
        } finally {
            await ctx.close();
        }
    }

    @Test('agent module resolves durable turn diagnostics store behavior when orm adapter exists')
    async agentModuleResolvesDurableStore() {
        const ctx = await Application.run(AgentTurnDiagnosticsOrmTestModule);
        try {
            const store = ctx.get(TurnDiagnosticsStore);
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            await store.append(makeRecord({ id: 'wired-db-t1', sessionId: 'wired-session' }));
            const stored = await adapter.getRepository(AgentTurnDiagnosticsEntity).findOne({ where: { id: 'wired-db-t1' } as any });
            expect(stored?.sessionId).toEqual('wired-session');
        } finally {
            await ctx.close();
        }
    }

    @Test('runtime records turn diagnostics for completed turns')
    async runtimeRecordsTurnDiagnostics() {
        const store = new InMemoryTurnDiagnosticsStore();
        const runtime = new DefaultAgentRuntime(
            new StaticModelAdapter('done'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new LLMSessionSummarizer(new StaticModelAdapter('summary') as any),
            defaultAgentOptions,
            new FakeApp() as any,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            store as any
        );
        await runtime.runTurn('s1', 'first turn');
        await runtime.runTurn('s1', 'second turn');

        const records = await store.list('s1');
        expect(records.length).toEqual(2);
        expect(records.every(record => record.sessionId === 's1')).toEqual(true);
        expect(records.every(record => record.emptyResponseRetryCount >= 0)).toEqual(true);
        expect(records[records.length - 1].createdAt).toBeGreaterThanOrEqual(records[0].createdAt);
    }
}
