import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { SpawnAgentAdapter, SpawnAgentInput, SpawnAgentResult } from './spawn-agent.tool';

/**
 * Unified budget constraints for orchestration primitives.
 */
export interface OrchestrationBudget {
    /** Maximum number of sub-agents running concurrently. */
    concurrency?: number;
    /** Maximum total token cost across all sub-agents. Undefined = unlimited. */
    maxCost?: number;
    /** Maximum wall-clock time in milliseconds for the entire operation. */
    timeoutMs?: number;
}

/**
 * Per-task input for orchestration primitives.
 */
export interface OrchestrationTaskInput {
    goal: string;
    context?: string;
    toolsets?: string[];
    maxTurns?: number;
    profile?: string;
    reasoning?: boolean;
    secrets?: Record<string, string>;
    /** Optional weight for map_reduce aggregation (default: 1). */
    weight?: number;
    /** Optional confidence score 0-1 for this task's expected output quality. */
    confidence?: number;
}

/**
 * Result from a single sub-agent within an orchestration primitive.
 */
export interface OrchestrationTaskResult {
    goal: string;
    output?: string;
    error?: string;
    sessionId?: string;
    summary?: string;
    turnCount?: number;
    toolCalls?: number;
    model?: string;
    finishReason?: string;
    usage?: Record<string, any>;
    completed?: string[];
    nextSteps?: string[];
    risks?: string[];
    artifacts?: string[];
}

/**
 * Aggregated result entry with provenance metadata.
 */
export interface AggregatedResultEntry {
    source: string;
    output: string;
    confidence: number;
    summary?: string;
    usage?: Record<string, any>;
}

/**
 * Conflict between two or more result entries.
 */
export interface ResultConflict {
    field: string;
    values: Array<{ source: string; value: string }>;
}

/**
 * Unified output shape for all orchestration primitives.
 */
export interface OrchestrationOutput {
    primitive: string;
    taskCount: number;
    succeededCount: number;
    failedCount: number;
    timedOutCount: number;
    cancelledCount: number;
    summary: string;
    results: OrchestrationTaskResult[];
    aggregated?: AggregatedResultEntry[];
    conflicts?: ResultConflict[];
    completed: string[];
    nextSteps: string[];
    risks: string[];
    artifacts: string[];
    failures: Array<{ goal: string; error: string; sessionId?: string }>;
    budget: {
        concurrency?: number;
        maxCost?: number;
        timeoutMs?: number;
        actualCost?: number;
        elapsedMs?: number;
    };
}

// ---------------------------------------------------------------------------
// fan_out
// ---------------------------------------------------------------------------

@Injectable()
export class FanOutTool implements AgentTool {
    name = 'fan_out';
    description = 'Spawn multiple sub-agents in parallel, each with an isolated context and goal. All run concurrently (bounded by concurrency budget) and results are collected. Use for independent parallel work like research, file processing, or exploring multiple approaches.';
    inputSchema = {
        type: 'object',
        properties: {
            tasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        goal: { type: 'string', description: 'The specific task or goal for this sub-agent.' },
                        context: { type: 'string', description: 'Additional context for this sub-agent.' },
                        toolsets: { type: 'array', items: { type: 'string' }, description: 'Restrict to specific tool categories.' },
                        maxTurns: { type: 'number', description: 'Maximum turns (default: 10).' },
                        profile: { type: 'string', description: 'Named model profile.' },
                        reasoning: { type: 'boolean', description: 'Enable extended thinking.' },
                        secrets: { type: 'object', additionalProperties: { type: 'string' }, description: 'Sensitive values, never persisted.' }
                    },
                    required: ['goal']
                },
                description: 'Array of tasks to run in parallel.'
            },
            concurrency: { type: 'number', description: 'Max concurrent sub-agents (default: unlimited).' },
            maxCost: { type: 'number', description: 'Max total token cost across all sub-agents.' },
            timeoutMs: { type: 'number', description: 'Max wall-clock time in ms for the entire fan_out.' }
        },
        required: ['tasks']
    };
    toolset = 'agent';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(private adapter: SpawnAgentAdapter) {}

    async invoke(input: any, context: AgentToolContext): Promise<OrchestrationOutput> {
        const tasks = this.parseTasks(input);
        if (tasks.length === 0) {
            return this.emptyOutput('fan_out', 'tasks array is required and must contain at least one task.');
        }

        const budget: OrchestrationBudget = {
            concurrency: typeof input?.concurrency === 'number' ? input.concurrency : undefined,
            maxCost: typeof input?.maxCost === 'number' ? input.maxCost : undefined,
            timeoutMs: typeof input?.timeoutMs === 'number' ? input.timeoutMs : undefined
        };

        const startMs = Date.now();
        const inputs: SpawnAgentInput[] = tasks.map(t => ({
            goal: t.goal,
            context: t.context,
            toolsets: t.toolsets,
            maxTurns: t.maxTurns,
            sessionId: context?.sessionId,
            profile: t.profile,
            reasoning: t.reasoning,
            secrets: t.secrets,
            concurrency: budget.concurrency
        }));

        let results: SpawnAgentResult[];
        if (budget.timeoutMs && budget.timeoutMs > 0) {
            results = await this.spawnWithTimeout(inputs, budget.timeoutMs);
        } else {
            results = await this.adapter.spawnParallel(inputs);
        }

        const elapsedMs = Date.now() - startMs;
        return this.buildOutput('fan_out', tasks, results, budget, elapsedMs);
    }

    protected async spawnWithTimeout(inputs: SpawnAgentInput[], timeoutMs: number): Promise<SpawnAgentResult[]> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`fan_out timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        try {
            const results = await Promise.race([
                this.adapter.spawnParallel(inputs),
                timeoutPromise
            ]);
            return results;
        } catch (err: any) {
            if (timer) clearTimeout(timer);
            if (String(err?.message || '').includes('timed out')) {
                return inputs.map(() => ({
                    output: '',
                    error: `Timed out after ${timeoutMs}ms`
                }));
            }
            throw err;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    protected parseTasks(input: any): OrchestrationTaskInput[] {
        const raw: any[] = Array.isArray(input?.tasks) ? input.tasks : [];
        return raw.map(t => ({
            goal: this.requireString(t.goal, 'fan_out task goal'),
            context: typeof t.context === 'string' ? t.context : undefined,
            toolsets: Array.isArray(t.toolsets) ? t.toolsets.filter((x: any) => typeof x === 'string') : undefined,
            maxTurns: typeof t.maxTurns === 'number' ? t.maxTurns : undefined,
            profile: typeof t.profile === 'string' && t.profile.trim() ? t.profile.trim() : undefined,
            reasoning: typeof t.reasoning === 'boolean' ? t.reasoning : undefined,
            secrets: this.requireSecrets(t.secrets)
        }));
    }

    protected buildOutput(
        primitive: string,
        tasks: OrchestrationTaskInput[],
        results: SpawnAgentResult[],
        budget: OrchestrationBudget,
        elapsedMs: number
    ): OrchestrationOutput {
        const taskResults: OrchestrationTaskResult[] = results.map((r, i) => ({
            goal: tasks[i]?.goal || `task-${i + 1}`,
            output: r.output,
            error: r.error,
            sessionId: r.sessionId,
            summary: r.summary ?? r.report?.summary,
            turnCount: r.turnCount,
            toolCalls: r.toolCalls,
            model: r.model,
            finishReason: r.finishReason,
            usage: r.usage,
            completed: this.normalizeList(r.completed ?? r.report?.completed),
            nextSteps: this.normalizeList(r.nextSteps ?? r.report?.nextSteps),
            risks: this.normalizeList(r.risks ?? r.report?.risks),
            artifacts: this.normalizeList(r.artifacts ?? r.report?.artifacts)
        }));

        const succeeded = taskResults.filter(r => !r.error);
        const failed = taskResults.filter(r => !!r.error);
        const timedOut = failed.filter(r => /timed out/i.test(r.error || ''));
        const cancelled = failed.filter(r => /cancel/i.test(r.error || ''));

        const allCompleted = this.dedupeList(taskResults.flatMap(r => r.completed ?? []));
        const allNextSteps = this.dedupeList(taskResults.flatMap(r => r.nextSteps ?? []));
        const allRisks = this.dedupeList([
            ...taskResults.flatMap(r => r.risks ?? []),
            ...failed.map(r => r.error || '')
        ]);
        const allArtifacts = this.dedupeList(taskResults.flatMap(r => r.artifacts ?? []));

        const successfulSummaries = succeeded.map(r => r.summary || this.summarizeOutput(r.output)).filter(Boolean);
        const summary = successfulSummaries.length === 1 && failed.length === 0
            ? successfulSummaries[0]
            : [
                `${primitive} ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
                `${succeeded.length} succeeded`,
                failed.length ? `${failed.length} failed` : '',
                timedOut.length ? `${timedOut.length} timed out` : '',
                cancelled.length ? `${cancelled.length} cancelled` : ''
            ].filter(Boolean).join(' · ');

        return {
            primitive,
            taskCount: tasks.length,
            succeededCount: succeeded.length,
            failedCount: failed.length,
            timedOutCount: timedOut.length,
            cancelledCount: cancelled.length,
            summary,
            results: taskResults,
            completed: allCompleted,
            nextSteps: allNextSteps,
            risks: allRisks,
            artifacts: allArtifacts,
            failures: failed.map(r => ({ goal: r.goal, error: r.error || 'task failed', sessionId: r.sessionId })),
            budget: {
                concurrency: budget.concurrency,
                maxCost: budget.maxCost,
                timeoutMs: budget.timeoutMs,
                elapsedMs
            }
        };
    }

    protected summarizeOutput(output: string | undefined): string {
        const text = String(output || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';
        return text.length > 160 ? `${text.slice(0, 160)}...` : text;
    }

    protected normalizeList(values?: string[] | null): string[] {
        return Array.isArray(values) ? values.map(v => String(v || '').trim()).filter(Boolean) : [];
    }

    protected dedupeList(values: string[]): string[] {
        return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
    }

    protected emptyOutput(primitive: string, error: string): OrchestrationOutput {
        return {
            primitive,
            taskCount: 0,
            succeededCount: 0,
            failedCount: 0,
            timedOutCount: 0,
            cancelledCount: 0,
            summary: error,
            results: [],
            completed: [],
            nextSteps: [],
            risks: [error],
            artifacts: [],
            failures: [{ goal: '', error }],
            budget: {}
        };
    }

    protected requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }

    protected requireSecrets(value: unknown): Record<string, string> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
        const secrets: Record<string, string> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            if (typeof entry === 'string') secrets[key] = entry;
        }
        return Object.keys(secrets).length > 0 ? secrets : undefined;
    }
}

// ---------------------------------------------------------------------------
// map_reduce
// ---------------------------------------------------------------------------

@Injectable()
export class MapReduceTool implements AgentTool {
    name = 'map_reduce';
    description = 'Fan out sub-agents in parallel (map phase), then synthesize their results into a single aggregated output (reduce phase). The reduce step receives all successful map results and merges them. Use when you need parallel work followed by a unified synthesis.';
    inputSchema = {
        type: 'object',
        properties: {
            mapGoal: {
                type: 'string',
                description: 'Goal template for each map sub-agent. Use {input} as placeholder for each task input.'
            },
            inputs: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of string inputs to fan out over. Each becomes a map task.'
            },
            reduceGoal: {
                type: 'string',
                description: 'Goal for the reduce sub-agent. It receives all successful map results as context.'
            },
            context: { type: 'string', description: 'Shared context injected into all map tasks and the reduce task.' },
            toolsets: { type: 'array', items: { type: 'string' }, description: 'Restrict sub-agents to specific tool categories.' },
            maxTurns: { type: 'number', description: 'Maximum turns per sub-agent (default: 10).' },
            profile: { type: 'string', description: 'Named model profile.' },
            reasoning: { type: 'boolean', description: 'Enable extended thinking.' },
            concurrency: { type: 'number', description: 'Max concurrent map sub-agents.' },
            maxCost: { type: 'number', description: 'Max total token cost.' },
            timeoutMs: { type: 'number', description: 'Max wall-clock time in ms.' }
        },
        required: ['mapGoal', 'inputs', 'reduceGoal']
    };
    toolset = 'agent';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(private adapter: SpawnAgentAdapter) {}

    async invoke(input: any, context: AgentToolContext): Promise<OrchestrationOutput> {
        const mapGoalTemplate = this.requireString(input?.mapGoal, 'map_reduce mapGoal');
        const rawInputs: any[] = Array.isArray(input?.inputs) ? input.inputs : [];
        const reduceGoal = this.requireString(input?.reduceGoal, 'map_reduce reduceGoal');

        if (rawInputs.length === 0) {
            return this.emptyOutput('map_reduce', 'inputs array is required and must contain at least one item.');
        }

        const mapInputs = rawInputs.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim());
        if (mapInputs.length === 0) {
            return this.emptyOutput('map_reduce', 'inputs array must contain at least one non-empty string.');
        }

        const budget: OrchestrationBudget = {
            concurrency: typeof input?.concurrency === 'number' ? input.concurrency : undefined,
            maxCost: typeof input?.maxCost === 'number' ? input.maxCost : undefined,
            timeoutMs: typeof input?.timeoutMs === 'number' ? input.timeoutMs : undefined
        };

        const startMs = Date.now();
        const sharedContext = typeof input?.context === 'string' ? input.context : '';
        const toolsets = Array.isArray(input?.toolsets) ? input.toolsets.filter((x: any) => typeof x === 'string') : undefined;
        const maxTurns = typeof input?.maxTurns === 'number' ? input.maxTurns : undefined;
        const profile = typeof input?.profile === 'string' && input.profile.trim() ? input.profile.trim() : undefined;
        const reasoning = typeof input?.reasoning === 'boolean' ? input.reasoning : undefined;

        // Map phase
        const mapSpawnInputs: SpawnAgentInput[] = mapInputs.map(inp => ({
            goal: mapGoalTemplate.replace(/\{input\}/g, inp),
            context: sharedContext ? `Input: ${inp}\n\n${sharedContext}` : `Input: ${inp}`,
            toolsets,
            maxTurns,
            sessionId: context?.sessionId,
            profile,
            reasoning,
            concurrency: budget.concurrency
        }));

        let mapResults: SpawnAgentResult[];
        if (budget.timeoutMs && budget.timeoutMs > 0) {
            const halfTimeout = Math.floor(budget.timeoutMs / 2);
            mapResults = await this.spawnWithTimeout(mapSpawnInputs, halfTimeout);
        } else {
            mapResults = await this.adapter.spawnParallel(mapSpawnInputs);
        }

        // Collect successful map results
        const successfulMapResults: OrchestrationTaskResult[] = [];
        const failedMapResults: OrchestrationTaskResult[] = [];
        mapResults.forEach((r, i) => {
            const tr: OrchestrationTaskResult = {
                goal: mapInputs[i],
                output: r.output,
                error: r.error,
                sessionId: r.sessionId,
                summary: r.summary ?? r.report?.summary,
                turnCount: r.turnCount,
                toolCalls: r.toolCalls,
                model: r.model,
                usage: r.usage,
                completed: this.normalizeList(r.completed ?? r.report?.completed),
                nextSteps: this.normalizeList(r.nextSteps ?? r.report?.nextSteps),
                risks: this.normalizeList(r.risks ?? r.report?.risks),
                artifacts: this.normalizeList(r.artifacts ?? r.report?.artifacts)
            };
            if (r.error) {
                failedMapResults.push(tr);
            } else {
                successfulMapResults.push(tr);
            }
        });

        // Reduce phase
        const reduceContext = [
            sharedContext ? `Shared context: ${sharedContext}\n` : '',
            'Map results:',
            ...successfulMapResults.map((r, i) => `[${i + 1}] Source: ${r.goal}\nOutput: ${r.output || r.summary || '(no output)'}\nSummary: ${r.summary || '(none)'}`),
            failedMapResults.length ? `\nFailed map tasks: ${failedMapResults.map(r => `${r.goal} (${r.error})`).join(', ')}` : ''
        ].filter(Boolean).join('\n\n');

        let reduceResult: SpawnAgentResult;
        if (budget.timeoutMs && budget.timeoutMs > 0) {
            const remaining = Math.max(1000, budget.timeoutMs - (Date.now() - startMs));
            const reduceResults = await this.spawnWithTimeout([{
                goal: reduceGoal,
                context: reduceContext,
                toolsets,
                maxTurns,
                sessionId: context?.sessionId,
                profile,
                reasoning
            }], remaining);
            reduceResult = reduceResults[0];
        } else {
            const reduceResults = await this.adapter.spawnParallel([{
                goal: reduceGoal,
                context: reduceContext,
                toolsets,
                maxTurns,
                sessionId: context?.sessionId,
                profile,
                reasoning
            }]);
            reduceResult = reduceResults[0];
        }

        const elapsedMs = Date.now() - startMs;

        // Build aggregated results
        const aggregated: AggregatedResultEntry[] = successfulMapResults.map((r, i) => ({
            source: r.goal,
            output: r.output || '',
            confidence: 1.0,
            summary: r.summary,
            usage: r.usage
        }));

        if (reduceResult && !reduceResult.error) {
            aggregated.push({
                source: 'reduce',
                output: reduceResult.output || '',
                confidence: 1.0,
                summary: reduceResult.summary ?? reduceResult.report?.summary,
                usage: reduceResult.usage
            });
        }

        // Detect conflicts between map results
        const conflicts = this.detectConflicts(successfulMapResults);

        const allResults: OrchestrationTaskResult[] = [
            ...successfulMapResults,
            ...failedMapResults,
            ...(reduceResult ? [{
                goal: 'reduce',
                output: reduceResult.output,
                error: reduceResult.error,
                sessionId: reduceResult.sessionId,
                summary: reduceResult.summary ?? reduceResult.report?.summary,
                turnCount: reduceResult.turnCount,
                toolCalls: reduceResult.toolCalls,
                model: reduceResult.model,
                usage: reduceResult.usage,
                completed: this.normalizeList(reduceResult.completed ?? reduceResult.report?.completed),
                nextSteps: this.normalizeList(reduceResult.nextSteps ?? reduceResult.report?.nextSteps),
                risks: this.normalizeList(reduceResult.risks ?? reduceResult.report?.risks),
                artifacts: this.normalizeList(reduceResult.artifacts ?? reduceResult.report?.artifacts)
            }] : [])
        ];

        const allCompleted = this.dedupeList(allResults.flatMap(r => r.completed ?? []));
        const allNextSteps = this.dedupeList(allResults.flatMap(r => r.nextSteps ?? []));
        const allRisks = this.dedupeList([...allResults.flatMap(r => r.risks ?? []), ...failedMapResults.map(r => r.error || '')]);
        const allArtifacts = this.dedupeList(allResults.flatMap(r => r.artifacts ?? []));

        const reduceOutput = reduceResult && !reduceResult.error ? (reduceResult.summary ?? reduceResult.report?.summary) : undefined;
        const summary = [
            `map_reduce ${mapInputs.length} inputs`,
            `${successfulMapResults.length}/${mapInputs.length} map succeeded`,
            failedMapResults.length ? `${failedMapResults.length} map failed` : '',
            reduceResult?.error ? 'reduce failed' : 'reduce succeeded',
            conflicts.length ? `${conflicts.length} conflicts detected` : ''
        ].filter(Boolean).join(' · ');

        return {
            primitive: 'map_reduce',
            taskCount: allResults.length,
            succeededCount: successfulMapResults.length + (reduceResult && !reduceResult.error ? 1 : 0),
            failedCount: failedMapResults.length + (reduceResult?.error ? 1 : 0),
            timedOutCount: allResults.filter(r => /timed out/i.test(r.error || '')).length,
            cancelledCount: allResults.filter(r => /cancel/i.test(r.error || '')).length,
            summary,
            results: allResults,
            aggregated,
            conflicts,
            completed: allCompleted,
            nextSteps: allNextSteps,
            risks: allRisks,
            artifacts: allArtifacts,
            failures: allResults.filter(r => r.error).map(r => ({ goal: r.goal, error: r.error || 'task failed', sessionId: r.sessionId })),
            budget: {
                concurrency: budget.concurrency,
                maxCost: budget.maxCost,
                timeoutMs: budget.timeoutMs,
                elapsedMs
            }
        };
    }

    protected detectConflicts(results: OrchestrationTaskResult[]): ResultConflict[] {
        const conflicts: ResultConflict[] = [];
        // Simple heuristic: if two results have different summaries, report as potential conflict
        if (results.length >= 2) {
            const summaries = results.filter(r => r.summary).map(r => ({ goal: r.goal, summary: r.summary! }));
            for (let i = 0; i < summaries.length; i++) {
                for (let j = i + 1; j < summaries.length; j++) {
                    if (summaries[i].summary !== summaries[j].summary) {
                        conflicts.push({
                            field: 'summary',
                            values: [
                                { source: summaries[i].goal, value: summaries[i].summary },
                                { source: summaries[j].goal, value: summaries[j].summary }
                            ]
                        });
                    }
                }
            }
        }
        return conflicts;
    }

    protected async spawnWithTimeout(inputs: SpawnAgentInput[], timeoutMs: number): Promise<SpawnAgentResult[]> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`map_reduce timed out after ${timeoutMs}ms`)), timeoutMs);
        });
        try {
            return await Promise.race([this.adapter.spawnParallel(inputs), timeoutPromise]);
        } catch (err: any) {
            if (timer) clearTimeout(timer);
            if (String(err?.message || '').includes('timed out')) {
                return inputs.map(() => ({ output: '', error: `Timed out after ${timeoutMs}ms` }));
            }
            throw err;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    private normalizeList(values?: string[] | null): string[] {
        return Array.isArray(values) ? values.map(v => String(v || '').trim()).filter(Boolean) : [];
    }
    private dedupeList(values: string[]): string[] {
        return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
    }
    private emptyOutput(primitive: string, error: string): OrchestrationOutput {
        return {
            primitive,
            taskCount: 0,
            succeededCount: 0,
            failedCount: 0,
            timedOutCount: 0,
            cancelledCount: 0,
            summary: error,
            results: [],
            completed: [],
            nextSteps: [],
            risks: [error],
            artifacts: [],
            failures: [{ goal: '', error }],
            budget: {}
        };
    }
    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${field}: must be a non-empty string.`);
        return value.trim();
    }
}

// ---------------------------------------------------------------------------
// race
// ---------------------------------------------------------------------------

@Injectable()
export class RaceTool implements AgentTool {
    name = 'race';
    description = 'Spawn multiple sub-agents and return the first successful result. Failed sub-agents are ignored. Use when multiple approaches might work and you want the fastest successful one.';
    inputSchema = {
        type: 'object',
        properties: {
            tasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        goal: { type: 'string', description: 'The specific task or goal.' },
                        context: { type: 'string', description: 'Additional context.' },
                        toolsets: { type: 'array', items: { type: 'string' } },
                        maxTurns: { type: 'number' },
                        profile: { type: 'string' },
                        reasoning: { type: 'boolean' },
                        secrets: { type: 'object', additionalProperties: { type: 'string' } }
                    },
                    required: ['goal']
                },
                description: 'Tasks to race. First to succeed wins.'
            },
            concurrency: { type: 'number', description: 'Max concurrent sub-agents.' },
            timeoutMs: { type: 'number', description: 'Max wall-clock time in ms.' }
        },
        required: ['tasks']
    };
    toolset = 'agent';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(private adapter: SpawnAgentAdapter) {}

    async invoke(input: any, context: AgentToolContext): Promise<OrchestrationOutput> {
        const tasks = this.parseTasks(input);
        if (tasks.length === 0) {
            return this.emptyOutput('race', 'tasks array is required and must contain at least one task.');
        }

        const budget: OrchestrationBudget = {
            concurrency: typeof input?.concurrency === 'number' ? input.concurrency : undefined,
            timeoutMs: typeof input?.timeoutMs === 'number' ? input.timeoutMs : undefined
        };

        const startMs = Date.now();
        const inputs: SpawnAgentInput[] = tasks.map(t => ({
            goal: t.goal,
            context: t.context,
            toolsets: t.toolsets,
            maxTurns: t.maxTurns,
            sessionId: context?.sessionId,
            profile: t.profile,
            reasoning: t.reasoning,
            secrets: t.secrets,
            concurrency: budget.concurrency
        }));

        let winner: SpawnAgentResult | undefined;
        let allResults: SpawnAgentResult[];

        if (budget.timeoutMs && budget.timeoutMs > 0) {
            const results = await this.raceWithTimeout(inputs, budget.timeoutMs);
            allResults = results.all;
            winner = results.winner;
        } else {
            // Race all tasks, first success wins
            allResults = await this.adapter.spawnParallel(inputs);
            winner = allResults.find(r => !r.error);
        }

        const elapsedMs = Date.now() - startMs;

        if (winner) {
            const winnerIndex = allResults.indexOf(winner);
            const taskResults: OrchestrationTaskResult[] = allResults.map((r, i) => ({
                goal: tasks[i]?.goal || `task-${i + 1}`,
                output: r.output,
                error: i === winnerIndex ? undefined : (r === winner ? undefined : 'Lost race'),
                sessionId: r.sessionId,
                summary: r.summary ?? r.report?.summary,
                turnCount: r.turnCount,
                toolCalls: r.toolCalls,
                model: r.model,
                finishReason: r.finishReason,
                usage: r.usage,
                completed: this.normalizeList(r.completed ?? r.report?.completed),
                nextSteps: this.normalizeList(r.nextSteps ?? r.report?.nextSteps),
                risks: this.normalizeList(r.risks ?? r.report?.risks),
                artifacts: this.normalizeList(r.artifacts ?? r.report?.artifacts)
            }));

            return {
                primitive: 'race',
                taskCount: tasks.length,
                succeededCount: 1,
                failedCount: allResults.length - 1,
                timedOutCount: 0,
                cancelledCount: 0,
                summary: `race winner: ${winner.summary || this.summarizeOutput(winner.output) || tasks[winnerIndex]?.goal || 'unknown'} (${allResults.length} contestants, ${elapsedMs}ms)`,
                results: taskResults,
                aggregated: [{
                    source: tasks[winnerIndex]?.goal || `task-${winnerIndex + 1}`,
                    output: winner.output || '',
                    confidence: 1.0,
                    summary: winner.summary ?? winner.report?.summary,
                    usage: winner.usage
                }],
                completed: this.dedupeList(taskResults.flatMap(r => r.completed ?? [])),
                nextSteps: this.dedupeList(taskResults.flatMap(r => r.nextSteps ?? [])),
                risks: this.dedupeList(taskResults.flatMap(r => r.risks ?? [])),
                artifacts: this.dedupeList(taskResults.flatMap(r => r.artifacts ?? [])),
                failures: [],
                budget: {
                    concurrency: budget.concurrency,
                    timeoutMs: budget.timeoutMs,
                    elapsedMs
                }
            };
        }

        // No winner — all failed
        const taskResults: OrchestrationTaskResult[] = allResults.map((r, i) => ({
            goal: tasks[i]?.goal || `task-${i + 1}`,
            output: r.output,
            error: r.error || 'race failed',
            sessionId: r.sessionId,
            summary: r.summary ?? r.report?.summary,
            turnCount: r.turnCount,
            toolCalls: r.toolCalls,
            model: r.model,
            usage: r.usage
        }));

        return {
            primitive: 'race',
            taskCount: tasks.length,
            succeededCount: 0,
            failedCount: allResults.length,
            timedOutCount: allResults.filter(r => /timed out/i.test(r.error || '')).length,
            cancelledCount: 0,
            summary: `race: no winner (${allResults.length} contestants, all failed, ${elapsedMs}ms)`,
            results: taskResults,
            completed: [],
            nextSteps: [],
            risks: allResults.map(r => r.error || 'race failed'),
            artifacts: [],
            failures: taskResults.map(r => ({ goal: r.goal, error: r.error || 'race failed', sessionId: r.sessionId })),
            budget: {
                concurrency: budget.concurrency,
                timeoutMs: budget.timeoutMs,
                elapsedMs
            }
        };
    }

    private async raceWithTimeout(inputs: SpawnAgentInput[], timeoutMs: number): Promise<{ all: SpawnAgentResult[]; winner?: SpawnAgentResult }> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`race timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        try {
            // Use individual spawns so we can detect first success
            const all: SpawnAgentResult[] = new Array(inputs.length);
            let winner: SpawnAgentResult | undefined;
            let nextIndex = 0;
            const active: Promise<void>[] = [];

            const runOne = async (index: number) => {
                try {
                    all[index] = await this.adapter.spawn(inputs[index]);
                    if (!all[index].error && !winner) {
                        winner = all[index];
                    }
                } catch {
                    all[index] = { output: '', error: 'spawn failed' };
                }
            };

            // Fire all in parallel
            for (let i = 0; i < inputs.length; i++) {
                active.push(runOne(i));
            }

            // Wait for first success or all to finish
            await Promise.race([
                Promise.all(active).then(() => {}),
                timeoutPromise
            ]);

            if (timer) clearTimeout(timer);
            return { all, winner };
        } catch (err: any) {
            if (timer) clearTimeout(timer);
            if (String(err?.message || '').includes('timed out')) {
                // Partial results
                return {
                    all: inputs.map((_, i) => ({ output: '', error: `Timed out after ${timeoutMs}ms` })),
                    winner: undefined
                };
            }
            throw err;
        }
    }

    private parseTasks(input: any): OrchestrationTaskInput[] {
        const raw: any[] = Array.isArray(input?.tasks) ? input.tasks : [];
        return raw.map(t => ({
            goal: this.requireString(t.goal, 'race task goal'),
            context: typeof t.context === 'string' ? t.context : undefined,
            toolsets: Array.isArray(t.toolsets) ? t.toolsets.filter((x: any) => typeof x === 'string') : undefined,
            maxTurns: typeof t.maxTurns === 'number' ? t.maxTurns : undefined,
            profile: typeof t.profile === 'string' && t.profile.trim() ? t.profile.trim() : undefined,
            reasoning: typeof t.reasoning === 'boolean' ? t.reasoning : undefined,
            secrets: this.requireSecrets(t.secrets)
        }));
    }

    private summarizeOutput(output: string | undefined): string {
        const text = String(output || '').replace(/\s+/g, ' ').trim();
        return text.length > 160 ? `${text.slice(0, 160)}...` : text;
    }
    private normalizeList(values?: string[] | null): string[] {
        return Array.isArray(values) ? values.map(v => String(v || '').trim()).filter(Boolean) : [];
    }
    private dedupeList(values: string[]): string[] {
        return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
    }
    private emptyOutput(primitive: string, error: string): OrchestrationOutput {
        return { primitive, taskCount: 0, succeededCount: 0, failedCount: 0, timedOutCount: 0, cancelledCount: 0, summary: error, results: [], completed: [], nextSteps: [], risks: [error], artifacts: [], failures: [{ goal: '', error }], budget: {} };
    }
    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${field}: must be a non-empty string.`);
        return value.trim();
    }
    private requireSecrets(value: unknown): Record<string, string> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
        const secrets: Record<string, string> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            if (typeof entry === 'string') secrets[key] = entry;
        }
        return Object.keys(secrets).length > 0 ? secrets : undefined;
    }
}

// ---------------------------------------------------------------------------
// wait_all
// ---------------------------------------------------------------------------

@Injectable()
export class WaitAllTool implements AgentTool {
    name = 'wait_all';
    description = 'Spawn sub-agents and wait for all to complete. Returns results only after every sub-agent has finished (or timed out). Use when you need all results before proceeding.';
    inputSchema = {
        type: 'object',
        properties: {
            tasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        goal: { type: 'string', description: 'The specific task or goal.' },
                        context: { type: 'string', description: 'Additional context.' },
                        toolsets: { type: 'array', items: { type: 'string' } },
                        maxTurns: { type: 'number' },
                        profile: { type: 'string' },
                        reasoning: { type: 'boolean' },
                        secrets: { type: 'object', additionalProperties: { type: 'string' } }
                    },
                    required: ['goal']
                },
                description: 'Tasks to run. All will be waited on.'
            },
            concurrency: { type: 'number', description: 'Max concurrent sub-agents.' },
            timeoutMs: { type: 'number', description: 'Max wall-clock time in ms.' }
        },
        required: ['tasks']
    };
    toolset = 'agent';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(private adapter: SpawnAgentAdapter) {}

    async invoke(input: any, context: AgentToolContext): Promise<OrchestrationOutput> {
        const tasks = this.parseTasks(input);
        if (tasks.length === 0) {
            return this.emptyOutput('wait_all', 'tasks array is required and must contain at least one task.');
        }

        const budget: OrchestrationBudget = {
            concurrency: typeof input?.concurrency === 'number' ? input.concurrency : undefined,
            timeoutMs: typeof input?.timeoutMs === 'number' ? input.timeoutMs : undefined
        };

        const startMs = Date.now();
        const inputs: SpawnAgentInput[] = tasks.map(t => ({
            goal: t.goal,
            context: t.context,
            toolsets: t.toolsets,
            maxTurns: t.maxTurns,
            sessionId: context?.sessionId,
            profile: t.profile,
            reasoning: t.reasoning,
            secrets: t.secrets,
            concurrency: budget.concurrency
        }));

        let results: SpawnAgentResult[];
        if (budget.timeoutMs && budget.timeoutMs > 0) {
            results = await this.spawnWithTimeout(inputs, budget.timeoutMs);
        } else {
            results = await this.adapter.spawnParallel(inputs);
        }

        const elapsedMs = Date.now() - startMs;
        return this.buildOutput('wait_all', tasks, results, budget, elapsedMs);
    }

    private async spawnWithTimeout(inputs: SpawnAgentInput[], timeoutMs: number): Promise<SpawnAgentResult[]> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`wait_all timed out after ${timeoutMs}ms`)), timeoutMs);
        });
        try {
            return await Promise.race([this.adapter.spawnParallel(inputs), timeoutPromise]);
        } catch (err: any) {
            if (timer) clearTimeout(timer);
            if (String(err?.message || '').includes('timed out')) {
                return inputs.map(() => ({ output: '', error: `Timed out after ${timeoutMs}ms` }));
            }
            throw err;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    private buildOutput(
        primitive: string,
        tasks: OrchestrationTaskInput[],
        results: SpawnAgentResult[],
        budget: OrchestrationBudget,
        elapsedMs: number
    ): OrchestrationOutput {
        const taskResults: OrchestrationTaskResult[] = results.map((r, i) => ({
            goal: tasks[i]?.goal || `task-${i + 1}`,
            output: r.output,
            error: r.error,
            sessionId: r.sessionId,
            summary: r.summary ?? r.report?.summary,
            turnCount: r.turnCount,
            toolCalls: r.toolCalls,
            model: r.model,
            finishReason: r.finishReason,
            usage: r.usage,
            completed: this.normalizeList(r.completed ?? r.report?.completed),
            nextSteps: this.normalizeList(r.nextSteps ?? r.report?.nextSteps),
            risks: this.normalizeList(r.risks ?? r.report?.risks),
            artifacts: this.normalizeList(r.artifacts ?? r.report?.artifacts)
        }));

        const succeeded = taskResults.filter(r => !r.error);
        const failed = taskResults.filter(r => !!r.error);
        const timedOut = failed.filter(r => /timed out/i.test(r.error || ''));

        return {
            primitive,
            taskCount: tasks.length,
            succeededCount: succeeded.length,
            failedCount: failed.length,
            timedOutCount: timedOut.length,
            cancelledCount: 0,
            summary: [
                `wait_all ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
                `${succeeded.length} succeeded`,
                failed.length ? `${failed.length} failed` : '',
                timedOut.length ? `${timedOut.length} timed out` : ''
            ].filter(Boolean).join(' · '),
            results: taskResults,
            completed: this.dedupeList(taskResults.flatMap(r => r.completed ?? [])),
            nextSteps: this.dedupeList(taskResults.flatMap(r => r.nextSteps ?? [])),
            risks: this.dedupeList([...taskResults.flatMap(r => r.risks ?? []), ...failed.map(r => r.error || '')]),
            artifacts: this.dedupeList(taskResults.flatMap(r => r.artifacts ?? [])),
            failures: failed.map(r => ({ goal: r.goal, error: r.error || 'task failed', sessionId: r.sessionId })),
            budget: { concurrency: budget.concurrency, timeoutMs: budget.timeoutMs, elapsedMs }
        };
    }

    private parseTasks(input: any): OrchestrationTaskInput[] {
        const raw: any[] = Array.isArray(input?.tasks) ? input.tasks : [];
        return raw.map(t => ({
            goal: this.requireString(t.goal, 'wait_all task goal'),
            context: typeof t.context === 'string' ? t.context : undefined,
            toolsets: Array.isArray(t.toolsets) ? t.toolsets.filter((x: any) => typeof x === 'string') : undefined,
            maxTurns: typeof t.maxTurns === 'number' ? t.maxTurns : undefined,
            profile: typeof t.profile === 'string' && t.profile.trim() ? t.profile.trim() : undefined,
            reasoning: typeof t.reasoning === 'boolean' ? t.reasoning : undefined,
            secrets: this.requireSecrets(t.secrets)
        }));
    }

    private normalizeList(values?: string[] | null): string[] {
        return Array.isArray(values) ? values.map(v => String(v || '').trim()).filter(Boolean) : [];
    }
    private dedupeList(values: string[]): string[] {
        return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
    }
    private emptyOutput(primitive: string, error: string): OrchestrationOutput {
        return { primitive, taskCount: 0, succeededCount: 0, failedCount: 0, timedOutCount: 0, cancelledCount: 0, summary: error, results: [], completed: [], nextSteps: [], risks: [error], artifacts: [], failures: [{ goal: '', error }], budget: {} };
    }
    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${field}: must be a non-empty string.`);
        return value.trim();
    }
    private requireSecrets(value: unknown): Record<string, string> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
        const secrets: Record<string, string> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            if (typeof entry === 'string') secrets[key] = entry;
        }
        return Object.keys(secrets).length > 0 ? secrets : undefined;
    }
}

// ---------------------------------------------------------------------------
// wait_any
// ---------------------------------------------------------------------------

@Injectable()
export class WaitAnyTool implements AgentTool {
    name = 'wait_any';
    description = 'Spawn sub-agents and return as soon as any one completes successfully. Use when you need a quick result and any approach is acceptable.';
    inputSchema = {
        type: 'object',
        properties: {
            tasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        goal: { type: 'string', description: 'The specific task or goal.' },
                        context: { type: 'string', description: 'Additional context.' },
                        toolsets: { type: 'array', items: { type: 'string' } },
                        maxTurns: { type: 'number' },
                        profile: { type: 'string' },
                        reasoning: { type: 'boolean' },
                        secrets: { type: 'object', additionalProperties: { type: 'string' } }
                    },
                    required: ['goal']
                },
                description: 'Tasks to race. First to complete wins.'
            },
            concurrency: { type: 'number', description: 'Max concurrent sub-agents.' },
            timeoutMs: { type: 'number', description: 'Max wall-clock time in ms.' }
        },
        required: ['tasks']
    };
    toolset = 'agent';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(private adapter: SpawnAgentAdapter) {}

    async invoke(input: any, context: AgentToolContext): Promise<OrchestrationOutput> {
        const tasks = this.parseTasks(input);
        if (tasks.length === 0) {
            return this.emptyOutput('wait_any', 'tasks array is required and must contain at least one task.');
        }

        const budget: OrchestrationBudget = {
            concurrency: typeof input?.concurrency === 'number' ? input.concurrency : undefined,
            timeoutMs: typeof input?.timeoutMs === 'number' ? input.timeoutMs : undefined
        };

        const startMs = Date.now();
        const inputs: SpawnAgentInput[] = tasks.map(t => ({
            goal: t.goal,
            context: t.context,
            toolsets: t.toolsets,
            maxTurns: t.maxTurns,
            sessionId: context?.sessionId,
            profile: t.profile,
            reasoning: t.reasoning,
            secrets: t.secrets,
            concurrency: budget.concurrency
        }));

        let winner: SpawnAgentResult | undefined;
        let allResults: SpawnAgentResult[];

        if (budget.timeoutMs && budget.timeoutMs > 0) {
            const result = await this.raceWithTimeout(inputs, budget.timeoutMs);
            allResults = result.all;
            winner = result.winner;
        } else {
            allResults = await this.adapter.spawnParallel(inputs);
            winner = allResults.find(r => !r.error);
        }

        const elapsedMs = Date.now() - startMs;
        const winnerIndex = winner ? allResults.indexOf(winner) : -1;

        const taskResults: OrchestrationTaskResult[] = allResults.map((r, i) => ({
            goal: tasks[i]?.goal || `task-${i + 1}`,
            output: r.output,
            error: i === winnerIndex ? undefined : (r === winner ? undefined : 'Not the first to complete'),
            sessionId: r.sessionId,
            summary: r.summary ?? r.report?.summary,
            turnCount: r.turnCount,
            toolCalls: r.toolCalls,
            model: r.model,
            finishReason: r.finishReason,
            usage: r.usage,
            completed: this.normalizeList(r.completed ?? r.report?.completed),
            nextSteps: this.normalizeList(r.nextSteps ?? r.report?.nextSteps),
            risks: this.normalizeList(r.risks ?? r.report?.risks),
            artifacts: this.normalizeList(r.artifacts ?? r.report?.artifacts)
        }));

        if (winner) {
            return {
                primitive: 'wait_any',
                taskCount: tasks.length,
                succeededCount: 1,
                failedCount: allResults.length - 1,
                timedOutCount: 0,
                cancelledCount: 0,
                summary: `wait_any winner: ${winner.summary || this.summarizeOutput(winner.output) || tasks[winnerIndex]?.goal || 'unknown'} (${allResults.length} contestants, ${elapsedMs}ms)`,
                results: taskResults,
                aggregated: [{
                    source: tasks[winnerIndex]?.goal || `task-${winnerIndex + 1}`,
                    output: winner.output || '',
                    confidence: 1.0,
                    summary: winner.summary ?? winner.report?.summary,
                    usage: winner.usage
                }],
                completed: this.dedupeList(taskResults.flatMap(r => r.completed ?? [])),
                nextSteps: this.dedupeList(taskResults.flatMap(r => r.nextSteps ?? [])),
                risks: this.dedupeList(taskResults.flatMap(r => r.risks ?? [])),
                artifacts: this.dedupeList(taskResults.flatMap(r => r.artifacts ?? [])),
                failures: [],
                budget: { concurrency: budget.concurrency, timeoutMs: budget.timeoutMs, elapsedMs }
            };
        }

        return {
            primitive: 'wait_any',
            taskCount: tasks.length,
            succeededCount: 0,
            failedCount: allResults.length,
            timedOutCount: allResults.filter(r => /timed out/i.test(r.error || '')).length,
            cancelledCount: 0,
            summary: `wait_any: no winner (${allResults.length} contestants, all failed, ${elapsedMs}ms)`,
            results: taskResults,
            completed: [],
            nextSteps: [],
            risks: allResults.map(r => r.error || 'failed'),
            artifacts: [],
            failures: taskResults.map(r => ({ goal: r.goal, error: r.error || 'failed', sessionId: r.sessionId })),
            budget: { concurrency: budget.concurrency, timeoutMs: budget.timeoutMs, elapsedMs }
        };
    }

    private async raceWithTimeout(inputs: SpawnAgentInput[], timeoutMs: number): Promise<{ all: SpawnAgentResult[]; winner?: SpawnAgentResult }> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`wait_any timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        try {
            const all: SpawnAgentResult[] = new Array(inputs.length);
            let winner: SpawnAgentResult | undefined;
            const active: Promise<void>[] = [];

            const runOne = async (index: number) => {
                try {
                    all[index] = await this.adapter.spawn(inputs[index]);
                    if (!all[index].error && !winner) {
                        winner = all[index];
                    }
                } catch {
                    all[index] = { output: '', error: 'spawn failed' };
                }
            };

            for (let i = 0; i < inputs.length; i++) {
                active.push(runOne(i));
            }

            await Promise.race([
                Promise.all(active).then(() => {}),
                timeoutPromise
            ]);

            if (timer) clearTimeout(timer);
            return { all, winner };
        } catch (err: any) {
            if (timer) clearTimeout(timer);
            if (String(err?.message || '').includes('timed out')) {
                return {
                    all: inputs.map(() => ({ output: '', error: `Timed out after ${timeoutMs}ms` })),
                    winner: undefined
                };
            }
            throw err;
        }
    }

    private summarizeOutput(output: string | undefined): string {
        const text = String(output || '').replace(/\s+/g, ' ').trim();
        return text.length > 160 ? `${text.slice(0, 160)}...` : text;
    }
    private parseTasks(input: any): OrchestrationTaskInput[] {
        const raw: any[] = Array.isArray(input?.tasks) ? input.tasks : [];
        return raw.map(t => ({
            goal: this.requireString(t.goal, 'wait_any task goal'),
            context: typeof t.context === 'string' ? t.context : undefined,
            toolsets: Array.isArray(t.toolsets) ? t.toolsets.filter((x: any) => typeof x === 'string') : undefined,
            maxTurns: typeof t.maxTurns === 'number' ? t.maxTurns : undefined,
            profile: typeof t.profile === 'string' && t.profile.trim() ? t.profile.trim() : undefined,
            reasoning: typeof t.reasoning === 'boolean' ? t.reasoning : undefined,
            secrets: this.requireSecrets(t.secrets)
        }));
    }
    private normalizeList(values?: string[] | null): string[] {
        return Array.isArray(values) ? values.map(v => String(v || '').trim()).filter(Boolean) : [];
    }
    private dedupeList(values: string[]): string[] {
        return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
    }
    private emptyOutput(primitive: string, error: string): OrchestrationOutput {
        return { primitive, taskCount: 0, succeededCount: 0, failedCount: 0, timedOutCount: 0, cancelledCount: 0, summary: error, results: [], completed: [], nextSteps: [], risks: [error], artifacts: [], failures: [{ goal: '', error }], budget: {} };
    }
    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${field}: must be a non-empty string.`);
        return value.trim();
    }
    private requireSecrets(value: unknown): Record<string, string> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
        const secrets: Record<string, string> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            if (typeof entry === 'string') secrets[key] = entry;
        }
        return Object.keys(secrets).length > 0 ? secrets : undefined;
    }
}
