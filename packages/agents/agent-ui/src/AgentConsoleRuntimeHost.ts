import type { AgentRuntime, SandboxMode, ToolRegistry } from '@tsdi/agent';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { AgentConsoleSettingsHost } from './AgentConsoleSettingsHost';
import { EffortLevel, ModelHandlerContext } from './AgentConsoleModelHandlers';
import type { ModelHandlerContext as _ModelHandlerContext } from './AgentConsoleModelHandlers';
import {
    activateModelProfile,
    consumePendingTurnModelProfile,
    cycleModelVariant,
    cycleRecentModel,
    persistModelStore,
    queueNextTurnModelProfile,
    recordRecentModel,
    restoreModelStore,
    setModelReasoningEffort,
    toggleModelFavorite
} from './AgentConsoleModelHandlers';
import { runGoalCommand as runGoalCommandView } from './AgentConsolePolicyCommands';
import { runStatusCommand } from './AgentConsoleRuntimeCommands';
import { buildGitSnapshotDiffLines as buildGitSnapshotDiffLinesView } from './AgentConsoleGitView';
import {
    openGitSnapshotDiff as openGitSnapshotDiffView,
    openGitSnapshotList as openGitSnapshotListView,
    revertGitSnapshotFromDetail as revertGitSnapshotFromDetailView,
    runGitSnapshotsCommand as runGitSnapshotsCommandView
} from './AgentConsoleGitSnapshotCommands';
import { refreshTools as refreshToolsView } from './AgentConsoleToolsView';
import { gitSnapshotCommandHost, policyCommandHost, runtimeHost } from './AgentConsoleHostFactories';
import { modelCtx } from './AgentConsoleHandlerContexts';

/** Runtime, sandbox, undo/redo, git snapshot, model store and tool activation commands. */
export abstract class AgentConsoleRuntimeCommandHost extends AgentConsoleSettingsHost {
    protected abstract runtime: AgentRuntime;
    protected abstract toolRegistry?: ToolRegistry | null;
    protected abstract modelCtx(): ModelHandlerContext;
    protected abstract loadTools(sessionId?: string): Promise<any[]>;

    protected async runStatusCommand(): Promise<void> {
        return runStatusCommand(runtimeHost(this));
    }

    protected async runGoalCommand(args: string): Promise<void> {
        return runGoalCommandView(policyCommandHost(this), args);
    }

    protected async setSessionSandboxMode(
        sessionId: string,
        mode: import('@tsdi/agent').SandboxMode | null
    ): Promise<void> {
        if (this.appRpc) {
            await this.appRpc.request('session.sandbox_mode.set', { sessionId, mode: mode ?? 'default' }, this.rpcRequestContext());
            return;
        }
        this.runtime.setSessionSandboxMode(sessionId, mode);
    }

    protected async getSessionSandboxMode(sessionId: string): Promise<string> {
        if (this.appRpc) {
            const result = await this.appRpc.request('session.sandbox_mode.get', { sessionId }, this.rpcRequestContext()).catch(() => null);
            return String(result?.mode || 'default');
        }
        return this.runtime.getSessionSandboxMode(sessionId) ?? 'default';
    }

    protected async getSessionDelegationMode(sessionId: string): Promise<string> {
        if (this.appRpc) {
            const result = await this.appRpc.request('session.delegation_mode.get', { sessionId }, this.rpcRequestContext()).catch(() => null);
            return String(result?.mode || 'explicit');
        }
        return this.runtime.getSessionDelegationMode(sessionId) ?? 'explicit';
    }

    protected async runUndoCommand(): Promise<void> {
        await this.runFileUndoRedo('undo');
    }

    protected async runRedoCommand(): Promise<void> {
        await this.runFileUndoRedo('redo');
    }

    protected async runFileUndoRedo(direction: 'undo' | 'redo'): Promise<void> {
        const sessionId = this.state.sessionId;
        try {
            const result = this.appRpc
                ? await this.appRpc.request(direction === 'undo' ? 'session.undo_file' : 'session.redo_file', { sessionId }, this.rpcRequestContext())
                : direction === 'undo'
                    ? await this.runtime.undoFileChange(sessionId)
                    : await this.runtime.redoFileChange(sessionId);
            if (!result || result.restored === 'none') {
                this.notify(direction === 'undo' ? formatAgentUiNotice(this.translator, 'nothingToUndo') : formatAgentUiNotice(this.translator, 'nothingToRedo'));
                return;
            }
            this.notify(direction === 'undo'
                ? formatAgentUiNotice(this.translator, 'undidFile', { filePath: result.filePath, restored: result.restored })
                : formatAgentUiNotice(this.translator, 'redidFile', { filePath: result.filePath, restored: result.restored }));
        } catch (error) {
            this.notify(direction === 'undo'
                ? formatAgentUiNotice(this.translator, 'failedUndo', { error: error instanceof Error ? error.message : String(error) })
                : formatAgentUiNotice(this.translator, 'failedRedo', { error: error instanceof Error ? error.message : String(error) }));
        }
    }

    protected async runGitSnapshotsCommand(args: string): Promise<void> {
        return runGitSnapshotsCommandView(gitSnapshotCommandHost(this), args);
    }

    protected async openGitSnapshotList(): Promise<void> {
        return openGitSnapshotListView(gitSnapshotCommandHost(this));
    }

    protected async openGitSnapshotDiff(ref: string): Promise<void> {
        return openGitSnapshotDiffView(gitSnapshotCommandHost(this), ref);
    }

    protected async revertGitSnapshotFromDetail(): Promise<void> {
        return revertGitSnapshotFromDetailView(gitSnapshotCommandHost(this));
    }

    protected buildGitSnapshotDiffLines(diff: Record<string, any>): string[] {
        return buildGitSnapshotDiffLinesView(diff);
    }

    protected async activateModelProfile(profileName: string, reasoningEffort?: any, silent = false): Promise<void> {
        return activateModelProfile(this.modelCtx(), profileName, reasoningEffort, silent);
    }

    protected async restoreModelStore(): Promise<void> {
        return restoreModelStore(this.modelCtx());
    }

    protected async persistModelStore(): Promise<void> {
        return persistModelStore(this.modelCtx());
    }

    protected async toggleModelFavorite(): Promise<void> {
        return toggleModelFavorite(this.modelCtx());
    }

    protected async cycleRecentModel(delta: 1 | -1): Promise<void> {
        return cycleRecentModel(this.modelCtx(), delta);
    }

    protected async cycleModelVariant(): Promise<void> {
        return cycleModelVariant(this.modelCtx());
    }

    protected async setModelReasoningEffort(next: EffortLevel): Promise<void> {
        return setModelReasoningEffort(this.modelCtx(), next);
    }

    protected async recordRecentModel(name: string): Promise<void> {
        return recordRecentModel(this.modelCtx(), name);
    }

    protected async queueNextTurnModelProfile(profileName: string): Promise<void> {
        return queueNextTurnModelProfile(this.modelCtx(), profileName);
    }

    protected consumePendingTurnModelProfile(): string | undefined {
        return consumePendingTurnModelProfile(this.modelCtx());
    }

    protected async activateTool(name: string): Promise<boolean> {
        return this.activateToolForSession(name, this.state.sessionId);
    }

    protected async activateToolForSession(name: string, sessionId: string): Promise<boolean> {
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.activate', { sessionId, name }, this.rpcRequestContext());
            return result?.activated !== false;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.activateTool !== 'function') {
            return false;
        }
        return !!(await this.toolRegistry.activateTool(sessionId, name));
    }

    protected async refreshTools(sessionId = this.state.sessionId): Promise<void> {
        return refreshToolsView({
            state: this.state,
            appRpc: this.appRpc,
            toolRegistry: this.toolRegistry,
            loadTools: (sid) => this.loadTools(sid)
        }, sessionId);
    }
}
