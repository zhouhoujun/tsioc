import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { EvalReportStore, EvalRunner } from '../src/eval/EvalRunner';
import { compareEvalMetrics } from '../src/eval/EvalTask';
import { Application } from '@tsdi/core';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

@Suite('Eval runner (P85)')
export class EvalRunnerTest {
    @Test('runs tasks, verification, and persists reports')
    async runsAndPersists() {
        const runtime = { runTurn: async () => ({}) } as any;
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const store = ctx.get(EvalReportStore);
        const runner = new EvalRunner(runtime, store, { id: () => 'run-1', verify: async command => ({ command, ok: command === 'test' }) });
        const report = await runner.run({ id: 'task', issue: 'fix it', verifyCommands: ['test', 'lint'] });
        expect(report.status).toEqual('failed'); expect(report.score).toEqual(0);
        expect(report.verifications.length).toEqual(2); expect((await store.get('run-1'))?.taskId).toEqual('task');
    }

    @Test('captures trajectory metrics and compares them to a baseline')
    async metricsAndComparison() {
        const runtime = {
            runTurn: async () => ({}),
            getMessages: async () => [
                { role: 'user', content: 'do it', metadata: {} },
                { role: 'assistant', content: '', metadata: { toolCalls: [{ id: 't1' }], usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } } },
                { role: 'tool', content: '{"error":"boom"}', metadata: { error: 'boom' } },
                { role: 'assistant', content: 'done', metadata: { usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 } } }
            ]
        } as any;
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const runner = new EvalRunner(runtime, ctx.get(EvalReportStore), { id: () => 'run-metrics' });
        const report = await runner.run({ id: 'task-metrics', issue: 'go' });
        expect(report.metrics?.toolCalls).toEqual(1);
        expect(report.metrics?.toolFailures).toEqual(1);
        expect(report.metrics?.totalTokens).toEqual(180);
        expect(report.metrics?.assistantMessages).toEqual(2);

        const baseline = { ...report.metrics!, durationMs: 100, toolFailures: 0 };
        const current = { ...report.metrics!, durationMs: 500, toolFailures: 1, toolCalls: 10 };
        expect(compareEvalMetrics(baseline, current).ok).toEqual(false);
        expect(compareEvalMetrics(baseline, { ...current, durationMs: 120, toolFailures: 0 }).ok).toEqual(true);
    }

    @Test('supports successful batches and runtime failures')
    async batchesAndFails() {
        const runtime = { runTurn: async (_id: string, issue: string) => { if (issue === 'bad') throw new Error('model failed'); } } as any;
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const runner = new EvalRunner(runtime, ctx.get(EvalReportStore));
        const reports = await runner.runBatch([{ id: 'ok', issue: 'good' }, { id: 'bad', issue: 'bad' }]);
        expect(reports.map(item => item.status)).toEqual(['passed', 'failed']);
        expect(reports[1].message).toEqual('model failed'); expect((await runner.reports.list()).length).toEqual(2);
    }
}
