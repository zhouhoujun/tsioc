import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentModule } from '../src/agent.module';
import { AgentOrmModule } from '../src/orm.module';
import { CompactionHistoryRecord, CompactionHistoryStore, aggregateCompactionHistory, buildCompactionHistoryTrend } from '../src/harness/CompactionHistoryStore';
import { InMemoryCompactionHistoryStore } from '../src/harness/InMemoryCompactionHistoryStore';
import { TypeOrmCompactionHistoryStore } from '../src/harness/TypeOrmCompactionHistoryStore';
import { AgentCompactionHistoryEntity } from '../src/memory/entities';
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
class CompactionHistoryOrmTestModule {}

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
class AgentCompactionHistoryOrmTestModule {}

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

function makeRecord(partial: Partial<CompactionHistoryRecord> = {}): CompactionHistoryRecord {
    return {
        id: 'c1',
        sessionId: 's1',
        strategy: 'pruned',
        compactionTriggered: true,
        level: 'light',
        summaryInserted: false,
        beforeMessageCount: 20,
        afterMessageCount: 12,
        beforeTokens: 8000,
        afterTokens: 4000,
        compactedMessageCount: 8,
        preservedAnchorCount: 2,
        recentMessageCount: 4,
        prunedMessageCount: 6,
        toolMessagesCompacted: 0,
        compressionRatio: 50,
        cumulativeTokenSavings: 4000,
        createdAt: 1,
        ...partial
    };
}

@Suite('Compaction history stores')
export class CompactionHistoryStoreTest {
    @Test('in-memory compaction history store snapshots appended records immutably')
    async inMemorySnapshotsRecords() {
        const store = new InMemoryCompactionHistoryStore();
        const metadata = { nested: { value: 'safe' } };
        await store.append(makeRecord({ id: 'c-in-mem', metadata }));
        metadata.nested.value = 'mutated';
        const records = await store.list('s1');
        expect(records.length).toEqual(1);
        expect((records[0].metadata as any).nested.value).toEqual('safe');
    }

    @Test('in-memory compaction history store filters by session and applies limit')
    async inMemoryFiltersAndLimits() {
        const store = new InMemoryCompactionHistoryStore();
        await store.append(makeRecord({ id: 'c-a', sessionId: 's1', createdAt: 1 }));
        await store.append(makeRecord({ id: 'c-b', sessionId: 's1', createdAt: 2 }));
        await store.append(makeRecord({ id: 'c-c', sessionId: 's2', createdAt: 3 }));
        expect((await store.list('s1')).length).toEqual(2);
        expect((await store.list()).length).toEqual(3);
        expect((await store.list('s1', { limit: 1, offset: 1 }))[0].id).toEqual('c-b');
    }

    @Test('aggregate compaction history groups by session with token totals')
    async aggregateGroupsBySession() {
        const aggregates = aggregateCompactionHistory([
            makeRecord({ id: 'a1', sessionId: 's1', strategy: 'compacted', beforeTokens: 8000, afterTokens: 4000, compressionRatio: 50, compactionTriggered: true, createdAt: 1 }),
            makeRecord({ id: 'a2', sessionId: 's1', beforeTokens: 1000, afterTokens: 900, compressionRatio: 10, compactionTriggered: false, strategy: 'pruned', createdAt: 2 }),
            makeRecord({ id: 'a3', sessionId: 's2', beforeTokens: 2000, afterTokens: 500, compressionRatio: 75, compactionTriggered: true, createdAt: 3 })
        ]);
        expect(aggregates.length).toEqual(2);
        const s1 = aggregates[0];
        expect(s1.sessionId).toEqual('s1');
        expect(s1.recordCount).toEqual(2);
        expect(s1.compactedCount).toEqual(1);
        expect(s1.prunedCount).toEqual(1);
        expect(s1.avgCompressionRatio).toEqual(30);
        expect(s1.totalTokensBefore).toEqual(9000);
        expect(s1.totalTokensAfter).toEqual(4900);
        expect(s1.totalTokensSaved).toEqual(4100);
        expect(s1.timeRange?.from).toEqual(1);
        expect(s1.timeRange?.to).toEqual(2);
        const s2 = aggregates[1];
        expect(s2.sessionId).toEqual('s2');
        expect(s2.totalTokensSaved).toEqual(1500);
    }

    @Test('aggregate compaction history scopes to a single session')
    async aggregateScopesToSession() {
        const aggregates = aggregateCompactionHistory([
            makeRecord({ id: 'a1', sessionId: 's1', createdAt: 1 }),
            makeRecord({ id: 'a2', sessionId: 's2', createdAt: 2 })
        ], 's2');
        expect(aggregates.length).toEqual(1);
        expect(aggregates[0].sessionId).toEqual('s2');
    }

    @Test('in-memory compaction history store aggregates across sessions')
    async inMemoryAggregates() {
        const store = new InMemoryCompactionHistoryStore();
        await store.append(makeRecord({ id: 'm1', sessionId: 's1', beforeTokens: 8000, afterTokens: 4000, createdAt: 1 }));
        await store.append(makeRecord({ id: 'm2', sessionId: 's1', beforeTokens: 1000, afterTokens: 900, createdAt: 2 }));
        const aggregates = await store.aggregate('s1');
        expect(aggregates.length).toEqual(1);
        expect(aggregates[0].totalTokensSaved).toEqual(4100);
        expect(aggregates[0].recordCount).toEqual(2);
    }

    @Test('typeorm compaction history store aggregates persisted records')
    async typeOrmAggregates() {
        const ctx = await Application.run(CompactionHistoryOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = new TypeOrmCompactionHistoryStore(adapter);
            await store.append(makeRecord({ id: 'db-agg-1', sessionId: 's-agg', beforeTokens: 8000, afterTokens: 4000, createdAt: 1 }));
            await store.append(makeRecord({ id: 'db-agg-2', sessionId: 's-agg', beforeTokens: 2000, afterTokens: 500, createdAt: 2 }));
            await store.append(makeRecord({ id: 'db-agg-3', sessionId: 's-other', beforeTokens: 5000, afterTokens: 1000, createdAt: 3 }));
            const scoped = await store.aggregate('s-agg');
            expect(scoped.length).toEqual(1);
            expect(scoped[0].totalTokensSaved).toEqual(5500);
            expect(scoped[0].recordCount).toEqual(2);
            const all = await store.aggregate();
            expect(all.length).toEqual(2);
        } finally {
            await ctx.close();
        }
    }

    @Test('build compaction history trend buckets records by time per session')
    async trendBucketsByTimePerSession() {
        const day = 24 * 60 * 60 * 1000;
        const trend = buildCompactionHistoryTrend([
            makeRecord({ id: 't1', sessionId: 's1', strategy: 'compacted', compactionTriggered: true, beforeTokens: 8000, afterTokens: 4000, compressionRatio: 50, createdAt: 1 * day }),
            makeRecord({ id: 't2', sessionId: 's1', beforeTokens: 1000, afterTokens: 900, compressionRatio: 10, compactionTriggered: false, strategy: 'pruned', createdAt: 2 * day }),
            makeRecord({ id: 't3', sessionId: 's2', beforeTokens: 2000, afterTokens: 500, compressionRatio: 75, compactionTriggered: true, createdAt: 3 * day })
        ]);
        expect(trend.length).toEqual(3);
        const s1First = trend[0];
        expect(s1First.sessionId).toEqual('s1');
        expect(s1First.bucketStart).toEqual(1 * day);
        expect(s1First.recordCount).toEqual(1);
        expect(s1First.compactedCount).toEqual(1);
        expect(s1First.prunedCount).toEqual(0);
        expect(s1First.avgCompressionRatio).toEqual(50);
        expect(s1First.totalTokensSaved).toEqual(4000);
        const s1Second = trend[1];
        expect(s1Second.bucketStart).toEqual(2 * day);
        expect(s1Second.recordCount).toEqual(1);
        expect(s1Second.avgCompressionRatio).toEqual(10);
        const s2 = trend[2];
        expect(s2.sessionId).toEqual('s2');
        expect(s2.totalTokensSaved).toEqual(1500);
    }

    @Test('build compaction history trend honors bucket size and caps buckets')
    async trendHonorsBucketSizeAndCap() {
        const day = 24 * 60 * 60 * 1000;
        const trend = buildCompactionHistoryTrend([
            makeRecord({ id: 'b1', sessionId: 's1', createdAt: 1 * day }),
            makeRecord({ id: 'b2', sessionId: 's1', createdAt: 2 * day }),
            makeRecord({ id: 'b3', sessionId: 's1', createdAt: 3 * day }),
            makeRecord({ id: 'b4', sessionId: 's1', createdAt: 4 * day })
        ], { sessionId: 's1', bucketSize: 2 * day, maxBuckets: 2 });
        expect(trend.length).toEqual(2);
        expect(trend[0].bucketStart).toEqual(2 * day);
        expect(trend[0].recordCount).toEqual(2);
        expect(trend[1].bucketStart).toEqual(4 * day);
        expect(trend[1].recordCount).toEqual(1);
    }

    @Test('build compaction history trend scopes to a single session')
    async trendScopesToSession() {
        const trend = buildCompactionHistoryTrend([
            makeRecord({ id: 'a1', sessionId: 's1', createdAt: 1 }),
            makeRecord({ id: 'a2', sessionId: 's2', createdAt: 2 })
        ], { sessionId: 's2' });
        expect(trend.length).toEqual(1);
        expect(trend[0].sessionId).toEqual('s2');
    }

    @Test('in-memory compaction history store builds trends across sessions')
    async inMemoryTrends() {
        const store = new InMemoryCompactionHistoryStore();
        await store.append(makeRecord({ id: 'mt1', sessionId: 's1', beforeTokens: 8000, afterTokens: 4000, compressionRatio: 50, createdAt: 1 }));
        await store.append(makeRecord({ id: 'mt2', sessionId: 's1', beforeTokens: 1000, afterTokens: 900, compressionRatio: 10, createdAt: 2 }));
        const trend = await store.trend('s1');
        expect(trend.length).toEqual(1);
        expect(trend[0].recordCount).toEqual(2);
        expect(trend[0].totalTokensSaved).toEqual(4100);
        expect(trend[0].avgCompressionRatio).toEqual(30);
    }

    @Test('typeorm compaction history store builds trends from persisted records')
    async typeOrmTrends() {
        const ctx = await Application.run(CompactionHistoryOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = new TypeOrmCompactionHistoryStore(adapter);
            await store.append(makeRecord({ id: 'db-trend-1', sessionId: 's-trend', beforeTokens: 8000, afterTokens: 4000, compressionRatio: 50, createdAt: 1 }));
            await store.append(makeRecord({ id: 'db-trend-2', sessionId: 's-trend', beforeTokens: 2000, afterTokens: 500, compressionRatio: 75, createdAt: 2 }));
            await store.append(makeRecord({ id: 'db-trend-3', sessionId: 's-other', beforeTokens: 5000, afterTokens: 1000, createdAt: 3 }));
            const scoped = await store.trend('s-trend');
            expect(scoped.length).toEqual(1);
            expect(scoped[0].recordCount).toEqual(2);
            expect(scoped[0].totalTokensSaved).toEqual(5500);
            expect(scoped[0].avgCompressionRatio).toEqual(62.5);
            const all = await store.trend();
            expect(all.length).toEqual(2);
        } finally {
            await ctx.close();
        }
    }

    @Test('typeorm compaction history store persists and reloads records')
    async typeOrmPersistsRecords() {
        const ctx = await Application.run(CompactionHistoryOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = new TypeOrmCompactionHistoryStore(adapter);
            await store.append(makeRecord({
                id: 'db-c1',
                sessionId: 's-db',
                level: 'medium',
                compressionRatio: 60,
                cumulativeTokenSavings: 9000
            }));
            const records = await store.list('s-db');
            expect(records.length).toEqual(1);
            expect(records[0].level).toEqual('medium');
            expect(records[0].compressionRatio).toEqual(60);
            expect(records[0].cumulativeTokenSavings).toEqual(9000);
            const stored = await adapter.getRepository(AgentCompactionHistoryEntity).findOne({ where: { id: 'db-c1' } as any });
            expect(stored?.strategy).toEqual('pruned');
            expect(stored?.compactionTriggered).toEqual(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('agent module falls back to usable in-memory compaction history store without orm adapter')
    async agentModuleFallsBackToInMemory() {
        const ctx = await Application.run(AgentModule);
        try {
            const store = ctx.get(CompactionHistoryStore);
            await store.append(makeRecord({ id: 'fallback-c1', sessionId: 'fallback-session' }));
            const records = await store.list('fallback-session');
            expect(records.length).toEqual(1);
            expect(records[0].id).toEqual('fallback-c1');
        } finally {
            await ctx.close();
        }
    }

    @Test('agent module resolves durable compaction history store behavior when orm adapter exists')
    async agentModuleResolvesDurableStore() {
        const ctx = await Application.run(AgentCompactionHistoryOrmTestModule);
        try {
            const store = ctx.get(CompactionHistoryStore);
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            await store.append(makeRecord({ id: 'wired-db-c1', sessionId: 'wired-session' }));
            const stored = await adapter.getRepository(AgentCompactionHistoryEntity).findOne({ where: { id: 'wired-db-c1' } as any });
            expect(stored?.sessionId).toEqual('wired-session');
        } finally {
            await ctx.close();
        }
    }

    @Test('runtime records compaction history when context preparation modifies history')
    async runtimeRecordsCompactionHistory() {
        const store = new InMemoryCompactionHistoryStore();
        const runtime = new DefaultAgentRuntime(
            new StaticModelAdapter('done'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new LLMSessionSummarizer(new StaticModelAdapter(
                'Goal: keep going. Decisions: continue. Files: none. Errors: none. Open state: continue.'
            ) as any),
            {
                ...defaultAgentOptions,
                session: {
                    ...defaultAgentOptions.session,
                    recentMessages: 50,
                    summaryThreshold: 999
                },
                context: {
                    ...defaultAgentOptions.context,
                    compactionThreshold: 6,
                    compactionMinTokens: 150
                }
            },
            new FakeApp() as any,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            store as any
        );
        const longGoal = '设计一个跨平台在线考试系统，包含题库管理、随机组卷、在线考试、监考、防作弊、成绩分析和数据库表设计。'.repeat(4);
        await runtime.runTurn('s1', longGoal);
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '补充数据库表设计');

        const records = await store.list('s1');
        expect(records.length).toBeGreaterThan(0);
        expect(records[records.length - 1].sessionId).toEqual('s1');
        expect(records[records.length - 1].strategy).toEqual('compacted');
        expect(records[records.length - 1].compactionTriggered).toEqual(true);
        expect(records[records.length - 1].beforeTokens).toBeGreaterThan(0);
    }

    @Test('runtime skips compaction history when context preparation leaves history unchanged')
    async runtimeSkipsUnchangedHistory() {
        const store = new InMemoryCompactionHistoryStore();
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
            store as any
        );
        await runtime.runTurn('s2', 'hi');
        const records = await store.list('s2');
        expect(records.length).toEqual(0);
    }
}
