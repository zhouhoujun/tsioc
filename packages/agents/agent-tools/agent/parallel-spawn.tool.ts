import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { SpawnAgentAdapter, SpawnAgentInput, SpawnAgentResult } from './spawn-agent.tool';

export interface ParallelSpawnResultItem {
    goal: string;
    sessionId?: string;
    output?: string;
    error?: string;
    summary?: string;
    completed?: string[];
    nextSteps?: string[];
    risks?: string[];
    artifacts?: string[];
    turnCount?: number;
    toolCalls?: number;
    model?: string;
    finishReason?: string;
    usage?: Record<string, any>;
}

export interface ParallelSpawnAggregateReport {
    summary: string;
    completed: string[];
    nextSteps: string[];
    risks: string[];
    artifacts: string[];
    failures: Array<{ goal: string; error: string; sessionId?: string }>;
}

@Injectable()
export class ParallelSpawnTool implements AgentTool {
    name = 'parallel_spawn';
    description = 'Spawn multiple sub-agents in parallel, each with an isolated context and goal. All sub-agents run concurrently and results are collected together. Useful for independent research, parallel file processing, or exploring multiple approaches simultaneously.';
    inputSchema = {
        type: 'object',
        properties: {
            tasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        goal: {
                            type: 'string',
                            description: 'The specific task or goal for this sub-agent to accomplish.'
                        },
                        context: {
                            type: 'string',
                            description: 'Additional context or background information for this sub-agent.'
                        },
                        toolsets: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Restrict this sub-agent to specific tool categories (e.g., filesystem, web).'
                        },
                        maxTurns: {
                            type: 'number',
                            description: 'Maximum number of turns this sub-agent may execute (default: 10).'
                        }
                    },
                    required: ['goal']
                },
                description: 'Array of task specifications to run in parallel. Each task gets its own isolated sub-agent.'
            }
        },
        required: ['tasks']
    };
    toolset = 'agent';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(
        private adapter: SpawnAgentAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const tasks: Array<{ goal: string; context?: string; toolsets?: string[]; maxTurns?: number }> = Array.isArray(input?.tasks) ? input.tasks : [];
        if (tasks.length === 0) {
            return { results: [], error: 'tasks array is required and must contain at least one task.' };
        }
        const inputs: SpawnAgentInput[] = tasks.map(task => ({
            goal: this.requireString(task.goal, 'parallel_spawn task goal'),
            context: typeof task.context === 'string' ? task.context : undefined,
            toolsets: Array.isArray(task.toolsets) ? task.toolsets.filter((t: any) => typeof t === 'string') : undefined,
            maxTurns: typeof task.maxTurns === 'number' ? task.maxTurns : undefined,
            sessionId: _context?.sessionId
        }));
        const results = await this.adapter.spawnParallel(inputs);
        const aggregate = this.aggregateResults(tasks, results);
        return {
            taskCount: tasks.length,
            succeededCount: results.filter(r => !r.error).length,
            failedCount: results.filter(r => r.error).length,
            summary: aggregate.summary,
            completed: aggregate.completed,
            nextSteps: aggregate.nextSteps,
            risks: aggregate.risks,
            artifacts: aggregate.artifacts,
            failures: aggregate.failures,
            results: results.map((r, i) => ({
                goal: tasks[i].goal,
                output: r.output,
                error: r.error,
                sessionId: r.sessionId,
                turnCount: r.turnCount,
                toolCalls: r.toolCalls,
                model: r.model,
                finishReason: r.finishReason,
                usage: r.usage,
                summary: r.summary ?? r.report?.summary,
                completed: r.completed ?? r.report?.completed,
                nextSteps: r.nextSteps ?? r.report?.nextSteps,
                risks: r.risks ?? r.report?.risks,
                artifacts: r.artifacts ?? r.report?.artifacts
            }))
        };
    }

    protected aggregateResults(tasks: Array<{ goal: string }>, results: SpawnAgentResult[]): ParallelSpawnAggregateReport {
        const items: ParallelSpawnResultItem[] = results.map((result, index) => ({
            goal: tasks[index]?.goal || `task-${index + 1}`,
            sessionId: result.sessionId,
            output: result.output,
            error: result.error,
            summary: result.summary ?? result.report?.summary,
            completed: this.normalizeList(result.completed ?? result.report?.completed),
            nextSteps: this.normalizeList(result.nextSteps ?? result.report?.nextSteps),
            risks: this.normalizeList(result.risks ?? result.report?.risks),
            artifacts: this.normalizeList(result.artifacts ?? result.report?.artifacts),
            turnCount: result.turnCount,
            toolCalls: result.toolCalls,
            model: result.model,
            finishReason: result.finishReason,
            usage: result.usage
        }));

        const successful = items.filter(item => !item.error);
        const failed = items.filter(item => !!item.error);
        const completed = this.dedupeLists(items.flatMap(item => item.completed ?? []));
        const nextSteps = this.dedupeLists(items.flatMap(item => item.nextSteps ?? []));
        const risks = this.dedupeLists([
            ...items.flatMap(item => item.risks ?? []),
            ...failed.map(item => item.error || '')
        ]);
        const artifacts = this.dedupeLists(items.flatMap(item => item.artifacts ?? []));
        const successfulSummaries = successful
            .map(item => item.summary || this.summarizeOutput(item.output))
            .filter(Boolean);
        const summary = successfulSummaries.length === 1 && failed.length === 0
            ? successfulSummaries[0]
            : [
                `parallel ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
                `${successful.length} succeeded`,
                failed.length ? `${failed.length} failed` : ''
            ].filter(Boolean).join(' · ');

        return {
            summary,
            completed,
            nextSteps,
            risks,
            artifacts,
            failures: failed.map(item => ({
                goal: item.goal,
                error: item.error || 'parallel task failed',
                sessionId: item.sessionId
            }))
        };
    }

    protected summarizeOutput(output: string | undefined): string {
        const text = String(output || '').replace(/\s+/g, ' ').trim();
        if (!text) {
            return '';
        }
        return text.length > 160 ? `${text.slice(0, 160)}...` : text;
    }

    protected normalizeList(values?: string[] | null): string[] {
        return Array.isArray(values)
            ? values.map(value => String(value || '').trim()).filter(Boolean)
            : [];
    }

    protected dedupeLists(values: string[]): string[] {
        return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
