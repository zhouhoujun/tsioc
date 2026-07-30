import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { SpawnAgentAdapter, SpawnAgentInput, SpawnAgentResult } from './spawn-agent.tool';

export interface OrchestrateTask {
    id: string;
    goal: string;
    context?: string;
    dependsOn?: string[];
    toolsets?: string[];
    maxTurns?: number;
}

export interface OrchestratePhase {
    depth: number;
    tasks: OrchestrateTask[];
}

export interface OrchestrateTaskResult {
    id: string;
    goal: string;
    status: 'completed' | 'failed' | 'skipped';
    output?: string;
    sessionId?: string;
    summary?: string;
    turnCount?: number;
    toolCalls?: number;
    model?: string;
    error?: string;
    completed?: string[];
    nextSteps?: string[];
    risks?: string[];
    artifacts?: string[];
}

export interface OrchestrateResult {
    goal: string;
    phaseCount: number;
    taskCount: number;
    succeededCount: number;
    failedCount: number;
    summary: string;
    phases: Array<{
        depth: number;
        tasks: OrchestrateTaskResult[];
    }>;
    completed: string[];
    nextSteps: string[];
    risks: string[];
    artifacts: string[];
    failures: Array<{ id: string; goal: string; error: string }>;
}

@Injectable()
export class OrchestrateTool implements AgentTool {
    name = 'orchestrate';
    description = 'Execute a DAG of dependent sub-tasks. Tasks without dependencies run in parallel; tasks that depend on others wait for their dependencies to complete first. Results are collected and synthesized phase by phase. Use this when you have a multi-step plan where some steps depend on earlier results.';
    inputSchema = {
        type: 'object',
        properties: {
            goal: {
                type: 'string',
                description: 'High-level objective for the entire orchestration.'
            },
            tasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Unique identifier for this task within the plan.'
                        },
                        goal: {
                            type: 'string',
                            description: 'The specific goal for this sub-agent.'
                        },
                        context: {
                            type: 'string',
                            description: 'Additional context or results from prior phases to pass to this task.'
                        },
                        dependsOn: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'IDs of tasks that must complete before this one runs. Omit or use empty array for tasks with no dependencies.'
                        },
                        toolsets: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Restrict this sub-agent to specific tool categories.'
                        },
                        maxTurns: {
                            type: 'number',
                            description: 'Maximum turns for this sub-agent (default: 10).'
                        }
                    },
                    required: ['id', 'goal']
                },
                description: 'Array of sub-tasks to execute. Each task can declare dependencies on other task IDs to form a DAG.'
            }
        },
        required: ['goal', 'tasks']
    };
    toolset = 'agent';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(
        private adapter: SpawnAgentAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const goal = this.requireString(input?.goal, 'orchestrate goal');
        const rawTasks: Array<Record<string, any>> = Array.isArray(input?.tasks) ? input.tasks : [];
        if (rawTasks.length === 0) {
            return { error: 'tasks array is required and must contain at least one task.' };
        }

        const tasks: OrchestrateTask[] = rawTasks.map((t, i) => ({
            id: this.requireString(t.id, `tasks[${i}].id`),
            goal: this.requireString(t.goal, `tasks[${i}].goal`),
            context: typeof t.context === 'string' ? t.context : undefined,
            dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.filter((d: any) => typeof d === 'string') : undefined,
            toolsets: Array.isArray(t.toolsets) ? t.toolsets.filter((t2: any) => typeof t2 === 'string') : undefined,
            maxTurns: typeof t.maxTurns === 'number' ? t.maxTurns : undefined
        }));

        const allIds = new Set(tasks.map(t => t.id));
        for (const task of tasks) {
            if (task.dependsOn) {
                for (const depId of task.dependsOn) {
                    if (!allIds.has(depId)) {
                        return { error: `Task "${task.id}" depends on unknown task "${depId}".` };
                    }
                }
            }
        }

        const phases = this.buildPhases(tasks);
        if (phases instanceof Error) {
            return { error: `DAG cycle detected: ${phases.message}` };
        }

        const completedResults = new Map<string, OrchestrateTaskResult>();
        const phaseResults: OrchestrateResult['phases'] = [];

        for (const phase of phases) {
            const phaseTasks = phase.tasks.map(task => {
                const depResults = this.getDependencyResults(task, completedResults);
                const blockedDep = depResults.find(result => result.status !== 'completed');
                if (blockedDep) {
                    return {
                        task,
                        skipped: true,
                        reason: `Skipped because dependency "${blockedDep.id}" ${blockedDep.status}.`
                    };
                }
                const depContext = this.buildDependencyContext(task, completedResults);
                const fullContext = [task.context, depContext].filter(Boolean).join('\n\n');
                return { task, context: fullContext || undefined };
            });

            const runnable = phaseTasks.filter(pt => !(pt as any).skipped) as Array<{ task: OrchestrateTask; context?: string }>;
            const inputs: SpawnAgentInput[] = runnable.map(pt => ({
                goal: pt.task.goal,
                context: pt.context,
                toolsets: pt.task.toolsets,
                maxTurns: pt.task.maxTurns,
                sessionId: _context?.sessionId
            }));

            const results = inputs.length ? await this.adapter.spawnParallel(inputs) : [];
            let resultIndex = 0;

            const taskResults: OrchestrateTaskResult[] = phaseTasks.map((pt: any) => {
                if (pt.skipped) {
                    const skippedResult: OrchestrateTaskResult = {
                        id: pt.task.id,
                        goal: pt.task.goal,
                        status: 'skipped',
                        error: pt.reason
                    };
                    completedResults.set(pt.task.id, skippedResult);
                    return skippedResult;
                }

                const result = results[resultIndex++];
                const isError = !!result?.error;
                const tr: OrchestrateTaskResult = {
                    id: pt.task.id,
                    goal: pt.task.goal,
                    status: isError ? 'failed' : 'completed',
                    output: result?.output,
                    sessionId: result?.sessionId,
                    summary: result?.summary ?? result?.report?.summary,
                    turnCount: result?.turnCount,
                    toolCalls: result?.toolCalls,
                    model: result?.model,
                    error: result?.error,
                    completed: this.normalizeList(result?.completed ?? result?.report?.completed),
                    nextSteps: this.normalizeList(result?.nextSteps ?? result?.report?.nextSteps),
                    risks: this.normalizeList(result?.risks ?? result?.report?.risks),
                    artifacts: this.normalizeList(result?.artifacts ?? result?.report?.artifacts)
                };
                completedResults.set(pt.task.id, tr);
                return tr;
            });

            phaseResults.push({
                depth: phase.depth,
                tasks: taskResults
            });
        }

        const allResults = Array.from(completedResults.values());
        return this.buildFinalResult(goal, phaseResults, allResults);
    }

    protected buildPhases(tasks: OrchestrateTask[]): OrchestratePhase[] | Error {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const visited = new Map<string, 'visiting' | 'visited'>();
        const phaseMap = new Map<string, number>();


        const computeDepth = (taskId: string): number | Error => {
            const state = visited.get(taskId);
            if (state === 'visiting') {
                return new Error(`Cycle detected involving task "${taskId}".`);
            }
            if (state === 'visited') {
                return phaseMap.get(taskId) ?? 0;
            }

            const task = taskMap.get(taskId);
            if (!task) {
                return new Error(`Task "${taskId}" not found.`);
            }

            visited.set(taskId, 'visiting');

            let maxDepth = 0;
            if (task.dependsOn && task.dependsOn.length > 0) {
                for (const depId of task.dependsOn) {
                    const depDepth = computeDepth(depId);
                    if (depDepth instanceof Error) {
                        return depDepth;
                    }
                    maxDepth = Math.max(maxDepth, depDepth + 1);
                }
            }

            visited.set(taskId, 'visited');
            phaseMap.set(taskId, maxDepth);
            return maxDepth;
        };

        for (const task of tasks) {
            const depth = computeDepth(task.id);
            if (depth instanceof Error) {
                return depth;
            }
        }

        const depthGroups = new Map<number, OrchestrateTask[]>();
        for (const task of tasks) {
            const depth = phaseMap.get(task.id) ?? 0;
            if (!depthGroups.has(depth)) {
                depthGroups.set(depth, []);
            }
            depthGroups.get(depth)!.push(task);
        }

        return Array.from(depthGroups.entries())
            .sort(([a], [b]) => a - b)
            .map(([depth, group]) => ({
                depth,
                tasks: group
            }));
    }

    protected buildDependencyContext(task: OrchestrateTask, completed: Map<string, OrchestrateTaskResult>): string {
        if (!task.dependsOn || task.dependsOn.length === 0) {
            return '';
        }
        const parts: string[] = [];
        for (const depId of task.dependsOn) {
            const result = completed.get(depId);
            if (!result) {
                continue;
            }
            const lines = [`[dependency: ${depId} - ${result.status}]`];
            if (result.summary) {
                lines.push(`  summary: ${result.summary}`);
            }
            if (result.completed?.length) {
                lines.push(`  completed: ${result.completed.join(', ')}`);
            }
            if (result.artifacts?.length) {
                lines.push(`  artifacts: ${result.artifacts.join(', ')}`);
            }
            if (result.error) {
                lines.push(`  error: ${result.error}`);
            }
            parts.push(lines.join('\n'));
        }
        return parts.join('\n\n');
    }

    protected getDependencyResults(task: OrchestrateTask, completed: Map<string, OrchestrateTaskResult>): OrchestrateTaskResult[] {
        if (!task.dependsOn || task.dependsOn.length === 0) {
            return [];
        }
        return task.dependsOn
            .map(depId => completed.get(depId))
            .filter((result): result is OrchestrateTaskResult => !!result);
    }

    protected buildFinalResult(
        goal: string,
        phases: OrchestrateResult['phases'],
        allResults: OrchestrateTaskResult[]
    ): OrchestrateResult {
        const succeeded = allResults.filter(r => r.status === 'completed');
        const failed = allResults.filter(r => r.status === 'failed');

        const allCompleted = this.dedupeList(allResults.flatMap(r => r.completed ?? []));
        const allNextSteps = this.dedupeList(allResults.flatMap(r => r.nextSteps ?? []));
        const allRisks = this.dedupeList([
            ...allResults.flatMap(r => r.risks ?? []),
            ...failed.map(r => r.error || 'unknown error')
        ]);
        const allArtifacts = this.dedupeList(allResults.flatMap(r => r.artifacts ?? []));

        const phaseSummaries = phases.map(phase => {
            const count = phase.tasks.length;
            const ok = phase.tasks.filter(t => t.status === 'completed').length;
            const fail = phase.tasks.filter(t => t.status === 'failed').length;
            const skipped = phase.tasks.filter(t => t.status === 'skipped').length;
            return `phase ${phase.depth + 1}: ${ok}/${count} succeeded${fail ? `, ${fail} failed` : ''}${skipped ? `, ${skipped} skipped` : ''}`;
        });

        const summary = [
            `orchestrate ${allResults.length} task${allResults.length === 1 ? '' : 's'} across ${phases.length} phase${phases.length === 1 ? '' : 's'}`,
            `${succeeded.length} succeeded`,
            failed.length ? `${failed.length} failed` : '',
            ...phaseSummaries
        ].filter(Boolean).join(' · ');

        return {
            goal,
            phaseCount: phases.length,
            taskCount: allResults.length,
            succeededCount: succeeded.length,
            failedCount: failed.length,
            summary,
            phases,
            completed: allCompleted,
            nextSteps: allNextSteps,
            risks: allRisks,
            artifacts: allArtifacts,
            failures: failed.map(r => ({
                id: r.id,
                goal: r.goal,
                error: r.error || 'task failed'
            }))
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }

    private normalizeList(values?: string[] | null): string[] {
        return Array.isArray(values)
            ? values.map(v => String(v || '').trim()).filter(Boolean)
            : [];
    }

    private dedupeList(values: string[]): string[] {
        return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
    }
}
