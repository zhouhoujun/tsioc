import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

@Abstract()
export abstract class SpawnAgentAdapter {
    abstract spawn(input: SpawnAgentInput): Promise<SpawnAgentResult>;

    /**
     * Spawn multiple sub-agents in parallel.
     * Default implementation runs each spawn sequentially via Promise.all.
     * Override for optimized parallel execution.
     */
    async spawnParallel(inputs: SpawnAgentInput[]): Promise<SpawnAgentResult[]> {
        const results = await Promise.allSettled(inputs.map(input => this.spawn(input)));
        return results.map(r => r.status === 'fulfilled' ? r.value : { output: '', error: r.reason instanceof Error ? r.reason.message : String(r.reason) });
    }
}

export interface SpawnAgentInput {
    goal: string;
    context?: string;
    toolsets?: string[];
    maxTurns?: number;
    sessionId?: string;
    /** P42: explicit named model profile for the sub-agent turn. */
    profile?: string;
    /** P42: enable model reasoning (extended thinking) for the sub-agent. */
    reasoning?: boolean;
    /** P42: cap concurrent workers in a spawn batch (parallel_spawn only). */
    concurrency?: number;
    /** P42: sensitive values injected into the sub-agent prompt, never persisted. */
    secrets?: Record<string, string>;
}

export interface SpawnAgentResult {
    output: string;
    error?: string;
    sessionId?: string;
    turnCount?: number;
    toolCalls?: number;
    model?: string;
    finishReason?: string;
    usage?: Record<string, any>;
    summary?: string;
    diff?: string;
    completed?: string[];
    nextSteps?: string[];
    risks?: string[];
    artifacts?: string[];
    report?: import('../src/nested-agent-runner').DelegatedAgentReport;
}

@Injectable()
export class SpawnAgentTool implements AgentTool {
    name = 'spawn_agent';
    description = 'Spawn a sub-agent with an isolated context to accomplish a specific goal. The sub-agent can use its own tools and session and return a structured report.';
    inputSchema = {
        type: 'object',
        properties: {
            goal: {
                type: 'string',
                description: 'The specific task or goal for the sub-agent to accomplish.'
            },
            context: {
                type: 'string',
                description: 'Additional context, constraints, or background information for the sub-agent.'
            },
            toolsets: {
                type: 'array',
                items: { type: 'string' },
                description: 'Restrict the sub-agent to specific tool categories (e.g., filesystem, web).'
            },
            maxTurns: {
                type: 'number',
                description: 'Maximum number of turns the sub-agent may execute (default: 10).'
            },
            profile: {
                type: 'string',
                description: 'Explicit named model profile for the sub-agent turn (overrides the worker-class profile).'
            },
            reasoning: {
                type: 'boolean',
                description: 'Enable model reasoning (extended thinking) for the sub-agent.'
            },
            secrets: {
                type: 'object',
                additionalProperties: { type: 'string' },
                description: 'Sensitive key/value pairs injected into the sub-agent prompt. Never persisted to delegation metadata or logs.'
            }
        },
        required: ['goal']
    };
    toolset = 'agent';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(
        private adapter: SpawnAgentAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const goal = this.requireString(input?.goal, 'spawn_agent goal');
        const result = await this.adapter.spawn({
            goal,
            context: typeof input?.context === 'string' ? input.context : undefined,
            toolsets: Array.isArray(input?.toolsets) ? input.toolsets.filter((t: any) => typeof t === 'string') : undefined,
            maxTurns: typeof input?.maxTurns === 'number' && input.maxTurns > 0 ? input.maxTurns : undefined,
            sessionId: _context?.sessionId,
            profile: typeof input?.profile === 'string' && input.profile.trim() ? input.profile.trim() : undefined,
            reasoning: typeof input?.reasoning === 'boolean' ? input.reasoning : undefined,
            secrets: this.requireSecrets(input?.secrets)
        });
        return {
            goal,
            output: result.output,
            error: result.error,
            sessionId: result.sessionId,
            turnCount: result.turnCount,
            toolCalls: result.toolCalls,
            model: result.model,
            finishReason: result.finishReason,
            usage: result.usage,
            summary: result.summary ?? result.report?.summary,
            diff: result.diff ?? result.report?.diff,
            completed: result.completed ?? result.report?.completed,
            nextSteps: result.nextSteps ?? result.report?.nextSteps,
            risks: result.risks ?? result.report?.risks,
            artifacts: result.artifacts ?? result.report?.artifacts,
            report: result.report
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }

    protected requireSecrets(value: unknown): Record<string, string> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        const secrets: Record<string, string> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            if (typeof entry === 'string') {
                secrets[key] = entry;
            }
        }
        return Object.keys(secrets).length > 0 ? secrets : undefined;
    }
}
