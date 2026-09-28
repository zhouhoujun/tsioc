import { ApplicationContext, formatCompactNumber } from '@tsdi/core';
import { Component, ComponentRef, OnDestroy, RNode } from '@tsdi/components';
import { AudioCaptureAdapter, AudioPlaybackAdapter, AudioPlaybackFormat, FileAdapter } from '@tsdi/common';
import {
    CLEAR_SCROLLBACK_SEQUENCE,
    ConsoleTextChunk,
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceAccessor,
    ConsoleTerminalSurfaceLifecycle,
    TerminalInputSequenceResult
} from './console-ports';
import { Inject, Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import type { SshClient, SshConnectionManager, SshHostConfig, SshShellSession } from '@tsdi/agent-ssh';
import type { SandboxMode } from '@tsdi/agent/src/harness/sandbox-exec';
import {
    runExportCommand as runExportCommandFn,
    buildTurnMessageInput,
    runAttachCommand as runAttachCommandFn
} from './AgentConsoleExportHandlers';
import { formatSummaryQualityAggregate as fmtSummaryQualityAggregate } from './AgentConsoleFormatters';
import {
    openCompactionHistory,
    openCompactionHistoryTrend,
    openTurnDiagnostics as openTurnDiagnosticsFn,
    openUsage,
    openHarnessAudit,
    openHarnessProfile
} from './AgentConsoleDiagnosticsHandlers';
import {
    ReviewHandlerContext,
    resolveReviewAnnotationsSessionId,
    getReviewAnnotationsCacheKey,
    saveReviewAnnotationsCacheToDisk,
    restoreReviewAnnotationsCacheFromDisk,
    restoreReviewAnnotationsCacheFromDiskForScope,
    rememberVolatileReviewAnnotations,
    getVolatileReviewAnnotations,
    getReviewAnnotationsVolatileCache,
    applyReviewAnnotationsForScope,
    extractReviewAnnotations,
    looksLikeReviewAnnotationMap,
    parseWorktreeDiffArgs,
    describeWorktreeDiffScope,
    buildGitDiffReviewPrompt,
    parseReviewFindingsFromText,
    fetchGitDiffReview,
    saveReviewFindings,
    openGitDiffReviewPanel,
    openGitDiffReview,
    runGitDiffReviewAnalysis,
    listReviewFindings,
    showReviewRun,
    openWorktreeDiff
} from './AgentConsoleReviewHandlers';
import { getGlobalProcess } from './global-process';
import { decodeVoiceAudioChunk, handleVoiceCommand, playVoiceReply, startVoiceCapture, stopVoiceCapture, VoiceHandlerContext } from './AgentConsoleVoiceHandlers';
import { activateModelProfile, consumePendingTurnModelProfile, cycleModelVariant, cycleRecentModel, getModelProfileOptions, loadModelProfileOptions, openModelSwitcher, persistModelStore, queueNextTurnModelProfile, recordRecentModel, resolveInitialModelProfile, resolveModelProfileConfig, restoreModelStore, setModelReasoningEffort, toggleModelFavorite, ModelHandlerContext } from './AgentConsoleModelHandlers';
import { dismissEditMode, enterEditMode, EditModeHandlerContext, extractEditableMessageText, getEditableImageParts, getEditableUserMessages, handleIdleEscape, startEditTarget } from './AgentConsoleEditModeHandlers';
import {
    CodingTaskHandlerContext,
    resolveCodingTaskSessionId as resolveCodingTaskSessionIdFn,
    captureTaskViewContext as captureTaskViewContextFn,
    isTaskViewContextCurrent as isTaskViewContextCurrentFn,
    resolveFocusedCodingTask as resolveFocusedCodingTaskFn,
    describeCodingTaskRollback as describeCodingTaskRollbackFn,
    describeCodingTaskCheckpointSummary as describeCodingTaskCheckpointSummaryFn,
    canCancelCodingTask as canCancelCodingTaskFn,
    canRollbackCodingTask as canRollbackCodingTaskFn,
    canRetryCodingTask as canRetryCodingTaskFn,
    resolveCodingTaskRetrySourceTaskId as resolveCodingTaskRetrySourceTaskIdFn,
    buildCodingTaskLineageMetadata as buildCodingTaskLineageMetadataFn,
    buildCodingTaskChoice as buildCodingTaskChoiceFn,
    orderCodingTasksByLineage as orderCodingTasksByLineageFn,
    buildCodingTaskSelectOption as buildCodingTaskSelectOptionFn,
    loadCodingTasks as loadCodingTasksFn,
    selectCodingTask as selectCodingTaskFn,
    openCodingTaskReview as openCodingTaskReviewFn,
    openCodingTaskReviewSelector as openCodingTaskReviewSelectorFn,
    openThreadCodingTaskReviewSelector as openThreadCodingTaskReviewSelectorFn,
    openCodingTaskInspector as openCodingTaskInspectorFn,
    rollbackCodingTask as rollbackCodingTaskFn,
    retryFailedCodingTask as retryFailedCodingTaskFn,
    cancelCodingTask as cancelCodingTaskFn,
    refreshScheduledTasks as refreshScheduledTasksFn,
    openScheduledJobsDashboard as openScheduledJobsDashboardFn,
    toggleScheduledTask as toggleScheduledTaskFn,
    pauseScheduledTask as pauseScheduledTaskFn,
    resumeScheduledTask as resumeScheduledTaskFn,
    cancelScheduledTask as cancelScheduledTaskFn,
    recoverScheduledTask as recoverScheduledTaskFn
} from './AgentConsoleCodingTaskHandlers';
import {
    AgentConsoleApprovalRequest,
    AgentConsoleCommandOutputEntry,
    AgentConsoleHealthItem,
    AgentConsolePendingAttachment,
    AgentConsolePlanTodoItem,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem,
    AgentConsoleSessionMeta,
    AgentConsoleSessionState
} from './AgentConsoleSessionState';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentIdeBridge, AGENT_IDE_BRIDGE } from './AgentIdeBridge';
import { AgentEditorBridge, AGENT_EDITOR_BRIDGE } from './AgentEditorBridge';
import { AgentConsoleInputHistoryStore } from './AgentConsoleInputHistoryStore';
import { AgentConsoleModelStore } from './AgentConsoleModelStore';
import {
    agentConsoleThemeNames,
    agentConsoleThemes,
    AgentConsoleThemeName,
    AgentConsoleThemeStore,
    isAgentConsoleThemeName,
    mergeAgentConsoleTheme
} from './AgentConsoleTheme';
import {
    AgentConsoleStatuslineField,
    AgentConsoleStatuslineStore,
    defaultAgentConsoleStatusline,
    isAgentConsoleStatuslineField,
    normalizeAgentConsoleStatusline
} from './AgentConsoleStatusline';
import {
    AgentConsoleTitleField,
    AgentConsoleTitleStore,
    defaultAgentConsoleTitle,
    isAgentConsoleTitleField,
    normalizeAgentConsoleTitle
} from './AgentConsoleTitle';
import { AgentConsoleRawModeStore } from './AgentConsoleRawMode';
import { AgentConsoleSettingsData, AgentConsoleSettingsStore } from './AgentConsoleSettingsStore';
import {
    AgentConsoleAppAuthorizer,
    AgentConsoleAppStatus
} from './AgentConsoleApps';
import { AgentConsoleStashStore } from './AgentConsoleStash';
import { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import { AgentUiConfigService } from './agent-ui-config';
import {
    AgentConsoleMentionCatalogItem,
    AgentConsoleWorkspaceMentionsProvider
} from './AgentConsoleWorkspaceMentions';
import {
    AGENT_CONSOLE_DEFAULT_KEYMAP,
    AGENT_CONSOLE_GLOBAL_ACTIONS,
    AGENT_CONSOLE_KEYMAP_CONTEXTS,
    AgentConsoleGlobalAction,
    AgentConsoleKeymap,
    AgentConsoleKeymapContext,
    AgentConsoleKeymapStore,
    isAgentConsoleGlobalAction,
    isAgentConsoleKeymapContext,
    isAgentConsoleMessageNavigationAction,
    isAgentConsoleThreadNavigationAction
} from './AgentConsoleKeymap';
import { VIM_ACTION_NAMES, isConsoleVimAction } from './AgentConsoleVim';
import type { BackgroundTaskManager } from '@tsdi/agent-tools';
import { BackgroundTaskCommandHost, runBackgroundTasksCommandView } from './AgentConsoleBackgroundTaskCommands';
import { decodeGlobalKey, describePendingToolCall, describeStreamEventContent } from './AgentConsoleStreamHelpers';
import { AgentConsoleTurnStreamHost, AgentConsoleTurnStreamState, clearStreamingMessageState, consumeStreamChunkView, consumeStreamEventChunkView, runTurnStreamView } from './AgentConsoleTurnStreamController';
import { AgentConsoleGlobalKeyInputHost, executeGlobalKeyActionView, handleBrowserGlobalKeyInputView, handleGlobalKeyInputView, handleGlobalKeySequenceView } from './AgentConsoleGlobalKeyInputController';
import { AgentConsoleTurnInputHost, submitMultilineDraftView, submitView } from './AgentConsoleTurnInputController';
import { AgentConsoleTerminalInputHost, closingSessionMessageView, handleTerminalInputView, openCommandPaletteView, requestTerminalExitView, syncConsoleMessageViewportView } from './AgentConsoleTerminalInputController';
import { buildGitSnapshotDiffLines } from './AgentConsoleGitView';
import { openSummaryQualityRecords, openTurnDiagnosticsListView, openTurnDiagnosticsTrendView, openSummaryQualityTrendView, parseCompactionHistoryTrendArgs, parseSummaryQualityTrendArgs, refreshCompactionDigest, refreshSummaryQualityDigest, refreshTurnDiagnosticsDigest, refreshUsageDigest, runHarnessStopCommand } from './AgentConsoleDiagnosticsView';
import { normalizeLoadedMessages } from './AgentConsoleMessageNormalization';
import { flattenProjectSessions, navigateThreadCycle, refreshCurrentSections, refreshProjects, refreshThreads, resolveCurrentProjectSessions, resolveProjectSessionsFor, resolveSessionProjectKey, resolveSessionThreadKey, resolveThreadKeyForSession, resolveThreadSessionsFor, selectProjectRepresentative } from './AgentConsoleProjectProjection';
import { refreshProjectContext as refreshProjectContextView } from './AgentConsoleProjectProjection';
import { refreshTools as refreshToolsView } from './AgentConsoleToolsView';
import {
    PreferenceCommandHost,
    resolveProjectMemoryId as resolveProjectMemoryIdView,
    runDebugConfigCommand as runDebugConfigCommandView,
    runHooksCommand as runHooksCommandView,
    runMemoriesCommand as runMemoriesCommandView,
    runPersonalityCommand as runPersonalityCommandView
} from './AgentConsolePreferenceCommands';
import { ShellCommandHost, handleShellBang as handleShellBangView } from './AgentConsoleShellCommands';
import { StashCommandHost, runStashCommand as runStashCommandView } from './AgentConsoleStashCommands';
import {
    GitSnapshotCommandHost,
    openGitSnapshotDiff as openGitSnapshotDiffView,
    openGitSnapshotList as openGitSnapshotListView,
    revertGitSnapshotFromDetail as revertGitSnapshotFromDetailView,
    runGitSnapshotsCommand as runGitSnapshotsCommandView
} from './AgentConsoleGitSnapshotCommands';
import {
    ExtensionCommandHost,
    formatPluginDetail as formatPluginDetailView,
    formatPluginLine as formatPluginLineView,
    formatSkillDetail as formatSkillDetailView,
    formatSkillLine as formatSkillLineView,
    insertAppMention as insertAppMentionView,
    resolveAppAuthorizer as resolveAppAuthorizerView,
    resolveApps as resolveAppsView,
    runAppsCommand as runAppsCommandView,
    runPluginsCommand as runPluginsCommandView,
    runSkillsCommand as runSkillsCommandView
} from './AgentConsoleExtensionCommands';
import {
    PolicyCommandHost,
    runDelegationModeCommand as runDelegationModeCommandView,
    runGoalCommand as runGoalCommandView,
    runPermissionsCommand as runPermissionsCommandView,
    showSandboxCapabilities as showSandboxCapabilitiesView
} from './AgentConsolePolicyCommands';
import { ensureMessageAtTail } from './AgentConsoleMessageState';
import { parseSlashCommandLine, handleMenuSelection, loadInputHistory } from './AgentConsoleInputHelpers';
import { listSshHosts, connectSshHost, forwardSshTunnel } from './AgentConsoleSshCommands';
import { selectApprovalRequest, refreshPendingApprovals } from './AgentConsoleApprovalView';
import { HarnessCommandHost, openDelegationLineageView, openDelegationListView, openDelegationTreeView, openHarnessListView, openHarnessTreeView } from './AgentConsoleHarnessCommands';
import { TodoPlanCommandHost, mergeTodoPlanForSessionsView } from './AgentConsoleTodoPlanCommands';
import { KeymapCommandHost, resolveKeymapContext as resolveKeymapContextView, runKeymapCommand as runKeymapCommandView } from './AgentConsoleKeymapCommands';
import { PromptMentionHost, enrichPromptWithMentions as enrichPromptWithMentionsView } from './AgentConsolePromptMentions';
import { ApprovalInspectorHost, openApprovalInspector as openApprovalInspectorView } from './AgentConsoleApprovalCommands';
import {
    SettingsPanelHost,
    openSettingsGeneralTab as openSettingsGeneralTabView,
    openSettingsLanguage as openSettingsLanguageView,
    openSettingsProvidersTab as openSettingsProvidersTabView,
    openSettingsKeybindsTab,
    runDisplayCommand,
    runLayoutCommand,
    runExperimentalCommand,
    runSettingsCommand as runSettingsCommandView,
    runTimelineModeCommand,
    runVimCommand
} from './AgentConsoleSettingsCommands';
import { AgentConsoleRuntimeHost, runFastCommand, runRawModeCommand, runStatusCommand, runStatuslineCommand, runThemeCommand, runTitleCommand } from './AgentConsoleRuntimeCommands';
import { runIdeCommand } from './AgentConsoleIdeCommands';
import { collectHealthItems } from './AgentConsoleHealthView';
import { searchSessionContent } from './AgentConsoleSessionSearch';
import { loadLocalTodoPlan } from './AgentConsoleTodoView';
import { refreshMentionCatalog } from './AgentConsoleMentions';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, AgentConsoleAppRpc, AgentMessage, AgentOptions, AgentRuntime, AgentScheduler, AgentSessionSection, AgentSessionSectionInfo, AgentTurnMessageInput, ExchangeMetricsSnapshot, ProjectMemoryService, normalizeAgentWorkspaceIdentity, SessionSearchMatch, ToolApprovalManager, ToolRegistry, defaultAgentOptions, initAgentsDoc, buildHarnessProjection, formatHarnessTreeLines, formatHarnessListLines, DelegationTreeNode } from '@tsdi/agent';
import { AgentConsoleSessionProjectGroup, AgentConsoleSessionService } from './AgentConsoleSessionService';
import { CommandHandlerContext, COMMAND_HANDLERS } from './AgentConsoleCommandHandlers';
import { AGENT_WIZARD_PROVIDERS, AGENT_WIZARD_TIERS, AgentWizardProviderDef, AgentWizardStepDef, buildProviderWizardChoiceOptions, buildProviderWizardConfirmOptions, buildProviderWizardSteps, buildProviderWizardSummary, buildWizardStepHelp, resolveWizardPrefill, resolveWizardProviderDef, resolveWizardProviderName, resolveWizardTierLabel } from './AgentConsoleProviderWizard';
import { startProviderWizard, handleWizardEscape, cancelProviderWizard, resetProviderWizardComposer, showProviderWizardStep, openProviderWizardChoice, handleProviderWizardChoice, openProviderWizardConfirm, handleProviderWizardConfirm, openProviderWizardEditor, testProviderConnection, commitProviderWizard, advanceProviderWizard } from './AgentConsoleProviderWizardFlow';
import {
    getAgentConsoleCommandDefinition,
    getAgentConsoleCommandName,
    formatAgentConsoleCommandDiagnosticEcho,
    formatAgentConsoleCommandDiagnostics,
    parseAgentConsoleCommandArguments
} from './AgentConsoleCommandRegistry';

interface AgentConsoleQueuedPrompt {
    input: string;
    attachments: AgentConsolePendingAttachment[];
    command?: boolean;
}

@Component({
    selector: 'agent-console',
    template: `
    <div class="agent-console">
        <agent-console-brand-panel renderRegion="header" v-show="!showMessageDetailPanel"></agent-console-brand-panel>
        <agent-console-status-panel v-show="showStatusPanel && !showMessageDetailPanel"></agent-console-status-panel>
        <agent-console-sessions-panel v-show="showSessionsPanel && !showMessageDetailPanel"></agent-console-sessions-panel>
        <agent-console-approvals-panel v-show="showApprovalsPanel && !showMessageDetailPanel"></agent-console-approvals-panel>
        <agent-console-messages-panel renderRegion="transcript" v-show="!showMessageDetailPanel"></agent-console-messages-panel>
        <agent-console-message-detail-panel renderRegion="transcript" v-if="showMessageDetailPanel"></agent-console-message-detail-panel>
        <agent-console-timeline-event-detail-panel renderRegion="transcript" v-if="showTimelineEventInspector"></agent-console-timeline-event-detail-panel>
        <agent-console-tasks-panel v-show="showTasksPanel && !showMessageDetailPanel"></agent-console-tasks-panel>
        <agent-console-jobs-panel v-show="showJobsPanel && !showMessageDetailPanel"></agent-console-jobs-panel>
        <agent-console-review-panel v-show="showReviewPanel && !showMessageDetailPanel"></agent-console-review-panel>
        <agent-console-git-snapshot-panel v-show="showGitSnapshotPanel && !showMessageDetailPanel"></agent-console-git-snapshot-panel>
        <agent-console-activity-panel v-show="showActivityPanel && !showMessageDetailPanel"></agent-console-activity-panel>
        <agent-console-tools-panel v-show="showToolsPanel && !showMessageDetailPanel"></agent-console-tools-panel>
        <agent-console-working-panel v-show="showWorkingPanel && !showMessageDetailPanel"></agent-console-working-panel>
        <agent-console-tool-runs-panel v-show="showToolRunsPanel && !showMessageDetailPanel"></agent-console-tool-runs-panel>
        <agent-console-pending-question-panel v-show="showPendingQuestionPanel"></agent-console-pending-question-panel>
        <agent-console-input-panel renderRegion="footer"></agent-console-input-panel>
        <agent-console-select-panel v-show="showSelectPanel"></agent-console-select-panel>
        <agent-console-which-key-panel v-show="showWhichKeyPanel"></agent-console-which-key-panel>
        <agent-console-health-popover v-show="showHealthPopover"></agent-console-health-popover>
        <agent-console-text-overlay-panel v-show="showTextOverlayPanel"></agent-console-text-overlay-panel>
        <agent-console-outputs-panel v-show="showCommandOutputsPanel"></agent-console-outputs-panel>
    </div>
    `
})
export class AgentConsoleComponent implements OnDestroy, ConsoleTerminalInputHandler, ConsoleTerminalSurfaceLifecycle {
    protected static readonly IMAGE_MIME_TYPES: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml'
    };

    shouldEnableTerminalMouseTracking(): boolean {
        return false;
    }
    protected static readonly DOCUMENT_MIME_TYPES: Record<string, string> = {
        '.pdf': 'application/pdf'
    };
    protected static readonly SEARCH_CONCURRENCY = 6;
    protected multilineMode = false;
    protected draftLines: string[] = [];
    protected shellMultilineMode = false;
    protected shellDraftLines: string[] = [];
    protected destroyed = false;
    protected closing = false;
    protected sshShell: SshShellSession | null = null;
    protected voiceCaptureSessionId = '';
    protected voiceCaptureFeed: Promise<void> = Promise.resolve();
    protected openSessionRequestId = 0;
    protected openReviewRequestId = 0;
    protected activateModelRequestId = 0;
    protected pendingCommandRequestId = '';
    protected sessionEpoch = 0;
    protected taskViewContextVersion = 0;
    protected turnStreamState: AgentConsoleTurnStreamState = { streamMessageText: '' };
    protected mentionCatalog: AgentConsoleMentionCatalogItem[] = [];
    protected globalKeyPending = '';
    protected keymapRecording?: { context: AgentConsoleKeymapContext; action: AgentConsoleGlobalAction };
    protected commandPaletteQuery = '';
    protected startupWorkspace = '';
    protected freshSessionScoped = false;
    protected queuedPrompts = new Map<string, AgentConsoleQueuedPrompt[]>();
    protected drainingQueuedSessions = new Set<string>();
    protected activeTurnRun?: Promise<void> | null = null;
    protected activeThemeName: AgentConsoleThemeName = 'dark';
    protected lastTerminalTitle = '';
    protected editTargetMessageId = '';
    protected editDraftBefore = '';
    protected editAttachmentsBefore: AgentConsolePendingAttachment[] = [];
    protected lastEditSessionMessageId = '';
    protected editDismissedAt = 0;
    protected lastEscapeAt = 0;
    protected modelFavorites: string[] = [];
    protected modelRecents: string[] = [];
    protected modelReasoningEffort: 'low' | 'medium' | 'high' = 'medium';
    protected wizHolder: import('./AgentConsoleProviderWizardFlow').AgentWizardHolder = {};
    protected get providerWizard(): import('./AgentConsoleProviderWizardFlow').AgentWizardState | undefined {
        return this.wizHolder.wizard;
    }
    protected set providerWizard(value: import('./AgentConsoleProviderWizardFlow').AgentWizardState | undefined) {
        this.wizHolder.wizard = value;
    }
    protected pwctx(): import('./AgentConsoleProviderWizardFlow').ProviderWizardContext {
        return {
            state: this.state,
            appRpc: this.appRpc,
            uiConfig: this.uiConfig,
            options: this.options,
            notify: (message: string) => this.notify(message),
            notifyBusyState: () => this.notifyBusyState(),
            isTurnInProgress: () => this.isTurnInProgress(),
            rpcRequestContext: () => this.rpcRequestContext(),
            activateModelProfile: (profile: string) => this.activateModelProfile(profile)
        };
    }
    protected yoloMode = false;

    constructor(
        private state: AgentConsoleSessionState,
        private runtime: AgentRuntime,
        private scheduler: AgentScheduler,
        private bridge: AgentConsoleEventBridge,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions,
        @Optional() @Inject(ToolRegistry) private toolRegistry?: ToolRegistry | null,
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) private appRpc?: AgentConsoleAppRpc | null,
        @Optional() @Inject(AgentConsoleSessionService) private sessionService?: AgentConsoleSessionService | null,
        @Optional() private approvalManager?: ToolApprovalManager | null,
        @Optional() @Inject(AgentConsoleWorkspaceMentionsProvider) private workspaceMentionsProvider?: AgentConsoleWorkspaceMentionsProvider | null,
        @Optional() @Inject(AgentConsoleInputHistoryStore) private inputHistoryStore?: AgentConsoleInputHistoryStore | null,
        @Optional() @Inject(ComponentRef) private componentRef?: ComponentRef<AgentConsoleComponent> | null,
        @Optional() @Inject(ConsoleTerminalSurfaceAccessor) private surfaceAccessor?: ConsoleTerminalSurfaceAccessor | null,
        @Optional() @Inject(ApplicationContext) private app?: ApplicationContext | null,
        @Optional() private sshManager?: SshConnectionManager | null,
        @Optional() private audioCapture?: AudioCaptureAdapter | null,
        @Optional() private audioPlayback?: AudioPlaybackAdapter | null,
        @Optional() private translator?: TranslatorService,
        @Optional() @Inject(AgentConsoleKeymap) private globalKeymap?: AgentConsoleKeymap | null,
        @Optional() @Inject(AgentConsoleKeymapStore) private keymapStore?: AgentConsoleKeymapStore | null,
        @Optional() @Inject(AgentConsoleThemeStore) private themeStore?: AgentConsoleThemeStore | null,
        @Optional() private statuslineStore?: AgentConsoleStatuslineStore | null,
        @Optional() private titleStore?: AgentConsoleTitleStore | null,
        @Optional() private backgroundTasks?: BackgroundTaskManager | null,
        @Optional() @Inject(AGENT_IDE_BRIDGE) private ideBridge?: AgentIdeBridge | null,
        @Optional() @Inject(AGENT_EDITOR_BRIDGE) private editorBridge?: AgentEditorBridge | null,
        @Optional() @Inject(AgentConsoleRawModeStore) private rawModeStore?: AgentConsoleRawModeStore | null,
        @Optional() @Inject(AgentConsoleStashStore) private stashStore?: AgentConsoleStashStore | null,
        @Optional() private modelStore?: AgentConsoleModelStore | null,
        @Optional() @Inject(AgentConsoleSettingsStore) private settingsStore?: AgentConsoleSettingsStore | null,
        @Optional() private uiConfig?: AgentUiConfigService | null,
        @Optional() @Inject(ProjectMemoryService) private projectMemory?: ProjectMemoryService | null
    ) {
        this.globalKeymap = this.globalKeymap || new AgentConsoleKeymap();
        this.globalKeymap.configure(this.options.ui?.keymap);
        this.state.setTitle(this.options.ui?.title ?? defaultAgentOptions.ui!.title!);
        this.state.setProvider(this.options.model?.provider ?? '');
        this.state.setModel(this.options.model?.model ?? '');
        this.state.setModelProfile(this.resolveInitialModelProfile());
        this.state.setTheme(mergeAgentConsoleTheme(this.options.ui?.theme));
        this.state.setConsoleOptions(this.options.ui?.console);
        this.state.setStatusline(this.resolveInitialStatusline());
        this.state.setTitleFields(this.resolveInitialTitleFields());
        this.state.setRawMode(this.options.ui?.rawMode === true);
        this.state.setPlanNudgesEnabled(this.options.ui?.planNudges !== false);
        this.state.setWorkspaceMentionResolver(this.workspaceMentionsProvider || undefined);
        this.startupWorkspace = String(this.options.ui?.console?.workspace || '').trim();
        if (this.startupWorkspace) {
            this.state.setWorkspace(this.startupWorkspace);
        }
    }

    protected resolveInitialStatusline(): AgentConsoleStatuslineField[] {
        if (Array.isArray(this.options.ui?.statusline)) {
            return normalizeAgentConsoleStatusline(this.options.ui.statusline);
        }
        return [...defaultAgentConsoleStatusline];
    }

    protected resolveInitialTitleFields(): AgentConsoleTitleField[] {
        return [...defaultAgentConsoleTitle];
    }

    protected resolveInitialModelProfile(): string {
        return resolveInitialModelProfile(this.modelCtx());
    }

    protected isCancelPromptValue(value?: string): boolean {
        const normalized = String(value || '').trim().toLowerCase();
        return normalized === 'cancel' || normalized === '/cancel' || normalized === 'q';
    }

    protected isTurnInProgress(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    protected isQueueModeEnabled(): boolean {
        const mode = this.options.ui?.queueMode;
        return mode !== false && mode !== 'off';
    }

    protected isSteerModeEnabled(): boolean {
        // Steering interrupts the in-flight turn, so it is opt-in: a plain Enter
        // during a running turn queues the draft instead of cancelling the turn.
        const mode = this.options.ui?.steerMode;
        return mode === true || mode === 'on';
    }

    protected enqueuePrompt(input: string): void {
        const sessionId = this.state.sessionId;
        const queue = this.queuedPrompts.get(sessionId) || [];
        const command = input.trim().startsWith('/');
        queue.push({ input, attachments: command ? [] : this.state.pendingAttachments.slice(), command });
        this.queuedPrompts.set(sessionId, queue);
        this.state.setInput('');
        this.state.clearPendingAttachments();
        this.state.setQueuedPromptCount(queue.length);
        const noticeKey = command ? 'agent.notice.queuedCommand' : 'agent.notice.queuedPrompt';
        const noticeFallback = command ? `Queued command (${queue.length}).` : `Queued prompt (${queue.length}).`;
        this.notify(this.translator?.translate(noticeKey, { count: queue.length }) || noticeFallback);
    }

    protected queueDraft(): boolean {
        if (!this.isTurnInProgress() || !this.state.input.trim()) {
            return false;
        }
        this.enqueuePrompt(this.state.input);
        return true;
    }

    protected async drainQueuedPrompts(sessionId: string): Promise<void> {
        if (this.destroyed || this.drainingQueuedSessions.has(sessionId) || this.state.sessionId !== sessionId) return;
        this.drainingQueuedSessions.add(sessionId);
        try {
            const queue = this.queuedPrompts.get(sessionId) || [];
            while (queue.length && this.state.sessionId === sessionId && !this.isTurnInProgress()) {
                const next = queue.shift()!;
                this.state.setQueuedPromptCount(queue.length);
                this.state.setInput(next.input, next.input.length);
                this.state.setPendingAttachments(next.attachments);
                await this.submit();
            }
            if (!queue.length) this.queuedPrompts.delete(sessionId);
        } finally {
            this.drainingQueuedSessions.delete(sessionId);
        }
    }

    protected async interruptTurn(): Promise<void> {
        if (!this.isTurnInProgress()) return;
        const cancelled = await this.sessionService?.cancelTurn(this.state.sessionId) ?? false;
        this.notify(cancelled
            ? (this.translator?.translate('agent.notice.cancelling') || 'Cancelling current turn…')
            : (this.translator?.translate('agent.notice.nothingToCancel') || 'No running turn to cancel.'));
    }

    protected notify(message: string, duration?: number): void {
        void duration;
        const lines = String(message || '').split('\n').filter(line => line.trim().length);
        this.state.setNotice(message);
        if (lines.length > 3) {
            this.state.openTextOverlay('notice', lines);
        }
    }

    protected pushCommandOutput(command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']): void {
        const outputId = this.state.pushCommandOutput(command, text, kind);
        if (outputId && this.pendingCommandRequestId) {
            this.state.linkCommandOutputToExecution(this.pendingCommandRequestId, outputId);
        }
        this.notify(text);
    }

    protected notifyBusyState(message?: string): void {
        this.notify(message || this.translator?.translate('agent.notice.busy') || 'Wait for the current turn to finish.');
    }

    protected formatSummaryQualityAggregate(aggregate: Record<string, any>): string {
        return fmtSummaryQualityAggregate(aggregate);
    }

    protected async openSummaryQualityRecords(provider?: string): Promise<boolean> {
        return openSummaryQualityRecords(
            this.sessionService,
            (message: string) => this.notify(message),
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            provider
        );
    }

    protected async openSummaryQualityTrend(
        provider?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        return openSummaryQualityTrendView(
            this.sessionService,
            (message: string) => this.notify(message),
            (command: string, text: string) => this.pushCommandOutput(command, text),
            provider,
            bucketSize,
            maxBuckets
        );
    }

    protected async runExportCommand(args: string): Promise<boolean> {
        return runExportCommandFn(this.getExportHandlerContext(), args);
    }

    protected resolveFileAdapter(): FileAdapter | null {
        return this.app?.get(FileAdapter, null) as FileAdapter | null;
    }

    protected buildTurnMessageInput(prompt: string, attachments: AgentConsolePendingAttachment[]): AgentTurnMessageInput | undefined {
        return buildTurnMessageInput(prompt, attachments);
    }

    protected async runAttachCommand(args: string): Promise<boolean> {
        return runAttachCommandFn(this.getExportHandlerContext(), args);
    }

    private getExportHandlerContext() {
        return {
            state: this.state,
            sessionService: this.sessionService!,
            app: this.app!,
            workspace: this.workspace,
            notify: (msg: string) => this.notify(msg),
        };
    }

    protected async openCompactionHistory(args: string): Promise<boolean> {
        return openCompactionHistory(this.getDiagnosticsHandlerContext(), args);
    }

    protected async openCompactionHistoryTrend(
        sessionId?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        const args = [sessionId, bucketSize, maxBuckets].filter(v => v != null).join(' ');
        return openCompactionHistoryTrend(this.getDiagnosticsHandlerContext(), args);
    }

    protected async openTurnDiagnostics(sessionId?: string): Promise<boolean> {
        return openTurnDiagnosticsFn(this.getDiagnosticsHandlerContext(), sessionId);
    }

    protected async openUsage(input?: string): Promise<boolean> {
        return openUsage(this.getDiagnosticsHandlerContext(), input);
    }

    protected async openHarnessAudit(sessionId?: string): Promise<boolean> {
        return openHarnessAudit(this.getDiagnosticsHandlerContext(), sessionId);
    }

    private getDiagnosticsHandlerContext() {
        return {
            state: this.state,
            sessionService: this.sessionService!,
            notify: (msg: string) => this.notify(msg),
            pushCommandOutput: (command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']) => this.pushCommandOutput(command, text, kind),
            select: (title: string, options: any[], footer?: string) => this.select(title, options, 0, footer),
        };
    }

    protected async openHarnessProfile(sub?: string): Promise<boolean> {
        return openHarnessProfile(this.getDiagnosticsHandlerContext(), sub);
    }

    protected async openHarnessTree(sessionId?: string): Promise<boolean> {
        return openHarnessTreeView(this.harnessCommandHost(), sessionId);
    }

    private harnessCommandHost(): HarnessCommandHost {
        return {
            sessionService: this.sessionService ?? null,
            state: this.state,
            notify: message => this.notify(message),
            pushCommandOutput: (command, text) => this.pushCommandOutput(command, text)
        };
    }

    protected async openHarnessList(sessionId?: string): Promise<boolean> {
        return openHarnessListView(this.harnessCommandHost(), sessionId);
    }

    /**
     * Handles `/harness stop <taskId>`: cancels the referenced background task
     * over RPC and reports the outcome inline.
     */
    protected async runHarnessStopCommand(taskId: string): Promise<boolean> {
        return runHarnessStopCommand(this.sessionService, (message: string) => this.notify(message), taskId);
    }

    private voiceCtx(): VoiceHandlerContext {
        return {
            state: this.state,
            sessionService: this.sessionService,
            audioCapture: this.audioCapture,
            audioPlayback: this.audioPlayback,
            notify: (message, duration) => this.notify(message, duration),
            pushCommandOutput: (command, text, kind) => this.pushCommandOutput(command, text, kind),
            getCaptureSessionId: () => this.voiceCaptureSessionId,
            setCaptureSessionId: value => { this.voiceCaptureSessionId = value; },
            getCaptureFeed: () => this.voiceCaptureFeed,
            setCaptureFeed: feed => { this.voiceCaptureFeed = feed; }
        };
    }

    protected async handleVoiceCommand(arg: string): Promise<boolean> {
        return handleVoiceCommand(this.voiceCtx(), arg);
    }

    protected async startVoiceCapture(sessionId: string): Promise<string | undefined> {
        return startVoiceCapture(this.voiceCtx(), sessionId);
    }

    protected async stopVoiceCapture(cancel: boolean): Promise<void> {
        return stopVoiceCapture(this.voiceCtx(), cancel);
    }

    protected async playVoiceReply(result: Record<string, any>): Promise<string | undefined> {
        return playVoiceReply(this.voiceCtx(), result);
    }

    protected decodeVoiceAudioChunk(value: string): Uint8Array {
        return decodeVoiceAudioChunk(value);
    }

    /**
     * Opens `/diagnostics list [sessionId]`: browses recorded turn diagnostics
     * records for the given session (or all owned sessions when omitted) as a
     * selectable list.
     */
    protected async openTurnDiagnosticsList(sessionId?: string): Promise<boolean> {
        return openTurnDiagnosticsListView(
            this.sessionService,
            (message: string) => this.notify(message),
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            sessionId,
            this.state.sessionId
        );
    }

    /**
     * Opens `/diagnostics trend [sessionId] [bucketSize] [maxBuckets]`:
     * renders one sparkline line per session showing how token savings and
     * compaction activity evolve over time buckets.
     */
    protected async openTurnDiagnosticsTrend(
        sessionId?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        return openTurnDiagnosticsTrendView(
            this.sessionService,
            (message: string) => this.notify(message),
            (command: string, text: string) => this.pushCommandOutput(command, text),
            sessionId,
            bucketSize,
            maxBuckets
        );
    }

    /**
     * Opens `/delegation tree [sessionId] [status] [depth]`: renders the
     * persisted parent → child session tree rooted at the current (or given)
     * session as an indented tree with edge kind/status/timestamps inline.
     */
    protected async openDelegationTree(sessionId?: string, status?: string, depth?: number): Promise<boolean> {
        return openDelegationTreeView(this.harnessCommandHost(), sessionId, status, depth);
    }

    /**
     * Opens `/delegation lineage [sessionId]`: renders the persisted chain of
     * parent sessions above the current (or given) session, closest first.
     */
    protected async openDelegationLineage(sessionId?: string): Promise<boolean> {
        return openDelegationLineageView(this.harnessCommandHost(), sessionId);
    }

    /**
     * Opens `/delegation [list] [sessionId]`: lists flat delegation edges
     * touching the current (or given) session, newest edges first, as one
     * digest line per edge.
     */
    protected async openDelegationList(sessionId?: string): Promise<boolean> {
        return openDelegationListView(this.harnessCommandHost(), sessionId);
    }

    /**
     * Parses `/diagnostics trend` trailing tokens: optional session id,
     * optional bucket size (`Nd` for days or a millisecond number), optional
     * max bucket count. Reuses the same token grammar as the compaction trend.
     */
    protected parseTurnDiagnosticsTrendArgs(
        args: string
    ): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
        return this.parseCompactionHistoryTrendArgs(args);
    }

    private reviewCtx(): ReviewHandlerContext {
        return {
            state: this.state,
            appRpc: this.appRpc,
            notify: (message, duration) => this.notify(message, duration),
            activateToolForSession: (toolName, sessionId) => this.activateToolForSession(toolName, sessionId),
            getOpenReviewRequestId: () => this.openReviewRequestId
        };
    }

    private codingTaskCtx(): CodingTaskHandlerContext {
        return {
            state: this.state,
            appRpc: this.appRpc,
            scheduler: this.scheduler,
            notify: (message, duration) => this.notify(message, duration),
            select: (title, options, selectedIndex, hint) => this.select(title, options, selectedIndex, hint),
            getTaskViewContextVersion: () => this.taskViewContextVersion,
            bumpTaskViewContextVersion: () => ++this.taskViewContextVersion,
            getOpenReviewRequestId: () => this.openReviewRequestId,
            bumpOpenReviewRequestId: () => ++this.openReviewRequestId,
            resolveProjectSessionIdsFor: (sessionId) => this.resolveProjectSessionIdsFor(sessionId),
            resolveThreadSessionIdsFor: (sessionId) => this.resolveThreadSessionIdsFor(sessionId),
            restoreReviewAnnotationsCacheFromDiskForScope: (scope) => this.restoreReviewAnnotationsCacheFromDiskForScope(scope)
        };
    }

    protected resolveReviewAnnotationsSessionId(): string {
        return resolveReviewAnnotationsSessionId(this.reviewCtx());
    }

    protected getReviewAnnotationsCacheKey(): string | undefined {
        return getReviewAnnotationsCacheKey(this.reviewCtx());
    }

    protected async refreshSessions(currentSessionId = this.state.sessionId): Promise<void> {
        if (!this.sessionService) {
            return;
        }
        const groups = await this.sessionService.listProjectSessions(currentSessionId);
        if (currentSessionId !== this.state.sessionId) {
            return;
        }
        const groupedSessions = this.flattenProjectSessions(groups);
        if (groupedSessions.length) {
            this.state.setSessions(groupedSessions);
            this.refreshProjectContext();
            this.refreshProjects();
            this.refreshThreads();
            return;
        }
        const sessions = await this.sessionService.listSessions(currentSessionId);
        if (currentSessionId !== this.state.sessionId) {
            return;
        }
        if (!sessions.length) {
            this.state.setSessions([]);
            this.state.setProjects([]);
            this.state.setThreads([]);
            this.state.setProjectContext();
            this.updateTerminalTitle();
            return;
        }
        this.state.setSessions(sessions.map(item => ({
            id: item.id,
            current: !!item.current,
            workspace: item.workspace,
            updatedAt: item.lastActiveAt,
            messageCount: item.messageCount,
            summary: item.summary,
            title: item.title,
            pinned: !!item.pinned,
            archived: !!item.archived,
            projectKey: item.projectKey,
            projectId: item.projectId,
            primaryThreadId: item.primaryThreadId,
            originThreadId: item.originThreadId,
            sessionRole: item.sessionRole,
            rootRequest: item.rootRequest,
            focusSummary: item.focusSummary,
            projectLabel: item.projectId || item.focusSummary || item.workspace || item.primaryThreadId || item.rootRequest || item.id,
            sections: Array.isArray(item.sections) ? item.sections : undefined
        })));
        this.refreshProjectContext();
        this.refreshProjects();
        this.refreshThreads();
    }

    protected refreshThreads(): void {
        refreshThreads(this.state);
    }

    protected async refreshCurrentSections(): Promise<void> {
        return refreshCurrentSections(this.sessionService, this.state);
    }

    protected refreshProjects(): void {
        refreshProjects(this.state);
    }

    protected flattenProjectSessions(groups: AgentConsoleSessionProjectGroup[]): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        title?: string;
        pinned?: boolean;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        originThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        return flattenProjectSessions(groups);
    }

    protected refreshProjectContext(): void {
        return refreshProjectContextView({
            state: this.state,
            updateTerminalTitle: () => this.updateTerminalTitle()
        });
    }

    protected resolveProjectSessionsFor(sessionId = this.state.sessionId): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        return resolveProjectSessionsFor(this.state, sessionId) as any;
    }

    protected resolveCurrentProjectSessions(): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        return resolveCurrentProjectSessions(this.state) as any;
    }

    protected selectProjectRepresentative<T extends {
        id: string;
        updatedAt?: number;
    }>(sessions: T[]): T | undefined {
        return selectProjectRepresentative(sessions);
    }

    protected resolveSessionProjectKey(session?: {
        projectKey?: string;
        projectId?: string;
        workspace?: string;
        primaryThreadId?: string;
    } | null): string {
        return resolveSessionProjectKey(session);
    }

    protected resolveSessionThreadKey(session?: {
        primaryThreadId?: string;
        id?: string;
    } | null): string {
        return resolveSessionThreadKey(session);
    }

    protected resolveThreadKeyForSession(
        session?: {
            primaryThreadId?: string;
            originThreadId?: string;
            id?: string;
        } | null,
        sessions: Array<{
            id: string;
            primaryThreadId?: string;
            originThreadId?: string;
        }> = this.state.sessions,
        visited = new Set<string>()
    ): string {
        return resolveThreadKeyForSession(session, sessions, visited);
    }

    protected resolveProjectSessionIdsFor(sessionId = this.state.sessionId): string[] {
        const sessions = this.resolveProjectSessionsFor(sessionId);
        const ids = sessions.map(item => String(item.id || '').trim()).filter(Boolean);
        return ids.length ? ids : [sessionId];
    }

    protected resolveThreadSessionsFor(sessionId = this.state.sessionId): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        originThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        return resolveThreadSessionsFor(this.state, sessionId) as any;
    }

    protected resolveThreadSessionIdsFor(sessionId = this.state.sessionId): string[] {
        const sessions = this.resolveThreadSessionsFor(sessionId);
        const ids = sessions.map(item => String(item.id || '').trim()).filter(Boolean);
        return ids.length ? ids : [sessionId];
    }

    protected resolveCurrentProjectSessionIds(): string[] {
        return this.resolveProjectSessionIdsFor(this.state.sessionId);
    }

    protected resolveCodingTaskSessionId(task?: Record<string, any> | null): string {
        return resolveCodingTaskSessionIdFn(this.codingTaskCtx(), task);
    }

    protected captureTaskViewContext(): { sessionId: string; version: number } {
        return captureTaskViewContextFn(this.codingTaskCtx());
    }

    protected isTaskViewContextCurrent(context: { sessionId: string; version: number }): boolean {
        return isTaskViewContextCurrentFn(this.codingTaskCtx(), context);
    }

    protected resolveFocusedCodingTask(): Record<string, any> | null {
        return resolveFocusedCodingTaskFn(this.codingTaskCtx());
    }

    protected async refreshPendingApprovals(sessionId = this.state.sessionId): Promise<void> {
        return refreshPendingApprovals(sessionId, this.state, this.approvalManager, this.appRpc, this.sessionService, () => this.updateTerminalTitle());
    }

    protected async applyApprovalDecision(decision: 'approve' | 'deny', requestId: string): Promise<boolean> {
        if (this.approvalManager) {
            return decision === 'approve'
                ? this.approvalManager.approve(requestId)
                : this.approvalManager.reject(requestId);
        }
        if (this.appRpc && this.sessionService) {
            const result = await this.sessionService.decideApproval(decision, requestId);
            return result?.applied === true;
        }
        return false;
    }

    protected async getPendingApprovals(sessionId: string): Promise<AgentConsoleApprovalRequest[]> {
        if (this.approvalManager) {
            return this.approvalManager.getPending().filter((request: any) => request.sessionId === sessionId) as AgentConsoleApprovalRequest[];
        }
        if (this.appRpc && this.sessionService) {
            const requests = await this.sessionService.listApprovals(sessionId);
            return requests as AgentConsoleApprovalRequest[];
        }
        return [];
    }

    protected async openSession(sessionId?: string, options?: { persistCurrentHistory?: boolean; fresh?: boolean }): Promise<void> {
        if (this.isTurnInProgress()) {
            this.notifyBusyState('Wait for the current turn to finish before switching sessions.');
            return;
        }
        if (!this.sessionService) {
            return;
        }
        const requestId = ++this.openSessionRequestId;
        if (options?.persistCurrentHistory !== false) {
            await this.persistInputHistory();
            if (requestId !== this.openSessionRequestId) {
                return;
            }
        }
        const target = await this.sessionService.ensureSession(sessionId);
        if (requestId !== this.openSessionRequestId) {
            return;
        }
        if (target.archived) {
            await this.sessionService.setSessionArchived(target.id, false);
            target.archived = false;
        }
        this.freshSessionScoped = options?.fresh === true;
        const configuredWorkspace = String(this.startupWorkspace || this.state.workspace || (this.options.ui?.console as any)?.workspace || '').trim();
        const nextWorkspace = requestId === 1 && configuredWorkspace
            ? configuredWorkspace
            : String(target.workspace || '').trim() || configuredWorkspace;
        this.openReviewRequestId++;
        this.taskViewContextVersion++;
        this.state.configure({
            sessionId: target.id,
            workspace: nextWorkspace
        });
        if (nextWorkspace) {
            this.state.setWorkspace(nextWorkspace);
        }
        this.state.setQueuedPromptCount((this.queuedPrompts.get(target.id) || []).length);
        this.state.setMessagesFocused(false);
        this.state.setSessionsFocused(false);
        this.state.setProjectsFocused(false);
        this.state.setToolsFocused(false);
        this.state.setToolRunsFocused(false);
        this.state.setApprovalsFocused(false);
        this.state.setTasksFocused(false);
        this.state.setJobsFocused(false);
        this.state.setPendingApprovals([]);
        this.state.clearReview();
        this.state.clearPlanTodos();
        this.state.setPendingQuestion(null);
        this.state.clearToolActivity();
        this.state.setContextPreparation(null);
        this.state.closeMessageDetail();
        this.state.clearActivities();
        this.state.setLastError('');
        this.updateTerminalTitle();
        this.state.setNotice('');
        this.state.setInput('', 0);
        this.editTargetMessageId = '';
        this.editDraftBefore = '';
        this.editAttachmentsBefore = [];
        this.lastEditSessionMessageId = '';
        this.editDismissedAt = 0;
        this.lastEscapeAt = 0;
        await this.refreshSessions(target.id);
        if (requestId !== this.openSessionRequestId || this.state.sessionId !== target.id) {
            return;
        }
        // A plain startup owns a new session. Project aggregation is useful
        // after an explicit resume/switch, but on a fresh launch it would pull
        // old plans and task summaries from sibling sessions into the empty UI.
        const projectSessions = options?.fresh
            ? [{ ...target, current: true, updatedAt: target.lastActiveAt }]
            : this.resolveProjectSessionsFor(target.id);
        const projectSessionIds = options?.fresh ? [target.id] : this.resolveProjectSessionIdsFor(target.id);
        const [page] = await Promise.all([
            this.loadSessionPage(target.id),
            this.refreshTools(target.id),
            this.refreshPendingApprovals(target.id),
            this.refreshTodoPlan(target.id, projectSessions),
            this.loadCodingTasks(target.id, projectSessionIds),
            this.restoreInputHistory()
        ]);
        if (requestId !== this.openSessionRequestId || this.state.sessionId !== target.id) {
            return;
        }
        // A fresh startup must never render a transcript returned by stale
        // host/app state. Explicit resume and interactive session switching
        // continue to load their persisted page normally.
        this.state.setMessages(options?.fresh ? [] : page.messages);
        this.state.setSections(options?.fresh ? [] : page.sections);
        this.state.setGoalSummary(options?.fresh ? null : (page.goalSummary || null));
        await this.restoreSessionModes(target.id);
    }

    protected async restoreSessionModes(sessionId: string): Promise<void> {
        try {
            let planMode = false;
            if (this.appRpc) {
                const result = await this.appRpc.request('session.plan_mode.get', { sessionId }, this.rpcRequestContext()).catch(() => null);
                planMode = result?.enabled === true;
            } else {
                planMode = this.runtime.isPlanMode(sessionId);
            }
            this.state.setPlanMode(planMode);
        } catch {
            // runtime may not support plan mode queries — leave current value
        }
    }

    protected async selectApprovalRequest(
        requests: AgentConsoleApprovalRequest[],
        selectedIndex = 0
    ): Promise<AgentConsoleApprovalRequest | undefined> {
        return selectApprovalRequest(
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            this.state,
            requests,
            selectedIndex
        );
    }

    protected async openApprovalInspector(requests: AgentConsoleApprovalRequest[]): Promise<void> {
        return openApprovalInspectorView(this.approvalInspectorHost(), requests);
    }

    get title(): string {
        return this.state.title;
    }

    get showStatusPanel(): boolean {
        return (this.state.consoleOptions.showStatusline && !!this.state.statusline.length)
            || !!this.state.notice
            || !!this.state.pendingApprovals.length;
    }

    get showSessionsPanel(): boolean {
        return this.state.sessionsFocused;
    }

    get showApprovalsPanel(): boolean {
        return this.state.approvalsFocused;
    }

    get showTasksPanel(): boolean {
        return this.state.tasksFocused;
    }

    get showJobsPanel(): boolean {
        return this.state.jobsFocused;
    }

    get showMessageDetailPanel(): boolean {
        return this.state.consoleOptions.messageToggleInteraction === 'enter'
            && this.state.messageDetailOpen
            && !!this.state.selectedMessage;
    }

    get showTimelineEventInspector(): boolean {
        return this.state.timelineEventInspectorOpen;
    }

    get showReviewPanel(): boolean {
        return !!this.state.reviewOpen;
    }

    get showGitSnapshotPanel(): boolean {
        return !!this.state.gitSnapshotOpen;
    }

    get showActivityPanel(): boolean {
        return false;
    }

    get showToolsPanel(): boolean {
        return this.state.toolsFocused;
    }

    get showWorkingPanel(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    get showToolRunsPanel(): boolean {
        return this.state.toolRunsFocused;
    }

    get showSelectPanel(): boolean {
        return !!this.state.selectMenu;
    }

    get showWhichKeyPanel(): boolean {
        return this.state.whichKeyVisible;
    }

    get showHealthPopover(): boolean {
        return this.state.healthPopoverVisible;
    }

    get showTextOverlayPanel(): boolean {
        return this.state.hasTextOverlayFocus();
    }

    get showCommandOutputsPanel(): boolean {
        return this.state.commandOutputsOpen;
    }

    get showPendingQuestionPanel(): boolean {
        return !!this.state.pendingQuestion;
    }

    // ---- generic component bindings ----

    get inputShellStyle(): string {
        return this.state.theme?.inputShell || 'background: #1b2128; color: #c9d1d9; padding: 1 1;';
    }

    get inputValue(): string {
        return this.state.input || '';
    }

    get inputCursor(): number {
        return this.state.inputCursor || 0;
    }

    get selectTitle(): string {
        return this.state.selectMenu?.title || '';
    }

    get selectHint(): string {
        return this.state.selectMenu?.hint || this.state.consoleOptions.selectHint;
    }

    get selectOptions(): Array<{ label: string; value: string; description?: string }> {
        return this.state.selectMenu?.options?.map((o: any) => ({
            label: o.label,
            value: o.value,
            description: o.description || ''
        })) || [];
    }

    get selectIndex(): number {
        return this.state.selectMenu?.selectedIndex ?? 0;
    }

    get theme() {
        return this.state.theme;
    }

    get sessionState(): AgentConsoleSessionState {
        return this.state;
    }

    get sessionId(): string {
        return this.state.sessionId;
    }

    get input(): string {
        return this.state.input;
    }

    set input(value: string) {
        this.state.setInput(value, value.length);
    }

    get messages(): AgentMessage[] {
        return this.state.messages;
    }

    get status(): string {
        return this.state.status;
    }

    get provider(): string {
        return this.state.provider;
    }

    get model(): string {
        return this.state.model;
    }

    get workspace(): string {
        return this.state.workspace;
    }

    get tools() {
        return this.state.tools;
    }

    get activities() {
        return this.state.activities;
    }

    get runningTools(): string[] {
        return this.state.runningTools;
    }

    get toolRuns() {
        return this.state.toolRuns;
    }

    get highlightedToolRun() {
        return this.state.highlightedToolRun;
    }

    get tokenUsage() {
        return this.state.tokenUsage;
    }

    get lastError(): string {
        return this.state.lastError;
    }

    get notice(): string {
        return this.state.notice;
    }

    get selectMenu() {
        return this.state.selectMenu;
    }

    get commandHints(): string[] {
        return this.state.commandHints;
    }

    get tasksCount(): number {
        return this.state.tasksCount;
    }

    get submitActionHandler(): () => Promise<void> {
        return async () => {
            await this.submit();
        };
    }

    get selectActionHandler(): (value: string) => Promise<void> {
        return async (value: string) => {
            await this.state.confirmSelectMenu(value);
        };
    }

    get copyFocusedTextActionHandler(): (text: string, label: string) => Promise<void> {
        return async (text: string, label: string) => {
            if (!text) {
                this.notify(`Nothing to copy for ${label}.`);
                return;
            }
            if (this.surfaceAccessor?.writeTerminalClipboardText?.(text)) {
                this.notify(`Copied ${label}.`);
                return;
            }
            this.notify(text);
        };
    }

    protected async retryFailedEventHandler(message: AgentMessage): Promise<boolean> {
        void message;
        if (this.isTurnInProgress()) {
            this.notify(this.translator?.translate('agent.notice.busy') || 'Wait for the current turn to finish.');
            return false;
        }
        const lastUser = [...this.state.messages].reverse().find(item =>
            item.role === 'user' && !!String(item.content || '').trim());
        if (!lastUser) {
            this.notify(this.translator?.translate('agent.notice.nothingToRetry') || 'Nothing to retry.');
            return false;
        }
        this.state.setInput(String(lastUser.content || ''), String(lastUser.content || '').length);
        await this.submit();
        return true;
    }

    get activateSelectedSessionActionHandler(): (sessionId: string) => Promise<void> {
        return async (sessionId: string) => {
            if (!sessionId) {
                return;
            }
            await this.openSession(sessionId);            this.state.setSessionsFocused(false);
        };
    }

    get openSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            const taskRecord = this.state.taskRecords.find(task => task?.id === taskId) || null;
            await this.openCodingTaskReview(taskId, taskRecord);
        };
    }

    get cancelSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.cancelCodingTask(taskId);
        };
    }

    get retrySelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.retryFailedCodingTask(taskId);
        };
    }

    get retrySelectedPlanTodoActionHandler(): (todo: AgentConsolePlanTodoItem) => Promise<void> {
        return async (todo: AgentConsolePlanTodoItem) => {
            const rev = this.state.planRevision > 0 ? ` at revision ${this.state.planRevision}` : '';
            const instruction = `Retry plan step${rev}: ${todo.content}`;
            this.state.setInput(instruction, instruction.length);
            this.state.setInputFocused(true);
            this.notify('Plan step reopened. Press Enter to continue it.');
        };
    }

    get rollbackSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.rollbackCodingTask(taskId);
        };
    }

    get toggleSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.toggleScheduledTask(taskId);
        };
    }

    get cancelSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.cancelScheduledTask(taskId);
        };
    }

    get recoverSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.recoverScheduledTask(taskId);
        };
    }

    get activateSelectedToolActionHandler(): (toolName: string) => Promise<void> {
        return async (toolName: string) => {
            const name = String(toolName || '').trim();
            if (!name) {
                return;
            }
            const sessionId = this.state.sessionId;
            const selected = this.state.tools.find(item => item.name === name);
            if (selected?.active) {
                this.notify(`Tool ${name} is already active.`);
                return;
            }
            try {
                const activated = await this.activateToolForSession(name, sessionId);
                await this.refreshTools(sessionId);
                if (sessionId !== this.state.sessionId) {
                    return;
                }
                this.state.setSelectedToolName(name);
                const current = this.state.tools.find(item => item.name === name);
                this.notify(activated || current?.active
                    ? `Activated ${name}.`
                    : `Tool ${name} could not be activated.`);
            } catch (error: any) {
                this.notify(error?.message || `Failed to activate ${name}.`);
            }
        };
    }

    get resolveApprovalActionHandler(): (decision: 'approve' | 'deny', requestId: string) => Promise<void> {
        return async (decision: 'approve' | 'deny', requestId: string) => {
            if (!requestId) {
                return;
            }
            const requests = await this.getPendingApprovals(this.state.sessionId);
            const request = requests.find((item: any) => item.id === requestId)
                || this.state.selectedApproval
                || { id: requestId, toolName: 'request' };
            const applied = await this.applyApprovalDecision(decision, requestId);
            await this.refreshPendingApprovals();
            this.notify(applied
                ? `${decision === 'approve' ? 'Approved' : 'Denied'} ${request.toolName} (${requestId.slice(0, 8)}).`
                : `Approval request ${requestId.slice(0, 8)} is no longer pending.`);
        };
    }

    showNotice(message: string): void {
        this.state.setNotice(message);
    }

    clearNotice(): void {
        this.showNotice('');
    }

    async select(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<string | undefined> {
        return new Promise(resolve => {
            const resolveSelection = async (value: string | undefined) => {
                resolve(value);
            };
            this.state.openSelectMenu(title, options, selectedIndex, hint);
            this.state.selectMenuAction = resolveSelection;
        });
    }

    configure(meta: AgentConsoleSessionMeta): this {
        const nextSessionId = String(meta.sessionId || '').trim();
        if (nextSessionId && nextSessionId !== this.state.sessionId) {
            this.sessionEpoch += 1;
        }
        this.state.configure(meta);
        this.state.setQueuedPromptCount((this.queuedPrompts.get(this.state.sessionId) || []).length);
        return this;
    }

    protected rpcRequestContext(requestId?: string): { requestId?: string; sessionEpoch: number; signal?: AbortSignal } {
        const resolvedId = requestId || this.pendingCommandRequestId || undefined;
        return {
            requestId: resolvedId,
            sessionEpoch: this.sessionEpoch,
            signal: resolvedId ? this.state.getCommandExecutionSignal(resolvedId) : undefined
        };
    }

    async onInit(): Promise<void> {
        this.state.submitAction = this.submitActionHandler;
        this.state.escapeAction = () => this.handleWizardEscape();
        this.state.questionAction = this.appRpc
            ? async input => { await this.appRpc!.request('question.answer', input); }
            : undefined;
        this.state.queueDraftAction = () => this.queueDraft();
        this.state.toggleHealthPopoverAction = () => this.toggleHealthPopover();
        this.state.copyFocusedTextAction = this.copyFocusedTextActionHandler;
        this.state.retryFailedEventAction = message => this.retryFailedEventHandler(message);
        this.state.activateSelectedSessionAction = this.activateSelectedSessionActionHandler;
        this.state.openSelectedTaskAction = this.openSelectedTaskActionHandler;
        this.state.cancelSelectedTaskAction = this.cancelSelectedTaskActionHandler;
        this.state.retrySelectedTaskAction = this.retrySelectedTaskActionHandler;
        this.state.retrySelectedPlanTodoAction = this.retrySelectedPlanTodoActionHandler;
        this.state.rollbackSelectedTaskAction = this.rollbackSelectedTaskActionHandler;
        this.state.toggleSelectedScheduledTaskAction = this.toggleSelectedScheduledTaskActionHandler;
        this.state.cancelSelectedScheduledTaskAction = this.cancelSelectedScheduledTaskActionHandler;
        this.state.recoverSelectedScheduledTaskAction = this.recoverSelectedScheduledTaskActionHandler;
        this.state.activateSelectedToolAction = this.activateSelectedToolActionHandler;
        this.state.revertGitSnapshotFromDetailAction = () => this.revertGitSnapshotFromDetail();
        this.state.resolveApprovalAction = this.resolveApprovalActionHandler;
        this.state.globalKeyInputAction = (key, modifiers) => this.handleBrowserGlobalKeyInput(key, modifiers);
this.state.onReviewAnnotationsPersist = (cache) => this.saveReviewAnnotationsCacheToDisk(cache);
        this.state.onReviewConclusionsWriteBack = (conclusions) => this.writeReviewConclusionsToMemory(conclusions);
        this.state.onSessionReconnected = () => this.restoreReviewAnnotationsCacheFromDisk();
        this.restoreReviewAnnotationsCacheFromDisk();
        this.ensureWorkspaceMentionResolver();
        await this.restoreGlobalKeymap();
        await this.restoreTheme();
        await this.restoreStatusline();
        await this.restoreTitle();
        await this.restoreRawMode();
        await this.restoreModelStore();
        await this.restoreSettings();
        syncConsoleMessageViewportView(this.terminalInputHost());
        this.updateTerminalTitle();
        await this.resolveGitBranch();
        // Do not ask app.state for an implicit session: that RPC creates and
        // tracks a session (and can replay its transcript through the bridge).
        // Startup session contract: only --session may resume.
        const explicitSessionId = String(this.options.bootstrapTurn?.sessionId || '').trim();
        const freshStartup = !explicitSessionId
            && (this.options.bootstrapTurn?.enabled === false || !!this.startupWorkspace);
        if (!freshStartup) {
            await this.bootstrapStateFromAppRpc();
        }
        await this.initializeInputHistory();
        // No explicit session means a fresh conversation. Resuming the state
        // default here replays the previous transcript on every console start.
        await this.openSession(explicitSessionId || (freshStartup ? undefined : this.state.sessionId) || undefined, {
            persistCurrentHistory: false,
            fresh: freshStartup
        });
        // Subscribe only after the initial session is selected. Subscribing
        // earlier lets the remote bridge seed the default session's timeline
        // into a new, non-resumed chat.
        this.bridge.bindState(this.sessionState);
        // Await remote seed/replay before declaring startup complete. Without
        // this, a fresh-session clear races async replay and old project
        // transcript can be appended after the clear.
        await Promise.resolve(this.bridge.subscribe());
        if (freshStartup) {
            // Local bridge subscription can synchronously project retained
            // host events, including a plan from a previous workspace session.
            // A plain workspace start owns a clean conversation unless the
            // caller explicitly supplied --session.
            this.state.setMessages([]);
            this.state.clearPlanTodos();
            this.state.setGoalSummary(null);
            this.state.clearActivities();
        }
        this.scheduleInputHistoryRestore();
        await this.refreshTools();
        await this.refreshMentionCatalog();
        await this.refreshScheduledTasks();
        await this.refreshUsageDigest();
        await this.refreshSummaryQualityDigest();
        await this.refreshCompactionDigest();
        await this.refreshTurnDiagnosticsDigest();
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    onDestroy(): void {
        this.destroyed = true;
        void this.stopVoiceCapture(true).catch(() => undefined);
        void Promise.resolve(this.audioPlayback?.stop()).catch(() => undefined);
        this.clearStreamingMessageState();
        this.clearInputHistoryRestoreTimers();
        this.state.copyFocusedTextAction = undefined;
        this.state.activateSelectedSessionAction = undefined;
        this.state.openSelectedTaskAction = undefined;
        this.state.cancelSelectedTaskAction = undefined;
        this.state.retrySelectedTaskAction = undefined;
        this.state.retrySelectedPlanTodoAction = undefined;
        this.state.rollbackSelectedTaskAction = undefined;
        this.state.toggleSelectedScheduledTaskAction = undefined;
        this.state.cancelSelectedScheduledTaskAction = undefined;
        this.state.recoverSelectedScheduledTaskAction = undefined;
        this.state.activateSelectedToolAction = undefined;
        this.state.resolveApprovalAction = undefined;
        this.state.globalKeyInputAction = undefined;
        void this.persistInputHistory();
        const shell = this.sshShell;
        this.sshShell = null;
        this.state.sshShell = null;
        if (shell) {
            void shell.close().catch(() => void 0);
        }
        this.dispose();
    }

    protected async saveReviewAnnotationsCacheToDisk(cache: Record<string, Record<string, any>>): Promise<void> {
        await saveReviewAnnotationsCacheToDisk(this.reviewCtx(), cache);
    }

    protected async writeReviewConclusionsToMemory(conclusions: Record<string, any>): Promise<void> {
        const ctx = this.reviewCtx();
        if (!ctx.appRpc) return;
        const sessionId = ctx.state.sessionId;
        if (!sessionId) return;
        await ctx.appRpc.request('review.conclusions.write', { sessionId, conclusions }, this.rpcRequestContext());
    }

    protected async restoreReviewAnnotationsCacheFromDisk(): Promise<void> {
        await restoreReviewAnnotationsCacheFromDisk(this.reviewCtx());
    }

    protected async restoreReviewAnnotationsCacheFromDiskForScope(scope?: {
        cacheKey?: string;
        selectedTaskId?: string;
        sessionId?: string;
        requestId?: number;
    }): Promise<void> {
        await restoreReviewAnnotationsCacheFromDiskForScope(this.reviewCtx(), scope);
    }

    protected rememberVolatileReviewAnnotations(cacheKey: string, annotations?: Record<string, any> | null): Record<string, any> {
        return rememberVolatileReviewAnnotations(this.reviewCtx(), cacheKey, annotations);
    }

    protected getVolatileReviewAnnotations(cacheKey: string): Record<string, any> | undefined {
        return getVolatileReviewAnnotations(this.reviewCtx(), cacheKey);
    }

    protected getReviewAnnotationsVolatileCache(create = false): Map<string, Record<string, any>> | undefined {
        return getReviewAnnotationsVolatileCache(this.reviewCtx(), create);
    }

    protected applyReviewAnnotationsForScope(
        cacheKey: string,
        selectedTaskId: string,
        annotations: Record<string, any>
    ): void {
        applyReviewAnnotationsForScope(this.reviewCtx(), cacheKey, selectedTaskId, annotations);
    }

    protected extractReviewAnnotations(
        cache: Record<string, Record<string, any>> | Record<string, any> | null | undefined,
        scope: { cacheKey?: string; selectedTaskId?: string }
    ): Record<string, any> | undefined {
        return extractReviewAnnotations(cache, scope);
    }

    protected looksLikeReviewAnnotationMap(value: unknown): value is Record<string, any> {
        return looksLikeReviewAnnotationMap(value);
    }

    protected ensureWorkspaceMentionResolver(): void {
        const injected = this.workspaceMentionsProvider
            || this.app?.get(AgentConsoleWorkspaceMentionsProvider, null) as AgentConsoleWorkspaceMentionsProvider | null
            || undefined;
        const injectedFileAdapter = injected ? ((injected as any).fileAdapter as FileAdapter | undefined) : undefined;
        if (injected && injectedFileAdapter) {
            this.workspaceMentionsProvider = injected;
        } else {
            const fileAdapter = this.app?.get(FileAdapter, null) as FileAdapter | null;
            this.workspaceMentionsProvider = fileAdapter
                ? new AgentConsoleWorkspaceMentionsProvider(fileAdapter)
                : injected;
        }
        this.state.setWorkspaceMentionResolver(this.workspaceMentionsProvider || undefined);
    }

    protected parseSlashCommandLine(input: string): { raw: string; command: string; args: string } {
        return parseSlashCommandLine(input);
    }

    /**
     * Parses `/quality trend` trailing tokens: optional provider, optional
     * bucket size (`Nd` for days or a millisecond number), optional max bucket
     * count. Returns undefined for absent or invalid numeric tokens.
     */
    protected parseSummaryQualityTrendArgs(
        args: string
    ): { provider?: string; bucketSize?: number; maxBuckets?: number } {
        return parseSummaryQualityTrendArgs(args);
    }

    /**
     * Parses `/compactions trend` trailing tokens: optional session id,
     * optional bucket size (`Nd` for days or a millisecond number), optional
     * max bucket count. Returns undefined for absent or invalid numeric tokens.
     */
    protected parseCompactionHistoryTrendArgs(
        args: string
    ): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
        return parseCompactionHistoryTrendArgs(args);
    }

    protected resolveUniqueCommandPrefix(input: string): { command: string; matches: string[] } {
        const matches = this.state.commandHints.filter(item => item.startsWith(input));
        return {
            command: matches.length === 1 ? matches[0] : input,
            matches
        };
    }

    protected resolveMentionDisplayFiles(input: string): string[] {
        const matches = String(input || '').match(/(^|\s)@([^\s@]+)/g) || [];
        const builtin = new Set(['workspace', 'session', 'model', 'tools']);
        const toolNames = new Set((this.state.tools || []).map(tool => tool.name));
        const files = new Set<string>();
        for (const raw of matches) {
            const name = raw.trim().slice(1);
            if (!name || builtin.has(name) || toolNames.has(name)) {
                continue;
            }
            files.add(name);
        }
        return Array.from(files);
    }

    protected async enrichPromptWithMentions(input: string): Promise<string> {
        return enrichPromptWithMentionsView(this.promptMentionHost(), input);
    }

    protected async refreshMentionCatalog(): Promise<void> {
        return refreshMentionCatalog({
            appRpc: this.appRpc,
            toolRegistry: this.toolRegistry,
            state: this.state,
            rpcRequestContext: () => this.rpcRequestContext(),
            setMentionCatalog: (catalog: any[]) => {
                this.mentionCatalog = catalog as any;
                this.state.setMentionCatalog(catalog);
            }
        });
    }

    protected async bootstrapStateFromAppRpc(): Promise<void> {
        if (!this.appRpc) {
            return;
        }
        const meta = await this.appRpc.request('app.state', undefined, this.rpcRequestContext());
        if (!meta || typeof meta !== 'object') {
            return;
        }
        if (typeof meta.title === 'string' && meta.title.trim()) {
            this.state.setTitle(meta.title.trim());
        }
        const configuredSessionId = String(this.options.bootstrapTurn?.sessionId || '').trim();
        this.state.configure({
            // CLI fresh startup skips app.state entirely. Other hosts retain
            // their established current-session bootstrap behavior.
            sessionId: configuredSessionId || (typeof meta.sessionId === 'string' ? meta.sessionId : undefined),
            provider: typeof meta.provider === 'string' ? meta.provider : undefined,
            model: typeof meta.model === 'string' ? meta.model : undefined,
            modelProfile: typeof meta.modelProfile === 'string' ? meta.modelProfile : undefined,
            workspace: this.startupWorkspace || (typeof meta.workspace === 'string' ? meta.workspace : undefined)
        });
        if (this.startupWorkspace) {
            this.state.setWorkspace(this.startupWorkspace);
        }
        this.state.setQueuedPromptCount((this.queuedPrompts.get(this.state.sessionId) || []).length);
        this.updateTerminalTitle();
    }

    protected async restoreInputHistory(): Promise<void> {
        return loadInputHistory(this.inputHistoryStore, () => this.resolveHistoryWorkspace(), this.state);
    }

    protected async initializeInputHistory(): Promise<void> {
        return loadInputHistory(this.inputHistoryStore, () => this.resolveHistoryWorkspace(), this.state);
    }

    protected scheduleInputHistoryRestore(delays: number[] = [0, 150, 750]): void {
        void delays;
        if (!this.destroyed) void this.restoreInputHistory();
    }

    protected clearInputHistoryRestoreTimers(): void {
        // Kept as a lifecycle-compatible no-op; restoration is promise-driven.
    }

    protected async persistInputHistory(): Promise<void> {
        if (!this.inputHistoryStore) {
            return;
        }
        try {
            await this.inputHistoryStore.save(this.state.getInputHistoryEntries(), this.resolveHistoryWorkspace(), this.state.sessionId);
        } catch (error) {
            this.state.setLastError(`Failed to save input history: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected resolveHistoryWorkspace(): string {
        const configured = String(this.state.workspace || this.startupWorkspace || (this.options.ui?.console as any)?.workspace || '').trim();
        if (configured) {
            return configured;
        }
        return String(getGlobalProcess()?.cwd?.() || '').trim();
    }

    protected async openCodingTaskReview(
        taskId: string,
        taskRecord?: Record<string, any> | null,
        options?: { returnFalseOnStale?: boolean }
    ): Promise<boolean> {
        return openCodingTaskReviewFn(this.codingTaskCtx(), taskId, taskRecord, options);
    }

    protected async openGitDiffReview(base?: string): Promise<boolean> {
        return openGitDiffReview(this.reviewCtx(), base);
    }

    protected async openWorktreeDiff(args?: string): Promise<boolean> {
        return openWorktreeDiff(this.reviewCtx(), args);
    }

    protected parseWorktreeDiffArgs(args?: string): {
        scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked';
        paths: string[];
        error?: string;
    } {
        return parseWorktreeDiffArgs(args);
    }

    protected describeWorktreeDiffScope(scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked'): string {
        return describeWorktreeDiffScope(scope);
    }

    protected async runGitDiffReviewAnalysis(base?: string): Promise<boolean> {
        return runGitDiffReviewAnalysis(this.reviewCtx(), base);
    }

    protected async listReviewFindings(commit?: string): Promise<boolean> {
        return listReviewFindings(this.reviewCtx(), commit);
    }

    protected async showReviewRun(id: string | undefined): Promise<boolean> {
        return showReviewRun(this.reviewCtx(), id);
    }

    protected buildGitDiffReviewPrompt(base: string, files: string[], diff: string): string {
        return buildGitDiffReviewPrompt(base, files, diff);
    }

    protected parseReviewFindingsFromText(text: string): Record<string, any>[] {
        return parseReviewFindingsFromText(text);
    }

    protected async saveReviewFindings(sessionId: string, run: Record<string, any>): Promise<Record<string, any> | null> {
        return saveReviewFindings(this.reviewCtx(), sessionId, run);
    }

    protected openGitDiffReviewPanel(review: Record<string, any>, base: string): void {
        openGitDiffReviewPanel(this.reviewCtx(), review, base);
    }

    protected async fetchGitDiffReview(sessionId: string, base: string): Promise<Record<string, any> | null> {
        return fetchGitDiffReview(this.reviewCtx(), sessionId, base);
    }

    protected describeCodingTaskRollback(task: any): string {
        return describeCodingTaskRollbackFn(task);
    }

    protected describeCodingTaskCheckpointSummary(task: any): string | undefined {
        return describeCodingTaskCheckpointSummaryFn(task);
    }

    protected canCancelCodingTask(task: any): boolean {
        return canCancelCodingTaskFn(task);
    }

    protected canRollbackCodingTask(task: any): boolean {
        return canRollbackCodingTaskFn(task);
    }

    protected canRetryCodingTask(task: any): boolean {
        return canRetryCodingTaskFn(task);
    }

    protected resolveCodingTaskRetrySourceTaskId(task: any): string | undefined {
        return resolveCodingTaskRetrySourceTaskIdFn(task);
    }

    protected buildCodingTaskLineageMetadata(task: any, tasks: any[]): {
        retryOfTaskId?: string;
        lineageRootTaskId: string;
        retryDepth?: number;
        lineageTaskCount: number;
    } {
        return buildCodingTaskLineageMetadataFn(task, tasks);
    }

    protected buildCodingTaskChoice(task: any, tasks: any[] = []) {
        return buildCodingTaskChoiceFn(task, tasks);
    }

    protected orderCodingTasksByLineage(tasks: any[]): any[] {
        return orderCodingTasksByLineageFn(tasks);
    }

    protected buildCodingTaskSelectOption(task: any, tasks: any[] = []): AgentConsoleSelectOption {
        return buildCodingTaskSelectOptionFn(task, tasks);
    }

    protected async loadCodingTasks(sessionId = this.state.sessionId, sessionIds?: string[]): Promise<any[]> {
        const resolvedSessionIds = sessionIds
            ?? (this.freshSessionScoped ? [sessionId] : this.resolveProjectSessionIdsFor(sessionId));
        return loadCodingTasksFn(this.codingTaskCtx(), sessionId, resolvedSessionIds);
    }

    protected async openCodingTaskReviewSelector(): Promise<boolean> {
        return openCodingTaskReviewSelectorFn(this.codingTaskCtx());
    }

    protected async openThreadCodingTaskReviewSelector(): Promise<boolean> {
        return openThreadCodingTaskReviewSelectorFn(this.codingTaskCtx());
    }

    protected async selectCodingTask(options: {
        title: string;
        unavailableNotice: string;
        emptyNotice: string;
        filter?: (task: any) => boolean;
        selectedTaskId?: string;
        sessionIds?: string[];
    }): Promise<any | null> {
        return selectCodingTaskFn(this.codingTaskCtx(), options);
    }

    protected async openCodingTaskInspector(taskId?: string, options?: { returnFalseOnStale?: boolean }): Promise<boolean> {
        return openCodingTaskInspectorFn(this.codingTaskCtx(), taskId, options);
    }

    protected async rollbackCodingTask(taskId?: string): Promise<boolean> {
        return rollbackCodingTaskFn(this.codingTaskCtx(), taskId);
    }

    protected async retryFailedCodingTask(taskId?: string): Promise<boolean> {
        return retryFailedCodingTaskFn(this.codingTaskCtx(), taskId);
    }

    protected async refreshScheduledTasks(): Promise<void> {
        return refreshScheduledTasksFn(this.codingTaskCtx());
    }

    protected async openScheduledJobsDashboard(taskId?: string): Promise<boolean> {
        return openScheduledJobsDashboardFn(this.codingTaskCtx(), taskId);
    }

    protected async toggleScheduledTask(taskId?: string): Promise<boolean> {
        return toggleScheduledTaskFn(this.codingTaskCtx(), taskId);
    }

    protected async pauseScheduledTask(taskId?: string): Promise<boolean> {
        return pauseScheduledTaskFn(this.codingTaskCtx(), taskId);
    }

    protected async resumeScheduledTask(taskId?: string): Promise<boolean> {
        return resumeScheduledTaskFn(this.codingTaskCtx(), taskId);
    }

    protected async cancelScheduledTask(taskId?: string): Promise<boolean> {
        return cancelScheduledTaskFn(this.codingTaskCtx(), taskId);
    }

    protected async recoverScheduledTask(taskId?: string): Promise<boolean> {
        return recoverScheduledTaskFn(this.codingTaskCtx(), taskId);
    }

    protected async cancelCodingTask(taskId?: string): Promise<boolean> {
        return cancelCodingTaskFn(this.codingTaskCtx(), taskId);
    }



    protected buildCommandContext(abortSignal?: AbortSignal): CommandHandlerContext {
        const self = this;
        return {
            abortSignal,
            state: {
                get sessionId() { return self.state.sessionId; },
                get sessions() { return self.state.sessions; },
                get projects() { return self.state.projects; },
                get threads() { return self.state.threads; },
                get sections() { return self.state.sections; },
                get messages() { return self.state.messages; },
                get tools() { return self.state.tools; },
                get toolRuns() { return self.state.toolRuns; },
                get pendingAttachments() { return self.state.pendingAttachments; },
                get notice() { return self.state.notice; },
                get input() { return self.state.input; },
                get workspace() { return self.state.workspace; },
                get status() { return self.state.status; },
                get provider() { return self.state.provider; },
                get model() { return self.state.model; },
                get planTodos() { return self.state.planTodos; },
                get reviewFileSections() { return self.state.reviewFileSections; },
                get reviewFileAnnotations() { return self.state.reviewFileAnnotations; },
                get consoleOptions() { return self.state.consoleOptions; },
                get commandHints() { return self.state.commandHints; },
                setInput: (v, c) => self.state.setInput(v, c),
                setNotice: (m) => self.state.setNotice(m),
                setTitle: (t) => self.state.setTitle(t),
                setSessionsFocused: (f) => self.state.setSessionsFocused(f),
                setMessagesFocused: (f) => self.state.setMessagesFocused(f),
                setToolsFocused: (f) => self.state.setToolsFocused(f),
                setApprovalsFocused: (f) => self.state.setApprovalsFocused(f),
                setJobsFocused: (f) => self.state.setJobsFocused(f),
                setTasksFocused: (f) => self.state.setTasksFocused(f),
                setToolRunsFocused: (f) => self.state.setToolRunsFocused(f),
                setProjectsFocused: (f) => self.state.setProjectsFocused(f),
                closeMessageDetail: () => self.state.closeMessageDetail(),
                closeReview: () => self.state.closeReview(),
                closeGitSnapshotDetail: () => self.state.closeGitSnapshotDetail(),
                openTextOverlay: (k, l) => self.state.openTextOverlay(k, l),
                toggleCommandOutputs: () => self.state.toggleCommandOutputs(),
                setPendingApprovals: (p) => self.state.setPendingApprovals(p),
                getReviewAnnotationSummary: () => self.state.getReviewAnnotationSummary(),
                approveAllReviewFiles: () => self.state.approveAllReviewFiles(),
                clearAllReviewAnnotations: () => self.state.clearAllReviewAnnotations(),
                clearReviewFileAnnotation: () => self.state.clearReviewFileAnnotation(),
                getReviewExportReport: () => self.state.getReviewExportReport(),
                computeFileRiskScore: (s) => self.state.computeFileRiskScore(s),
                setReviewFileAnnotation: (status, comment) => self.state.setReviewFileAnnotation(status, comment),
                setSessions: (s) => self.state.setSessions(s),
                setProjects: (p) => self.state.setProjects(p),
                setThreads: (t) => self.state.setThreads(t),
                setProjectContext: () => self.state.setProjectContext(),
                setNavFilter: (f) => self.state.setNavFilter(f),
                setNavSelection: (s) => self.state.setNavSelection(s),
                setNavViewScroll: (viewId, scroll) => self.state.setNavViewScroll(viewId, scroll),
            },
            notify: (m, d) => self.notify(m, d),
            pushCommandOutput: (c, t, k) => self.pushCommandOutput(c, t, k),
            select: (t, o, i, h) => self.select(t, o, i, h),
            isTurnInProgress: () => self.isTurnInProgress(),
            notifyBusyState: () => self.notifyBusyState(),
            sessionService: self.sessionService,
            openSession: (id) => self.openSession(id),
            refreshSessions: () => self.refreshSessions(),
            refreshCurrentSections: () => self.refreshCurrentSections(),
            refreshThreadTodoPlan: () => self.refreshThreadTodoPlan(),
            loadThreadCodingTasks: () => self.loadThreadCodingTasks(),
            workspace: self.workspace,
            updateTerminalTitle: () => self.updateTerminalTitle(),
            requestTerminalExit: (m) => self.requestTerminalExit(m),
            closingSessionMessage: () => self.closingSessionMessage(),
            runInitCommand: (a) => self.runInitCommand(a),
            runPlanCommand: (a) => self.runPlanCommand(a),
            runArchetypeCommand: (a) => self.runArchetypeCommand(a),
            runVimCommand: (a) => self.runVimCommand(a),
            runKeymapCommand: (a) => self.runKeymapCommand(a),
            runPermissionsCommand: (a) => self.runPermissionsCommand(a),
            runStatusCommand: () => self.runStatusCommand(),
            runCdCommand: (a) => self.runCdCommand(a),
            runGoalCommand: (a) => self.runGoalCommand(a),
            runUndoCommand: () => self.runUndoCommand(),
            runRedoCommand: () => self.runRedoCommand(),
            runExportCommand: (a) => self.runExportCommand(a),
            runAttachCommand: (a) => self.runAttachCommand(a),
            runSkillsCommand: (a) => self.runSkillsCommand(a),
            runMcpCommand: (a) => self.runMcpCommand(a),
            runPluginsCommand: (a) => self.runPluginsCommand(a),
            runAppsCommand: (a) => self.runAppsCommand(a),
            runSshCommand: (a) => self.runSshCommand(a),
            runThemeCommand: (a) => self.runThemeCommand(a),
            runThinkingCommand: (a) => self.runThinkingCommand(a),
            runDisplayCommand: (a) => self.runDisplayCommand(a),
            runLayoutCommand: (a) => self.runLayoutCommand(a),
            runTimelineModeCommand: (a) => self.runTimelineModeCommand(a),
            runRawModeCommand: (a) => self.runRawModeCommand(a),
            runStashCommand: (a) => self.runStashCommand(a),
            runQueueCommand: (a) => self.runQueueCommand(a),
            runStatuslineCommand: (a) => self.runStatuslineCommand(a),
            runHooksCommand: () => self.runHooksCommand(),
            runMemoriesCommand: (a) => self.runMemoriesCommand(a),
            runFastCommand: (a) => self.runFastCommand(a),
            runPersonalityCommand: (a) => self.runPersonalityCommand(a),
            runDebugConfigCommand: () => self.runDebugConfigCommand(),
            runSettingsCommand: () => self.runSettingsCommand(),
            runYoloCommand: (a) => self.runYoloCommand(a),
            runExperimentalCommand: (a) => self.runExperimentalCommand(a),
            runFeedbackCommand: () => self.runFeedbackCommand(),
            runBackgroundTasksCommand: (a) => self.runBackgroundTasksCommand(a),
            runIdeCommand: (a) => self.runIdeCommand(a),
            runEditorCommand: (a) => self.runEditorCommand(a),
            runShareCommand: (a) => self.runShareCommand(a),
            runUnshareCommand: (a) => self.runUnshareCommand(a),
            runTitleCommand: (a) => self.runTitleCommand(a),
            runGitSnapshotsCommand: (a) => self.runGitSnapshotsCommand(a),
            runApproveRetryCommand: () => self.runApproveRetryCommand(),
            openScheduledJobsDashboard: (a) => self.openScheduledJobsDashboard(a),
            openCodingTaskInspector: (a) => self.openCodingTaskInspector(a),
            openThreadCodingTaskReviewSelector: () => self.openThreadCodingTaskReviewSelector(),
            openCodingTaskReview: (a) => self.openCodingTaskReview(a),
            openCodingTaskReviewSelector: () => self.openCodingTaskReviewSelector(),
            openWorktreeDiff: (a) => self.openWorktreeDiff(a),
            retryFailedCodingTask: (a) => self.retryFailedCodingTask(a),
            rollbackCodingTask: (a) => self.rollbackCodingTask(a),
            openSummaryQualityRecords: (p) => self.openSummaryQualityRecords(p),
            openSummaryQualityTrend: (p, b, m) => self.openSummaryQualityTrend(p, b, m),
            parseSummaryQualityTrendArgs: (a) => self.parseSummaryQualityTrendArgs(a),
            formatSummaryQualityAggregate: (a) => self.formatSummaryQualityAggregate(a),
            openCompactionHistory: (a) => self.openCompactionHistory(a),
            openCompactionHistoryTrend: (s, b, m) => self.openCompactionHistoryTrend(s, b, m),
            parseCompactionHistoryTrendArgs: (a) => self.parseCompactionHistoryTrendArgs(a),
            openTurnDiagnostics: (s) => self.openTurnDiagnostics(s),
            openTurnDiagnosticsList: (s) => self.openTurnDiagnosticsList(s),
            openTurnDiagnosticsTrend: (s, b, m) => self.openTurnDiagnosticsTrend(s, b, m),
            parseTurnDiagnosticsTrendArgs: (a) => self.parseTurnDiagnosticsTrendArgs(a),
            openDelegationTree: (s, st, d) => self.openDelegationTree(s, st, d),
            openDelegationLineage: (s) => self.openDelegationLineage(s),
            openDelegationList: (s) => self.openDelegationList(s),
            runDelegationModeCommand: (a) => self.runDelegationModeCommand(a),
            openHarnessAudit: (s) => self.openHarnessAudit(s),
            openHarnessProfile: (s) => self.openHarnessProfile(s),
            openHarnessTree: (s) => self.openHarnessTree(s),
            openHarnessList: (s) => self.openHarnessList(s),
            runHarnessStopCommand: (t) => self.runHarnessStopCommand(t),
            handleVoiceCommand: (a) => self.handleVoiceCommand(a),
            getPendingApprovals: (s) => self.getPendingApprovals(s),
            applyApprovalDecision: (d, r) => self.applyApprovalDecision(d, r),
            copyFocusedTextActionHandler: (t, l) => self.copyFocusedTextActionHandler(t, l),
            searchSessionContent: (q, s) => self.searchSessionContent(q, s),
            activateSelectedToolActionHandler: (t) => self.activateSelectedToolActionHandler(t),
            resolveSessionProjectKey: (s) => self.resolveSessionProjectKey(s),
            resolveSessionThreadKey: (s) => self.resolveSessionThreadKey(s),
            handleMenuSelection: (v) => self.handleMenuSelection(v),
            submitMultilineDraft: () => self.submitMultilineDraft(),
            get multilineMode() { return self.multilineMode; },
            set multilineMode(v) { self.multilineMode = v; },
            get draftLines() { return self.draftLines; },
            set draftLines(v) { self.draftLines = v; },
            get shellMultilineMode() { return self.shellMultilineMode; },
            set shellMultilineMode(v) { self.shellMultilineMode = v; },
            get shellDraftLines() { return self.shellDraftLines; },
            set shellDraftLines(v) { self.shellDraftLines = v; },
            openGitDiffReview: (b) => self.openGitDiffReview(b),
            runGitDiffReviewAnalysis: (b) => self.runGitDiffReviewAnalysis(b),
            listReviewFindings: (c) => self.listReviewFindings(c),
            showReviewRun: (id) => self.showReviewRun(id),
            openModelSwitcher: () => self.openModelSwitcher(),
            activateModelProfile: (n) => self.activateModelProfile(n),
            queueNextTurnModelProfile: (n) => self.queueNextTurnModelProfile(n),
            startProviderWizard: () => self.startProviderWizard(),
            openUsage: (i) => self.openUsage(i),
        } as CommandHandlerContext;
    }

    protected async handleCommand(value: string): Promise<boolean> {
        const parsed = this.parseSlashCommandLine(value);
        if (!parsed.command.startsWith('/')) {
            return false;
        }
        const resolved = this.resolveUniqueCommandPrefix(parsed.command);
        const canonical = getAgentConsoleCommandName(resolved.command);
        const args = String(parsed.args || '').trim();
        const previousRequestId = this.pendingCommandRequestId;
        const requestId = this.state.beginCommandExecution(canonical, args);
        this.pendingCommandRequestId = requestId;
        if (!this.state.commandHints.includes(canonical)) {
            const reason = resolved.matches.length
                ? `Ambiguous command: ${parsed.command}  (${resolved.matches.join(', ')})`
                : `Unknown command: ${parsed.command}`;
            this.state.failCommandExecution(requestId, reason, false);
            this.notify(reason);
            this.pendingCommandRequestId = previousRequestId;
            return true;
        }
        const parsedArgs = parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition(canonical), args);
        if (parsedArgs.diagnostics.length) {
            const reason = formatAgentConsoleCommandDiagnostics(parsedArgs.diagnostics);
            this.state.failCommandExecution(requestId, reason, false);
            // Preserve the exact command so the user can correct it and retry.
            this.state.setInput(parsed.raw, parsed.raw.length);
            this.notify(formatAgentConsoleCommandDiagnosticEcho(parsedArgs.diagnostics).join('\n'));
            this.pendingCommandRequestId = previousRequestId;
            return true;
        }
        const handler = COMMAND_HANDLERS[canonical];
        if (handler) {
            try {
                const handled = await handler(this.buildCommandContext(this.state.getCommandExecutionSignal(requestId)), args, { command: canonical, matches: resolved.matches, parsedArgs });
                if (!this.state.isCommandExecutionCurrent(requestId)) {
                    this.pendingCommandRequestId = previousRequestId;
                    return true;
                }
                this.state.completeCommandExecution(requestId, 'succeeded');
                this.pendingCommandRequestId = previousRequestId;
                return handled;
            } catch (error) {
                if (!this.state.isCommandExecutionCurrent(requestId)) {
                    this.pendingCommandRequestId = previousRequestId;
                    return true;
                }
                const reason = error instanceof Error ? error.message : String(error);
                this.state.failCommandExecution(requestId, reason, true);
                this.notify(reason);
                this.pendingCommandRequestId = previousRequestId;
                return true;
            }
        }
        this.state.failCommandExecution(requestId, `Unknown command: ${parsed.command}`, false);
        this.pendingCommandRequestId = previousRequestId;
        return false;
    }


    protected async handleMenuSelection(value: string): Promise<void> {
        return handleMenuSelection(this.state, (selected: string) => this.handleCommand(selected), value);
    }

    protected async submitMultilineDraft(): Promise<void> {
        await submitMultilineDraftView(this.turnInputHost());
    }
    async submit(): Promise<void> {
        await submitView(this.turnInputHost());
    }

    /**
     * `!cmd` runs a shell command; `!!` toggles multiline draft mode; a bare
     * `!` submits the draft in draft mode, otherwise shows the usage hint.
     * Returns true when the input was consumed as a shell command.
     */
    protected async handleShellBang(value: string): Promise<boolean> {
        return handleShellBangView(this.shellCommandHost(), value);
    }

    /**
     * Runs a shell command via the terminal tool as a read-only `type: 'shell'`
     * message. The message stays in the UI state and never enters model context.
     */

    protected updateShellMessage(id: string, patch: Partial<AgentMessage>): void {
        const messages = this.state.messages.map(item => item.id === id ? { ...item, ...patch } : item);
        this.state.setMessages(messages);
    }

    protected async invokeTerminalTool(command: string): Promise<any> {
        const sessionId = this.state.sessionId;
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.invoke', {
                sessionId,
                name: 'terminal',
                input: { command }
            }, this.rpcRequestContext());
            return result?.output;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.invoke !== 'function') {
            throw new Error('Terminal tool is not available in this environment.');
        }
        if (typeof this.toolRegistry.isToolActive === 'function') {
            const active = await this.toolRegistry.isToolActive(sessionId, 'terminal');
            if (!active) {
                const activated = await this.activateToolForSession('terminal', sessionId);
                if (!activated) {
                    throw new Error('Terminal tool is not activated for this session. Approve activation or use /tools.');
                }
            }
        }
        return this.toolRegistry.invoke('terminal', { command }, sessionId);
    }

    protected async runTurnStream(
        prompt: string,
        assistantMessage: AgentMessage,
        message?: AgentTurnMessageInput,
        profile?: string
    ): Promise<void> {
        await runTurnStreamView(this.turnStreamHost(), this.turnStreamState, prompt, assistantMessage, message, profile);
    }

    protected consumeStreamChunk(chunk: any, assistantMessage: AgentMessage): void {
        consumeStreamChunkView(this.turnStreamHost(), this.turnStreamState, chunk, assistantMessage);
    }

    protected consumeStreamEventChunk(chunk: any): void {
        consumeStreamEventChunkView(this.turnStreamHost(), chunk);
    }

    protected describeStreamEventContent(eventType: string, chunk: any): string {
        return describeStreamEventContent(eventType, chunk, this.translator);
    }

    protected describePendingToolCall(chunk: any): string {
        return describePendingToolCall(chunk, this.translator);
    }

    private turnStreamHost(): AgentConsoleTurnStreamHost {
        return {
            state: this.state,
            destroyed: this.destroyed,
            translator: this.translator,
            appRpc: this.appRpc,
            runtime: this.runtime,
            updateTerminalTitle: () => this.updateTerminalTitle(),
            executeTurn: (input, message, profile) => this.executeTurn(input, message, profile),
            refreshTodoPlan: () => this.refreshTodoPlan(),
            refreshPendingApprovals: () => this.refreshPendingApprovals()
        };
    }

    async schedulePrompt(prompt: string, delayMs: number): Promise<void> {
        await this.scheduler.schedule({
            id: `task-${Date.now()}`,
            sessionId: this.state.sessionId,
            prompt,
            runAt: Date.now() + delayMs,
            scheduleType: 'once'
        });
        await this.refreshScheduledTasks();
    }

    dispose(): void {
        this.clearStreamingMessageState();
        this.bridge.dispose();
    }

    getTerminalRoot(): RNode | RNode[] | undefined {
        const rootNodes = this.componentRef?.hostView?.rootNodes;
        if (rootNodes?.length) {
            return rootNodes;
        }
        return undefined;
    }

    shouldPlaceTerminalCursor(): boolean {
        return this.state.shouldRenderTerminalCursor();
    }

    resolveTerminalCursorMode(): 'prompt' | 'bottom' {
        return this.state.resolveTerminalCursorMode();
    }

    resolveTerminalCursorStyle(): 'bar' {
        return 'bar';
    }

    shouldBlinkTerminalCursor(): boolean {
        return true;
    }

    // LAYOUT CONTRACT: viewport (default) windows the transcript; stream uses
    // native terminal scrollback for the whole session and is opt-in via /layout.
    shouldUseNativeScrollback(): boolean {
        return this.state.consoleOptions.messageLayout === 'stream';
    }

    getTerminalRenderedLines(): string[] {
        return this.surfaceAccessor?.getLastRenderedLines() || [];
    }

    getTerminalRenderedText(stripAnsi: (value: string) => string): string {
        return this.surfaceAccessor?.getLastRenderedText(stripAnsi) || '';
    }

    protected clearStreamingMessageState(): void {
        clearStreamingMessageState(this.turnStreamState);
    }

    protected ensureMessageAtTail(messageId: string): void {
        ensureMessageAtTail(this.state, messageId);
    }

    protected async loadSessionMessages(sessionId = this.state.sessionId): Promise<AgentMessage[]> {
        const messages = await (this.sessionService?.loadMessages(sessionId) || this.runtime.getMessages(sessionId));
        return this.normalizeLoadedMessages(messages);
    }

    protected async loadSessionPage(sessionId = this.state.sessionId): Promise<{ messages: AgentMessage[]; sections: AgentSessionSection[]; goalSummary?: any }> {
        if (this.sessionService) {
            const page = await this.sessionService.loadMessagesPage(sessionId);
            const messages = page.messages.slice();
            const seenCursors = new Set<string>();
            let cursor = page.messages[0]?.id;
            let hasMore = page.hasMore === true;
            while (hasMore && cursor && !seenCursors.has(cursor)) {
                seenCursors.add(cursor);
                const previous = await this.sessionService.loadMessagesPage(
                    sessionId,
                    undefined,
                    { cursor, before: true }
                );
                messages.unshift(...previous.messages);
                cursor = previous.messages[0]?.id;
                hasMore = previous.hasMore === true;
            }
            return {
                messages: this.normalizeLoadedMessages(messages),
                sections: Array.isArray(page.sections) ? page.sections : [],
                goalSummary: page.goalSummary
            };
        }
        const messages = await this.runtime.getMessages(sessionId);
        return { messages: this.normalizeLoadedMessages(messages), sections: [], goalSummary: undefined };
    }

    protected async searchSessionContent(
        query: string,
        sessions: AgentConsoleSessionItem[]
    ): Promise<Map<string, { count: number; snippet: string }>> {
        return searchSessionContent(
            query,
            sessions,
            this.state,
            (sessionId: string) => this.loadSessionMessages(sessionId),
            (items: any[], limit: number, fn: (item: any) => Promise<any>) => this.mapWithConcurrency(items, limit, fn) as any,
            AgentConsoleComponent.SEARCH_CONCURRENCY
        );
    }

    protected async mapWithConcurrency<T, R>(
        items: T[],
        limit: number,
        worker: (item: T, index: number) => Promise<R>
    ): Promise<Array<{ item: T; result?: R; error?: unknown }>> {
        const outputs: Array<{ item: T; result?: R; error?: unknown }> = [];
        let next = 0;
        const run = async () => {
            while (next < items.length) {
                const index = next++;
                const item = items[index];
                try {
                    const result = await worker(item, index);
                    outputs.push({ item, result });
                } catch (error) {
                    outputs.push({ item, error });
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
        return outputs;
    }

    protected normalizeLoadedMessages(messages: AgentMessage[] = []): AgentMessage[] {
        return normalizeLoadedMessages(messages);
    }

    protected async refreshTurnArtifacts(): Promise<void> {
        await Promise.allSettled([
            this.refreshTools(),
            this.refreshScheduledTasks(),
            this.refreshTodoPlan(),
            this.loadCodingTasks(),
            this.refreshUsageDigest(),
            this.refreshSummaryQualityDigest(),
            this.refreshCompactionDigest(),
            this.refreshTurnDiagnosticsDigest()
        ]);
    }

    protected async refreshUsageDigest(): Promise<void> {
        return refreshUsageDigest(this.sessionService, this.state);
    }

    protected async refreshTurnDiagnosticsDigest(): Promise<void> {
        return refreshTurnDiagnosticsDigest(this.sessionService, this.state);
    }

    protected async refreshCompactionDigest(): Promise<void> {
        return refreshCompactionDigest(this.sessionService, this.state);
    }

    protected async refreshSummaryQualityDigest(): Promise<void> {
        return refreshSummaryQualityDigest(this.sessionService, this.state);
    }

    protected async mergeTodoPlanForSessions(
        sessionId: string,
        sessions: Array<{ id: string; updatedAt?: number }>
    ): Promise<{ todos: AgentConsolePlanTodoItem[]; sourceSessionId?: string } | null> {
        return mergeTodoPlanForSessionsView(this.todoPlanCommandHost(), sessionId, sessions);
    }

    private todoPlanCommandHost(): TodoPlanCommandHost {
        return {
            appRpc: this.appRpc ?? null,
            state: this.state,
            loadLocalTodoPlan: sessionId => this.loadLocalTodoPlan(sessionId),
            normalizeTodoStatus: status => this.normalizeTodoStatus(status)
        };
    }

    protected async loadLocalTodoPlan(sessionId: string): Promise<AgentConsolePlanTodoItem[]> {
        return loadLocalTodoPlan(sessionId, this.toolRegistry, this.state, (status: unknown) => this.normalizeTodoStatus(status)) as any;
    }

    protected async refreshTodoPlan(
        sessionId = this.state.sessionId,
        sessions?: Array<{ id: string; updatedAt?: number }>
    ): Promise<void> {
        const resolvedSessions = sessions
            ?? (this.freshSessionScoped ? [{ id: sessionId }] : this.resolveProjectSessionsFor(sessionId));
        const merged = await this.mergeTodoPlanForSessions(sessionId, resolvedSessions);
        if (!merged) {
            return;
        }
        this.state.setPlanTodos(merged.todos, merged.sourceSessionId, 'project');
    }

    protected async refreshThreadTodoPlan(
        sessionId = this.state.sessionId,
        sessions = this.resolveThreadSessionsFor(sessionId)
    ): Promise<void> {
        const merged = await this.mergeTodoPlanForSessions(sessionId, sessions);
        if (!merged) {
            return;
        }
        this.state.setPlanTodos(merged.todos, merged.sourceSessionId, 'thread');
    }

    protected async loadThreadCodingTasks(
        sessionId = this.state.sessionId,
        sessionIds = this.resolveThreadSessionIdsFor(sessionId)
    ): Promise<any[]> {
        return loadCodingTasksFn(this.codingTaskCtx(), sessionId, sessionIds);
    }

    protected normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
        switch (String(status || '').trim()) {
            case 'in_progress':
            case 'completed':
            case 'cancelled':
                return status as 'in_progress' | 'completed' | 'cancelled';
            default:
                return 'pending';
        }
    }

    protected async restoreGlobalKeymap(): Promise<void> {
        const persisted = await this.keymapStore?.load(this.state.workspace) || {};
        this.globalKeymap!.configure({ ...(this.options.ui?.keymap || {}), ...persisted });
        const contexts = await this.keymapStore?.loadContexts(this.state.workspace) || {};
        AGENT_CONSOLE_KEYMAP_CONTEXTS.forEach(context => {
            if (context !== 'global' && contexts[context]) {
                this.globalKeymap!.configureContext(context, contexts[context]);
            }
        });
    }

    protected async persistGlobalKeymap(): Promise<void> {
        const contexts: Partial<Record<AgentConsoleKeymapContext, Record<string, string | null>>> = {};
        AGENT_CONSOLE_KEYMAP_CONTEXTS.forEach(context => {
            if (context !== 'global') {
                const bindings = this.globalKeymap!.customBindingsFor(context);
                if (Object.keys(bindings).length) contexts[context] = bindings;
            }
        });
        await this.keymapStore?.save(this.state.workspace, this.globalKeymap!.customBindings, contexts);
    }

    protected async restoreTheme(): Promise<void> {
        const persisted = await this.themeStore?.load(this.resolveHistoryWorkspace());
        if (persisted) {
            this.activeThemeName = persisted;
            this.state.setTheme(agentConsoleThemes[persisted]);
        }
    }

    protected runtimeHost(): AgentConsoleRuntimeHost {
        return {
            state: this.state,
            options: this.options,
            runtime: this.runtime,
            appRpc: this.appRpc,
            rawModeStore: this.rawModeStore,
            activeThemeName: this.activeThemeName,
            notify: (message: string) => this.notify(message),
            select: (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            pushCommandOutput: (command: string, text: string, kind?: any) => this.pushCommandOutput(command, text, kind),
            applyTheme: (name: string) => this.applyTheme(name),
            applyStatusline: (fields: any[]) => this.applyStatusline(fields as any),
            applyTitleFields: (fields: any[]) => this.applyTitleFields(fields as any),
            activateModelProfile: (profile: string) => this.activateModelProfile(profile),
            resolveHistoryWorkspace: () => this.resolveHistoryWorkspace(),
            getSessionSandboxMode: (sessionId: string) => this.getSessionSandboxMode(sessionId),
            getSessionDelegationMode: (sessionId: string) => this.getSessionDelegationMode(sessionId),
            rpcRequestContext: () => this.rpcRequestContext()
        };
    }

    protected async runThemeCommand(args?: string): Promise<boolean> {
        return runThemeCommand(this.runtimeHost(), args);
    }

    protected async runThinkingCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().toLowerCase();
        if (requested === 'on' || requested === 'show') {
            this.state.setShowThinking(true);
        } else if (requested === 'off' || requested === 'hide') {
            this.state.setShowThinking(false);
        } else {
            this.state.setShowThinking(!this.state.showThinking);
        }
        this.notify(this.state.showThinking ? 'Showing reasoning messages.' : 'Hiding reasoning messages.');
        return true;
    }

    protected async runRawModeCommand(args?: string): Promise<boolean> {
        return runRawModeCommand(this.runtimeHost(), args);
    }

    protected async runStashCommand(args?: string): Promise<boolean> {
        return runStashCommandView(this.stashCommandHost(), args);
    }

    protected async runQueueCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim();
        const queue = this.queuedPrompts.get(this.state.sessionId) || [];
        if (!parsed || parsed.toLowerCase() === 'list') {
            if (!queue.length) {
                this.notify(this.translator?.translate('agent.notice.noQueuedPrompts') || 'No queued prompts. Press Tab while a turn is running to queue a follow-up prompt.');
                return true;
            }
            const lines = queue.map((entry, index) =>
                `${index + 1}. ${entry.command ? '[command] ' : ''}${entry.input}${entry.attachments.length ? ` (+${entry.attachments.length} attachment${entry.attachments.length === 1 ? '' : 's'})` : ''}`
            );
            this.pushCommandOutput('/queue list', `Queued prompts (${queue.length}):\n${lines.join('\n')}`);
            return true;
        }
        if (parsed.toLowerCase() === 'clear') {
            if (!queue.length) {
                this.notify(this.translator?.translate('agent.notice.noQueuedPromptsClear') || 'No queued prompts to clear.');
                return true;
            }
            this.queuedPrompts.delete(this.state.sessionId);
            this.state.setQueuedPromptCount(0);
            this.notify(`Cleared ${queue.length} queued prompt${queue.length === 1 ? '' : 's'}.`);
            return true;
        }
        this.notify(this.translator?.translate('agent.notice.queueUsage') || 'Usage: /queue [list|clear]');
        return true;
    }

    protected async applyTheme(value: string): Promise<boolean> {
        if (!isAgentConsoleThemeName(value)) {
            this.notify(`Unknown theme "${value}". Available: ${agentConsoleThemeNames.join(', ')}.`);
            return true;
        }
        this.activeThemeName = value;
        this.state.setTheme(agentConsoleThemes[value]);
        try {
            await this.themeStore?.save(this.resolveHistoryWorkspace(), value);
        } catch (error: any) {
            this.notify(error?.message || `Applied ${value}, but failed to save the theme.`);
            return true;
        }
        this.notify(`Theme set to ${value}.`);
        return true;
    }

    protected async restoreStatusline(): Promise<void> {
        const persisted = await this.statuslineStore?.load(this.resolveHistoryWorkspace());
        if (persisted) {
            this.state.setStatusline(persisted);
        }
    }

    protected async restoreTitle(): Promise<void> {
        const persisted = await this.titleStore?.load(this.resolveHistoryWorkspace());
        if (persisted) {
            this.state.setTitleFields(persisted);
        }
    }

    protected async restoreRawMode(): Promise<void> {
        const persisted = await this.rawModeStore?.load(this.resolveHistoryWorkspace());
        if (persisted) {
            this.state.setRawMode(persisted);
        }
    }

    protected async restoreSettings(): Promise<void> {
        const persisted = await this.settingsStore?.load(this.resolveHistoryWorkspace());
        if (!persisted) {
            return;
        }
        if (persisted.language && this.translator?.availableLocales.includes(persisted.language)) {
            this.translator.setLocale(persisted.language);
        }
        if (typeof persisted.vimMode === 'boolean') {
            this.state.setVimMode(persisted.vimMode);
        }
        if (typeof persisted.showThinking === 'boolean') {
            this.state.setShowThinking(persisted.showThinking);
        }
        if (typeof persisted.showTimestamps === 'boolean') {
            this.state.setShowTimestamps(persisted.showTimestamps);
        }
        if (typeof persisted.showToolOutput === 'boolean') {
            this.state.setShowToolOutput(persisted.showToolOutput);
        }
        if (typeof persisted.showUsername === 'boolean') {
            this.state.setShowUsername(persisted.showUsername);
        }
        if (persisted.timelineViewMode) {
            this.state.setTimelineMode(persisted.timelineViewMode);
        } else if (typeof persisted.timelineMode === 'boolean') {
            this.state.setTimelineMode(persisted.timelineMode ? 'compact' : 'off');
        }
        if (persisted.messageLayout) {
            this.state.setMessageLayout(persisted.messageLayout === 'stream' ? 'stream' : 'viewport');
        }
        if (persisted.thinkingLevel) {
            this.modelReasoningEffort = persisted.thinkingLevel;
            this.options.model = this.options.model || {};
            this.options.model.reasoningEffort = persisted.thinkingLevel;
        }
        if (typeof persisted.yoloMode === 'boolean') {
            await this.setYoloMode(persisted.yoloMode, false);
        }
        // restore task & plan filter state
        if (persisted.taskFilter) {
            this.state.selectedTaskFilter = persisted.taskFilter;
            this.state.selectedTaskLineageRootId = persisted.taskLineageRootId || '';
        }
        if (persisted.planTodoFilter) {
            this.state.planTodoFilter = persisted.planTodoFilter;
        }
    }

    protected async persistSettings(patch: Partial<AgentConsoleSettingsData>): Promise<void> {
        const workspace = this.resolveHistoryWorkspace();
        const current = await this.settingsStore?.load(workspace) || {};
        await this.settingsStore?.save(workspace, { ...current, ...patch });
    }

    protected async runTitleCommand(args?: string): Promise<boolean> {
        return runTitleCommand(this.runtimeHost(), args);
    }

    protected async applyTitleFields(fields: AgentConsoleTitleField[]): Promise<boolean> {
        this.state.setTitleFields(fields);
        this.updateTerminalTitle();
        try {
            await this.titleStore?.save(this.resolveHistoryWorkspace(), fields);
        } catch (error: any) {
            this.notify(error?.message || 'Updated the window title fields, but failed to save them.');
            return true;
        }
        this.notify(fields.length ? `Window title set to ${fields.join(', ')}.` : 'Window title cleared.');
        return true;
    }

    protected updateTerminalTitle(): void {
        if (this.options.ui?.terminalTitle === false) {
            return;
        }
        const title = this.state.formatTerminalTitle();
        if (!title || title === this.lastTerminalTitle) {
            return;
        }
        this.lastTerminalTitle = title;
        this.surfaceAccessor?.writeRawTerminalData?.(`\x1b]0;${title}\x07`);
        const doc = (globalThis as { document?: { title: string } }).document;
        if (doc) {
            doc.title = title;
        }
    }

    protected async runStatuslineCommand(args?: string): Promise<boolean> {
        return runStatuslineCommand(this.runtimeHost(), args);
    }

    protected async applyStatusline(fields: AgentConsoleStatuslineField[]): Promise<boolean> {
        this.state.setStatusline(fields);
        try {
            await this.statuslineStore?.save(this.resolveHistoryWorkspace(), fields);
        } catch (error: any) {
            this.notify(error?.message || 'Updated the statusline, but failed to save it.');
            return true;
        }
        this.notify(fields.length ? `Statusline set to ${fields.join(', ')}.` : 'Statusline cleared.');
        return true;
    }

    protected async resolveGitBranch(): Promise<void> {
        const workspace = this.workspace;
        if (!workspace) return;
        const fileAdapter = this.resolveFileAdapter();
        if (!fileAdapter) return;
        try {
            const headPath = fileAdapter.join(workspace, '.git', 'HEAD');
            if (!fileAdapter.existsSync(headPath)) {
                this.state.setGitBranch('');
                this.updateTerminalTitle();
                return;
            }
            const head = fileAdapter.readTextSync(headPath).trim();
            const match = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
            this.state.setGitBranch(match ? match[1] : head.slice(0, 7));
            this.updateTerminalTitle();
        } catch {
            this.state.setGitBranch('');
            this.updateTerminalTitle();
        }
    }

    protected async runHooksCommand(): Promise<boolean> {
        return runHooksCommandView(this.preferenceCommandHost());
    }

    protected async runMemoriesCommand(args?: string): Promise<boolean> {
        return runMemoriesCommandView(this.preferenceCommandHost(), args);
    }

    protected resolveProjectMemoryId(): string {
        return resolveProjectMemoryIdView(this.preferenceCommandHost());
    }

    protected async runFastCommand(args?: string): Promise<boolean> {
        return runFastCommand(this.runtimeHost(), args);
    }

    protected async runPersonalityCommand(args?: string): Promise<boolean> {
        return runPersonalityCommandView(this.preferenceCommandHost(), args);
    }

    protected async runDebugConfigCommand(): Promise<boolean> {
        return runDebugConfigCommandView(this.preferenceCommandHost());
    }

    protected keymapCommandHost(): KeymapCommandHost {
        const self = this;
        return {
            state: this.state,
            globalKeymap: this.globalKeymap,
            get keymapRecording() { return self.keymapRecording; },
            set keymapRecording(value) { self.keymapRecording = value; },
            persistGlobalKeymap: () => this.persistGlobalKeymap(),
            notify: (message: string) => this.notify(message)
        };
    }

    protected globalKeyInputHost(): AgentConsoleGlobalKeyInputHost {
        const self = this;
        return {
            state: this.state,
            globalKeymap: this.globalKeymap,
            get globalKeyPending() { return self.globalKeyPending; },
            set globalKeyPending(value) { self.globalKeyPending = value; },
            get keymapRecording() { return self.keymapRecording; },
            set keymapRecording(value) { self.keymapRecording = value; },
            get commandPaletteQuery() { return self.commandPaletteQuery; },
            set commandPaletteQuery(value) { self.commandPaletteQuery = value; },
            isTurnInProgress: () => this.isTurnInProgress(),
            interruptTurn: () => this.interruptTurn(),
            notify: (message: string, duration?: number) => this.notify(message, duration),
            handleCommand: (value: string) => this.handleCommand(value),
            persistGlobalKeymap: () => this.persistGlobalKeymap(),
            runTimelineModeCommand: (args?: string) => this.runTimelineModeCommand(args),
            runEditorCommand: (args?: string) => this.runEditorCommand(args),
            handleIdleEscape: () => this.handleIdleEscape(),
            clearScrollback: () => this.clearScrollback(),
            toggleWhichKeyOverlay: () => this.toggleWhichKeyOverlay(),
            refreshWhichKeyBindings: () => this.refreshWhichKeyBindings(),
            toggleHealthPopover: () => this.toggleHealthPopover(),
            navigateThreadChildFirst: () => this.navigateThreadChildFirst(),
            navigateThreadCycle: (delta: 1 | -1) => this.navigateThreadCycle(delta),
            navigateThreadParent: () => this.navigateThreadParent(),
            openCommandPalette: (query?: string) => this.openCommandPalette(query),
            requestTerminalExit: (message?: string) => this.requestTerminalExit(message),
            resolveKeymapContext: () => this.resolveKeymapContext(),
            canThreadNavigate: () => this.canThreadNavigate(),
            canMessageNavigate: () => this.canMessageNavigate(),
            toggleModelFavorite: () => this.toggleModelFavorite(),
            cycleRecentModel: (delta: 1 | -1) => this.cycleRecentModel(delta),
            cycleModelVariant: () => this.cycleModelVariant(),
            queueDraft: () => this.queueDraft()
        };
    }

    protected terminalInputHost(): AgentConsoleTerminalInputHost {
        const self = this;
        return {
            state: this.state,
            get closing() { return self.closing; },
            set closing(value) { self.closing = value; },
            destroyed: this.destroyed,
            get commandPaletteQuery() { return self.commandPaletteQuery; },
            set commandPaletteQuery(value) { self.commandPaletteQuery = value; },
            sshShell: this.sshShell,
            surfaceAccessor: this.surfaceAccessor,
            app: this.app,
            translator: this.translator,
            sessionService: this.sessionService,
            isTurnInProgress: () => this.isTurnInProgress(),
            notify: (message: string, duration?: number) => this.notify(message, duration),
            getTerminalRenderedLines: () => this.getTerminalRenderedLines(),
            handleGlobalKeyInput: (raw: string) => this.handleGlobalKeyInput(raw),
            detachSshShell: (reason: 'detached' | 'closed') => this.detachSshShell(reason),
            submit: () => this.submit(),
            queueDraft: () => this.queueDraft(),
            handleCommand: (value: string) => this.handleCommand(value)
        };
    }

    protected turnInputHost(): AgentConsoleTurnInputHost {
        const self = this;
        return {
            state: this.state,
            sessionService: this.sessionService,
            scheduler: this.scheduler,
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
            isTurnInProgress: () => this.isTurnInProgress(),
            notifyBusyState: (message?: string) => this.notifyBusyState(message),
            enrichPromptWithMentions: (input: string) => this.enrichPromptWithMentions(input),
            buildTurnMessageInput: (prompt: string, attachments: AgentConsolePendingAttachment[]) => this.buildTurnMessageInput(prompt, attachments),
            consumePendingTurnModelProfile: () => this.consumePendingTurnModelProfile(),
            persistInputHistory: () => this.persistInputHistory(),
            clearStreamingMessageState: () => this.clearStreamingMessageState(),
            updateTerminalTitle: () => this.updateTerminalTitle(),
            runTurnStream: (prompt: string, assistantMessage: AgentMessage, message?: AgentTurnMessageInput, profile?: string) => this.runTurnStream(prompt, assistantMessage, message, profile),
            ensureMessageAtTail: (messageId: string) => this.ensureMessageAtTail(messageId),
            advanceProviderWizard: (value: string) => this.advanceProviderWizard(value),
            notify: (message: string, duration?: number) => this.notify(message, duration),
            handleShellBang: (value: string) => this.handleShellBang(value),
            handleCommand: (value: string) => this.handleCommand(value),
            interruptTurn: () => this.interruptTurn(),
            isSteerModeEnabled: () => this.isSteerModeEnabled(),
            isQueueModeEnabled: () => this.isQueueModeEnabled(),
            enqueuePrompt: (input: string) => this.enqueuePrompt(input),
            openSession: (sessionId?: string, options?: { persistCurrentHistory?: boolean; fresh?: boolean }) => this.openSession(sessionId, options),
            resolveMentionDisplayFiles: (input: string) => this.resolveMentionDisplayFiles(input),
            refreshTurnArtifacts: () => this.refreshTurnArtifacts(),
            drainQueuedPrompts: (sessionId: string) => this.drainQueuedPrompts(sessionId)
        };
    }

    protected promptMentionHost(): PromptMentionHost {
        return {
            state: this.state,
            mentionCatalog: this.mentionCatalog,
            workspaceMentionsProvider: this.workspaceMentionsProvider,
            resolveApps: () => this.resolveApps()
        };
    }

    protected approvalInspectorHost(): ApprovalInspectorHost {
        return {
            state: this.state,
            translator: this.translator,
            notify: (message: string) => this.notify(message),
            select: (title: string, opts: any[], index: number, hint?: string) => this.select(title, opts, index, hint),
            selectApprovalRequest: (requests: AgentConsoleApprovalRequest[], index: number) => this.selectApprovalRequest(requests, index),
            applyApprovalDecision: (decision: 'approve' | 'deny', requestId: string) => this.applyApprovalDecision(decision, requestId),
            refreshPendingApprovals: () => this.refreshPendingApprovals(),
            copyFocusedTextActionHandler: (text: string, label: string) => this.copyFocusedTextActionHandler(text, label)
        };
    }

    protected settingsPanelHost(): SettingsPanelHost {
        return {
            state: this.state,
            options: this.options,
            translator: this.translator,
            activeThemeName: this.activeThemeName,
            yoloMode: this.yoloMode,
            modelReasoningEffort: this.modelReasoningEffort,
            select: (title: string, opts: any[], index: number, hint?: string) => this.select(title, opts, index, hint),
            notify: (message: string) => this.notify(message),
            runThemeCommand: () => this.runThemeCommand(),
            runVimCommand: (args?: string) => this.runVimCommand(args || ''),
            runDisplayCommand: (args?: string) => this.runDisplayCommand(args),
            runLayoutCommand: (args?: string) => this.runLayoutCommand(args),
            runRawModeCommand: () => this.runRawModeCommand(),
            runFastCommand: (args?: string) => this.runFastCommand(args),
            runStatusCommand: () => this.runStatusCommand(),
            runKeymapCommand: (args: string) => this.runKeymapCommand(args),
            openModelSwitcher: () => this.openModelSwitcher(),
            openSettingsThinkingLevel: () => this.openSettingsThinkingLevel(),
            openSettingsLanguage: () => this.openSettingsLanguage(),
            setYoloMode: (enabled: boolean, showNotice?: boolean) => this.setYoloMode(enabled, showNotice),
            persistSettings: (patch: any) => this.persistSettings(patch)
        };
    }

    protected shellCommandHost(): ShellCommandHost {
        const self = this;
        return {
            state: this.state,
            get shellMultilineMode() { return self.shellMultilineMode; },
            set shellMultilineMode(value: boolean) { self.shellMultilineMode = value; },
            get shellDraftLines() { return self.shellDraftLines; },
            set shellDraftLines(value: string[]) { self.shellDraftLines = value; },
            isTurnInProgress: () => this.isTurnInProgress(),
            notifyBusyState: (message?: string) => this.notifyBusyState(message),
            notify: (message: string) => this.notify(message),
            invokeTerminalTool: (command: string) => this.invokeTerminalTool(command),
            updateShellMessage: (id: string, patch: Partial<AgentMessage>) => this.updateShellMessage(id, patch)
        };
    }

    protected stashCommandHost(): StashCommandHost {
        return {
            state: this.state,
            stashStore: this.stashStore,
            translator: this.translator,
            resolveHistoryWorkspace: () => this.resolveHistoryWorkspace(),
            notify: (message: string) => this.notify(message),
            pushCommandOutput: (command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']) => this.pushCommandOutput(command, text, kind)
        };
    }

    protected gitSnapshotCommandHost(): GitSnapshotCommandHost {
        return {
            state: this.state,
            sessionService: this.sessionService,
            notify: (message: string) => this.notify(message),
            select: (title: string, opts: any[], index: number, hint?: string) => this.select(title, opts, index, hint)
        };
    }

    protected extensionCommandHost(): ExtensionCommandHost {
        return {
            state: this.state,
            options: this.options,
            notify: (message: string) => this.notify(message),
            select: (title: string, opts: any[], index: number, hint?: string) => this.select(title, opts, index, hint),
            pushCommandOutput: (command: string, out: string, kind?: AgentConsoleCommandOutputEntry['kind']) => this.pushCommandOutput(command, out, kind),
            invokeTool: (name: string, input?: any) => this.invokeTool(name, input)
        };
    }

    protected policyCommandHost(): PolicyCommandHost {
        return {
            state: this.state,
            options: this.options,
            runtime: this.runtime,
            appRpc: this.appRpc,
            notify: (message: string) => this.notify(message),
            rpcRequestContext: () => this.rpcRequestContext(),
            getSessionDelegationMode: (sessionId: string) => this.getSessionDelegationMode(sessionId),
            getSessionSandboxMode: (sessionId: string) => this.getSessionSandboxMode(sessionId),
            setSessionSandboxMode: (sessionId: string, mode: SandboxMode | null) => this.setSessionSandboxMode(sessionId, mode),
            runPlanCommand: (args: string) => this.runPlanCommand(args)
        };
    }

    protected preferenceCommandHost(): PreferenceCommandHost {
        return {
            state: this.state,
            options: this.options,
            workspace: this.workspace,
            runtime: this.runtime,
            appRpc: this.appRpc,
            projectMemory: this.projectMemory,
            translator: this.translator,
            rpcRequestContext: () => this.rpcRequestContext(),
            notify: (message: string) => this.notify(message),
            pushCommandOutput: (command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']) => this.pushCommandOutput(command, text, kind)
        };
    }

    protected async runSettingsCommand(): Promise<boolean> {
        return runSettingsCommandView(this.settingsPanelHost());
    }

    protected async openSettingsGeneralTab(): Promise<boolean> {
        return openSettingsGeneralTabView(this.settingsPanelHost());
    }

    protected async setYoloMode(enabled: boolean, notify = true): Promise<void> {
        this.yoloMode = enabled;
        if (typeof (this.approvalManager as any)?.setAutoApprove === 'function') {
            (this.approvalManager as any).setAutoApprove(enabled);
        }
        this.options.tools = { ...(this.options.tools || {}), autoApprove: enabled } as any;
        await this.persistSettings({ yoloMode: enabled });
        if (notify) this.notify(enabled ? 'Yolo mode enabled: gated tools auto-approve.' : 'Yolo mode disabled.');
    }

    protected async runYoloCommand(args?: string): Promise<boolean> {
        const value = String(args || '').trim().toLowerCase();
        if (value && value !== 'on' && value !== 'off') {
            this.notify(this.translator?.translate('agent.notice.yoloUsage') || 'Usage: /yolo [on|off]');
            return true;
        }
        await this.setYoloMode(value ? value === 'on' : !this.yoloMode);
        return true;
    }

    protected async openSettingsLanguage(): Promise<boolean> {
        return openSettingsLanguageView(this.settingsPanelHost());
    }

    protected async openSettingsKeybindsTab(): Promise<boolean> {
        return openSettingsKeybindsTab(
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            (args: string) => this.runKeymapCommand(args)
        );
    }

    protected async openSettingsProvidersTab(): Promise<boolean> {
        return openSettingsProvidersTabView(this.settingsPanelHost());
    }

    protected async openSettingsThinkingLevel(): Promise<boolean> {
        const tiers: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
        const selected = await this.select('Settings · Thinking Level', tiers.map(tier => ({
            label: `${tier === this.modelReasoningEffort ? '● ' : '  '}${tier}`,
            value: tier,
            description: tier === this.modelReasoningEffort ? 'current level' : 'set reasoning effort'
        })), Math.max(0, tiers.indexOf(this.modelReasoningEffort)), 'enter apply   esc close') as 'low' | 'medium' | 'high' | undefined;
        if (!selected) return true;
        await this.setModelReasoningEffort(selected);
        return true;
    }

    protected async runDisplayCommand(args?: string): Promise<boolean> {
        return runDisplayCommand(args, this.state, (message: string) => this.notify(message), (patch: Record<string, any>) => this.persistSettings(patch));
    }

    protected async runLayoutCommand(args?: string): Promise<boolean> {
        return runLayoutCommand(args, this.state, (message: string) => this.notify(message), (patch: Record<string, any>) => this.persistSettings(patch));
    }

    protected async runTimelineModeCommand(args?: string): Promise<boolean> {
        return runTimelineModeCommand(args, this.state, (message: string) => this.notify(message), (patch: Record<string, any>) => this.persistSettings(patch));
    }

    protected async invokeTool(name: string, input: any): Promise<any> {
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.invoke', { sessionId: this.state.sessionId, name, input }, this.rpcRequestContext());
            return result?.output;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.invoke !== 'function') return undefined;
        return this.toolRegistry.invoke(name, input, this.state.sessionId, undefined, this.state.workspace);
    }

    protected async runSkillsCommand(args?: string): Promise<boolean> {
        return runSkillsCommandView(this.extensionCommandHost(), args);
    }

    protected formatSkillLine(skill: any): string {
        return formatSkillLineView(skill);
    }

    protected formatSkillDetail(skill: any): string {
        return formatSkillDetailView(skill);
    }

    protected async runMcpCommand(args?: string): Promise<boolean> {
        const verbose = String(args || '').trim().toLowerCase() === 'verbose'
            || String(args || '').trim().toLowerCase() === '-v';
        const servers = new Map<string, { tools: string[]; active: number }>();
        for (const tool of this.state.tools) {
            if (!tool.name.startsWith('mcp.')) continue;
            const parts = tool.name.split('.');
            const serverId = parts[1] || 'unknown';
            const entry = servers.get(serverId) || { tools: [], active: 0 };
            entry.tools.push(tool.name);
            if (tool.active) entry.active += 1;
            servers.set(serverId, entry);
        }
        if (!servers.size) {
            this.notify(this.translator?.translate('agent.notice.noMcpServers') || 'No MCP servers configured. Add them via the agent settings (tsdi-agent mcp add).');
            return true;
        }
        const lines = Array.from(servers.entries()).map(([serverId, entry]) => {
            const summary = `${serverId} · ${entry.active}/${entry.tools.length} tools active`;
            return verbose
                ? `${summary}\n${entry.tools.map(name => `  ${name}`).join('\n')}`
                : summary;
        });
        this.pushCommandOutput('/mcp', lines.join('\n'));
        return true;
    }

    protected async runPluginsCommand(args?: string): Promise<boolean> {
        return runPluginsCommandView(this.extensionCommandHost(), args);
    }

    protected resolveApps(): AgentConsoleAppStatus[] {
        return resolveAppsView(this.extensionCommandHost());
    }

    protected resolveAppAuthorizer(): AgentConsoleAppAuthorizer | undefined {
        return resolveAppAuthorizerView(this.extensionCommandHost());
    }

    protected async runAppsCommand(args?: string): Promise<boolean> {
        return runAppsCommandView(this.extensionCommandHost(), args);
    }

    protected insertAppMention(app: AgentConsoleAppStatus): void {
        return insertAppMentionView(this.extensionCommandHost(), app);
    }

    protected formatPluginLine(plugin: any): string {
        return formatPluginLineView(plugin);
    }

    protected formatPluginDetail(plugin: any, contributions?: any): string {
        return formatPluginDetailView(plugin, contributions);
    }

    protected async runShareCommand(args?: string): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (this.appRpc) {
            try {
                const share = await this.appRpc.request('session.share.create', { sessionId }, this.rpcRequestContext());
                const token = String(share?.token || '').trim();
                if (!token) {
                    this.notify('Sharing is not available in this gateway.');
                    return true;
                }
                const url = String(share?.url || `/api/share/${token}`).trim();
                await this.openSharePanel(token, url);
                return true;
            } catch (error: any) {
                this.notify(`Failed to create a share: ${error?.message || String(error)}`);
                return true;
            }
        }
        this.notify('Sharing requires a gateway (app RPC). Start the agent through the gateway or web console.');
        return true;
    }

    protected async runUnshareCommand(args?: string): Promise<boolean> {
        const token = String(args || '').trim();
        if (!this.appRpc) {
            this.notify('Sharing requires a gateway (app RPC).');
            return true;
        }
        if (!token) {
            const shares = await this.appRpc.request('session.share.list', { sessionId: this.state.sessionId }, this.rpcRequestContext()).catch(() => []);
            if (!Array.isArray(shares) || !shares.length) {
                this.notify('No active shares for this session. Usage: /unshare <token>');
                return true;
            }
            const selected = await this.select('Active shares', shares.map((share: any) => ({
                label: `${String(share.token || '').slice(0, 12)}…  ${String(share.url || '')}`,
                value: String(share.token || ''),
                description: new Date(Number(share.createdAt) || Date.now()).toLocaleString()
            })), 0, 'enter revoke   esc close');
            if (!selected) return true;
            return this.revokeShare(selected);
        }
        return this.revokeShare(token);
    }

    protected async revokeShare(token: string): Promise<boolean> {
        try {
            const result = await this.appRpc?.request('session.share.revoke', { token });
            if (result?.revoked === false) {
                this.notify(`Share ${String(token).slice(0, 12)}… is no longer active.`);
                return true;
            }
            this.notify(`Share ${String(token).slice(0, 12)}… revoked.`);
        } catch (error: any) {
            this.notify(`Failed to revoke the share: ${error?.message || String(error)}`);
        }
        return true;
    }

    protected async openSharePanel(token: string, url: string): Promise<void> {
        const fullUrl = this.state.consoleOptions?.shareBaseUrl
            ? `${this.state.consoleOptions.shareBaseUrl.replace(/\/+$/, '')}${url}`
            : url;
        const selected = await this.select('Session share', [
            { label: 'Share created', value: 'info', description: `token ${String(token).slice(0, 8)}… · ${new Date().toLocaleString()}` },
            { label: fullUrl, value: 'copy', description: 'copy the share link' },
            { label: `Revoke (${String(token).slice(0, 8)}…)`, value: 'revoke', description: 'permanently disable this share' }
        ], 1, 'enter select   esc close');
        if (!selected) return;
        if (selected === 'copy') {
            await this.copyFocusedTextActionHandler(fullUrl, 'share link');
            return;
        }
        if (selected === 'revoke') {
            await this.revokeShare(token);
        }
    }

    protected async runApproveRetryCommand(): Promise<boolean> {
        if (!this.appRpc) {
            this.notify('Auto-review retry requires a gateway (app RPC).');
            return true;
        }
        const result = await this.appRpc.request('harness.rejected_actions', { sessionId: this.state.sessionId }, this.rpcRequestContext())
            .catch(() => null);
        const actions = Array.isArray(result?.actions) ? result.actions : [];
        if (!actions.length) {
            this.notify('No auto-review-rejected actions to retry.');
            return true;
        }
        const action = actions[0];
        const selected = await this.select('Approve retry', actions.map((item: any) => ({
            label: `${item.toolName}${String(item.inputSummary || '').trim() ? ` · ${item.inputSummary}` : ''}`,
            value: String(item.evidenceId || `${item.toolName}:${item.createdAt}`),
            description: String(item.falsificationReason || '')
        })), 0, 'enter retry once   esc close');
        if (!selected) return true;
        try {
            await this.appRpc.request('harness.retry_rejected_action', {
                sessionId: this.state.sessionId,
                evidenceId: selected,
                toolName: action.toolName
            }, this.rpcRequestContext());
            this.notify(`Retried ${action.toolName} once after auto-review rejection.`);
        } catch (error: any) {
            this.notify(`Retry failed: ${error?.message || String(error)}`);
        }
        return true;
    }

    protected async runExperimentalCommand(args?: string): Promise<boolean> {
        return runExperimentalCommand(args, this.options, (message: string) => this.notify(message));
    }

    protected async runFeedbackCommand(): Promise<boolean> {
        this.notify([
            'Packaging diagnostics for feedback:',
            '1. Run /debug-config and include the output.',
            '2. Include the session transcript (messages panel or /export).',
            '3. Note the agent version and host (CLI/Web/IDE/Desktop).',
            '4. If it reproduces, include the exact command or prompt.'
        ].join('\n'));
        return true;
    }

    protected async runBackgroundTasksCommand(args?: string): Promise<boolean> {
        return runBackgroundTasksCommandView(this.backgroundTaskCommandHost(), args);
    }

    private backgroundTaskCommandHost(): BackgroundTaskCommandHost {
        return {
            backgroundTasks: this.backgroundTasks ?? null,
            state: this.state,
            notify: message => this.notify(message),
            pushCommandOutput: (command, text) => this.pushCommandOutput(command, text)
        };
    }

    protected async runIdeCommand(args?: string): Promise<boolean> {
        return runIdeCommand(this.ideBridge, (message: string) => this.notify(message), (command: string, text: string) => this.pushCommandOutput(command, text), args);
    }

    protected async runEditorCommand(args?: string): Promise<boolean> {
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return true;
        }
        const initial = String(args || '').trim() || this.state.input;
        const result = await this.openExternalEditor(initial);
        if (!result) {
            return true;
        }
        if (result.cancelled || result.content === undefined) {
            this.notify('Editor closed without changes.');
            return true;
        }
        this.state.setInput(result.content, result.content.length);
        this.notify(`Draft updated from editor (${result.content.length} chars).`);
        return true;
    }

    protected async openExternalEditor(initial: string): Promise<{ content?: string; cancelled?: boolean } | undefined> {
        if (!this.editorBridge?.available) {
            this.notify('No external editor available. Set $EDITOR or $VISUAL (agent-cli host) to enable Ctrl+G / /editor.');
            return undefined;
        }
        try {
            return await this.editorBridge.open(initial);
        } catch (error: any) {
            this.notify(error?.message || 'External editor failed to start.');
            return undefined;
        }
    }

    protected decodeGlobalKey(raw: string): string {
        return decodeGlobalKey(raw);
    }

    protected async handleGlobalKeyInput(raw: string): Promise<boolean> {
        return handleGlobalKeyInputView(this.globalKeyInputHost(), raw);
    }

    protected async handleBrowserGlobalKeyInput(key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }): Promise<boolean> {
        return handleBrowserGlobalKeyInputView(this.globalKeyInputHost(), key, modifiers);
    }

    /**
     * P130 edit-last-message Esc state machine (G55/G70):
     * edit-active Esc dismisses (records target for step-back); idle double
     * Esc within the configured editEscapeWindowMs re-enters at the previous message, or
     * at the last editable user message when no dismissal is recent.
     */
    protected async handleIdleEscape(): Promise<boolean> {
        return handleIdleEscape(this.editCtx());
    }

    private editCtx(): EditModeHandlerContext {
        return {
            state: this.state,
            notify: (message, duration) => this.notify(message, duration),
            editEscapeWindowMs: this.state.consoleOptions.editEscapeWindowMs,
            getEditableUserMessages: () => getEditableUserMessages(this.state.messages),
            extractEditableMessageText: target => extractEditableMessageText(target),
            getEditableImageParts: target => getEditableImageParts(target),
            getTargetMessageId: () => this.editTargetMessageId,
            setTargetMessageId: value => { this.editTargetMessageId = value; },
            getLastSessionMessageId: () => this.lastEditSessionMessageId,
            setLastSessionMessageId: value => { this.lastEditSessionMessageId = value; },
            getDismissedAt: () => this.editDismissedAt,
            setDismissedAt: value => { this.editDismissedAt = value; },
            getDraftBefore: () => this.editDraftBefore,
            setDraftBefore: value => { this.editDraftBefore = value; },
            getAttachmentsBefore: () => this.editAttachmentsBefore,
            setAttachmentsBefore: value => { this.editAttachmentsBefore = value; },
            getLastEscapeAt: () => this.lastEscapeAt,
            setLastEscapeAt: value => { this.lastEscapeAt = value; },
        };
    }

    protected async enterEditMode(): Promise<boolean> {
        return enterEditMode(this.editCtx());
    }

    protected startEditTarget(target: AgentMessage): void {
        startEditTarget(this.editCtx(), target);
    }

    protected dismissEditMode(): boolean {
        return dismissEditMode(this.editCtx());
    }

    protected async executeGlobalKeyAction(action: AgentConsoleGlobalAction): Promise<boolean> {
        return executeGlobalKeyActionView(this.globalKeyInputHost(), action);
    }

    protected clearScrollback(): boolean {
        if (this.surfaceAccessor) {
            this.surfaceAccessor.writeRawTerminalData?.(CLEAR_SCROLLBACK_SEQUENCE);
            this.surfaceAccessor.resetTerminalRenderState?.();
        }
        return true;
    }

    protected toggleWhichKeyOverlay(): void {
        const visible = !this.state.whichKeyVisible;
        if (visible) {
            this.state.whichKeyPage = 0;
            this.refreshWhichKeyBindings();
        }
        this.state.setWhichKeyVisible(visible);
    }

    protected refreshWhichKeyBindings(): void {
        const context = this.resolveKeymapContext();
        const allBindings = Object.entries(this.globalKeymap!.effectiveBindings(context));
        const filtered = this.state.whichKeyFilterCustom
            ? allBindings.filter(([key]) => !(key in AGENT_CONSOLE_DEFAULT_KEYMAP) || AGENT_CONSOLE_DEFAULT_KEYMAP[key] === undefined)
            : allBindings;
        const pageSize = 25;
        const start = this.state.whichKeyPage * pageSize;
        const paged = filtered.slice(start, start + pageSize);
        this.state.setWhichKeyBindings(paged.map(([key, action]) => ({ key, action })));
    }

    protected async toggleHealthPopover(): Promise<void> {
        const visible = !this.state.healthPopoverVisible;
        if (visible) {
            this.state.setHealthItems(await this.collectHealthItems());
        }
        this.state.setHealthPopoverVisible(visible);
    }

    protected async collectHealthItems(): Promise<AgentConsoleHealthItem[]> {
        return collectHealthItems(this.appRpc, () => this.rpcRequestContext(), this.state) as any;
    }

    protected canThreadNavigate(): boolean {
        return !!this.appRpc
            && this.state.hasMessageFocus()
            && !this.state.messageDetailOpen
            && !this.state.selectMenu;
    }

    protected canMessageNavigate(): boolean {
        return this.state.hasMessageFocus()
            && !this.state.messageDetailOpen
            && !this.state.selectMenu;
    }

    protected async navigateThreadChildFirst(): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            return false;
        }
        const children = await this.sessionService.getDelegationChildren(sessionId, {}, this.state);
        const first = children?.[0];
        if (!first?.childSessionId) {
            return false;
        }
        await this.openSession(String(first.childSessionId));
        return true;
    }

    protected async navigateThreadCycle(delta: 1 | -1): Promise<boolean> {
        return navigateThreadCycle(delta, this.sessionService, this.state, (sessionId: string) => this.openSession(sessionId));
    }

    protected async navigateThreadParent(): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            return false;
        }
        const lineage = await this.sessionService.getDelegationLineage(sessionId, { limit: 1 }, this.state);
        const parentEdge = lineage?.[0];
        if (!parentEdge?.parentSessionId) {
            return false;
        }
        await this.openSession(String(parentEdge.parentSessionId));
        return true;
    }

    protected openCommandPalette(query = ''): void {
        openCommandPaletteView(this.terminalInputHost(), query);
    }

    async handleTerminalInput(
        decoded: TerminalInputSequenceResult,
        chunk: ConsoleTextChunk
    ): Promise<void> {
        await handleTerminalInputView(this.terminalInputHost(), decoded, chunk);
    }

    protected async requestTerminalExit(message?: string): Promise<void> {
        await requestTerminalExitView(this.terminalInputHost(), message);
    }

    protected closingSessionMessage(): string {
        return closingSessionMessageView(this.terminalInputHost());
    }

    protected async executeTurn(
        input: string,
        message?: AgentTurnMessageInput,
        profile?: string
    ): Promise<import('@tsdi/agent').AgentTurnResult | void> {
        if (this.appRpc) {
            await this.appRpc.request('run.turn', {
                sessionId: this.state.sessionId,
                input,
                ...(profile ? { profile } : {}),
                ...(message ? { message } : {})
            }, this.rpcRequestContext());
            return;
        }
        return this.runtime.runTurn(this.state.sessionId, input, undefined, message, profile);
    }

    protected async loadTools(sessionId = this.state.sessionId): Promise<any[]> {
        if (this.appRpc) {
            const tools = await this.appRpc.request('tools.list', { sessionId }, this.rpcRequestContext());
            return Array.isArray(tools) ? tools : [];
        }
        if (!this.toolRegistry) {
            return [];
        }
        return this.toolRegistry.getToolDefinitions(sessionId);
    }

    private modelCtx(): ModelHandlerContext {
        return {
            state: this.state,
            appRpc: this.appRpc,
            options: () => this.options,
            modelStore: this.modelStore,
            notify: (message, duration) => this.notify(message, duration),
            select: (title, options, selectedIndex, hint) => this.select(title, options, selectedIndex, hint),
            updateTerminalTitle: () => this.updateTerminalTitle(),
            persistSettings: patch => this.persistSettings(patch),
            addModelProvider: () => this.startProviderWizard(),
            resolveHistoryWorkspace: () => this.resolveHistoryWorkspace(),
            getFavorites: () => this.modelFavorites,
            setFavorites: value => { this.modelFavorites = value; },
            getRecents: () => this.modelRecents,
            setRecents: value => { this.modelRecents = value; },
            getReasoningEffort: () => this.modelReasoningEffort,
            setReasoningEffort: value => { this.modelReasoningEffort = value; },
            nextActivateRequestId: () => ++this.activateModelRequestId,
            peekActivateRequestId: () => this.activateModelRequestId
        };
    }

    protected startProviderWizard(): void {
        return startProviderWizard(this.pwctx(), this.wizHolder);
    }

    protected wizardProviderDef(id?: string): AgentWizardProviderDef | undefined {
        return resolveWizardProviderDef(id);
    }

    protected wizardTierLabel(tier?: string): string {
        return resolveWizardTierLabel(tier);
    }

    protected handleWizardEscape(): boolean {
        return handleWizardEscape(this.pwctx(), this.wizHolder);
    }

    protected cancelProviderWizard(): boolean {
        return cancelProviderWizard(this.pwctx(), this.wizHolder);
    }

    protected resetProviderWizardComposer(): void {
        return resetProviderWizardComposer(this.pwctx(), this.wizHolder);
    }

    protected providerWizardSteps(): AgentWizardStepDef[] {
        return buildProviderWizardSteps(this.providerWizard?.values || {});
    }

    protected wizardStepHelp(step: AgentWizardStepDef, values: NonNullable<typeof this.providerWizard>['values']): string {
        return buildWizardStepHelp(step, values);
    }

    protected providerWizardPrefill(step: AgentWizardStepDef, values: NonNullable<typeof this.providerWizard>['values']): string {
        return resolveWizardPrefill(step, values);
    }

    protected providerWizardSummary(): string[] {
        return buildProviderWizardSummary(this.providerWizard?.values || {});
    }

    protected showProviderWizardStep(): void {
        return showProviderWizardStep(this.pwctx(), this.wizHolder);
    }

    protected openProviderWizardChoice(step: AgentWizardStepDef): void {
        return openProviderWizardChoice(this.pwctx(), this.wizHolder, step);
    }

    protected async handleProviderWizardChoice(value?: string): Promise<void> {
        return await handleProviderWizardChoice(this.pwctx(), this.wizHolder, value);
    }

    protected wizardProviderName(values: NonNullable<typeof this.providerWizard>['values']): string {
        return resolveWizardProviderName(values);
    }

    protected providerWizardConfirmOptions(): AgentConsoleSelectOption[] {
        return buildProviderWizardConfirmOptions(this.providerWizard?.values || {}, !!this.appRpc);
    }

    protected openProviderWizardConfirm(): void {
        return openProviderWizardConfirm(this.pwctx(), this.wizHolder);
    }

    protected async handleProviderWizardConfirm(action?: string): Promise<void> {
        return await handleProviderWizardConfirm(this.pwctx(), this.wizHolder, action);
    }

    protected async openProviderWizardEditor(): Promise<void> {
        return await openProviderWizardEditor(this.pwctx(), this.wizHolder);
    }

    protected async testProviderConnection(): Promise<void> {
        return await testProviderConnection(this.pwctx(), this.wizHolder);
    }

    protected async commitProviderWizard(): Promise<void> {
        return await commitProviderWizard(this.pwctx(), this.wizHolder);
    }

    protected async advanceProviderWizard(value: string): Promise<void> {
        return await advanceProviderWizard(this.pwctx(), this.wizHolder, value);
    }

    protected getModelProfileOptions(): AgentConsoleSelectOption[] {
        return getModelProfileOptions(this.modelCtx());
    }

    protected async loadModelProfileOptions(): Promise<AgentConsoleSelectOption[]> {
        return loadModelProfileOptions(this.modelCtx());
    }

    protected resolveModelProfileConfig(profileName: string): AgentUiResolvedModelProfile {
        return resolveModelProfileConfig(this.modelCtx(), profileName);
    }

    protected async openModelSwitcher(): Promise<void> {
        return openModelSwitcher(this.modelCtx());
    }

    protected async runInitCommand(args: string): Promise<void> {
        const force = String(args || '').trim().split(/\s+/).includes('--force');
        try {
            const result = await initAgentsDoc({ force, root: this.workspace || this.options.ui?.console?.workspace, fileAdapter: this.resolveFileAdapter() ?? undefined });
            if (result.created) {
                this.pushCommandOutput('/init', `Created ${result.file}`);
            } else {
                this.pushCommandOutput('/init', `AGENTS.md ${result.reason}`);
            }
        } catch (error) {
            this.notify(`Failed to create AGENTS.md: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runPlanCommand(args: string): Promise<void> {
        const sessionId = this.state.sessionId;
        const raw = String(args || '').trim().toLowerCase();
        let enabled: boolean;
        if (raw === 'on' || raw === '1' || raw === 'true') {
            enabled = true;
        } else if (raw === 'off' || raw === '0' || raw === 'false') {
            enabled = false;
        } else {
            enabled = !this.state.planMode;
        }
        try {
            if (this.appRpc) {
                await this.appRpc.request('session.plan_mode.set', { sessionId, enabled }, this.rpcRequestContext());
            } else {
                this.runtime.setPlanMode(sessionId, enabled);
            }
            this.state.setPlanMode(enabled);
            this.notify(enabled ? 'Plan mode enabled — write tools will be denied.' : 'Plan mode disabled.');
        } catch (error) {
            this.notify(`Failed to set plan mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runArchetypeCommand(args: string): Promise<void> {
        const sessionId = this.state.sessionId;
        const name = String(args || '').trim().toLowerCase();
        try {
            if (!name) {
                const current = this.runtime.getSessionArchetype(sessionId);
                const available = this.runtime.listArchetypes().join(', ');
                this.notify(`Session archetype: ${current}. Available: ${available}.`);
                return;
            }
            if (this.appRpc) {
                await this.appRpc.request('session.archetype.set', { sessionId, archetype: name }, this.rpcRequestContext());
            } else {
                this.runtime.setSessionArchetype(sessionId, name);
            }
            this.notify(`Session ${sessionId} switched to the "${name}" archetype.`);
        } catch (error) {
            this.notify(`Failed to set archetype: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runDelegationModeCommand(args: string): Promise<void> {
        return runDelegationModeCommandView(this.policyCommandHost(), args);
    }

    protected async runVimCommand(args: string): Promise<void> {
        return runVimCommand(args, this.state, (message: string) => this.notify(message));
    }

    protected resolveKeymapContext(): AgentConsoleKeymapContext {
        return resolveKeymapContextView(this.keymapCommandHost());
    }

    protected async runKeymapCommand(args: string): Promise<void> {
        return runKeymapCommandView(this.keymapCommandHost(), args);
    }

    protected async runSshCommand(args: string): Promise<void> {
        const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        const action = (tokens[0] || 'list').toLowerCase();
        if (action === 'help' || action === '?') {
            this.notify('Usage: /ssh [list] | connect <host> | disconnect <host> | shell <host> | forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
            return;
        }
        if (action === 'list' || action === 'ls') {
            this.listSshHosts();
            return;
        }
        if (action === 'connect') {
            await this.connectSshHost(tokens[1]);
            return;
        }
        if (action === 'disconnect') {
            await this.disconnectSshHost(tokens[1]);
            return;
        }
        if (action === 'shell') {
            await this.startSshShell(tokens[1]);
            return;
        }
        if (action === 'forward') {
            await this.forwardSshTunnel(tokens.slice(1));
            return;
        }
        this.notify('Unknown /ssh command. Usage: /ssh [list] | connect <host> | disconnect <host> | shell <host> | forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
    }

    protected listSshHosts(): void {
        listSshHosts(this.sshManager, (message: string) => this.notify(message));
    }

    protected async connectSshHost(id: string | undefined): Promise<void> {
        return connectSshHost(this.sshManager, (message: string) => this.notify(message), id);
    }

    protected async disconnectSshHost(id: string | undefined): Promise<void> {
        if (!id) {
            this.notify('Usage: /ssh disconnect <host>');
            return;
        }
        if (!this.sshManager) {
            this.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
            return;
        }
        const disconnected = await this.sshManager.disconnect(id);
        this.notify(disconnected
            ? `Disconnected from ${id}.`
            : `SSH host '${id}' is not connected.`);
    }

    protected async forwardSshTunnel(tokens: string[]): Promise<void> {
        return forwardSshTunnel(this.sshManager, (message: string) => this.notify(message), tokens);
    }

    protected async startSshShell(id: string | undefined): Promise<void> {
        if (!id) {
            this.notify('Usage: /ssh shell <host>');
            return;
        }
        if (!this.sshManager) {
            this.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
            return;
        }
        if (!this.sshManager.hasHost(id)) {
            this.notify(`SSH host '${id}' is not configured. Use /ssh list to see available hosts.`);
            return;
        }
        if (this.state.isSshShellActive) {
            this.notify(`Already in SSH shell on ${this.state.sshShell?.hostId}. Press Ctrl+] to detach.`);
            return;
        }
        let client: SshClient;
        try {
            client = await this.sshManager.connect(id);
        } catch (error) {
            this.notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        const size = this.surfaceAccessor?.getTerminalSize?.() ?? { cols: 80, rows: 24 };
        let shell: SshShellSession;
        try {
            shell = await client.shell({ term: 'xterm-256color', cols: size.cols, rows: size.rows });
        } catch (error) {
            this.notify(`SSH shell failed: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        this.sshShell = shell;
        this.state.sshShell = { hostId: id };
        shell.stream.on('data', (chunk: Uint8Array | string) => {
            this.surfaceAccessor?.writeRawTerminalData?.(String(chunk));
        });
        shell.stream.stderr?.on('data', (chunk: Uint8Array | string) => {
            this.surfaceAccessor?.writeRawTerminalData?.(String(chunk));
        });
        const onEnd = () => {
            if (this.state.isSshShellActive && this.sshShell === shell) {
                void this.detachSshShell('closed');
            }
        };
        shell.stream.on('close', onEnd);
        shell.stream.on('error', onEnd);
        this.notify(`SSH shell started on ${id}. Terminal bytes stream live; press Ctrl+] to detach.`);
    }

    protected async detachSshShell(reason: 'detached' | 'closed'): Promise<void> {
        const hostId = this.state.sshShell?.hostId || '';
        const shell = this.sshShell;
        this.sshShell = null;
        this.state.sshShell = null;
        if (shell) {
            try {
                await shell.close();
            } catch {
                void 0;
            }
        }
        this.surfaceAccessor?.resetTerminalRenderState?.();
        if (hostId) {
            this.notify(reason === 'detached'
                ? `SSH shell detached from ${hostId}.`
                : `SSH shell on ${hostId} closed.`);
        }
    }

    protected async runPermissionsCommand(args: string): Promise<void> {
        return runPermissionsCommandView(this.policyCommandHost(), args);
    }

    protected async showSandboxCapabilities(): Promise<void> {
        return showSandboxCapabilitiesView(this.policyCommandHost());
    }

    protected async runCdCommand(args: string): Promise<void> {
        const target = String(args || '').trim();
        if (!target) {
            this.notify(this.workspace);
            return;
        }
        const current = this.workspace;
        let resolved: string;
        if (target.startsWith('/') || /^[A-Z]:\\/i.test(target)) {
            resolved = target;
        } else if (current) {
            resolved = current.endsWith('/') ? current + target : current + '/' + target;
        } else {
            resolved = target;
        }
        resolved = resolved.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
        await this.persistInputHistory();
        this.state.setWorkspace(resolved);
        await this.restoreInputHistory();
        this.notify(`workspace → ${resolved}`);
    }

    protected async runStatusCommand(): Promise<void> {
        return runStatusCommand(this.runtimeHost());
    }

    protected async runGoalCommand(args: string): Promise<void> {
        return runGoalCommandView(this.policyCommandHost(), args);
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
                this.notify(direction === 'undo' ? 'Nothing to undo.' : 'Nothing to redo.');
                return;
            }
            this.notify(`${direction === 'undo' ? 'Undid' : 'Redid'} ${result.filePath} (${result.restored}).`);
        } catch (error) {
            this.notify(`Failed to ${direction}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runGitSnapshotsCommand(args: string): Promise<void> {
        return runGitSnapshotsCommandView(this.gitSnapshotCommandHost(), args);
    }

    protected async openGitSnapshotList(): Promise<void> {
        return openGitSnapshotListView(this.gitSnapshotCommandHost());
    }

    protected async openGitSnapshotDiff(ref: string): Promise<void> {
        return openGitSnapshotDiffView(this.gitSnapshotCommandHost(), ref);
    }

    protected async revertGitSnapshotFromDetail(): Promise<void> {
        return revertGitSnapshotFromDetailView(this.gitSnapshotCommandHost());
    }

    protected buildGitSnapshotDiffLines(diff: Record<string, any>): string[] {
        return buildGitSnapshotDiffLines(diff);
    }

    protected async activateModelProfile(profileName: string): Promise<void> {
        return activateModelProfile(this.modelCtx(), profileName);
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

    protected async setModelReasoningEffort(next: 'low' | 'medium' | 'high'): Promise<void> {
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
