import { Application } from '@tsdi/core';
import { AgentRuntime, AGENT_OPTIONS, AGENT_SANDBOX_RUNTIME, AgentHookCommandExecutor, ModelAdapter, RoutedModelAdapter, mergeAgentOptions, AgentModule, provideAgentOrmStorage } from '@tsdi/agent';
import { AgentUiConfigService } from '@tsdi/agent-ui';
import { provideTools, PipelineAdapter } from '@tsdi/agent-tools';
import { AgentAppServerModule, AppRpcServer, StdioAppRpcServer } from '@tsdi/agent-gateway';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { NodeAgentHookCommandExecutor } from './NodeAgentHookCommandExecutor';
import { Readable, Writable } from 'stream';

export interface AgentRunJsonEvent {
    type: string;
    timestamp: number;
    sessionId?: string;
    [key: string]: any;
}

function createConfigService(options: AgentCliOptions): AgentUiConfigService {
    return new AgentUiConfigService(new CliAgentUiConfigReader(), options);
}

export function createAgentSandboxRuntimeProvider(): any {
    return {
        provide: AGENT_SANDBOX_RUNTIME,
        useValue: {
            os: process.platform,
            shellFamily: process.platform === 'win32' ? 'cmd' : 'posix'
        }
    };
}

export function resolveModelAdapter(config: AgentUiConfigService, options: AgentCliOptions): any {
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

export function withAdapterProviders(baseOptions: AgentCliOptions = {}): any[] {
    return [
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
    return Application.run(AgentModule, {
        deps: [ServerCommonModule],
        providers: [
            ...provideAgentOrmStorage(resolved.root),
            ...provideTools(resolved.tools),
            ...withAdapterProviders(options),
            createAgentSandboxRuntimeProvider(),
            resolveModelAdapter(config, options),
            NodeAgentHookCommandExecutor,
            { provide: AgentHookCommandExecutor, useExisting: NodeAgentHookCommandExecutor },
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
            ...provideAgentOrmStorage(resolved.root),
            ...provideTools(resolved.tools),
            ...withAdapterProviders(options),
            createAgentSandboxRuntimeProvider(),
            resolveModelAdapter(config, options),
            NodeAgentHookCommandExecutor,
            { provide: AgentHookCommandExecutor, useExisting: NodeAgentHookCommandExecutor },
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
    const resolved = createConfigService(options).resolve(options);
    const ctx = await runAgentRpcApplication(options, mergeAgentOptions({ hooks: resolved.hooks }));
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
        hooks: resolved.hooks,
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
        hooks: resolved.hooks,
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
        const stream = runtime.runStreamingTurn(resolved.sessionId, prompt, 'local-system');
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

export async function runAgentJsonStream(
    prompt: string,
    options: AgentCliOptions = {},
    streams?: { output?: Writable; principalId?: string; }
): Promise<void> {
    const config = createConfigService(options);
    const resolved = config.resolve();
    const output = streams?.output ?? process.stdout;
    const principalId = streams?.principalId ?? 'local-system';
    const ctx = await runAgentRpcApplication(options, mergeAgentOptions({ hooks: resolved.hooks }));
    const rpc = ctx.get(AppRpcServer);
    const sessionId = resolved.sessionId;
    let lastMessage: any = null;
    let lastUsage: Record<string, any> | undefined;

    const writeEvent = async (event: AgentRunJsonEvent) => {
        const body = `${JSON.stringify(event)}\n`;
        await new Promise<void>((resolve, reject) => {
            (output as Writable).write(body, (error?: Error | null) => error ? reject(error) : resolve());
        });
    };

    try {
        await ctx.get(AgentRuntime).start();
        await writeEvent({
            type: 'thread.started',
            timestamp: Date.now(),
            sessionId,
            input: prompt
        });

        for await (const message of rpc.streamPayload({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'run.turn_stream',
            params: {
                sessionId,
                input: prompt
            }
        }, { principalId })) {
            const timestamp = Date.now();
            if ('error' in message) {
                await writeEvent({
                    type: 'error',
                    timestamp,
                    sessionId,
                    code: message.error?.code ?? -32603,
                    message: message.error?.message || 'App RPC stream failed',
                    data: message.error?.data
                });
                throw new Error(message.error?.message || 'App RPC stream failed');
            }
            if ('method' in message && message.method === 'run.turn_stream.chunk') {
                const params = message.params ?? {};
                const chunkType = String(params.chunkType || '');
                if (params.usage) {
                    lastUsage = params.usage;
                }
                if (chunkType === 'event') {
                    const eventType = String(params.eventType || '');
                    await writeEvent({
                        type: eventType === 'turn_started' ? 'turn.started' : 'item.event',
                        timestamp,
                        sessionId: params.sessionId || sessionId,
                        eventType,
                        label: params.label,
                        status: params.status,
                        content: params.content,
                        toolName: params.toolName,
                        toolCallId: params.toolCallId,
                        approvalId: params.approvalId,
                        report: params.report,
                        diagnostics: params.diagnostics,
                        compensated: params.compensated
                    });
                    continue;
                }
                if (chunkType === 'text' || chunkType === 'reasoning') {
                    await writeEvent({
                        type: chunkType === 'text' ? 'item.text.delta' : 'item.reasoning.delta',
                        timestamp,
                        sessionId: params.sessionId || sessionId,
                        delta: params.content || ''
                    });
                    continue;
                }
                if (chunkType === 'tool_call') {
                    await writeEvent({
                        type: 'item.tool_call',
                        timestamp,
                        sessionId: params.sessionId || sessionId,
                        content: params.content || '',
                        toolCalls: params.toolCalls ?? []
                    });
                    continue;
                }
                if (chunkType === 'done') {
                    await writeEvent({
                        type: 'item.done',
                        timestamp,
                        sessionId: params.sessionId || sessionId,
                        usage: params.usage ?? null
                    });
                }
                continue;
            }
            if ('result' in message) {
                lastMessage = message.result?.message ?? null;
                await writeEvent({
                    type: 'turn.completed',
                    timestamp,
                    sessionId: message.result?.sessionId || sessionId,
                    message: lastMessage,
                    cancelled: message.result?.cancelled === true,
                    usage: lastUsage ?? null
                });
                break;
            }
        }

        if (options.outputLastMessage && lastMessage) {
            await writeEvent({
                type: 'output.last_message',
                timestamp: Date.now(),
                sessionId,
                content: String(lastMessage?.content || '')
            });
        }
        await writeEvent({
            type: 'thread.completed',
            timestamp: Date.now(),
            sessionId
        });
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
