import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { SpawnAgentAdapter, SpawnAgentInput } from './spawn-agent.tool';

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
        const tasks: Array<{ goal: string; context?: string; toolsets?: string[] }> = Array.isArray(input?.tasks) ? input.tasks : [];
        if (tasks.length === 0) {
            return { results: [], error: 'tasks array is required and must contain at least one task.' };
        }
        const inputs: SpawnAgentInput[] = tasks.map(task => ({
            goal: this.requireString(task.goal, 'parallel_spawn task goal'),
            context: typeof task.context === 'string' ? task.context : undefined,
            toolsets: Array.isArray(task.toolsets) ? task.toolsets.filter((t: any) => typeof t === 'string') : undefined,
            sessionId: _context?.sessionId
        }));
        const results = await this.adapter.spawnParallel(inputs);
        return {
            taskCount: tasks.length,
            succeededCount: results.filter(r => !r.error).length,
            failedCount: results.filter(r => r.error).length,
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

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
