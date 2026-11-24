import type { SessionStore } from '../memory/SessionStore';
import type { AgentMessage } from './AgentMessage';
import type { AgentHookContext, AgentHookExecutionResult, AgentFunctionHookDefinition, AgentHookTranscriptEntry } from '../hooks/AgentHooks';
import type { AgentHookManager } from '../hooks/AgentHooks';
import type { AgentLifecycleHookStage } from '../hooks/AgentHooks';

export interface HookControllerHost {
    hookManager?: AgentHookManager;
    sessions: SessionStore;
    signal(sessionId: string): AbortSignal | undefined;
    workspace?(sessionId: string): Promise<string | undefined>;
    createMessage(role: 'system', content: string, metadata?: Record<string, any>): AgentMessage;
}

/** Lifecycle hook execution plus transcript entries for hook output. */
export class HookController {
    private overrideManager?: AgentHookManager;

    constructor(private readonly host: HookControllerHost) {
    }

    /** Plugins rebuild the hook manager; keep the controller on the live instance. */
    setManager(manager?: AgentHookManager): void {
        this.overrideManager = manager;
    }

    private get manager(): AgentHookManager | undefined {
        return this.overrideManager ?? this.host.hookManager;
    }

    async run(stage: AgentHookContext['stage'], sessionId: string, context: AgentHookContext): Promise<AgentHookExecutionResult[]> {
        if (!this.manager?.hasHooks(stage)) {
            return [];
        }
        const output = await this.manager.run(stage, context, this.host.signal(sessionId));
        await this.appendOutputs(sessionId, output.entries);
        return output.results;
    }

    /** P2.3: model.request / model.response observation hooks (no request mutation). */
    async runModel(stage: 'model.request' | 'model.response', sessionId: string, model: Record<string, any>): Promise<void> {
        if (!this.manager?.hasHooks(stage)) {
            return;
        }
        const output = await this.manager.run(stage, {
            sessionId,
            workspace: await this.host.workspace?.(sessionId),
            stage,
            model
        }, this.host.signal(sessionId));
        await this.appendOutputs(sessionId, output.entries);
    }

    /** P2.3: config.observe hooks fire when runtime options change (not persisted to a session). */
    async runConfig(config: Record<string, any>): Promise<void> {
        if (!this.manager?.hasHooks('config.observe')) {
            return;
        }
        await this.manager.run('config.observe', { sessionId: '', stage: 'config.observe', config })
            .catch(() => undefined);
    }

    register(stage: AgentLifecycleHookStage, hook: AgentFunctionHookDefinition): void {
        this.manager?.registerFunction(stage, hook);
    }

    unregister(stage: AgentLifecycleHookStage, name?: string): void {
        this.manager?.unregisterFunction(stage, name);
    }

    summary(): Array<{ stage: AgentLifecycleHookStage; commands: string[]; functions: string[] }> {
        return this.manager ? this.manager.describe() : [];
    }

    private async appendOutputs(sessionId: string, entries: AgentHookTranscriptEntry[]): Promise<void> {
        if (!entries.length) {
            return;
        }
        for (const entry of entries) {
            await this.host.sessions.append(sessionId, this.host.createMessage('system', entry.content, {
                kind: 'hook',
                hookStage: entry.stage,
                hookName: entry.name,
                exitCode: entry.exitCode,
                durationMs: entry.durationMs,
                stderr: entry.stderr
            }));
        }
    }
}
