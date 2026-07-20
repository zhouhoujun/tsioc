import { Application } from '@tsdi/core';
import { randomUUID } from 'crypto';
import { AgentRuntime, AGENT_OPTIONS, AGENT_PROMPT_SECTIONS, ModelAdapter, RoutedModelAdapter, mergeAgentOptions, AgentUiConfigService, AgentUiModule } from '@tsdi/agent';
import { TuiTemplateModule } from '@tsdi/components/console';
import { provideTools, NestedAgentRunner, PipelineAdapter } from '@tsdi/agent-tools';
import { AgentAppServerModule, StdioAppRpcServer } from '@tsdi/agent-gateway';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { Readable, Writable } from 'stream';

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

function buildModelOptions(modelConfig: any, overrides?: { model?: string; temperature?: number; maxTokens?: number }): Record<string, any> {
    return {
        provider: modelConfig.provider,
        model: overrides?.model || modelConfig.model,
        baseUrl: modelConfig.baseUrl,
        apiKey: modelConfig.apiKey,
        apiKeyEnv: modelConfig.apiKeyEnv,
        timeoutMs: modelConfig.timeoutMs,
        temperature: overrides?.temperature ?? modelConfig.temperature,
        maxTokens: overrides?.maxTokens ?? modelConfig.maxTokens,
        headers: modelConfig.headers,
        thinkingBudget: modelConfig.thinkingBudget,
        reasoning: modelConfig.reasoning,
        defaultProfile: modelConfig.defaultProfile,
        profiles: modelConfig.profiles,
        routes: modelConfig.routes,
        complexityRouting: modelConfig.complexityRouting,
        complexityThresholds: modelConfig.complexityThresholds
    };
}

async function executeNestedAgentTurn(
    baseOptions: AgentCliOptions,
    prompt: string,
    overrides: {
        sessionId?: string;
        toolsets?: string[];
        systemPrompt?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
    } = {}
): Promise<{ content: string; turnCount: number; toolCalls: number; model?: string; finishReason?: string; usage?: Record<string, any> }> {
    const options: AgentCliOptions = {
        ...baseOptions,
        session: overrides.sessionId || `subagent-${randomUUID()}`,
        tools: overrides.toolsets?.length ? overrides.toolsets.join(',') : baseOptions.tools,
        defaultTools: overrides.toolsets?.length ? false : baseOptions.defaultTools
    };
    const config = createConfigService(options);
    const resolved = config.resolve(options);
    const modelConfig = resolved.model;
    const agentOptions = mergeAgentOptions({
        model: buildModelOptions(modelConfig, overrides)
    });
    const ctx = await runAgentApplication(options, agentOptions, overrides.systemPrompt?.trim()
        ? [{
            provide: AGENT_PROMPT_SECTIONS,
            useValue: {
                priority: 9,
                render: () => `## Task Instructions\n${overrides.systemPrompt!.trim()}`
            },
            multi: true
        }]
        : []);

    try {
        const runtime = ctx.get(AgentRuntime);
        await runtime.start();
        const result = await runtime.runTurn(options.session || 'default', prompt);
        const messages = await runtime.getMessages(options.session || 'default');
        return {
            content: result.message.content,
            turnCount: messages.filter((message: any) => message.role === 'user').length,
            toolCalls: messages.filter((message: any) => message.role === 'tool').length,
            model: result.message.metadata?.model,
            finishReason: result.message.metadata?.finishReason,
            usage: result.message.metadata?.usage
        };
    } finally {
        await ctx.close();
    }
}

export function withAdapterProviders(baseOptions: AgentCliOptions = {}): any[] {
    return [
        {
            provide: NestedAgentRunner,
            useValue: {
                run: async (request: {
                    prompt: string;
                    sessionId?: string;
                    toolsets?: string[];
                    systemPrompt?: string;
                    model?: string;
                    temperature?: number;
                    maxTokens?: number;
                }) => {
                    return executeNestedAgentTurn(baseOptions, request.prompt, request);
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
        deps: [TuiTemplateModule, ServerCommonModule],
        providers: [
            ...provideTools(resolved.tools),
            ...withAdapterProviders(options),
            resolveModelAdapter(config, options),
            { provide: AgentUiConfigService, useValue: config },
            ...extraProviders,
            ...(agentOptions ? [{ provide: AGENT_OPTIONS, useValue: agentOptions }] : [])
        ]
    });
}

export async function runAgentRpcApplication(options: AgentCliOptions, agentOptions: any = {}, extraProviders: any[] = []): Promise<any> {
    const config = createConfigService(options);
    const resolved = config.resolve();
    return Application.run(AgentAppServerModule, {
        deps: [ServerCommonModule],
        providers: [
            ...provideTools(resolved.tools),
            ...withAdapterProviders(options),
            resolveModelAdapter(config, options),
            { provide: AgentUiConfigService, useValue: config },
            ...extraProviders,
            ...(agentOptions ? [{ provide: AGENT_OPTIONS, useValue: agentOptions }] : [])
        ]
    });
}

export async function runAgentRpcStdio(
    options: AgentCliOptions = {},
    streams?: { input?: Readable; output?: Writable; principalId?: string; }
): Promise<void> {
    const ctx = await runAgentRpcApplication(options, {});
    const input = streams?.input ?? process.stdin;
    const output = streams?.output ?? process.stdout;
    const principalId = streams?.principalId ?? 'local-system';

    try {
        await ctx.get(AgentRuntime).start();
        const stdio = ctx.get(StdioAppRpcServer);
        stdio.start({
            input,
            output,
            context: { principalId }
        });
        await waitForReadableEnd(input);
        stdio.stop({ input });
    } finally {
        await ctx.close();
    }
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

function waitForReadableEnd(input: Readable): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = () => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            resolve();
        };
        const fail = (error: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            reject(error);
        };
        const cleanup = () => {
            input.off('end', finish);
            input.off('close', finish);
            input.off('error', fail);
        };
        input.on('end', finish);
        input.on('close', finish);
        input.on('error', fail);
    });
}
