import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

@Abstract()
export abstract class SpawnAgentAdapter {
    abstract spawn(input: SpawnAgentInput): Promise<SpawnAgentResult>;
}

export interface SpawnAgentInput {
    goal: string;
    context?: string;
    toolsets?: string[];
    maxTurns?: number;
}

export interface SpawnAgentResult {
    output: string;
    error?: string;
    turnCount?: number;
    toolCalls?: number;
}

@Injectable()
export class SpawnAgentTool implements AgentTool {
    name = 'spawn_agent';
    description = 'Spawn a sub-agent with an isolated context to accomplish a specific goal. The sub-agent can use its own tools and session.';
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
            maxTurns: typeof input?.maxTurns === 'number' && input.maxTurns > 0 ? input.maxTurns : undefined
        });
        return {
            goal,
            output: result.output,
            error: result.error,
            turnCount: result.turnCount,
            toolCalls: result.toolCalls
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
