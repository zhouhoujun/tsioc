import { Application } from '@tsdi/core';
import { AgentRuntime, AGENT_OPTIONS, AGENT_SANDBOX_RUNTIME, AGENT_WORKSPACE_TRUST, AgentHookCommandExecutor, AgentTurnMessageInput, ModelAdapter, RoutedModelAdapter, mergeAgentOptions, AgentModule, provideAgentOrmStorage, TrustedProjectStore } from '@tsdi/agent';
import { AgentUiConfigService, AgentUiResolvedConfig } from '@tsdi/agent-ui';
import { provideTools } from '@tsdi/agent-tools';
import { AgentAppServerModule, AppRpcServer, StdioAppRpcServer } from '@tsdi/agent-gateway';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { FileAdapter } from '@tsdi/common';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { NodeAgentHookCommandExecutor } from './NodeAgentHookCommandExecutor';
import { Readable, Writable } from 'stream';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface AgentRunJsonEvent {
    type: string;
    timestamp: number;
    sessionId?: string;
    [key: string]: any;
}

const IMAGE_MIME_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml'
};

function resolveImagePaths(options: AgentCliOptions = {}): string[] {
    const value = options.image;
    if (Array.isArray(value)) {
        return value.map(item => String(item || '').trim()).filter(Boolean);
    }
    const text = String(value || '').trim();
    return text ? [text] : [];
}

async function buildTurnMessage(prompt: string, options: AgentCliOptions = {}): Promise<AgentTurnMessageInput | undefined> {
    const images = await Promise.all(resolveImagePaths(options).map(loadImagePart));
    if (!images.length) {
        return undefined;
    }
    return {
        content: prompt,
        parts: [
            ...(prompt ? [{ type: 'text', text: prompt } as const] : []),
            ...images
        ]
    };
}

async function loadImagePart(filePath: string): Promise<NonNullable<AgentTurnMessageInput['parts']>[number]> {
    const absolutePath = path.resolve(filePath);
    const bytes = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const mediaType = IMAGE_MIME_TYPES[ext];
    if (!mediaType) {
        throw new Error(`Unsupported image format for '${filePath}'. Expected one of: ${Object.keys(IMAGE_MIME_TYPES).join(', ')}`);
    }
    return {
        type: 'image',
        imageUrl: `data:${mediaType};base64,${bytes.toString('base64')}`,
        mediaType,
        name: path.basename(absolutePath)
    };
}

function createConfigService(options: AgentCliOptions): AgentUiConfigService {
    return new AgentUiConfigService(new CliAgentUiConfigReader(), options);
}

/**
 * Ensure the resolved workspace and file tool root directories exist before the
 * application boots. Config resolution stays side-effect free so `doctor` can
 * report a missing workspace directory.
 */
export async function ensureAgentWorkspace(resolved: AgentUiResolvedConfig): Promise<void> {
    const directories = new Set<string>();
    if (resolved.workspace) {
        directories.add(resolved.workspace);
    }
    const fileRootDir = resolved.tools?.file?.rootDir;
    if (fileRootDir) {
        directories.add(fileRootDir);
    }
    for (const dir of directories) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch {
            // workspace creation failure is surfaced by tool execution; do not block bootstrap
        }
    }
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

export function provideWorkspaceTrust(root: string): any {
    return {
        provider(injector: any) {
            const fileAdapter = injector.get(FileAdapter, null);
            return [{
                provide: AGENT_WORKSPACE_TRUST,
                useValue: {
                    isTrusted(workspace: string): boolean {
                        const target = String(workspace || '').trim();
                        if (!target) {
                            return true;
                        }
                        if (!fileAdapter) {
                            return false;
                        }
                        try {
                            return new TrustedProjectStore({ root, fileAdapter }).isTrusted(target).trusted;
                        } catch {
                            return false;
                        }
                    }
                }
            }];
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

export async function runAgentApplication(options: AgentCliOptions, agentOptions: any, extraProviders: any[] = []): Promise<any> {
    const config = createConfigService(options);
    const resolved = config.resolve();
    await ensureAgentWorkspace(resolved);
    return Application.run(AgentModule, {
        deps: [ServerCommonModule],
        providers: [
            ...provideAgentOrmStorage(resolved.root),
            ...provideTools(resolved.tools),
            createAgentSandboxRuntimeProvider(),
            provideWorkspaceTrust(resolved.root),
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
    await ensureAgentWorkspace(resolved);
    return Application.run(AgentAppServerModule, {
        deps: [ServerCommonModule],
        providers: [
            ...provideAgentOrmStorage(resolved.root),
            ...provideTools(resolved.tools),
            createAgentSandboxRuntimeProvider(),
            provideWorkspaceTrust(resolved.root),
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
    const ctx = await runAgentRpcApplication(options, mergeAgentOptions({ hooks: resolved.hooks, format: resolved.tools.format, workspace: resolved.workspace }));
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
    const message = await buildTurnMessage(prompt, options);
    const agentOptions = mergeAgentOptions({
        harnessProfile: resolved.harnessProfile,
        hooks: resolved.hooks,
        format: resolved.tools.format,
        workspace: resolved.workspace,
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
        const result = await ctx.get(AgentRuntime).runTurn(resolved.sessionId, prompt, 'local-system', message);
        return result.message.content || '';
    } finally {
        await ctx.close();
    }
}

export async function runAgentStreaming(prompt: string, options: AgentCliOptions = {}): Promise<void> {
    const config = createConfigService(options);
    const resolved = config.resolve();
    const modelConfig = resolved.model;
    const message = await buildTurnMessage(prompt, options);
    const agentOptions = mergeAgentOptions({
        harnessProfile: resolved.harnessProfile,
        hooks: resolved.hooks,
        format: resolved.tools.format,
        workspace: resolved.workspace,
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
        const stream = runtime.runStreamingTurn(resolved.sessionId, prompt, 'local-system', message);
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
    const message = await buildTurnMessage(prompt, options);
    const output = streams?.output ?? process.stdout;
    const principalId = streams?.principalId ?? 'local-system';
    const ctx = await runAgentRpcApplication(options, mergeAgentOptions({ hooks: resolved.hooks, format: resolved.tools.format, workspace: resolved.workspace }));
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

        for await (const eventMessage of rpc.streamPayload({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'run.turn_stream',
            params: {
                sessionId,
                input: prompt,
                ...(message ? { message } : {})
            }
        }, { principalId })) {
            const timestamp = Date.now();
            if ('error' in eventMessage) {
                await writeEvent({
                    type: 'error',
                    timestamp,
                    sessionId,
                    code: eventMessage.error?.code ?? -32603,
                    message: eventMessage.error?.message || 'App RPC stream failed',
                    data: eventMessage.error?.data
                });
                throw new Error(eventMessage.error?.message || 'App RPC stream failed');
            }
            if ('method' in eventMessage && eventMessage.method === 'run.turn_stream.chunk') {
                const params = eventMessage.params ?? {};
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
            if ('result' in eventMessage) {
                lastMessage = eventMessage.result?.message ?? null;
                await writeEvent({
                    type: 'turn.completed',
                    timestamp,
                    sessionId: eventMessage.result?.sessionId || sessionId,
                    message: lastMessage,
                    cancelled: eventMessage.result?.cancelled === true,
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
