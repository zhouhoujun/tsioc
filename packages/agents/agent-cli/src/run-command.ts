import { Application } from '@tsdi/core';
import { AgentRuntime, AGENT_OPTIONS, ModelAdapter, RoutedModelAdapter, mergeAgentOptions, AgentUiConfigService, AgentUiModule } from '@tsdi/agent';
import { TuiTemplateModule } from '@tsdi/components/console';
import { provideTools, SpawnAgentAdapter, WeatherAdapter, LlmTaskAdapter, PipelineAdapter } from '@tsdi/agent-tools';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';

function createConfigService(options: AgentCliOptions): AgentUiConfigService {
    return new AgentUiConfigService(new CliAgentUiConfigReader(), options);
}

function resolveModelAdapter(config: AgentUiConfigService, options: AgentCliOptions): any {
    const resolved = config.resolve(options);
    const modelConfig = resolved.model;

    return {
        provide: ModelAdapter,
        useFactory: () => new RoutedModelAdapter({
            provider: modelConfig.provider,
            model: modelConfig.model,
            baseUrl: modelConfig.baseUrl,
            apiKey: modelConfig.apiKey,
            apiKeyEnv: modelConfig.apiKeyEnv,
            timeoutMs: modelConfig.timeoutMs || 120000,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            headers: modelConfig.headers,
            thinkingBudget: modelConfig.thinkingBudget,
            reasoning: modelConfig.reasoning
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

export async function runAgentApplication(options: AgentCliOptions, agentOptions: any, extraProviders: any[] = []): Promise<any> {
    const config = createConfigService(options);
    const resolved = config.resolve();
    return Application.run(AgentUiModule, {
        deps: [TuiTemplateModule],
        providers: [
            ...provideTools(resolved.tools),
            ...withAdapterProviders(),
            resolveModelAdapter(config, options),
            { provide: AgentUiConfigService, useValue: config },
            ...extraProviders,
            ...(agentOptions ? [{ provide: AGENT_OPTIONS, useValue: agentOptions }] : [])
        ]
    });
}

export async function runAgentPrompt(prompt: string, options: AgentCliOptions = {}): Promise<string> {
    const config = createConfigService(options);
    const resolved = config.resolve();
    const modelConfig = resolved.model;
    const agentOptions = mergeAgentOptions({
        model: {
            provider: modelConfig.provider,
            model: modelConfig.model,
            baseUrl: modelConfig.baseUrl,
            apiKey: modelConfig.apiKey,
            apiKeyEnv: modelConfig.apiKeyEnv,
            timeoutMs: modelConfig.timeoutMs,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            headers: modelConfig.headers,
            thinkingBudget: modelConfig.thinkingBudget,
            reasoning: modelConfig.reasoning
        },
        bootstrapTurn: {
            enabled: true,
            sessionId: resolved.sessionId,
            input: prompt,
            output: ''
        }
    });

    const ctx = await runAgentApplication(options, agentOptions);

    try {
        await ctx.get(AgentRuntime).start();
        return agentOptions.bootstrapTurn?.output ?? '';
    } finally {
        await ctx.close();
    }
}

export async function runAgentStreaming(prompt: string, options: AgentCliOptions = {}): Promise<void> {
    const config = createConfigService(options);
    const resolved = config.resolve();
    const modelConfig = resolved.model;
    const agentOptions = mergeAgentOptions({
        model: {
            provider: modelConfig.provider,
            model: modelConfig.model,
            baseUrl: modelConfig.baseUrl,
            apiKey: modelConfig.apiKey,
            apiKeyEnv: modelConfig.apiKeyEnv,
            timeoutMs: modelConfig.timeoutMs,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            headers: modelConfig.headers,
            thinkingBudget: modelConfig.thinkingBudget,
            reasoning: modelConfig.reasoning
        }
    });

    const ctx = await runAgentApplication(options, agentOptions);

    try {
        await ctx.get(AgentRuntime).start();
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
