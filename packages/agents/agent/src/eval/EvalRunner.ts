import { Abstract, Injectable, Optional } from '@tsdi/ioc';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { EvalMetrics, EvalRun, EvalTask, EvalVerification } from './EvalTask';

@Abstract()
export abstract class EvalReportStore {
    abstract save(run: EvalRun): Promise<void>;
    abstract list(): Promise<EvalRun[]>;
    abstract get(id: string): Promise<EvalRun | undefined>;
}
export interface EvalRunnerOptions { verify?: (command: string, task: EvalTask) => Promise<EvalVerification>; now?: () => Date; id?: () => string; }
@Injectable()
export class EvalRunner {
    constructor(private runtime: AgentRuntime, private store: EvalReportStore, @Optional() private options: EvalRunnerOptions = {}) {}
    async run(task: EvalTask): Promise<EvalRun> {
        const now = this.options.now ?? (() => new Date()); const started = now();
        let status: EvalRun['status'] = 'passed'; let message: string | undefined;
        try { await this.runtime.runTurn(task.sessionId ?? task.id, task.issue, undefined, undefined, task.profile); }
        catch (e) { status = 'failed'; message = e instanceof Error ? e.message : String(e); }
        const verifications: EvalVerification[] = [];
        for (const command of task.verifyCommands ?? []) { const result = this.options.verify ? await this.options.verify(command, task) : { command, ok: true }; verifications.push(result); if (!result.ok) status = 'failed'; }
        const score = status === 'passed' ? 1 : 0;
        const metrics = await this.collectMetrics(task.sessionId ?? task.id, now().getTime() - started.getTime());
        const run: EvalRun = { id: (this.options.id ?? (() => `${task.id}-${started.getTime()}`))(), taskId: task.id, status, score, startedAt: started.toISOString(), finishedAt: now().toISOString(), message, verifications, metrics };
        await this.store.save(run); return run;
    }
    /** Read the persisted transcript to capture tool/token/duration metrics. */
    protected async collectMetrics(sessionId: string, durationMs: number): Promise<EvalMetrics> {
        const metrics: EvalMetrics = { userMessages: 0, assistantMessages: 0, toolCalls: 0, toolFailures: 0, turns: 0, durationMs };
        const getMessages = (this.runtime as any).getMessages;
        if (typeof getMessages !== 'function') {
            return metrics;
        }
        try {
            const messages = await getMessages.call(this.runtime, sessionId);
            for (const message of messages || []) {
                if (message.role === 'user') metrics.userMessages++;
                if (message.role === 'assistant') {
                    metrics.assistantMessages++;
                    const calls = message.metadata?.toolCalls;
                    metrics.toolCalls += Array.isArray(calls) ? calls.length : 0;
                    const usage = message.metadata?.usage;
                    if (usage && typeof usage === 'object') {
                        metrics.promptTokens = (metrics.promptTokens ?? 0) + Number(usage.promptTokens ?? usage.inputTokens ?? 0);
                        metrics.completionTokens = (metrics.completionTokens ?? 0) + Number(usage.completionTokens ?? usage.outputTokens ?? 0);
                        metrics.totalTokens = (metrics.totalTokens ?? 0) + Number(usage.totalTokens ?? 0);
                    }
                }
                if (message.role === 'tool') {
                    const failed = !!message.metadata?.error
                        || message.metadata?.receipt?.status === 'error'
                        || (typeof message.content === 'string' && message.content.trim().startsWith('{"error"'));
                    if (failed) metrics.toolFailures++;
                }
            }
            metrics.turns = metrics.userMessages;
        } catch {
            // Metrics must never turn a task into a failure.
        }
        return metrics;
    }

    async runBatch(tasks: EvalTask[]) { return Promise.all(tasks.map(task => this.run(task))); }
    get reports() { return this.store; }
}
