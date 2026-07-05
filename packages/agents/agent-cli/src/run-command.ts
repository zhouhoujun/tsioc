import { Application } from '@tsdi/core';
import { AgentModule, AgentRuntime, AGENT_OPTIONS, ModelAdapter, OpenAICompatibleModelAdapter, mergeAgentOptions } from '@tsdi/agent';
import { provideTools, SpawnAgentAdapter, WeatherAdapter, LlmTaskAdapter, PipelineAdapter } from '@tsdi/agent-tools';
import { AgentCliOptions, resolveCliConfig } from './config';

function resolveModelAdapter(options: AgentCliOptions): any {
    const provider = (options as any).provider || process.env.AGENT_PROVIDER || 'deepseek';
    const model = (options as any).model || process.env.AGENT_MODEL || 'deepseek-chat';
    const baseUrl = (options as any).baseUrl || process.env.AGENT_BASE_URL || undefined;
    const apiKey = (options as any).apiKey || process.env.AGENT_API_KEY || undefined;
    const apiKeyEnv = (options as any).apiKeyEnv || undefined;
    const timeoutMs = parseInt((options as any).timeout as string) || undefined;

    return {
        provide: ModelAdapter,
        useFactory: () => new OpenAICompatibleModelAdapter({
            provider,
            model,
            baseUrl: baseUrl || `https://api.${provider === 'openai' ? 'openai.com' : 'deepseek.com'}`,
            apiKey,
            apiKeyEnv,
            timeoutMs: timeoutMs || 120000
        })
    };
}

export function withAdapterProviders(): any[] {
    return [
        {
            provide: SpawnAgentAdapter,
            useValue: {
                spawn: async (request: { goal: string; context?: string; toolsets?: string[]; maxTurns?: number }) => {
                    return { output: '', turnCount: 0, toolCalls: 0 };
                }
            }
        },
        {
            provide: WeatherAdapter,
            useValue: {
                getCurrentWeather: async (location: string, units?: string) => ({
                    location, temperature: 0, feelsLike: 0, humidity: 0,
                    description: 'Weather service not configured', windSpeed: 0, units: units || 'metric'
                }),
                getForecast: async (location: string, days?: number, units?: string) => ({
                    location, days: [], units: units || 'metric'
                })
            }
        },
        {
            provide: LlmTaskAdapter,
            useValue: {
                execute: async (request: { prompt: string; system?: string }) => {
                    return { content: '', model: 'default', usage: { totalTokens: 0 } };
                }
            }
        },
        {
            provide: PipelineAdapter,
            useValue: {
                list: async () => [],
                define: async (p: any) => ({ ...p, id: `p-${Date.now()}` }),
                execute: async (id: string) => ({ pipelineId: id, status: 'completed', stepResults: [], startedAt: Date.now(), completedAt: Date.now() }),
                get: async () => null,
                delete: async () => true
            }
        }
    ];
}

export async function runAgentPrompt(prompt: string, options: AgentCliOptions = {}): Promise<string> {
    const resolved = resolveCliConfig(options);
    const agentOptions = mergeAgentOptions({
        model: {
            provider: (options as any).provider || process.env.AGENT_PROVIDER || 'deepseek',
            model: (options as any).model || process.env.AGENT_MODEL || 'deepseek-chat',
            baseUrl: (options as any).baseUrl || process.env.AGENT_BASE_URL || undefined,
            apiKey: (options as any).apiKey || process.env.AGENT_API_KEY || undefined,
            apiKeyEnv: (options as any).apiKeyEnv || undefined,
            timeoutMs: parseInt((options as any).timeout as string) || 120000
        },
        bootstrapTurn: {
            enabled: true,
            sessionId: resolved.sessionId,
            input: prompt,
            output: ''
        }
    });

    const ctx = await Application.run(AgentModule, {
        providers: [
            ...provideTools(resolved.tools),
            ...withAdapterProviders(),
            resolveModelAdapter(options),
            { provide: AGENT_OPTIONS, useValue: agentOptions },
        ]
    });

    try {
        return agentOptions.bootstrapTurn?.output ?? '';
    } finally {
        await ctx.close();
    }
}

export async function runAgentStreaming(prompt: string, options: AgentCliOptions = {}): Promise<void> {
    const resolved = resolveCliConfig(options);
    const agentOptions = mergeAgentOptions({
        model: {
            provider: (options as any).provider || process.env.AGENT_PROVIDER || 'deepseek',
            model: (options as any).model || process.env.AGENT_MODEL || 'deepseek-chat',
            baseUrl: (options as any).baseUrl || process.env.AGENT_BASE_URL || undefined,
            apiKey: (options as any).apiKey || process.env.AGENT_API_KEY || undefined,
            apiKeyEnv: (options as any).apiKeyEnv || undefined,
            timeoutMs: parseInt((options as any).timeout as string) || 120000
        }
    });

    const ctx = await Application.run(AgentModule, {
        providers: [
            ...provideTools(resolved.tools),
            ...withAdapterProviders(),
            resolveModelAdapter(options),
            { provide: AGENT_OPTIONS, useValue: agentOptions },
        ]
    });

    try {
        const runtime = ctx.get(AgentRuntime);
        const stream = runtime.runStreamingTurn(resolved.sessionId, prompt);
        for await (const chunk of stream) {
            if (chunk.type === 'text' && chunk.content) {
                process.stdout.write(chunk.content);
            } else if (chunk.type === 'tool_call') {
                process.stdout.write(`\n[Tool: ${chunk.content || '...'}]\n`);
            } else if (chunk.type === 'done') {
                process.stdout.write('\n');
            }
        }
    } finally {
        await ctx.close();
    }
}
