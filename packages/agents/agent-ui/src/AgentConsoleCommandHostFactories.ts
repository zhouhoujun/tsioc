import type { AgentMessage, AgentTurnMessageInput, SandboxMode } from '@tsdi/agent';
import type { AgentConsoleApprovalRequest, AgentConsoleCommandOutputEntry, AgentConsolePendingAttachment } from './AgentConsoleSessionState';
import type { AgentConsoleRuntimeHost } from './AgentConsoleRuntimeCommands';
import type { AgentConsoleSessionOpenHost } from './AgentConsoleSessionOpen';
import { restoreSessionModes as restoreSessionModesView } from './AgentConsoleSessionOpen';
import type { AgentConsoleCommandDispatchHost } from './AgentConsoleCommandDispatch';
import type { AgentConsoleTurnStreamHost } from './AgentConsoleTurnStreamController';
import type { AgentConsoleSessionContentLoaderHost } from './AgentConsoleSessionContentLoader';
import type { TodoPlanCommandHost } from './AgentConsoleTodoPlanCommands';
import type { AgentConsoleRpcCommandHost } from './AgentConsoleRpcCommands';
import type { BackgroundTaskCommandHost } from './AgentConsoleBackgroundTaskCommands';
import { scrollAgentConsoleTranscript } from './AgentConsoleTranscriptLayout';
import type { KeymapCommandHost } from './AgentConsoleKeymapCommands';
import type { AgentConsoleGlobalKeyInputHost } from './AgentConsoleGlobalKeyInputController';
import type { AgentConsoleTerminalInputHost } from './AgentConsoleTerminalInputController';
import type { AgentConsoleTurnInputHost } from './AgentConsoleTurnInputController';
import type { PromptMentionHost } from './AgentConsolePromptMentions';
import type { ApprovalInspectorHost } from './AgentConsoleApprovalCommands';
import type { SettingsPanelHost } from './AgentConsoleSettingsCommands';
import type { ShellCommandHost } from './AgentConsoleShellCommands';
import type { StashCommandHost } from './AgentConsoleStashCommands';
import type { GitSnapshotCommandHost } from './AgentConsoleGitSnapshotCommands';
import type { ExtensionCommandHost } from './AgentConsoleExtensionCommands';
import type { PolicyCommandHost } from './AgentConsolePolicyCommands';
import type { PreferenceCommandHost } from './AgentConsolePreferenceCommands';


export function settingsPanelHost(self: any): SettingsPanelHost {
    return {
        state: self.state,
        options: self.options, translator: self.translator,
        activeThemeName: self.activeThemeName,
        yoloMode: self.yoloMode,
        modelReasoningEffort: self.modelReasoningEffort,
        select: (title: string, opts: any[], index: number, hint?: string) => self.select(title, opts, index, hint),
        notify: (message: string) => self.notify(message),
        runThemeCommand: () => self.runThemeCommand(),
        runVimCommand: (args?: string) => self.runVimCommand(args || ''),
        runDisplayCommand: (args?: string) => self.runDisplayCommand(args),
        runLayoutCommand: (args?: string) => self.runLayoutCommand(args),
        runRawModeCommand: () => self.runRawModeCommand(),
        runFastCommand: (args?: string) => self.runFastCommand(args),
        runStatusCommand: () => self.runStatusCommand(),
        runKeymapCommand: (args: string) => self.runKeymapCommand(args),
        openModelSwitcher: () => self.openModelSwitcher(),
        openSettingsThinkingLevel: () => self.openSettingsThinkingLevel(),
        openSettingsLanguage: () => self.openSettingsLanguage(),
        setYoloMode: (enabled: boolean, showNotice?: boolean) => self.setYoloMode(enabled, showNotice),
        persistSettings: (patch: any) => self.persistSettings(patch)
    };
}
export function shellCommandHost(self: any): ShellCommandHost {
    
    return {
        state: self.state,
        get shellMultilineMode() { return self.shellMultilineMode; },
        set shellMultilineMode(value: boolean) { self.shellMultilineMode = value; },
        get shellDraftLines() { return self.shellDraftLines; },
        set shellDraftLines(value: string[]) { self.shellDraftLines = value; },
        isTurnInProgress: () => self.isTurnInProgress(),
        notifyBusyState: (message?: string) => self.notifyBusyState(message),
        notify: (message: string) => self.notify(message), translator: self.translator,
        invokeTerminalTool: (command: string) => self.invokeTerminalTool(command),
        updateShellMessage: (id: string, patch: Partial<AgentMessage>) => self.updateShellMessage(id, patch)
    };
}
export function stashCommandHost(self: any): StashCommandHost {
    return {
        state: self.state,
        stashStore: self.stashStore, translator: self.translator,
        resolveHistoryWorkspace: () => self.resolveHistoryWorkspace(),
        notify: (message: string) => self.notify(message),
        pushCommandOutput: (command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']) => self.pushCommandOutput(command, text, kind)
    };
}
export function gitSnapshotCommandHost(self: any): GitSnapshotCommandHost {
    return {
        state: self.state,
        sessionService: self.sessionService,
        notify: (message: string) => self.notify(message), translator: self.translator,
        select: (title: string, opts: any[], index: number, hint?: string) => self.select(title, opts, index, hint)
    };
}
export function extensionCommandHost(self: any): ExtensionCommandHost {
    return {
        state: self.state,
        options: self.options,
        notify: (message: string) => self.notify(message), translator: self.translator,
        select: (title: string, opts: any[], index: number, hint?: string) => self.select(title, opts, index, hint),
        pushCommandOutput: (command: string, out: string, kind?: AgentConsoleCommandOutputEntry['kind']) => self.pushCommandOutput(command, out, kind),
        invokeTool: (name: string, input?: any) => self.invokeTool(name, input)
    };
}
export function policyCommandHost(self: any): PolicyCommandHost {
    return {
        state: self.state,
        options: self.options,
        runtime: self.runtime,
        appRpc: self.appRpc,
        notify: (message: string) => self.notify(message), translator: self.translator,
        rpcRequestContext: () => self.rpcRequestContext(),
        getSessionDelegationMode: (sessionId: string) => self.getSessionDelegationMode(sessionId),
        getSessionSandboxMode: (sessionId: string) => self.getSessionSandboxMode(sessionId),
        setSessionSandboxMode: (sessionId: string, mode: SandboxMode | null) => self.setSessionSandboxMode(sessionId, mode),
        setYoloMode: (enabled: boolean) => self.setYoloMode(enabled, false),
        persistSettings: async (patch: Record<string, any>) => { await self.appRpc?.request('settings.ui.set', patch).catch(() => undefined); await self.persistSettings(patch); },
        select: (title: string, options: any[], index?: number, hint?: string) => self.select(title, options, index, hint),
        runPlanCommand: (args: string) => self.runPlanCommand(args)
    };
}
export function preferenceCommandHost(self: any): PreferenceCommandHost {
    return {
        state: self.state,
        options: self.options,
        workspace: self.workspace,
        runtime: self.runtime,
        appRpc: self.appRpc,
        projectMemory: self.projectMemory, translator: self.translator,
        rpcRequestContext: () => self.rpcRequestContext(),
        notify: (message: string) => self.notify(message),
        persistSettings: async (patch: Record<string, any>) => { await self.appRpc?.request('settings.ui.set', patch).catch(() => undefined); await self.persistSettings(patch); },
        pushCommandOutput: (command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']) => self.pushCommandOutput(command, text, kind)
    };
}

export function sessionOpenHost(self: any): AgentConsoleSessionOpenHost {
            return {
            sessionService: self.sessionService,
            startupWorkspace: self.startupWorkspace,
            options: self.options,
            state: self.state,
            translator: self.translator,
            transcriptNavigationController: self.transcriptNavigationController,
            queuedPrompts: self.queuedPrompts,
            get openSessionRequestId() { return self.openSessionRequestId; },
            set openSessionRequestId(value: number) { self.openSessionRequestId = value; },
            get freshSessionScoped() { return self.freshSessionScoped; },
            set freshSessionScoped(value: boolean) { self.freshSessionScoped = value; },
            get openReviewRequestId() { return self.openReviewRequestId; },
            set openReviewRequestId(value: number) { self.openReviewRequestId = value; },
            get taskViewContextVersion() { return self.taskViewContextVersion; },
            set taskViewContextVersion(value: number) { self.taskViewContextVersion = value; },
            get editTargetMessageId() { return self.editTargetMessageId; },
            set editTargetMessageId(value: string) { self.editTargetMessageId = value; },
            get editDraftBefore() { return self.editDraftBefore; },
            set editDraftBefore(value: string) { self.editDraftBefore = value; },
            get editAttachmentsBefore() { return self.editAttachmentsBefore; },
            set editAttachmentsBefore(value: any[]) { self.editAttachmentsBefore = value; },
            get lastEditSessionMessageId() { return self.lastEditSessionMessageId; },
            set lastEditSessionMessageId(value: string) { self.lastEditSessionMessageId = value; },
            get editDismissedAt() { return self.editDismissedAt; },
            set editDismissedAt(value: number) { self.editDismissedAt = value; },
            get lastEscapeAt() { return self.lastEscapeAt; },
            set lastEscapeAt(value: number) { self.lastEscapeAt = value; },
            isTurnInProgress: () => self.isTurnInProgress(),
            persistInputHistory: () => self.persistInputHistory(),
            notifyBusyState: (message: string) => self.notifyBusyState(message),
            updateTerminalTitle: () => self.updateTerminalTitle(),
            refreshSessions: (currentId?: string) => self.refreshSessions(currentId),
            resolveProjectSessionIdsFor: (sessionId: string) => self.resolveProjectSessionIdsFor(sessionId),
            loadSessionPage: (sessionId: string) => self.loadSessionPage(sessionId),
            refreshTools: (sessionId?: string) => self.refreshTools(sessionId),
            refreshPendingApprovals: (sessionId?: string) => self.refreshPendingApprovals(sessionId),
            refreshTodoPlan: (sessionId?: string) => self.refreshTodoPlan(sessionId),
            loadCodingTasks: (sessionId?: string, projectSessionIds?: string[]) => self.loadCodingTasks(sessionId, projectSessionIds),
            restoreInputHistory: () => self.restoreInputHistory(),
            restoreSessionModes: (sessionId: string) => restoreSessionModesView({ appRpc: self.appRpc, runtime: self.runtime, state: self.state, rpcRequestContext: () => self.rpcRequestContext() }, sessionId)
        };
    }

export function commandDispatchHost(self: any): AgentConsoleCommandDispatchHost {
            return {
            state: self.state,
            get pendingCommandRequestId() { return self.pendingCommandRequestId; },
            set pendingCommandRequestId(value) { self.pendingCommandRequestId = value; },
            resolveUniqueCommandPrefix: (input) => self.resolveUniqueCommandPrefix(input),
            notify: (message, duration) => self.notify(message, duration),
            buildCommandContext: (abortSignal) => self.buildCommandContext(abortSignal),
            beginRenderBatch: () => self.surfaceAccessor?.beginRenderBatch?.(),
            endRenderBatch: () => self.surfaceAccessor?.endRenderBatch?.()
        };
    }

export function turnStreamHost(self: any): AgentConsoleTurnStreamHost {
        return {
            state: self.state,
            destroyed: self.destroyed, translator: self.translator,
            appRpc: self.appRpc,
            runtime: self.runtime,
            updateTerminalTitle: () => self.updateTerminalTitle(),
            executeTurn: (input, message, profile) => self.executeTurn(input, message, profile),
            refreshTodoPlan: () => self.refreshTodoPlan(),
            refreshPendingApprovals: () => self.refreshPendingApprovals()
        };
    }

export function sessionContentLoaderHost(self: any): AgentConsoleSessionContentLoaderHost {
        return {
            sessionService: self.sessionService,
            runtime: self.runtime,
            translator: self.translator
        };
    }

export function todoPlanCommandHost(self: any): TodoPlanCommandHost {
        return {
            appRpc: self.appRpc ?? null,
            state: self.state,
            loadLocalTodoPlan: sessionId => self.loadLocalTodoPlan(sessionId),
            normalizeTodoStatus: status => self.normalizeTodoStatus(status)
        };
    }

export function rpcCommandHost(self: any): AgentConsoleRpcCommandHost {
        return {
            appRpc: self.appRpc,
            state: self.state,
            runtime: self.runtime,
            translator: self.translator,
            queuedPrompts: self.queuedPrompts,
            notify: (message: string) => self.notify(message),
            select: (title: string, options: any[], selectedIndex?: number, hint?: string) => self.select(title, options, selectedIndex, hint),
            pushCommandOutput: (command: string, text: string) => self.pushCommandOutput(command, text),
            rpcRequestContext: (requestId?: string) => self.rpcRequestContext(requestId),
            revokeShare: (token: string) => self.revokeShare(token)
        };
    }

export function backgroundTaskCommandHost(self: any): BackgroundTaskCommandHost {
        return {
            backgroundTasks: self.backgroundTasks ?? null,
            state: self.state,
            notify: message => self.notify(message), translator: self.translator,
            pushCommandOutput: (command, text) => self.pushCommandOutput(command, text)
        };
    }
