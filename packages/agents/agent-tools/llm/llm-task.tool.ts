import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

export interface LlmTaskRequest {
    prompt: string;
    system?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LlmTaskResult {
    content: string;
    model?: string;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    finishReason?: string;
}

@Abstract()
export abstract class LlmTaskAdapter {
    abstract execute(request: LlmTaskRequest): Promise<LlmTaskResult>;
}



@Injectable()
export class LlmTaskTool implements AgentTool {
    name = 'llm_task';
    description = 'Execute a self-contained LLM inference task with a custom prompt, system instructions, and model configuration. Useful for parallel reasoning, fact-checking, or independent analysis subtasks.';
    inputSchema = {
        type: 'object',
        properties: {
            prompt: {
                type: 'string',
                description: 'The primary prompt or question for the LLM.'
            },
            system: {
                type: 'string',
                description: 'Optional system instructions to set context or constrain output format.'
            },
            model: {
                type: 'string',
                description: 'Optional model identifier (e.g., "gpt-4", "claude-3-opus"). Defaults to the adapter configured model.'
            },
            temperature: {
                type: 'number',
                description: 'Sampling temperature (0.0 to 2.0, default: adapter-specific).'
            },
            maxTokens: {
                type: 'number',
                description: 'Maximum output tokens.'
            }
        },
        required: ['prompt']
    };
    toolset = 'llm';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        private adapter: LlmTaskAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const prompt = this.requireString(input?.prompt, 'llm_task prompt');
        const result = await this.adapter.execute({
            prompt,
            system: typeof input?.system === 'string' ? input.system : undefined,
            model: typeof input?.model === 'string' ? input.model : undefined,
            temperature: typeof input?.temperature === 'number' ? input.temperature : undefined,
            maxTokens: typeof input?.maxTokens === 'number' ? input.maxTokens : undefined
        });
        return {
            content: result.content,
            model: result.model,
            usage: result.usage,
            finishReason: result.finishReason
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
