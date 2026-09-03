import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { EvalReportStore, EvalRunner } from '../src/eval/EvalRunner';
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
