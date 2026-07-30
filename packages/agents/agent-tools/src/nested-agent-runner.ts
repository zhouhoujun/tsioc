import { randomUUID } from 'crypto';
import { Abstract, Injectable, Optional } from '@tsdi/ioc';
import { SpawnAgentAdapter, SpawnAgentInput, SpawnAgentResult } from '../agent/spawn-agent.tool';
import { LlmTaskAdapter, LlmTaskRequest, LlmTaskResult } from '../llm/llm-task.tool';
import { WeatherAdapter, WeatherForecastResult, WeatherLookup, WeatherResult } from '../utility/weather.tool';

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
        const settled = await Promise.allSettled(requests.map(req => this.run(req)));
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
        @Optional() private runner?: NestedAgentRunner | null
    ) {
        super();
    }

    override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
        const sessionId = `spawn-${randomUUID()}`;
        const result = await this.requireRunner().run({
            prompt: buildSubAgentPrompt(input),
            sessionId,
            toolsets: input.toolsets,
            maxTurns: input.maxTurns,
            parentSessionId: input.sessionId
        });
        return this.toSpawnAgentResult(result, sessionId);
    }

    override async spawnParallel(inputs: SpawnAgentInput[]): Promise<SpawnAgentResult[]> {
        if (inputs.length === 0) {
            return [];
        }
        const requests = inputs.map(input => ({
            prompt: buildSubAgentPrompt(input),
            sessionId: `spawn-${randomUUID()}`,
            toolsets: input.toolsets,
            maxTurns: input.maxTurns,
            parentSessionId: input.sessionId
        }));
        const results = await this.requireRunner().runParallel(requests);
        return results.map((result, index) => this.toSpawnAgentResult(result, requests[index].sessionId));
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
        if (!this.runner) {
            throw new Error('Nested agent runner is not configured for spawn_agent.');
        }
        return this.runner;
    }
}

@Injectable({ provide: LlmTaskAdapter })
export class DelegatingLlmTaskAdapter extends LlmTaskAdapter {
    constructor(
        @Optional() private runner?: NestedAgentRunner | null
    ) {
        super();
    }

    override async execute(request: LlmTaskRequest): Promise<LlmTaskResult> {
        const result = await this.requireRunner().run({
            prompt: request.prompt,
            sessionId: `llm-task-${randomUUID()}`,
            systemPrompt: request.system,
            model: request.model,
            temperature: request.temperature,
            maxTokens: request.maxTokens
        });
        return {
            content: result.content,
            model: result.model,
            usage: result.usage,
            finishReason: result.finishReason
        };
    }

    protected requireRunner(): NestedAgentRunner {
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
