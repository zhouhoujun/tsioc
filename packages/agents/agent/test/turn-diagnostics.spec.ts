import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentModule } from '../src/agent.module';
import { AgentOrmModule } from '../src/orm.module';
import { TurnDiagnosticsRecord, TurnDiagnosticsStore } from '../src/harness/TurnDiagnosticsStore';
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
