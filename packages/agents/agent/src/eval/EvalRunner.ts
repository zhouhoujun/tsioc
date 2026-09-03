import { Abstract, Injectable } from '@tsdi/ioc';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { EvalRun, EvalTask, EvalVerification } from './EvalTask';

@Abstract()
export abstract class EvalReportStore {
    abstract save(run: EvalRun): Promise<void>;
    abstract list(): Promise<EvalRun[]>;
    abstract get(id: string): Promise<EvalRun | undefined>;
}
export interface EvalRunnerOptions { verify?: (command: string, task: EvalTask) => Promise<EvalVerification>; now?: () => Date; id?: () => string; }
@Injectable()
export class EvalRunner {
    constructor(private runtime: AgentRuntime, private store: EvalReportStore, private options: EvalRunnerOptions = {}) {}
    async run(task: EvalTask): Promise<EvalRun> {
        const now = this.options.now ?? (() => new Date()); const started = now();
        let status: EvalRun['status'] = 'passed'; let message: string | undefined;
        try { await this.runtime.runTurn(task.sessionId ?? task.id, task.issue, undefined, undefined, task.profile); }
        catch (e) { status = 'failed'; message = e instanceof Error ? e.message : String(e); }
        const verifications: EvalVerification[] = [];
        for (const command of task.verifyCommands ?? []) { const result = this.options.verify ? await this.options.verify(command, task) : { command, ok: true }; verifications.push(result); if (!result.ok) status = 'failed'; }
        const score = status === 'passed' ? 1 : 0;
        const run: EvalRun = { id: (this.options.id ?? (() => `${task.id}-${started.getTime()}`))(), taskId: task.id, status, score, startedAt: started.toISOString(), finishedAt: now().toISOString(), message, verifications };
        await this.store.save(run); return run;
    }
    async runBatch(tasks: EvalTask[]) { return Promise.all(tasks.map(task => this.run(task))); }
    get reports() { return this.store; }
}
