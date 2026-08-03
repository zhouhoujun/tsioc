import { Abstract, Injectable } from '@tsdi/ioc';

export type AgentLifecycleHookStage = 'beforeTurn' | 'afterTurn' | 'beforeTool' | 'afterTool' | 'onApproval';

export interface AgentHookDefinition {
    name?: string;
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
}

export interface AgentHooksOptions {
    beforeTurn?: AgentHookDefinition | AgentHookDefinition[];
    afterTurn?: AgentHookDefinition | AgentHookDefinition[];
    beforeTool?: AgentHookDefinition | AgentHookDefinition[];
    afterTool?: AgentHookDefinition | AgentHookDefinition[];
    onApproval?: AgentHookDefinition | AgentHookDefinition[];
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
}

export interface AgentHookTranscriptEntry {
    stage: AgentLifecycleHookStage;
    name: string;
    content: string;
    exitCode: number;
    durationMs: number;
    stderr?: string;
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
    constructor(
        private readonly hooks: AgentHooksOptions | undefined,
        private readonly executor?: AgentHookCommandExecutor | null
    ) {
    }

    hasHooks(stage?: AgentLifecycleHookStage): boolean {
        if (!this.hooks) {
            return false;
        }
        if (!stage) {
            return this.stages().some(name => this.normalizeStageHooks(name).length > 0);
        }
        return this.normalizeStageHooks(stage).length > 0;
    }

    async run(stage: AgentLifecycleHookStage, context: AgentHookContext): Promise<AgentHookTranscriptEntry[]> {
        const hooks = this.normalizeStageHooks(stage);
        if (!hooks.length || !this.executor?.isSupported()) {
            return [];
        }
        const entries: AgentHookTranscriptEntry[] = [];
        for (const hook of hooks) {
            const entry = await this.runHook(stage, hook, context);
            if (entry) {
                entries.push(entry);
            }
        }
        return entries;
    }

    private stages(): AgentLifecycleHookStage[] {
        return ['beforeTurn', 'afterTurn', 'beforeTool', 'afterTool', 'onApproval'];
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
