import { Abstract, Injectable } from '@tsdi/ioc';

export type AgentLifecycleHookStage = 'beforeTurn' | 'afterTurn' | 'beforeTool' | 'afterTool' | 'onApproval' | 'beforeCompaction' | 'afterCompaction';

import { AgentHookTransportExecutor } from './AgentHookTransport';

export type AgentHookTransport = 'command' | 'http' | 'mcp' | 'prompt' | 'subagent';

export interface AgentHookDefinition {
    name?: string;
    /** Where the hook runs. Defaults to the existing shell command transport. */
    type?: AgentHookTransport;
    /** Shell command (required for `type: 'command'`). */
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    /** HTTP hook endpoint (required for `type: 'http'`). */
    url?: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    /** When `requireTrust` is enabled, only hooks explicitly trusted run. */
    trusted?: boolean;
    /** `type: 'mcp'`: tool name exposed by an MCP server. */
    tool?: string;
    /** `type: 'mcp'`: optional server id. */
    server?: string;
    /** `type: 'prompt'`: judge/instruction sent to the host model. */
    prompt?: string;
    /** `type: 'subagent'`: named worker definition. */
    agent?: string;
}

/**
 * In-process JS function hook handler. Runs without shell spawning (usable in
 * browser/no-Node environments). A `beforeTool` hook may return `input` to
 * rewrite the tool input before execution. Fields other than `input` are
 * normalized by the hook manager (exitCode/stdout/stderr/durationMs default
 * when omitted).
 */
export type AgentHookFunction = (ctx: AgentHookContext) => Partial<AgentHookExecutionResult> | Promise<Partial<AgentHookExecutionResult>>;

export interface AgentFunctionHookDefinition {
    name?: string;
    handler: AgentHookFunction;
}

export interface AgentFunctionHooksOptions {
    beforeTurn?: AgentFunctionHookDefinition | AgentFunctionHookDefinition[];
    afterTurn?: AgentFunctionHookDefinition | AgentFunctionHookDefinition[];
    beforeTool?: AgentFunctionHookDefinition | AgentFunctionHookDefinition[];
    afterTool?: AgentFunctionHookDefinition | AgentFunctionHookDefinition[];
    onApproval?: AgentFunctionHookDefinition | AgentFunctionHookDefinition[];
    beforeCompaction?: AgentFunctionHookDefinition | AgentFunctionHookDefinition[];
    afterCompaction?: AgentFunctionHookDefinition | AgentFunctionHookDefinition[];
}

export interface AgentHooksOptions {
    /** Deny project hooks unless they are explicitly marked `trusted`. */
    requireTrust?: boolean;
    /** Injectable fetch for HTTP hooks (defaults to the host global). */
    fetch?: typeof fetch;
    /** Host-provided executors for mcp/prompt/subagent transports. */
    executors?: AgentHookTransportExecutor[];
    beforeTurn?: AgentHookDefinition | AgentHookDefinition[];
    afterTurn?: AgentHookDefinition | AgentHookDefinition[];
    beforeTool?: AgentHookDefinition | AgentHookDefinition[];
    afterTool?: AgentHookDefinition | AgentHookDefinition[];
    onApproval?: AgentHookDefinition | AgentHookDefinition[];
    beforeCompaction?: AgentHookDefinition | AgentHookDefinition[];
    afterCompaction?: AgentHookDefinition | AgentHookDefinition[];
    /** In-process JS function hooks. Run before shell hooks for the same stage. */
    functions?: AgentFunctionHooksOptions;
}

export interface AgentHookContext {
    sessionId: string;
    principalId?: string;
    workspace?: string;
    input?: string;
    stage: AgentLifecycleHookStage;
    toolCall?: { id?: string; name?: string; input?: any };
    toolDefinition?: { name: string; description?: string; execution?: Record<string, any> };
    executionMode?: 'sequential' | 'parallel';
    approval?: { toolName: string; decision: string; reason?: string };
    turn?: { status: 'started' | 'completed' | 'cancelled' | 'failed'; message?: string; error?: string };
    compaction?: {
        phase: 'before' | 'after';
        sessionId?: string;
        level: 'light' | 'medium' | 'deep';
        beforeMessageCount: number;
        beforeTokens: number;
        afterMessageCount?: number;
        afterTokens?: number;
        droppedMessageCount?: number;
        summary?: string;
        summaryQuality?: number;
        report?: Record<string, any>;
    };
    metadata?: Record<string, any>;
}

export interface AgentHookExecutionRequest {
    command: string;
    args: string[];
    stdin: string;
    context: AgentHookContext;
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    /** Aborted when the user interrupts the turn (Esc). */
    signal?: AbortSignal;
}

export interface AgentHookExecutionResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
    error?: string;
    /** True when the user interrupted the turn (Esc) while the hook ran. */
    cancelled?: boolean;
    /** beforeTool only: replacement tool input applied before execution. */
    input?: any;
    /** beforeTool only: a hook may veto the call (`deny`) or allow it. */
    action?: 'allow' | 'deny';
}

export interface AgentHookTranscriptEntry {
    stage: AgentLifecycleHookStage;
    name: string;
    content: string;
    exitCode: number;
    durationMs: number;
    stderr?: string;
}

export interface AgentHookRunOutput {
    entries: AgentHookTranscriptEntry[];
    results: AgentHookExecutionResult[];
}

@Abstract()
export abstract class AgentHookCommandExecutor {
    abstract isSupported(): boolean;
    abstract execute(request: AgentHookExecutionRequest): Promise<AgentHookExecutionResult>;
}

@Injectable()
export class NoopAgentHookCommandExecutor extends AgentHookCommandExecutor {
    isSupported(): boolean {
        return false;
    }

    async execute(_request: AgentHookExecutionRequest): Promise<AgentHookExecutionResult> {
        return {
            exitCode: 1,
            stdout: '',
            stderr: '',
            durationMs: 0,
            error: 'Agent hook command execution is not supported in this environment.'
        };
    }
}

export class AgentHookManager {
    private readonly functionHooks: Partial<Record<AgentLifecycleHookStage, AgentFunctionHookDefinition[]>>;
    private readonly transportExecutors: AgentHookTransportExecutor[];

    constructor(
        private readonly hooks: AgentHooksOptions | undefined,
        private readonly executor?: AgentHookCommandExecutor | null
    ) {
        this.functionHooks = this.collectFunctionHooks(this.hooks?.functions);
        this.transportExecutors = this.hooks?.executors ?? [];
    }

    hasHooks(stage?: AgentLifecycleHookStage): boolean {
        if (!stage) {
            return this.stages().some(name => this.normalizeStageHooks(name).length > 0 || this.normalizeFunctionStageHooks(name).length > 0);
        }
        return this.normalizeStageHooks(stage).length > 0 || this.normalizeFunctionStageHooks(stage).length > 0;
    }

    describe(): Array<{ stage: AgentLifecycleHookStage; commands: string[]; functions: string[] }> {
        return this.stages().map(stage => ({
            stage,
            commands: this.normalizeStageHooks(stage).map(hook => hook.url ?? hook.command ?? ''),
            functions: this.normalizeFunctionStageHooks(stage).map(hook => hook.name ?? 'function')
        }));
    }

    async run(stage: AgentLifecycleHookStage, context: AgentHookContext, signal?: AbortSignal): Promise<AgentHookRunOutput> {
        const entries: AgentHookTranscriptEntry[] = [];
        const results: AgentHookExecutionResult[] = [];
        const functionHooks = this.normalizeFunctionStageHooks(stage);
        for (const hook of functionHooks) {
            const result = await this.runFunctionHook(hook, context);
            results.push(result);
            const entry = this.toFunctionTranscriptEntry(stage, hook, result);
            if (entry) {
                entries.push(entry);
            }
        }
        const stageHooks = this.normalizeStageHooks(stage);
        for (const hook of stageHooks.filter(item => item.type === 'mcp' || item.type === 'prompt' || item.type === 'subagent')) {
            const transport = this.transportExecutors.find(item => item.type === hook.type);
            if (!transport) {
                continue;
            }
            const result = await transport.execute({ type: hook.type as 'mcp' | 'prompt' | 'subagent', stage, hook, context, signal });
            const stdout = String(result.stdout || '').trim();
            if (stdout) {
                entries.push({
                    stage,
                    name: hook.name ?? hook.agent ?? hook.tool ?? hook.type ?? 'hook',
                    content: this.wrapOutput(stage, hook.name ?? hook.agent ?? hook.tool ?? hook.type ?? 'hook', stdout),
                    exitCode: typeof result.exitCode === 'number' ? result.exitCode : 0,
                    durationMs: typeof result.durationMs === 'number' ? result.durationMs : 0,
                    stderr: String(result.stderr || '').trim() || undefined
                });
            }
            results.push({
                exitCode: typeof result.exitCode === 'number' ? result.exitCode : 0,
                stdout,
                stderr: String(result.stderr || ''),
                durationMs: typeof result.durationMs === 'number' ? result.durationMs : 0,
                ...(result.error ? { error: result.error } : {}),
                ...(result.action ? { action: result.action } : {})
            });
        }
        for (const hook of stageHooks.filter(item => item.type === 'http')) {
            const entry = await this.runHttpHook(stage, hook, context, signal);
            if (entry) {
                entries.push(entry);
            }
        }
        if (!this.executor?.isSupported()) {
            return { entries, results };
        }
        for (const hook of stageHooks.filter(item => item.type !== 'http')) {
            const entry = await this.runHook(stage, hook, context, signal);
            if (entry) {
                entries.push(entry);
            }
        }
        return { entries, results };
    }

    registerFunction(stage: AgentLifecycleHookStage, hook: AgentFunctionHookDefinition): void {
        const normalized = this.normalizeFunctionHook(hook);
        if (!normalized) {
            return;
        }
        const list = this.functionHooks[stage] ?? [];
        list.push(normalized);
        this.functionHooks[stage] = list;
    }

    unregisterFunction(stage: AgentLifecycleHookStage, name?: string): void {
        const list = this.functionHooks[stage];
        if (!list?.length) {
            return;
        }
        if (!name) {
            delete this.functionHooks[stage];
            return;
        }
        this.functionHooks[stage] = list.filter(hook => hook.name !== name);
    }

    private collectFunctionHooks(functions: AgentFunctionHooksOptions | undefined): Partial<Record<AgentLifecycleHookStage, AgentFunctionHookDefinition[]>> {
        const collected: Partial<Record<AgentLifecycleHookStage, AgentFunctionHookDefinition[]>> = {};
        if (!functions) {
            return collected;
        }
        for (const stage of this.stages()) {
            const value = functions[stage];
            if (!value) {
                continue;
            }
            const list = (Array.isArray(value) ? value : [value])
                .map(hook => this.normalizeFunctionHook(hook))
                .filter((hook): hook is AgentFunctionHookDefinition => !!hook);
            if (list.length) {
                collected[stage] = list;
            }
        }
        return collected;
    }

    private normalizeFunctionStageHooks(stage: AgentLifecycleHookStage): AgentFunctionHookDefinition[] {
        return this.functionHooks[stage] ?? [];
    }

    private normalizeFunctionHook(hook: AgentFunctionHookDefinition | undefined | null): AgentFunctionHookDefinition | null {
        if (!hook || typeof hook !== 'object' || typeof hook.handler !== 'function') {
            return null;
        }
        return {
            name: String(hook.name || '').trim() || undefined,
            handler: hook.handler
        };
    }

    private async runFunctionHook(hook: AgentFunctionHookDefinition, context: AgentHookContext): Promise<AgentHookExecutionResult> {
        const startedAt = Date.now();
        try {
            const result = await hook.handler(context);
            const durationMs = typeof result?.durationMs === 'number'
                ? result.durationMs
                : Math.max(0, Date.now() - startedAt);
            return {
                exitCode: typeof result?.exitCode === 'number' ? result.exitCode : 0,
                stdout: String(result?.stdout ?? ''),
                stderr: String(result?.stderr ?? ''),
                durationMs,
                ...(result?.error ? { error: result.error } : {}),
                ...(result?.input !== undefined ? { input: result.input } : {}),
                ...(result?.action === 'deny' || result?.action === 'allow' ? { action: result.action } : {})
            };
        } catch (error) {
            return {
                exitCode: 1,
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                durationMs: Math.max(0, Date.now() - startedAt),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private toFunctionTranscriptEntry(
        stage: AgentLifecycleHookStage,
        hook: AgentFunctionHookDefinition,
        result: AgentHookExecutionResult
    ): AgentHookTranscriptEntry | null {
        const stdout = String(result.stdout || '').trim();
        const error = String(result.error || '').trim();
        if (!stdout && !error) {
            return null;
        }
        return {
            stage,
            name: hook.name ?? 'function',
            content: this.wrapOutput(stage, hook.name ?? 'function', stdout || error),
            exitCode: result.exitCode,
            durationMs: result.durationMs,
            stderr: error || undefined
        };
    }

    private stages(): AgentLifecycleHookStage[] {
        return ['beforeTurn', 'afterTurn', 'beforeTool', 'afterTool', 'onApproval', 'beforeCompaction', 'afterCompaction'];
    }

    private normalizeStageHooks(stage: AgentLifecycleHookStage): AgentHookDefinition[] {
        const value = this.hooks?.[stage];
        if (!value) {
            return [];
        }
        const hooks = Array.isArray(value) ? value : [value];
        return hooks
            .map(hook => this.normalizeHook(hook))
            .filter((hook): hook is AgentHookDefinition => !!hook);
    }

    private normalizeHook(hook: AgentHookDefinition | undefined | null): AgentHookDefinition | null {
        if (!hook || typeof hook !== 'object') {
            return null;
        }
        const type = hook.type === 'http' || hook.type === 'mcp' || hook.type === 'prompt' || hook.type === 'subagent'
            ? hook.type
            : 'command';
        const command = String(hook.command || '').trim();
        const url = String(hook.url || '').trim();
        if (type === 'command' && !command) {
            return null;
        }
        if (type === 'http' && !/^https?:\/\//i.test(url)) {
            return null;
        }
        if (type === 'mcp' && !String(hook.tool || '').trim()) {
            return null;
        }
        if (type === 'prompt' && !String(hook.prompt || '').trim()) {
            return null;
        }
        if (type === 'subagent' && !String(hook.agent || hook.prompt || '').trim()) {
            return null;
        }
        if (this.hooks?.requireTrust && hook.trusted !== true) {
            return null;
        }
        return {
            name: String(hook.name || '').trim() || undefined,
            type,
            ...(command ? { command } : {}),
            ...(type === 'http' ? {
                url,
                method: hook.method === 'GET' ? 'GET' as const : 'POST' as const,
                headers: hook.headers && typeof hook.headers === 'object'
                    ? Object.entries(hook.headers).reduce((headers, [key, value]) => {
                        if (value != null) {
                            headers[String(key)] = String(value);
                        }
                        return headers;
                    }, {} as Record<string, string>)
                    : undefined
            } : {}),
            args: Array.isArray(hook.args) ? hook.args.map(arg => String(arg)) : [],
            cwd: String(hook.cwd || '').trim() || undefined,
            env: hook.env && typeof hook.env === 'object' ? Object.entries(hook.env).reduce((env, [key, value]) => {
                if (value == null) {
                    return env;
                }
                env[String(key)] = String(value);
                return env;
            }, {} as Record<string, string>) : undefined,
            timeoutMs: typeof hook.timeoutMs === 'number' && Number.isFinite(hook.timeoutMs) ? hook.timeoutMs : undefined,
            trusted: hook.trusted === true ? true : undefined,
            ...(hook.tool ? { tool: String(hook.tool).trim() } : {}),
            ...(hook.server ? { server: String(hook.server).trim() } : {}),
            ...(hook.prompt ? { prompt: String(hook.prompt) } : {}),
            ...(hook.agent ? { agent: String(hook.agent).trim() } : {})
        };
    }

    private async runHttpHook(
        stage: AgentLifecycleHookStage,
        hook: AgentHookDefinition,
        context: AgentHookContext,
        signal?: AbortSignal
    ): Promise<AgentHookTranscriptEntry | null> {
        const startedAt = Date.now();
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        signal?.addEventListener('abort', onAbort, { once: true });
        const timer = hook.timeoutMs && hook.timeoutMs > 0
            ? setTimeout(() => controller.abort(), hook.timeoutMs)
            : undefined;
        const fetchImpl = this.hooks?.fetch ?? globalThis.fetch;
        if (!fetchImpl) {
            return {
                stage,
                name: hook.name ?? hook.url ?? 'http',
                content: this.wrapOutput(stage, hook.name ?? hook.url ?? 'http', ''),
                exitCode: 1,
                durationMs: Math.max(0, Date.now() - startedAt),
                stderr: 'fetch is not available in this environment.'
            };
        }
        try {
            const response = await fetchImpl(hook.url!, {
                method: hook.method ?? 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...(hook.headers ?? {})
                },
                body: hook.method === 'GET' ? undefined : this.safeStringify({ stage, context, timestamp: Date.now() }),
                signal: controller.signal
            });
            const body = await response.text();
            if (!body.trim()) {
                return null;
            }
            return {
                stage,
                name: hook.name ?? hook.url ?? 'http',
                content: this.wrapOutput(stage, hook.name ?? hook.url ?? 'http', body),
                exitCode: response.ok ? 0 : 1,
                durationMs: Math.max(0, Date.now() - startedAt),
                stderr: response.ok ? undefined : `HTTP ${response.status}`
            };
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError' && signal?.aborted) {
                return null;
            }
            const message = error instanceof Error ? error.message : String(error);
            return {
                stage,
                name: hook.name ?? hook.url ?? 'http',
                content: this.wrapOutput(stage, hook.name ?? hook.url ?? 'http', ''),
                exitCode: 1,
                durationMs: Math.max(0, Date.now() - startedAt),
                stderr: message
            };
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
            signal?.removeEventListener('abort', onAbort);
        }
    }

    private async runHook(
        stage: AgentLifecycleHookStage,
        hook: AgentHookDefinition,
        context: AgentHookContext,
        signal?: AbortSignal
    ): Promise<AgentHookTranscriptEntry | null> {
        if (!this.executor?.isSupported()) {
            return null;
        }
        const command = hook.command ?? '';
        const payload = this.safeStringify({
            stage,
            hook: {
                name: hook.name ?? command,
                command,
                args: hook.args ?? []
            },
            context,
            timestamp: Date.now()
        });
        try {
            const result = await this.executor.execute({
                command,
                args: hook.args ?? [],
                stdin: payload,
                context,
                cwd: hook.cwd ?? context.workspace,
                env: this.buildEnvironment(stage, hook, context),
                timeoutMs: hook.timeoutMs,
                signal
            });
            const stdout = String(result.stdout || '').trim();
            if (!stdout) {
                return null;
            }
            return {
                stage,
                name: hook.name ?? command,
                content: this.wrapOutput(stage, hook.name ?? command, stdout),
                exitCode: result.exitCode,
                durationMs: result.durationMs,
                stderr: String(result.stderr || '').trim() || undefined
            };
        } catch (error) {
            return {
                stage,
                name: hook.name ?? command,
                content: this.wrapOutput(stage, hook.name ?? command, ''),
                exitCode: 1,
                durationMs: 0,
                stderr: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private buildEnvironment(stage: AgentLifecycleHookStage, hook: AgentHookDefinition, context: AgentHookContext): Record<string, string> {
        return {
            TSDI_AGENT_HOOK_STAGE: stage,
            TSDI_AGENT_HOOK_NAME: hook.name ?? hook.command ?? '',
            TSDI_AGENT_SESSION_ID: context.sessionId,
            ...(context.principalId ? { TSDI_AGENT_PRINCIPAL_ID: context.principalId } : {}),
            ...(context.workspace ? { TSDI_AGENT_WORKSPACE: context.workspace } : {}),
            ...(hook.env ?? {})
        };
    }

    private wrapOutput(stage: AgentLifecycleHookStage, name: string, stdout: string): string {
        const body = stdout.trim();
        return [
            `[hook ${stage}${name ? `:${name}` : ''}]`,
            body,
            '[/hook]'
        ].filter(Boolean).join('\n');
    }

    private safeStringify(value: any): string {
        const seen = new WeakSet<object>();
        try {
            return JSON.stringify(value, (_key, current) => {
                if (typeof current === 'bigint') {
                    return current.toString();
                }
                if (current && typeof current === 'object') {
                    if (seen.has(current)) {
                        return '[circular]';
                    }
                    seen.add(current);
                }
                return current;
            });
        } catch {
            return '{}';
        }
    }
}
