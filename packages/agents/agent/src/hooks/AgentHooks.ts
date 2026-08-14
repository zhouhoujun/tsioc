import { Abstract, Injectable } from '@tsdi/ioc';

export type AgentLifecycleHookStage = 'beforeTurn' | 'afterTurn' | 'beforeTool' | 'afterTool' | 'onApproval' | 'beforeCompaction' | 'afterCompaction';

export interface AgentHookDefinition {
    name?: string;
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
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
}

export interface AgentHookExecutionResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
    error?: string;
    /** beforeTool only: replacement tool input applied before execution. */
    input?: any;
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

    constructor(
        private readonly hooks: AgentHooksOptions | undefined,
        private readonly executor?: AgentHookCommandExecutor | null
    ) {
        this.functionHooks = this.collectFunctionHooks(this.hooks?.functions);
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
            commands: this.normalizeStageHooks(stage).map(hook => hook.command),
            functions: this.normalizeFunctionStageHooks(stage).map(hook => hook.name ?? 'function')
        }));
    }

    async run(stage: AgentLifecycleHookStage, context: AgentHookContext): Promise<AgentHookRunOutput> {
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
        if (!this.executor?.isSupported()) {
            return { entries, results };
        }
        for (const hook of this.normalizeStageHooks(stage)) {
            const entry = await this.runHook(stage, hook, context);
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
                ...(result?.input !== undefined ? { input: result.input } : {})
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
        const command = String(hook.command || '').trim();
        if (!command) {
            return null;
        }
        return {
            name: String(hook.name || '').trim() || undefined,
            command,
            args: Array.isArray(hook.args) ? hook.args.map(arg => String(arg)) : [],
            cwd: String(hook.cwd || '').trim() || undefined,
            env: hook.env && typeof hook.env === 'object' ? Object.entries(hook.env).reduce((env, [key, value]) => {
                if (value == null) {
                    return env;
                }
                env[String(key)] = String(value);
                return env;
            }, {} as Record<string, string>) : undefined,
            timeoutMs: typeof hook.timeoutMs === 'number' && Number.isFinite(hook.timeoutMs) ? hook.timeoutMs : undefined
        };
    }

    private async runHook(
        stage: AgentLifecycleHookStage,
        hook: AgentHookDefinition,
        context: AgentHookContext
    ): Promise<AgentHookTranscriptEntry | null> {
        if (!this.executor?.isSupported()) {
            return null;
        }
        const payload = this.safeStringify({
            stage,
            hook: {
                name: hook.name ?? hook.command,
                command: hook.command,
                args: hook.args ?? []
            },
            context,
            timestamp: Date.now()
        });
        try {
            const result = await this.executor.execute({
                command: hook.command,
                args: hook.args ?? [],
                stdin: payload,
                context,
                cwd: hook.cwd ?? context.workspace,
                env: this.buildEnvironment(stage, hook, context),
                timeoutMs: hook.timeoutMs
            });
            const stdout = String(result.stdout || '').trim();
            if (!stdout) {
                return null;
            }
            return {
                stage,
                name: hook.name ?? hook.command,
                content: this.wrapOutput(stage, hook.name ?? hook.command, stdout),
                exitCode: result.exitCode,
                durationMs: result.durationMs,
                stderr: String(result.stderr || '').trim() || undefined
            };
        } catch (error) {
            return {
                stage,
                name: hook.name ?? hook.command,
                content: this.wrapOutput(stage, hook.name ?? hook.command, ''),
                exitCode: 1,
                durationMs: 0,
                stderr: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private buildEnvironment(stage: AgentLifecycleHookStage, hook: AgentHookDefinition, context: AgentHookContext): Record<string, string> {
        return {
            TSDI_AGENT_HOOK_STAGE: stage,
            TSDI_AGENT_HOOK_NAME: hook.name ?? hook.command,
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
