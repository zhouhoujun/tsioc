import { Abstract, INJECTOR, Inject, Injectable, Injector, Optional } from '@tsdi/ioc';
import { UuidGenerator } from '@tsdi/core';
import { SpawnAgentAdapter, SpawnAgentInput, SpawnAgentResult } from '../agent/spawn-agent.tool';
import { LlmTaskAdapter, LlmTaskRequest, LlmTaskResult } from '../llm/llm-task.tool';
import { WeatherAdapter, WeatherForecastResult, WeatherLookup, WeatherResult } from '../utility/weather.tool';
import { BackgroundTaskManager } from './background-task-manager';

export interface NestedAgentRunRequest {
    prompt: string;
    sessionId?: string;
    toolsets?: string[];
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    maxTurns?: number;
    parentSessionId?: string;
    /**
     * Worker class used to resolve the session's model profile through the
     * delegation policy (`AgentToolsOptions.delegation.workerModelProfiles`).
     * Defaults to the adapter-specific class ('spawn_agent' / 'llm_task').
     */
    workerClass?: string;
    /**
     * P42: explicit named model profile for this worker's turn. Takes
     * precedence over the worker-class profile. Unlike session-level profile
     * pinning it needs no cleanup and is safe under concurrent workers.
     */
    profile?: string;
    /** P42: enable model reasoning (extended thinking) for this worker's turn. */
    reasoning?: boolean;
    /** P42: cap concurrent workers within this batch (undefined = unlimited). */
    concurrency?: number;
    /** P42: sensitive values injected into the worker prompt, never persisted. */
    secrets?: Record<string, string>;
}

export interface DelegatedAgentReport {
    summary?: string;
    diff?: string;
    completed?: string[];
    nextSteps?: string[];
    risks?: string[];
    artifacts?: string[];
}

export interface NestedAgentRunResult {
    content: string;
    sessionId?: string;
    turnCount: number;
    toolCalls: number;
    model?: string;
    finishReason?: string;
    usage?: Record<string, any>;
    report?: DelegatedAgentReport;
}

/**
 * Run `fn` over `items` with at most `limit` in-flight promises.
 * `undefined`/non-positive/over-size limits fall back to unbounded
 * Promise.allSettled semantics (previous behavior). Results preserve input
 * order and settlement status, so callers keep their allSettled mapping.
 */
export async function runWithConcurrency<T, R>(
    items: T[],
    limit: number | undefined,
    fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
    if (items.length === 0) {
        return [];
    }
    if (!limit || limit <= 0 || limit >= items.length) {
        return Promise.allSettled(items.map((item, index) => fn(item, index)));
    }
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.floor(limit) }, async () => {
        while (cursor < items.length) {
            const index = cursor++;
            try {
                results[index] = { status: 'fulfilled', value: await fn(items[index], index) };
            } catch (err) {
                results[index] = { status: 'rejected', reason: err };
            }
        }
    }));
    return results;
}

@Abstract()
export abstract class NestedAgentRunner {
    abstract run(request: NestedAgentRunRequest): Promise<NestedAgentRunResult>;

    /**
     * Run multiple sub-agent tasks in parallel.
     * Default implementation uses Promise.all on individual run() calls.
     * Override in concrete runners for more sophisticated parallelism.
     */
    async runParallel(requests: NestedAgentRunRequest[]): Promise<NestedAgentRunResult[]> {
        if (requests.length === 0) {
            return [];
        }
        const settled = await runWithConcurrency(requests, requests[0]?.concurrency, (req, index) => this.run(req));
        return settled.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            const err = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
            return {
                content: `[parallel worker failed] ${err.message}`,
                sessionId: requests[index].sessionId,
                turnCount: 0,
                toolCalls: 0,
                report: {
                    summary: `Task failed: ${err.message}`,
                    risks: ['parallel worker error']
                }
            };
        });
    }
}

function buildSubAgentPrompt(request: SpawnAgentInput): string {
    const parts = [
        'Complete the delegated task independently and return the most useful final result.',
        'Return a compact report using these labels: Summary:, Diff:, Completed:, Next steps:, Risks:, Artifacts:.',
        `Task:\n${request.goal}`
    ];
    if (typeof request.maxTurns === 'number' && request.maxTurns > 0) {
        parts.push(`Turn budget:\nUse at most ${request.maxTurns} turns.`);
    }
    if (request.context?.trim()) {
        parts.push(`Context:\n${request.context.trim()}`);
    }
    return parts.join('\n\n');
}

export function appendSecrets(prompt: string, secrets?: Record<string, string>): string {
    const entries = secrets ? Object.entries(secrets).filter(([, value]) => value != null) : [];
    if (entries.length === 0) {
        return prompt;
    }
    const lines = entries.map(([key, value]) => `${key}: ${value}`);
    return `${prompt}\n\n## Secrets\n${lines.join('\n')}`;
}

export function parseDelegatedAgentReport(content: string): DelegatedAgentReport | undefined {
    const report: DelegatedAgentReport = {};
    const lines = String(content || '').replace(/\r/g, '').split('\n');
    const multiValueLabels = new Set(['Completed', 'Next steps', 'Risks', 'Artifacts']);

    for (const line of lines) {
        const match = /^\s*(Summary|Diff|Completed|Next steps|Risks|Artifacts)\s*:\s*(.*)\s*$/i.exec(line);
        if (!match) {
            continue;
        }
        const label = normalizeLabel(match[1]);
        const value = match[2].trim();
        if (!label || !value) {
            continue;
        }
        if (label === 'summary') {
            report.summary = value;
            continue;
        }
        if (label === 'diff') {
            report.diff = value;
            continue;
        }
        const items = value
            .split(/(?:\s*[,;•]\s*|\s+\d+\.\s+)/)
            .map(item => item.trim())
            .filter(Boolean);
        if (!items.length) {
            continue;
        }
        report[label] = Array.from(new Set([...(report[label] ?? []), ...items]));
        if (!multiValueLabels.has(match[1])) {
            break;
        }
    }

    return report.summary || report.diff || report.completed?.length || report.nextSteps?.length || report.risks?.length || report.artifacts?.length
        ? report
        : undefined;
}

function normalizeLabel(label: string): keyof DelegatedAgentReport | undefined {
    switch (String(label || '').trim().toLowerCase()) {
        case 'summary':
            return 'summary';
        case 'diff':
            return 'diff';
        case 'completed':
            return 'completed';
        case 'next steps':
            return 'nextSteps';
        case 'risks':
            return 'risks';
        case 'artifacts':
            return 'artifacts';
        default:
            return undefined;
    }
}

@Injectable({ provide: SpawnAgentAdapter })
export class DelegatingSpawnAgentAdapter extends SpawnAgentAdapter {
    constructor(
        private uuid: UuidGenerator,
        @Optional() private runner?: NestedAgentRunner | null,
        @Optional() private background?: BackgroundTaskManager | null,
        @Optional() @Inject(INJECTOR) private injector?: Injector | null
    ) {
        super();
    }

    override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
        if (input.background) {
            return this.spawnInBackground(input);
        }
        const sessionId = `spawn-${this.uuid.generate()}`;
        const result = await this.requireRunner().run({
            prompt: buildSubAgentPrompt(input),
            sessionId,
            toolsets: input.toolsets,
            maxTurns: input.maxTurns,
            parentSessionId: input.sessionId,
            workerClass: 'spawn_agent',
            profile: input.profile,
            reasoning: input.reasoning,
            secrets: input.secrets
        });
        return this.toSpawnAgentResult(result, sessionId);
    }

    private spawnInBackground(input: SpawnAgentInput): SpawnAgentResult {
        if (!this.background && this.injector) {
            this.background = this.injector.get(BackgroundTaskManager) ?? null;
        }
        if (!this.background) {
            throw new Error('Background task manager is not configured for spawn_agent background mode.');
        }
        const sessionId = `spawn-${this.uuid.generate()}`;
        const task = this.background.start({
            prompt: buildSubAgentPrompt(input),
            sessionId,
            toolsets: input.toolsets,
            maxTurns: input.maxTurns,
            parentSessionId: input.sessionId,
            workerClass: 'spawn_agent',
            profile: input.profile,
            reasoning: input.reasoning,
            secrets: input.secrets
        }, input.sessionId ?? 'system');
        return {
            output: `Background task '${task.id}' started. Use the task id to poll status or collect results when it completes.`,
            sessionId: task.id,
            taskId: task.id,
            background: true,
            status: task.status,
            summary: task.goal
        };
    }

    override async spawnParallel(inputs: SpawnAgentInput[]): Promise<SpawnAgentResult[]> {
        if (inputs.length === 0) {
            return [];
        }
        const requests: NestedAgentRunRequest[] = inputs.map(input => ({
            prompt: buildSubAgentPrompt(input),
            sessionId: `spawn-${this.uuid.generate()}`,
            toolsets: input.toolsets,
            maxTurns: input.maxTurns,
            parentSessionId: input.sessionId,
            workerClass: 'spawn_agent',
            profile: input.profile,
            reasoning: input.reasoning,
            secrets: input.secrets
        }));
        if (inputs[0]?.concurrency) {
            for (const req of requests) {
                req.concurrency = inputs[0].concurrency;
            }
        }
        const results = await this.requireRunner().runParallel(requests);
        return results.map((result, index) => this.toSpawnAgentResult(result, requests[index].sessionId!));
    }

    protected toSpawnAgentResult(result: NestedAgentRunResult, sessionId: string): SpawnAgentResult {
        const report = result.report ?? parseDelegatedAgentReport(result.content);
        return {
            output: result.content,
            sessionId: result.sessionId ?? sessionId,
            turnCount: result.turnCount,
            toolCalls: result.toolCalls,
            model: result.model,
            finishReason: result.finishReason,
            usage: result.usage,
            summary: report?.summary,
            diff: report?.diff,
            completed: report?.completed,
            nextSteps: report?.nextSteps,
            risks: report?.risks,
            artifacts: report?.artifacts,
            report
        };
    }

    protected requireRunner(): NestedAgentRunner {
        if (!this.runner && this.injector) {
            this.runner = this.injector.get(NestedAgentRunner) ?? null;
        }
        if (!this.runner) {
            throw new Error('Nested agent runner is not configured for spawn_agent.');
        }
        return this.runner;
    }
}

@Injectable({ provide: LlmTaskAdapter })
export class DelegatingLlmTaskAdapter extends LlmTaskAdapter {
    constructor(
        private uuid: UuidGenerator,
        @Optional() private runner?: NestedAgentRunner | null,
        @Optional() @Inject(INJECTOR) private injector?: Injector | null
    ) {
        super();
    }

    override async execute(request: LlmTaskRequest): Promise<LlmTaskResult> {
        const result = await this.requireRunner().run({
            prompt: request.prompt,
            sessionId: `llm-task-${this.uuid.generate()}`,
            systemPrompt: request.system,
            model: request.model,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            workerClass: 'llm_task',
            profile: request.profile,
            reasoning: request.reasoning,
            secrets: request.secrets
        });
        return {
            content: result.content,
            model: result.model,
            usage: result.usage,
            finishReason: result.finishReason
        };
    }

    protected requireRunner(): NestedAgentRunner {
        if (!this.runner && this.injector) {
            this.runner = this.injector.get(NestedAgentRunner) ?? null;
        }
        if (!this.runner) {
            throw new Error('Nested agent runner is not configured for llm_task.');
        }
        return this.runner;
    }
}

@Injectable({ provide: WeatherAdapter })
export class UnavailableWeatherAdapter extends WeatherAdapter {
    override async getCurrentWeather(_location: WeatherLookup, _units?: 'metric' | 'imperial'): Promise<WeatherResult> {
        throw new Error('Weather service adapter is not configured.');
    }

    override async getForecast(_location: WeatherLookup, _days?: number, _units?: 'metric' | 'imperial'): Promise<WeatherForecastResult> {
        throw new Error('Weather service adapter is not configured.');
    }
}
