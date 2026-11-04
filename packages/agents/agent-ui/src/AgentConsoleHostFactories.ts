import type { AgentMessage, AgentTurnMessageInput, SandboxMode } from '@tsdi/agent';
import type { AgentConsoleApprovalRequest, AgentConsoleCommandOutputEntry, AgentConsolePendingAttachment } from './AgentConsoleSessionState';
import type { AgentConsoleRuntimeHost } from './AgentConsoleRuntimeCommands';
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

export function runtimeHost(self: any): AgentConsoleRuntimeHost {
    return {
        state: self.state,
        options: self.options,
        runtime: self.runtime,
        appRpc: self.appRpc,
        rawModeStore: self.rawModeStore,
        activeThemeName: self.activeThemeName,
        notify: (message: string) => self.notify(message), translator: self.translator,
        select: (title: string, options: any[], index: number, hint?: string) => self.select(title, options, index, hint),
        pushCommandOutput: (command: string, text: string, kind?: any) => self.pushCommandOutput(command, text, kind),
        applyTheme: (name: string) => self.applyTheme(name),
        applyStatusline: (fields: any[]) => self.applyStatusline(fields as any),
        applyTitleFields: (fields: any[]) => self.applyTitleFields(fields as any),
        activateModelProfile: (profile: string) => self.activateModelProfile(profile),
        resolveHistoryWorkspace: () => self.resolveHistoryWorkspace(),
        getSessionSandboxMode: (sessionId: string) => self.getSessionSandboxMode(sessionId),
        getSessionDelegationMode: (sessionId: string) => self.getSessionDelegationMode(sessionId),
        rpcRequestContext: () => self.rpcRequestContext()
    };
}


export function keymapCommandHost(self: any): KeymapCommandHost {
    
    return {
        state: self.state,
        globalKeymap: self.globalKeymap,
        get keymapRecording() { return self.keymapRecording; },
        set keymapRecording(value) { self.keymapRecording = value; },
        persistGlobalKeymap: () => self.persistGlobalKeymap(),
        notify: (message: string) => self.notify(message), translator: self.translator,
    };
}
export function globalKeyInputHost(self: any): AgentConsoleGlobalKeyInputHost {
    
    return {
        state: self.state,
        transcriptNavigationController: self.transcriptNavigationController,
        dismissFocusLayer: () => self.state.focusLayers.dismiss(self.transcriptNavigationController),
        handleFocusKey: (key: string) => self.state.handleFocusKey(key, self.transcriptNavigationController),
        globalKeymap: self.globalKeymap,
        get globalKeyPending() { return self.globalKeyPending; },
        set globalKeyPending(value) { self.globalKeyPending = value; },
        get keymapRecording() { return self.keymapRecording; },
        set keymapRecording(value) { self.keymapRecording = value; },
        get commandPaletteQuery() { return self.commandPaletteQuery; },
        set commandPaletteQuery(value) { self.commandPaletteQuery = value; },
        isTurnInProgress: () => self.isTurnInProgress(),
        interruptTurn: () => self.interruptTurn(),
        notify: (message: string, duration?: number) => self.notify(message, duration), translator: self.translator,
        handleCommand: (value: string) => self.handleCommand(value),
        persistGlobalKeymap: () => self.persistGlobalKeymap(),
        runTimelineModeCommand: (args?: string) => self.runTimelineModeCommand(args),
        runEditorCommand: (args?: string) => self.runEditorCommand(args),
        handleIdleEscape: () => self.handleIdleEscape(),
        clearScrollback: () => self.clearScrollback(),
        toggleWhichKeyOverlay: () => self.toggleWhichKeyOverlay(),
        refreshWhichKeyBindings: () => self.refreshWhichKeyBindings(),
        toggleHealthPopover: () => self.toggleHealthPopover(),
        navigateThreadChildFirst: () => self.navigateThreadChildFirst(),
        navigateThreadCycle: (delta: 1 | -1) => self.navigateThreadCycle(delta),
        navigateThreadParent: () => self.navigateThreadParent(),
        openCommandPalette: (query?: string) => self.openCommandPalette(query),
        requestTerminalExit: (message?: string) => self.requestTerminalExit(message),
        resolveKeymapContext: () => self.resolveKeymapContext(),
        canThreadNavigate: () => self.canThreadNavigate(),
        canMessageNavigate: () => self.canMessageNavigate(),
        toggleModelFavorite: () => self.toggleModelFavorite(),
        cycleRecentModel: (delta: 1 | -1) => self.cycleRecentModel(delta),
        cycleModelVariant: () => self.cycleModelVariant(),
        queueDraft: () => self.queueDraft()
    };
}
export function terminalInputHost(self: any): AgentConsoleTerminalInputHost {
    
    return {
        state: self.state,
        transcriptNavigationController: self.transcriptNavigationController,
        get closing() { return self.closing; },
        set closing(value) { self.closing = value; },
        destroyed: self.destroyed,
        get commandPaletteQuery() { return self.commandPaletteQuery; },
        set commandPaletteQuery(value) { self.commandPaletteQuery = value; },
        sshShell: self.sshShell,
        surfaceAccessor: self.surfaceAccessor,
        app: self.app, translator: self.translator,
        sessionService: self.sessionService,
        isTurnInProgress: () => self.isTurnInProgress(),
        notify: (message: string, duration?: number) => self.notify(message, duration),
        scrollMessages: (delta: number) => scrollAgentConsoleTranscript(self.surfaceAccessor, self.transcriptNavigationController, () => self.state.syncTranscriptFollowing(), delta),
        getTerminalRenderedLines: () => self.getTerminalRenderedLines(),
        handleGlobalKeyInput: (raw: string) => self.handleGlobalKeyInput(raw),
        detachSshShell: (reason: 'detached' | 'closed') => self.detachSshShell(reason),
        submit: () => self.submit(),
        queueDraft: () => self.queueDraft(),
        handleCommand: (value: string) => self.handleCommand(value),
        focusComposer: () => self.state.setMessagesFocused(false)
    };
}
export function turnInputHost(self: any): AgentConsoleTurnInputHost {
    
    return {
        state: self.state,
        sessionService: self.sessionService,
        scheduler: self.scheduler,
        get draftLines() { return self.draftLines; },
        set draftLines(value) { self.draftLines = value; },
        get multilineMode() { return self.multilineMode; },
        set multilineMode(value) { self.multilineMode = value; },
        get shellMultilineMode() { return self.shellMultilineMode; },
        set shellMultilineMode(value) { self.shellMultilineMode = value; },
        get shellDraftLines() { return self.shellDraftLines; },
        set shellDraftLines(value) { self.shellDraftLines = value; },
        get editTargetMessageId() { return self.editTargetMessageId; },
        set editTargetMessageId(value) { self.editTargetMessageId = value; },
        get lastEditSessionMessageId() { return self.lastEditSessionMessageId; },
        set lastEditSessionMessageId(value) { self.lastEditSessionMessageId = value; },
        get editDismissedAt() { return self.editDismissedAt; },
        set editDismissedAt(value) { self.editDismissedAt = value; },
        get activeTurnRun() { return self.activeTurnRun; },
        set activeTurnRun(value) { self.activeTurnRun = value; },
        isTurnInProgress: () => self.isTurnInProgress(),
        notifyBusyState: (message?: string) => self.notifyBusyState(message),
        enrichPromptWithMentions: (input: string) => self.enrichPromptWithMentions(input),
        buildTurnMessageInput: (prompt: string, attachments: AgentConsolePendingAttachment[]) => self.buildTurnMessageInput(prompt, attachments),
        consumePendingTurnModelProfile: () => self.consumePendingTurnModelProfile(),
        persistInputHistory: () => self.persistInputHistory(),
        clearStreamingMessageState: () => self.clearStreamingMessageState(),
        updateTerminalTitle: () => self.updateTerminalTitle(),
        runTurnStream: (prompt: string, assistantMessage: AgentMessage, message?: AgentTurnMessageInput, profile?: string) => self.runTurnStream(prompt, assistantMessage, message, profile),
        ensureMessageAtTail: (messageId: string) => self.ensureMessageAtTail(messageId),
        advanceProviderWizard: (value: string) => self.advanceProviderWizard(value),
        notify: (message: string, duration?: number) => self.notify(message, duration), translator: self.translator,
        handleShellBang: (value: string) => self.handleShellBang(value),
        handleCommand: (value: string) => self.handleCommand(value),
        interruptTurn: () => self.interruptTurn(),
        isSteerModeEnabled: () => self.isSteerModeEnabled(),
        isQueueModeEnabled: () => self.isQueueModeEnabled(),
        enqueuePrompt: (input: string) => self.enqueuePrompt(input),
        openSession: (sessionId?: string, options?: { persistCurrentHistory?: boolean; fresh?: boolean }) => self.openSession(sessionId, options),
        resolveMentionDisplayFiles: (input: string) => self.resolveMentionDisplayFiles(input),
        refreshTurnArtifacts: () => self.refreshTurnArtifacts(),
        drainQueuedPrompts: (sessionId: string) => self.drainQueuedPrompts(sessionId),
        translate: self.translator ? (key: string, params?: Record<string, any>) => self.translator!.translate(key, params) : undefined
    };
}
export function promptMentionHost(self: any): PromptMentionHost {
    return {
        state: self.state,
        mentionCatalog: self.mentionCatalog,
        workspaceMentionsProvider: self.workspaceMentionsProvider,
        resolveApps: () => self.resolveApps()
    };
}
export function approvalInspectorHost(self: any): ApprovalInspectorHost {
    return {
        state: self.state, translator: self.translator,
        notify: (message: string) => self.notify(message),
        select: (title: string, opts: any[], index: number, hint?: string) => self.select(title, opts, index, hint),
        selectApprovalRequest: (requests: AgentConsoleApprovalRequest[], index: number) => self.selectApprovalRequest(requests, index),
        applyApprovalDecision: (decision: 'approve' | 'deny', requestId: string) => self.applyApprovalDecision(decision, requestId),
        refreshPendingApprovals: () => self.refreshPendingApprovals(),
        copyFocusedTextActionHandler: (text: string, label: string) => self.copyFocusedTextActionHandler(text, label)
    };
}
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
