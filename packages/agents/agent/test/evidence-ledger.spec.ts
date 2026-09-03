import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator, Application } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { EvidenceLedger, EvidenceLedgerSnapshot, ToolEvidenceEntry } from '../src/harness/EvidenceLedger';
import { TurnDiagnosticsRecord, TurnDiagnosticsStore } from '../src/harness/TurnDiagnosticsStore';
import { AgentTurnDiagnosticsEntity } from '../src/memory/entities';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { SessionStore } from '../src/memory/SessionStore';
import { MemoryStore } from '../src/memory/MemoryStore';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

class MixedOutcomeToolRegistry extends ToolRegistry {
    getTools() {
        return [
            { name: 'ok_tool', description: 'succeeds' },
            { name: 'fail_tool', description: 'throws' }
        ] as any;
    }
    getTool() {
        return undefined;
    }
    async invoke(name: string): Promise<any> {
        if (name === 'fail_tool') {
            throw new Error('boom');
        }
        return { ok: true };
    }
}

class MixedToolLoopModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [
                    { id: 'tool-ok', name: 'ok_tool', input: { a: 1 } },
                    { id: 'tool-fail', name: 'fail_tool', input: { b: 2 } },
                    { id: 'tool-unknown', name: 'unknown_tool', input: { c: 3 } }
                ],
                stopReason: 'tool'
            };
        }
        return { message: 'mixed-done', stopReason: 'end' };
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

function makeEvidence(turnId: string, statuses: ToolEvidenceEntry['status'][]): EvidenceLedgerSnapshot {
    return {
        turnId,
        sessionId: 's1',
        entries: statuses.map((status, index) => ({
            id: `e-${index}`,
            turnId,
            sessionId: 's1',
            toolName: `tool_${index}`,
            status,
            durationMs: index,
            createdAt: 10 + index
        })),
        successCount: statuses.filter(status => status === 'success').length,
        errorCount: statuses.filter(status => status === 'error').length,
        skippedCount: statuses.filter(status => status === 'skipped').length,
        falsifiedCount: 0,
        totalDurationMs: statuses.reduce((sum, _status, index) => sum + index, 0),
        createdAt: 100
    };
}

@Suite('Evidence ledger (B1)')
export class EvidenceLedgerTest {
    @Test('evidence ledger records entries and aggregates snapshot counts')
    async ledgerAggregatesCounts() {
        const ledger = new EvidenceLedger('s1', new RandomUuidGenerator(), 'turn-1');
        ledger.record({ toolName: 'ok_tool', status: 'success', durationMs: 10, inputSummary: '{a:1}', outputSummary: '{ok:true}' });
        ledger.record({ toolName: 'fail_tool', status: 'error', durationMs: 5, error: 'boom' });
        ledger.record({ toolName: 'unknown_tool', status: 'skipped', durationMs: 0, error: 'not callable' });

        expect(ledger.size).toEqual(3);
        const snapshot = ledger.snapshot();
        expect(snapshot.turnId).toEqual('turn-1');
        expect(snapshot.sessionId).toEqual('s1');
        expect(snapshot.successCount).toEqual(1);
        expect(snapshot.errorCount).toEqual(1);
        expect(snapshot.skippedCount).toEqual(1);
        expect(snapshot.falsifiedCount).toEqual(0);
        expect(snapshot.totalDurationMs).toEqual(15);
        expect(snapshot.entries.length).toEqual(3);
    }

    @Test('evidence ledger fills identity fields and snapshots immutably')
    async ledgerFillsIdentityAndSnapshotsImmutably() {
        const ledger = new EvidenceLedger('s1', new RandomUuidGenerator()
        );
        const entry = ledger.record({ toolName: 'ok_tool', status: 'success' });

        expect(entry.turnId).toEqual(ledger.turnId);
        expect(entry.sessionId).toEqual('s1');
        expect(entry.id).toBeTruthy();
        expect(entry.createdAt).toBeGreaterThan(0);

        const first = ledger.snapshot();
        first.entries[0].error = 'mutated';
        first.successCount = 99;
        const second = ledger.snapshot();
        expect(second.entries[0].error).toBeUndefined();
        expect(second.successCount).toEqual(1);
    }

    @Test('turn diagnostics store round-trips evidence immutably')
    async inMemoryRoundTripsEvidence() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        try {
            const store = ctx.get(TurnDiagnosticsStore);
            const evidence = makeEvidence('turn-x', ['success', 'error']);
            await store.append(makeRecord({ id: 't-ev', evidence }));

            const records = await store.list('s1');
            expect(records.length).toEqual(1);
            expect(records[0].evidence?.successCount).toEqual(1);
            expect(records[0].evidence?.errorCount).toEqual(1);
            expect(records[0].evidence?.entries[0].toolName).toEqual('tool_0');

            records[0].evidence!.entries[0].error = 'mutated';
            const reloaded = await store.list('s1');
            expect(reloaded[0].evidence?.entries[0].error).toBeUndefined();
        } finally { await ctx.close(); }
    }

    @Test('typeorm turn diagnostics store persists and reloads evidence')
    async typeOrmPersistsEvidence() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const store = ctx.get(TurnDiagnosticsStore);
            const evidence = makeEvidence('db-turn', ['success', 'error', 'skipped']);
            await store.append(makeRecord({ id: 'db-ev-1', sessionId: 's-db', evidence }));

            const records = await store.list('s-db');
            expect(records.length).toEqual(1);
            expect(records[0].evidence?.successCount).toEqual(1);
            expect(records[0].evidence?.errorCount).toEqual(1);
            expect(records[0].evidence?.skippedCount).toEqual(1);

            const stored = await adapter.getRepository(AgentTurnDiagnosticsEntity).findOne({ where: { id: 'db-ev-1' } as any });
            expect(stored?.evidence).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('runtime records tool evidence for mixed tool outcomes in a turn')
    async runtimeRecordsMixedToolEvidence() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        try {
            const store = ctx.get(TurnDiagnosticsStore);
            const runtime = new DefaultAgentRuntime(
                new MixedToolLoopModelAdapter(),
                new MixedOutcomeToolRegistry(),
                ctx.get(SessionStore),
                ctx.get(MemoryStore),
                new LLMSessionSummarizer(new EchoModelAdapter() as any),
                defaultAgentOptions,
                new FakeApp() as any,
                new RandomUuidGenerator(),
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                store as any
            );
            await runtime.runTurn('s1', 'run tools');

            const records = await store.list('s1');
            expect(records.length).toEqual(1);
            const evidence = records[0].evidence;
            expect(evidence).toBeTruthy();
            expect(evidence!.entries.length).toEqual(3);
            expect(evidence!.successCount).toEqual(1);
            expect(evidence!.errorCount).toEqual(1);
            expect(evidence!.skippedCount).toEqual(1);

            const byName = new Map(evidence!.entries.map(entry => [entry.toolName, entry]));
            expect(byName.get('ok_tool')?.status).toEqual('success');
            expect(byName.get('fail_tool')?.status).toEqual('error');
            expect(byName.get('fail_tool')?.error).toEqual('boom');
            expect(byName.get('unknown_tool')?.status).toEqual('skipped');
            expect(evidence!.entries.every(entry => entry.turnId === evidence!.turnId)).toEqual(true);
            expect(evidence!.entries.every(entry => entry.sessionId === 's1')).toEqual(true);
        } finally { await ctx.close(); }
    }

    @Test('runtime records tool evidence for parallel tool execution')
    async runtimeRecordsParallelToolEvidence() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        try {
            const store = ctx.get(TurnDiagnosticsStore);
            const options = {
                ...defaultAgentOptions,
                tools: {
                    ...defaultAgentOptions.tools,
                    parallelExecution: true,
                    parallelSafeTools: ['ok_tool', 'fail_tool', 'unknown_tool']
                }
            };
            const runtime = new DefaultAgentRuntime(
                new MixedToolLoopModelAdapter(),
                new MixedOutcomeToolRegistry(),
                ctx.get(SessionStore),
                ctx.get(MemoryStore),
                new LLMSessionSummarizer(new EchoModelAdapter() as any),
                options,
                new FakeApp() as any,
                new RandomUuidGenerator(),
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                store as any
            );
            await runtime.runTurn('s1', 'run tools parallel');

            const records = await store.list('s1');
            expect(records.length).toEqual(1);
            const evidence = records[0].evidence;
            expect(evidence).toBeTruthy();
            expect(evidence!.entries.length).toEqual(3);
            expect(evidence!.successCount).toEqual(1);
            expect(evidence!.errorCount).toEqual(1);
            expect(evidence!.skippedCount).toEqual(1);
        } finally { await ctx.close(); }
    }

    @Test('turn diagnostics store resolves through the agent module with evidence support')
    async agentModuleStoreSupportsEvidence() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        try {
            const store = ctx.get(TurnDiagnosticsStore);
            const evidence = makeEvidence('wired-turn', ['success']);
            await store.append(makeRecord({ id: 'wired-ev', sessionId: 'wired-session', evidence }));
            const records = await store.list('wired-session');
            expect(records[0].evidence?.successCount).toEqual(1);
        } finally {
            await ctx.close();
        }
    }
}
