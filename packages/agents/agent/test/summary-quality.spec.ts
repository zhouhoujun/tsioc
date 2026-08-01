import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentModule } from '../src/agent.module';
import { AgentOrmModule } from '../src/orm.module';
import { SummaryQualityRecord, SummaryQualityStore, aggregateSummaryQuality, buildSummaryQualityTrend } from '../src/harness/SummaryQualityStore';
import { scoreSummaryQuality } from '../src/harness/SummaryQualityScorer';
import { InMemorySummaryQualityStore } from '../src/harness/InMemorySummaryQualityStore';
import { TypeOrmSummaryQualityStore } from '../src/harness/TypeOrmSummaryQualityStore';
import { AgentSummaryQualityEntity } from '../src/memory/entities';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';

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
class SummaryQualityOrmTestModule {}

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
class AgentSummaryQualityOrmTestModule {}

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

function makeRecord(partial: Partial<SummaryQualityRecord> = {}): SummaryQualityRecord {
    return {
        id: 'q1',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        total: 100,
        fieldCompleteness: 100,
        annotationQuality: 100,
        lengthBalance: 100,
        truncationScore: 100,
        fallbackUsed: false,
        summaryLength: 240,
        createdAt: 1,
        ...partial
    };
}

function makeFullSummary(): string {
    return [
        'Goal: Fix routing in src/app.ts and keep the task goal visible.',
        'Decisions: Inspect the router branch first and patch the failing branch.',
        'Files: modified: src/app.ts | mentioned: docs/readme.md',
        'Errors: No errors recorded.',
        'Open state: Patch the router and verify the result.'
    ].join('\n');
}

@Suite('Summary quality scorer')
export class SummaryQualityScorerTest {
    @Test('scores a complete annotated summary at full marks')
    async scoresCompleteAnnotatedSummary() {
        const score = scoreSummaryQuality(makeFullSummary());
        expect(score.total).toEqual(100);
        expect(score.fieldCompleteness).toEqual(100);
        expect(score.annotationQuality).toEqual(100);
        expect(score.lengthBalance).toEqual(100);
        expect(score.truncationScore).toEqual(100);
        expect(score.missingFields.length).toEqual(0);
        expect(score.fallbackUsed).toEqual(false);
    }

    @Test('deducts one fifth per missing field')
    async deductsPerMissingField() {
        const summary = [
            'Goal: Fix routing in src/app.ts and keep the task goal visible.',
            'Decisions: Inspect the router branch first.',
            'Open state: Patch the router and verify the result.'
        ].join('\n');
        const score = scoreSummaryQuality(summary);
        expect(score.fieldCompleteness).toEqual(60);
        expect(score.missingFields).toEqual(['Files', 'Errors']);
        expect(score.annotationQuality).toEqual(0);
        expect(score.total).toEqual(64);
    }

    @Test('scores an unannotated Files line at zero annotation quality')
    async scoresUnannotatedFilesLine() {
        const summary = [
            'Goal: Fix routing in src/app.ts and keep the task goal visible.',
            'Decisions: Inspect the router branch first.',
            'Files: src/app.ts',
            'Errors: No errors recorded.',
            'Open state: Patch the router and verify the result.'
        ].join('\n');
        const score = scoreSummaryQuality(summary);
        expect(score.annotationQuality).toEqual(0);
        expect(score.fieldCompleteness).toEqual(100);
    }

    @Test('applies the fallback multiplier to the total')
    async appliesFallbackMultiplier() {
        const withoutFallback = scoreSummaryQuality(makeFullSummary());
        const withFallback = scoreSummaryQuality(makeFullSummary(), { fallbackUsed: true });
        expect(withoutFallback.total).toEqual(100);
        expect(withFallback.total).toEqual(70);
        expect(withFallback.fallbackUsed).toEqual(true);
    }

    @Test('scores an empty summary at zero')
    async scoresEmptySummaryAtZero() {
        const score = scoreSummaryQuality('');
        expect(score.total).toEqual(0);
        expect(score.fieldCompleteness).toEqual(0);
        expect(score.missingFields.length).toEqual(5);
    }

    @Test('penalizes a single-part annotation at half marks')
    async penalizesSinglePartAnnotation() {
        const summary = [
            'Goal: Fix routing in src/app.ts and keep the task goal visible.',
            'Decisions: Inspect the router branch first.',
            'Files: modified: src/app.ts',
            'Errors: No errors recorded.',
            'Open state: Patch the router and verify the result.'
        ].join('\n');
        const score = scoreSummaryQuality(summary);
        expect(score.annotationQuality).toEqual(50);
    }

    @Test('degrades truncation score for very long summaries')
    async degradesTruncationScore() {
        const longSummary = `${makeFullSummary()}\n${'x'.repeat(1900)}`;
        const score = scoreSummaryQuality(longSummary);
        expect(score.truncationScore).toEqual(30);
        expect(score.total).toBeLessThan(100);
    }
}

@Suite('Summary quality stores')
export class SummaryQualityStoreTest {
    @Test('in-memory summary quality store snapshots records immutably and filters by provider')
    async inMemorySnapshotsAndFilters() {
        const store = new InMemorySummaryQualityStore();
        const metadata = { route: 'a' } as any;
        await store.append(makeRecord({ id: 'q-a', provider: 'deepseek', createdAt: 1, metadata }));
        await store.append(makeRecord({ id: 'q-b', provider: 'deepseek', createdAt: 2 }));
        await store.append(makeRecord({ id: 'q-c', provider: 'anthropic', createdAt: 3 }));
        metadata.route = 'mutated';

        const deepseek = await store.list({ provider: 'deepseek' });
        expect(deepseek.length).toEqual(2);
        expect(deepseek[0].metadata?.route).toEqual('a');

        const all = await store.list();
        expect(all.length).toEqual(3);

        const paged = await store.list({ provider: 'deepseek', limit: 1, offset: 1 });
        expect(paged[0].id).toEqual('q-b');
    }

    @Test('aggregate summary quality groups by provider')
    async aggregateGroupsByProvider() {
        const store = new InMemorySummaryQualityStore();
        await store.append(makeRecord({ id: 'q-1', provider: 'deepseek', total: 100, fallbackUsed: false, createdAt: 1 }));
        await store.append(makeRecord({ id: 'q-2', provider: 'deepseek', total: 60, fallbackUsed: true, createdAt: 2 }));
        await store.append(makeRecord({ id: 'q-3', provider: 'anthropic', total: 70, fallbackUsed: false, createdAt: 3 }));

        const aggregates = await store.aggregate();
        expect(aggregates.length).toEqual(2);
        const deepseek = aggregates.find(a => a.provider === 'deepseek')!;
        expect(deepseek.recordCount).toEqual(2);
        expect(deepseek.avgTotal).toEqual(80);
        expect(deepseek.minTotal).toEqual(60);
        expect(deepseek.maxTotal).toEqual(100);
        expect(deepseek.fallbackRate).toEqual(50);
        expect(deepseek.timeRange).toEqual({ from: 1, to: 2 });

        const scoped = await store.aggregate('anthropic');
        expect(scoped.length).toEqual(1);
        expect(scoped[0].recordCount).toEqual(1);
        expect(scoped[0].avgTotal).toEqual(70);

        const raw = aggregateSummaryQuality([
            makeRecord({ id: 'r1', provider: 'deepseek', total: 90, createdAt: 1 }),
            makeRecord({ id: 'r2', provider: 'deepseek', total: 80, createdAt: 2 })
        ]);
        expect(raw[0].avgTotal).toEqual(85);
    }

    @Test('build summary quality trend buckets records per provider over time')
    async trendBucketsRecordsPerProvider() {
        const day = 24 * 60 * 60 * 1000;
        const trend = buildSummaryQualityTrend([
            makeRecord({ id: 't1', provider: 'deepseek', total: 90, fallbackUsed: false, createdAt: 1 }),
            makeRecord({ id: 't2', provider: 'deepseek', total: 80, fallbackUsed: false, createdAt: 2 }),
            makeRecord({ id: 't3', provider: 'deepseek', total: 60, fallbackUsed: true, createdAt: day + 1 }),
            makeRecord({ id: 't4', provider: 'anthropic', total: 70, fallbackUsed: false, createdAt: day + 2 })
        ]);

        expect(trend.length).toEqual(3);
        const deepseek = trend.filter(point => point.provider === 'deepseek');
        expect(deepseek.length).toEqual(2);
        expect(deepseek[0].bucketStart).toEqual(0);
        expect(deepseek[0].recordCount).toEqual(2);
        expect(deepseek[0].avgTotal).toEqual(85);
        expect(deepseek[0].minTotal).toEqual(80);
        expect(deepseek[0].maxTotal).toEqual(90);
        expect(deepseek[0].fallbackRate).toEqual(0);
        expect(deepseek[1].bucketStart).toEqual(day);
        expect(deepseek[1].recordCount).toEqual(1);
        expect(deepseek[1].avgTotal).toEqual(60);
        expect(deepseek[1].fallbackRate).toEqual(100);
        expect(trend.filter(point => point.provider === 'anthropic')[0].recordCount).toEqual(1);
    }

    @Test('build summary quality trend filters by provider and caps recent buckets')
    async trendFiltersAndCapsBuckets() {
        const day = 24 * 60 * 60 * 1000;
        const records = [0, 1, 2, 3].map(offset => makeRecord({
            id: `cap-${offset}`,
            provider: 'deepseek',
            total: 100 - offset * 10,
            createdAt: offset * day
        }));

        const scoped = buildSummaryQualityTrend(records, { provider: 'anthropic' });
        expect(scoped).toEqual([]);

        const capped = buildSummaryQualityTrend(records, { maxBuckets: 2 });
        expect(capped.length).toEqual(2);
        expect(capped.map(point => point.bucketStart)).toEqual([day * 2, day * 3]);
        expect(capped[1].avgTotal).toEqual(70);
    }

    @Test('build summary quality trend returns empty for no records')
    async trendEmptyForNoRecords() {
        expect(buildSummaryQualityTrend([])).toEqual([]);
    }

    @Test('typeorm summary quality store persists reloads and aggregates records')
    async typeOrmPersistsAndAggregates() {
        const ctx = await Application.run(SummaryQualityOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = new TypeOrmSummaryQualityStore(adapter);
            await store.append(makeRecord({ id: 'db-q1', provider: 'deepseek', total: 100, createdAt: 10 }));
            await store.append(makeRecord({ id: 'db-q2', provider: 'deepseek', total: 40, fallbackUsed: true, createdAt: 20 }));

            const records = await store.list({ provider: 'deepseek' });
            expect(records.length).toEqual(2);
            expect(records[0].total).toEqual(100);
            expect(records[0].createdAt).toEqual(10);
            expect(records[0].provider).toEqual('deepseek');

            const aggregate = await store.aggregate('deepseek');
            expect(aggregate.length).toEqual(1);
            expect(aggregate[0].recordCount).toEqual(2);
            expect(aggregate[0].avgTotal).toEqual(70);
            expect(aggregate[0].fallbackRate).toEqual(50);

            const stored = await adapter.getRepository(AgentSummaryQualityEntity).findOne({ where: { id: 'db-q1' } as any });
            expect(stored?.total).toEqual(100);
            expect(Number(stored?.createdAt)).toEqual(10);
        } finally {
            await ctx.close();
        }
    }

    @Test('agent module falls back to usable in-memory summary quality store without orm adapter')
    async agentModuleFallsBackToInMemory() {
        const ctx = await Application.run(AgentModule);
        try {
            const store = ctx.get(SummaryQualityStore);
            await store.append(makeRecord({ id: 'fallback-q1', provider: 'unknown' }));
            const records = await store.list();
            expect(records.length).toEqual(1);
            expect(records[0].id).toEqual('fallback-q1');
        } finally {
            await ctx.close();
        }
    }

    @Test('agent module resolves durable summary quality store when orm adapter exists')
    async agentModuleResolvesDurableStore() {
        const ctx = await Application.run(AgentSummaryQualityOrmTestModule);
        try {
            const store = ctx.get(SummaryQualityStore);
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            await store.append(makeRecord({ id: 'wired-q1', provider: 'deepseek', total: 95 }));
            const stored = await adapter.getRepository(AgentSummaryQualityEntity).findOne({ where: { id: 'wired-q1' } as any });
            expect(stored?.provider).toEqual('deepseek');
            expect(stored?.total).toEqual(95);
        } finally {
            await ctx.close();
        }
    }
}

@Suite('LLMSessionSummarizer quality recording')
export class SummaryQualityIntegrationTest {
    @Test('records a scored summary when a store is provided')
    async recordsScoredSummary() {
        const store = new InMemorySummaryQualityStore();
        const summarizer = new LLMSessionSummarizer(
            new StaticModelAdapter(makeFullSummary()) as any,
            store as any
        );
        const messages = [
            { id: '1', role: 'user' as const, content: 'Fix routing in src/app.ts.', createdAt: 1 }
        ];
        const summary = await summarizer.summarize(messages);
        expect(summary).toContain('Goal:');

        const records = await store.list();
        expect(records.length).toEqual(1);
        expect(records[0].provider).toEqual('echo');
        expect(records[0].model).toEqual('echo');
        expect(records[0].total).toEqual(100);
        expect(records[0].fallbackUsed).toEqual(false);
    }

    @Test('marks fallback summaries as fallback in the record')
    async recordsFallbackSummary() {
        const store = new InMemorySummaryQualityStore();
        const summarizer = new LLMSessionSummarizer(null, store as any);
        const messages = [
            { id: '1', role: 'user' as const, content: 'Fix routing in src/app.ts and keep docs/plan.md in mind.', createdAt: 1 }
        ];
        await summarizer.summarize(messages);

        const records = await store.list();
        expect(records.length).toEqual(1);
        expect(records[0].provider).toEqual('unknown');
        expect(records[0].fallbackUsed).toEqual(true);
        expect(records[0].total).toBeLessThan(100);
    }

    @Test('summarization never breaks when the store is missing')
    async summarizeWithoutStore() {
        const summarizer = new LLMSessionSummarizer(null);
        const messages = [
            { id: '1', role: 'user' as const, content: 'Fix routing in src/app.ts.', createdAt: 1 }
        ];
        const summary = await summarizer.summarize(messages);
        expect(summary).toContain('Goal:');
    }
}
