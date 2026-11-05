import { ApplicationContext, formatCompactNumber } from '@tsdi/core';
import { bootstrapConsole, disposeConsole } from './AgentConsoleBootstrap';
import { AgentConsolePolicyHost } from './AgentConsolePolicyHost';
import { drainQueuedPrompts, enqueuePrompt, queueDraft } from './AgentConsoleQueuedPrompts';
import { DefaultAgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
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
import { SshConnectionManager, type SshShellSession } from '@tsdi/agent-ssh';
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
import { activateModelProfile, consumePendingTurnModelProfile, cycleModelVariant, cycleRecentModel, EffortLevel, getModelProfileOptions, loadModelProfileOptions, openModelSwitcher, persistModelStore, queueNextTurnModelProfile, recordRecentModel, resolveInitialModelProfile, resolveModelProfileConfig, restoreModelStore, setModelReasoningEffort, toggleModelFavorite, ModelHandlerContext } from './AgentConsoleModelHandlers'; import { promptModelUnavailable } from './AgentConsoleModelAvailability';
import { dismissEditMode, enterEditMode, EditModeHandlerContext, extractEditableMessageText, getEditableImageParts, getEditableUserMessages, handleIdleEscape, startEditTarget } from './AgentConsoleEditModeHandlers';
import { formatAgentPagerStatusCopy, formatAgentPanelLabel, formatAgentUiDateTime, formatAgentUiLabel, formatAgentUiNotice } from './agent-ui.i18n';
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
    resolveAgentConsoleCssVariables,
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
import { AgentConsoleSettingsData, AgentConsoleSettingsStore, applyPersistedModelProfile, applyPersistedPreferences } from './AgentConsoleSettingsStore';
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
import { BackgroundTaskManager } from '@tsdi/agent-tools';
import { BackgroundTaskCommandHost, runBackgroundTasksCommandView } from './AgentConsoleBackgroundTaskCommands';
import { decodeGlobalKey, describePendingToolCall, describeStreamEventContent } from './AgentConsoleStreamHelpers';
import { AgentConsoleTurnStreamHost, AgentConsoleTurnStreamState, clearStreamingMessageState, consumeStreamChunkView, consumeStreamEventChunkView, runTurnStreamView } from './AgentConsoleTurnStreamController';
import { AgentConsoleGlobalKeyInputHost, executeGlobalKeyActionView, handleBrowserGlobalKeyInputView, handleGlobalKeyInputView, handleGlobalKeySequenceView } from './AgentConsoleGlobalKeyInputController';
import { AgentConsoleTurnInputHost, isCancelPromptValue, submitMultilineDraftView, submitView } from './AgentConsoleTurnInputController';
import { AgentConsoleTerminalInputHost, closingSessionMessageView, handleTerminalInputView, openCommandPaletteView, requestTerminalExitView, syncMarkdownWidthFromSurface } from './AgentConsoleTerminalInputController';
import { AgentConsoleTranscriptLayoutResolver, resolveTranscriptLayout, revealAgentConsoleMessage, scrollAgentConsoleTranscript } from './AgentConsoleTranscriptLayout';
import { AgentConsoleMessagesPanelComponent } from './AgentConsolePanels';
import { buildGitSnapshotDiffLines } from './AgentConsoleGitView';
import { openSummaryQualityRecords, openTurnDiagnosticsListView, openTurnDiagnosticsTrendView, openSummaryQualityTrendView, parseCompactionHistoryTrendArgs, parseSummaryQualityTrendArgs, refreshCompactionDigest, refreshSummaryQualityDigest, refreshTurnDiagnosticsDigest, refreshUsageDigest, runHarnessStopCommand } from './AgentConsoleDiagnosticsView';
import {
    AgentConsoleSessionContentLoaderHost,
    loadSessionMessages as loadSessionContentMessages,
    loadSessionPage as loadSessionContentPage,
    mapWithConcurrency as runWithConcurrency
} from './AgentConsoleSessionContentLoader';
import { applyMissingSessionNotice, openSession as delegateOpenSession, restoreSessionModes as restoreSessionModesView, AgentConsoleSessionOpenHost } from './AgentConsoleSessionOpen';
import { AgentConsoleSessionUiState } from './AgentConsoleSessionUiState';
import { closeAgentConsoleSessionTab } from './AgentConsoleSessionTabClose';
import { isAgentConsoleExactCommandToken, isAgentConsoleSuggestionMenu, resolveAgentConsoleMentionDisplayFiles } from './AgentConsoleSuggestions';
import {
    AgentConsoleRpcCommandHost,
    runApproveRetryCommand as runApproveRetryCommandView,
    runQueueCommand as runQueueCommandView,
    runMcpCommand as runMcpCommandView,
    runPlanCommand as runPlanCommandView,
    runUnshareCommand as runUnshareCommandView
} from './AgentConsoleRpcCommands';
import { flattenProjectSessions, navigateThreadCycle, refreshCurrentSections, refreshProjects, refreshThreads, resolveCurrentProjectSessions, resolveProjectSessionsFor, resolveSessionProjectKey, resolveSessionThreadKey, resolveThreadKeyForSession, resolveThreadSessionsFor, selectProjectRepresentative } from './AgentConsoleProjectProjection';
import { refreshProjectContext as refreshProjectContextView } from './AgentConsoleProjectProjection';
import { runCdCommandView } from './AgentConsoleCdCommand';
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
    applySecurityLevel,
    showSandboxCapabilities as showSandboxCapabilitiesView
} from './AgentConsolePolicyCommands';
import { ensureMessageAtTail } from './AgentConsoleMessageState';
import { parseSlashCommandLine, handleMenuSelection, loadInputHistory } from './AgentConsoleInputHelpers';
import { AgentConsoleSshHost, detachSshShell, runSshCommand } from './AgentConsoleSshCommands';
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
    applyPersistedLayout,
    runSettingsCommand as runSettingsCommandView,
    runTimelineModeCommand,
    runVimCommand
} from './AgentConsoleSettingsCommands';
import { buildCommandContext } from './AgentConsoleCommandContext';
import { AgentConsoleRuntimeHost, runFastCommand, runRawModeCommand, runStatusCommand, runStatuslineCommand, runThemeCommand, runTitleCommand } from './AgentConsoleRuntimeCommands';
import { applyTheme as applyThemeInState, persistGlobalKeymap as persistGlobalKeymapInState, persistSettings as persistSettingsInState, restoreGlobalKeymap as restoreGlobalKeymapInState, restoreRawMode as restoreRawModeInState, restoreSettings as restoreSettingsInState, restoreStatusline as restoreStatuslineInState, restoreTheme as restoreThemeInState, restoreTitle as restoreTitleInState } from './AgentConsoleSettingsRuntime';
import {
    runtimeHost,
    keymapCommandHost,
    globalKeyInputHost,
    terminalInputHost,
    turnInputHost,
    promptMentionHost,
    approvalInspectorHost,
    settingsPanelHost,
    shellCommandHost,
    stashCommandHost,
    gitSnapshotCommandHost,
    extensionCommandHost,
    policyCommandHost,
    preferenceCommandHost,
    sessionOpenHost,
    commandDispatchHost,
    turnStreamHost,
    sessionContentLoaderHost,
    todoPlanCommandHost,
    rpcCommandHost,
    backgroundTaskCommandHost
} from './AgentConsoleHostFactories';
import {
    getExportHandlerContext,
    getDiagnosticsHandlerContext,
    harnessCommandHost,
    voiceCtx,
    reviewCtx,
    codingTaskCtx,
    editCtx,
    modelCtx,
    sshHost,
    pwctx
} from './AgentConsoleHandlerContexts';
import { runFeedbackCommandView } from './AgentConsoleFeedbackCommand';
import { runReloadCommandView } from './AgentConsoleReloadCommand';
import { runIdeCommand } from './AgentConsoleIdeCommands';
import { collectHealthItems } from './AgentConsoleHealthView';
import { searchSessionContent } from './AgentConsoleSessionSearch';
import { loadLocalTodoPlan } from './AgentConsoleTodoView';
import { refreshMentionCatalog } from './AgentConsoleMentions';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, AgentConsoleAppRpc, AgentMessage, AgentOptions, AgentRuntime, AgentScheduler, AgentSessionSection, AgentSessionSectionInfo, AgentTurnMessageInput, ExchangeMetricsSnapshot, ProjectMemoryService, normalizeAgentWorkspaceIdentity, SessionSearchMatch, ApprovalManager, ToolRegistry, defaultAgentOptions, initAgentsDoc, buildHarnessProjection, formatHarnessTreeLines, formatHarnessListLines, DelegationTreeNode } from '@tsdi/agent';
import { AgentConsoleSessionProjectGroup, AgentConsoleSessionService } from './AgentConsoleSessionService';
import { refreshSessionsView } from './AgentConsoleSessionRefresh';
import { normalizeTodoStatus } from './AgentConsolePlanState';
import { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import { buildCommandHandlerState } from './AgentConsoleCommandHandlerContext';
import { AgentConsoleCommandDispatchHost, dispatchAgentConsoleCommand } from './AgentConsoleCommandDispatch';
import { AGENT_WIZARD_PROVIDERS, AGENT_WIZARD_TIERS, AgentWizardProviderDef, AgentWizardStepDef, buildProviderWizardChoiceOptions, buildProviderWizardConfirmOptions, buildProviderWizardSteps, buildProviderWizardSummary, buildWizardStepHelp, resolveWizardPrefill, resolveWizardProviderDef, resolveWizardProviderName, resolveWizardTierLabel } from './AgentConsoleProviderWizard';
import { startProviderWizard, handleWizardEscape, cancelProviderWizard, resetProviderWizardComposer, showProviderWizardStep, openProviderWizardChoice, handleProviderWizardChoice, openProviderWizardConfirm, handleProviderWizardConfirm, openProviderWizardEditor, testProviderConnection, commitProviderWizard, advanceProviderWizard } from './AgentConsoleProviderWizardFlow';
interface AgentConsoleQueuedPrompt {
    input: string;
    attachments: AgentConsolePendingAttachment[];
    command?: boolean;
}

@Component({
    selector: 'agent-console',
    template: `
    <div class="agent-console" [cssVariables]="rootStyle">
        <common-tab-bar renderRegion="header"></common-tab-bar>
        <agent-console-brand-panel renderRegion="transcript" v-show="!panels.messageDetail && !panels.select && !panels.textOverlay && !panels.pendingQuestion"></agent-console-brand-panel>
        <agent-console-messages-panel renderRegion="transcript" v-show="!panels.messageDetail"></agent-console-messages-panel>
        <agent-console-message-detail-panel renderRegion="transcript" v-if="panels.messageDetail"></agent-console-message-detail-panel>
        <agent-console-timeline-event-detail-panel renderRegion="transcript" v-if="panels.timelineEventInspector"></agent-console-timeline-event-detail-panel>
        <agent-console-tasks-panel v-show="panels.tasks && !panels.messageDetail"></agent-console-tasks-panel>
        <agent-console-jobs-panel v-show="panels.jobs && !panels.messageDetail"></agent-console-jobs-panel>
        <agent-console-review-panel v-show="panels.review && !panels.messageDetail"></agent-console-review-panel>
        <agent-console-git-snapshot-panel v-show="panels.gitSnapshot && !panels.messageDetail"></agent-console-git-snapshot-panel>
        <agent-console-activity-panel v-show="panels.activity && !panels.messageDetail"></agent-console-activity-panel>
        <agent-console-tools-panel v-show="panels.tools && !panels.messageDetail"></agent-console-tools-panel>
        <agent-console-working-panel v-show="panels.working && !panels.messageDetail"></agent-console-working-panel>
        <agent-console-tool-runs-panel v-show="panels.toolRuns && !panels.messageDetail"></agent-console-tool-runs-panel>
        <agent-console-pending-question-panel renderRegion="menu" v-show="panels.pendingQuestion"></agent-console-pending-question-panel>
        <agent-console-select-panel renderRegion="menu" v-show="panels.suggestion"></agent-console-select-panel><agent-console-select-panel renderRegion="menu" v-show="panels.select"></agent-console-select-panel>
        <agent-console-text-overlay-panel renderRegion="dialog" v-show="panels.textOverlay"></agent-console-text-overlay-panel>
        <agent-console-status-panel renderRegion="footer" v-show="panels.status && !panels.messageDetail"></agent-console-status-panel>
        <agent-console-sessions-panel renderRegion="footer" v-show="panels.sessions && !panels.messageDetail"></agent-console-sessions-panel>
        <agent-console-approvals-panel renderRegion="menu" v-show="panels.approvals && !panels.messageDetail"></agent-console-approvals-panel>
        <agent-console-input-panel renderRegion="footer"></agent-console-input-panel>
        <agent-console-which-key-panel v-show="panels.whichKey"></agent-console-which-key-panel>
        <agent-console-health-popover v-show="panels.healthPopover"></agent-console-health-popover>
        <agent-console-outputs-panel v-show="panels.commandOutputs"></agent-console-outputs-panel>
    </div>
    `
})
export class AgentConsoleComponent extends AgentConsolePolicyHost implements OnDestroy, ConsoleTerminalInputHandler, ConsoleTerminalSurfaceLifecycle {
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
        return !this.transcriptLayout.usesNativeScrollback;
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
    protected turnStreamState: AgentConsoleTurnStreamState = { streamMessageText: '', sealedNarrationCount: 0, reasoningText: '', reasoningPhase: '' };
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
    protected editTargetMessageId = '';
    protected editDraftBefore = '';
    protected editAttachmentsBefore: AgentConsolePendingAttachment[] = [];
    protected lastEditSessionMessageId = '';
    protected editDismissedAt = 0;
    protected lastEscapeAt = 0;
    protected modelFavorites: string[] = [];
    protected modelRecents: string[] = [];
    readonly transcriptNavigationController: DefaultAgentConsoleTranscriptNavigationController;
    constructor(
        protected state: AgentConsoleSessionState,
        protected runtime: AgentRuntime,
        private scheduler: AgentScheduler,
        private bridge: AgentConsoleEventBridge,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) protected options: AgentOptions,
        @Optional() @Inject(ToolRegistry) protected toolRegistry?: ToolRegistry | null,
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) protected appRpc?: AgentConsoleAppRpc | null,
        @Optional() @Inject(AgentConsoleSessionService) protected sessionService?: AgentConsoleSessionService | null,
        @Optional() @Inject(ApprovalManager) private approvalManager?: ApprovalManager | null,
        @Optional() @Inject(AgentConsoleWorkspaceMentionsProvider) private workspaceMentionsProvider?: AgentConsoleWorkspaceMentionsProvider | null,
        @Optional() @Inject(AgentConsoleInputHistoryStore) private inputHistoryStore?: AgentConsoleInputHistoryStore | null,
        @Optional() @Inject(ComponentRef) private componentRef?: ComponentRef<AgentConsoleComponent> | null,
        @Optional() @Inject(ConsoleTerminalSurfaceAccessor) protected surfaceAccessor?: ConsoleTerminalSurfaceAccessor | null,
        @Optional() @Inject(ApplicationContext) protected app?: ApplicationContext | null,
        @Optional() @Inject(SshConnectionManager) private sshManager?: SshConnectionManager | null,
        @Optional() @Inject(AudioCaptureAdapter) private audioCapture?: AudioCaptureAdapter | null,
        @Optional() @Inject(AudioPlaybackAdapter) private audioPlayback?: AudioPlaybackAdapter | null,
        @Optional() protected translator?: TranslatorService,
        @Optional() @Inject(AgentConsoleKeymap) private globalKeymap?: AgentConsoleKeymap | null,
        @Optional() @Inject(AgentConsoleKeymapStore) private keymapStore?: AgentConsoleKeymapStore | null,
        @Optional() @Inject(AgentConsoleThemeStore) private themeStore?: AgentConsoleThemeStore | null,
        @Optional() @Inject(AgentConsoleStatuslineStore) protected statuslineStore?: AgentConsoleStatuslineStore | null,
        @Optional() @Inject(AgentConsoleTitleStore) protected titleStore?: AgentConsoleTitleStore | null,
        @Optional() @Inject(BackgroundTaskManager) private backgroundTasks?: BackgroundTaskManager | null,
        @Optional() @Inject(AGENT_IDE_BRIDGE) protected ideBridge?: AgentIdeBridge | null,
        @Optional() @Inject(AGENT_EDITOR_BRIDGE) protected editorBridge?: AgentEditorBridge | null,
        @Optional() @Inject(AgentConsoleRawModeStore) private rawModeStore?: AgentConsoleRawModeStore | null,
        @Optional() @Inject(AgentConsoleStashStore) private stashStore?: AgentConsoleStashStore | null,
        @Optional() @Inject(AgentConsoleModelStore) private modelStore?: AgentConsoleModelStore | null,
        @Optional() @Inject(AgentConsoleSettingsStore) private settingsStore?: AgentConsoleSettingsStore | null,
        @Optional() @Inject(AgentUiConfigService) private uiConfig?: AgentUiConfigService | null,
        @Optional() @Inject(ProjectMemoryService) private projectMemory?: ProjectMemoryService | null,
        @Optional() @Inject(AgentConsoleTranscriptLayoutResolver) private transcriptLayoutResolver?: AgentConsoleTranscriptLayoutResolver | null,
    ) {
        super();
        this.transcriptNavigationController = new DefaultAgentConsoleTranscriptNavigationController(this.state, (messageId) => revealAgentConsoleMessage(this.componentRef?.hostView?.query?.(AgentConsoleMessagesPanelComponent)?.instance, this.surfaceAccessor, () => this.state.syncTranscriptFollowing(), messageId));
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

    protected isCancelPromptValue(value?: string): boolean { return isCancelPromptValue(value); }

    protected isTurnInProgress(): boolean {
        return this.activeTurnRun != null || this.state.status === 'running' || this.state.status === 'reasoning';
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

    protected enqueuePrompt(input: string): void { enqueuePrompt(this as any, input); }

    protected queueDraft(): boolean { return queueDraft(this as any); }

    protected async drainQueuedPrompts(sessionId: string): Promise<void> { return drainQueuedPrompts(this as any, sessionId); }

    protected async interruptTurn(): Promise<void> {
        if (!this.isTurnInProgress()) return;
        const cancelled = await this.sessionService?.cancelTurn(this.state.sessionId) ?? false;
        this.notify(cancelled
            ? (formatAgentUiNotice(this.translator, 'cancelling'))
            : (formatAgentUiNotice(this.translator, 'nothingToCancel')));
    }

    protected notify(message: string, duration?: number): void {
        void duration;
        const lines = String(message || '').split('\n').filter(line => line.trim().length);
        this.state.setNotice(message);
        if (lines.length > 3) {
            this.state.openTextOverlay(formatAgentPanelLabel(this.translator, 'overlay', 'noticeTitle', 'notice'), lines);
        }
    }

    protected pushCommandOutput(command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']): void {
        const outputId = this.state.pushCommandOutput(command, text, kind);
        if (outputId && this.pendingCommandRequestId) {
            this.state.commandExecutionController.linkOutput(this.pendingCommandRequestId, outputId);
        }
        this.notify(text);
    }

    protected notifyBusyState(message?: string): void {
        this.notify(message || formatAgentUiNotice(this.translator, 'busy'));
    }

    protected formatSummaryQualityAggregate(aggregate: Record<string, any>): string {
        return fmtSummaryQualityAggregate(aggregate, this.translator);
    }

    protected resolveReviewAnnotationsSessionId(): string {
        return resolveReviewAnnotationsSessionId(this.reviewCtx());
    }

    protected getReviewAnnotationsCacheKey(): string | undefined {
        return getReviewAnnotationsCacheKey(this.reviewCtx());
    }

    protected get resolvedApprovalManager(): ApprovalManager | undefined { return this.runtime?.approvalManager ?? this.approvalManager ?? undefined; }

    protected async refreshPendingApprovals(sessionId = this.state.sessionId): Promise<void> {
        return refreshPendingApprovals(sessionId, this.state, this.resolvedApprovalManager, this.appRpc, this.sessionService, () => this.updateTerminalTitle());
    }

    protected async applyApprovalDecision(decision: 'approve' | 'deny', requestId: string): Promise<boolean> {
        // In-process turns run through the app RPC server, which owns the queue.
        if (this.appRpc && this.sessionService) {
            const result = await this.sessionService.decideApproval(decision, requestId, this.rpcRequestContext());
            return result?.applied === true;
        }
        if (this.resolvedApprovalManager) {
            const manager = this.resolvedApprovalManager;
            return decision === 'approve' ? manager.approve(requestId) : manager.reject(requestId);
        }
        return false;
    }

    protected async getPendingApprovals(sessionId: string): Promise<AgentConsoleApprovalRequest[]> {
        if (this.appRpc && this.sessionService) {
            const requests = await this.sessionService.listApprovals(sessionId, this.rpcRequestContext());
            return requests as AgentConsoleApprovalRequest[];
        }
        if (this.resolvedApprovalManager) {
            return this.resolvedApprovalManager.getPending().filter((request: any) => request.sessionId === sessionId) as AgentConsoleApprovalRequest[];
        }
        return [];
    }

    protected readonly sessionUiState = new AgentConsoleSessionUiState(() => ({ state: this.state, surfaceAccessor: this.surfaceAccessor }));

    protected async openSession(sessionId?: string, options?: { persistCurrentHistory?: boolean; fresh?: boolean; missing?: boolean; scoped?: boolean }): Promise<void> {
        syncMarkdownWidthFromSurface(this.state, this.surfaceAccessor, this.destroyed); return this.sessionUiState.switchSession(
            () => delegateOpenSession(this.sessionOpenHost(), sessionId, options),
            () => this.state.sessionId,
            () => this.surfaceAccessor?.beginRenderBatch?.(),
            () => this.surfaceAccessor?.endRenderBatch?.()
        );
    }

    protected async selectApprovalRequest(
        requests: AgentConsoleApprovalRequest[],
        selectedIndex = 0
    ): Promise<AgentConsoleApprovalRequest | undefined> {
        return selectApprovalRequest(
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            this.state,
            requests, selectedIndex,
            (key: string, params: Record<string, any> | undefined, fallback: string) => this.translator?.translate(key, params) || fallback,
            this.translator
        );
    }

    protected async openApprovalInspector(requests: AgentConsoleApprovalRequest[]): Promise<void> {
        return openApprovalInspectorView(approvalInspectorHost(this), requests);
    }

    get title(): string {
        return this.state.title;
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
                this.notify(formatAgentUiNotice(this.translator, 'nothingCopyLabel', { label: label }));
                return;
            }
            if (this.surfaceAccessor?.writeTerminalClipboardText?.(text)) {
                this.notify(formatAgentUiNotice(this.translator, 'copiedLabel', { label: label }));
                return;
            }
            this.notify(text);
        };
    }

    protected async retryFailedEventHandler(message: AgentMessage): Promise<boolean> {
        void message;
        if (this.isTurnInProgress()) {
            this.notify(formatAgentUiNotice(this.translator, 'busy'));
            return false;
        }
        const lastUser = [...this.state.messages].reverse().find(item =>
            item.role === 'user' && !!String(item.content || '').trim());
        if (!lastUser) {
            this.notify(formatAgentUiNotice(this.translator, 'nothingToRetry'));
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
            this.notify(formatAgentUiNotice(this.translator, 'planStepReopened'));
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
                this.notify(formatAgentUiNotice(this.translator, 'toolAlreadyActive', { name: name }));
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
                    ? formatAgentUiNotice(this.translator, 'toolActivated', { name: name })
                    : formatAgentUiNotice(this.translator, 'toolActivateFailed', { name: name }));
            } catch (error: any) {
                this.notify(error?.message || formatAgentUiNotice(this.translator, 'toolActivationError', { name: name }));
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
                ? formatAgentUiNotice(this.translator, 'approvalApplied', { decision: formatAgentUiNotice(this.translator, decision === 'approve' ? 'approvalDecisionApprove' : 'approvalDecisionDeny'), tool: request.toolName, id: requestId.slice(0, 8) })
                : formatAgentUiNotice(this.translator, 'approvalNoLongerPending', { id: requestId.slice(0, 8) }));
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
            signal: resolvedId ? this.state.commandExecutionController.signal(resolvedId) : undefined
        };
    }

    get rootStyle(): string { return resolveAgentConsoleCssVariables(this.state?.theme); }
    private sessionOpenHost(): AgentConsoleSessionOpenHost { return sessionOpenHost(this); }
    private commandDispatchHost(): AgentConsoleCommandDispatchHost { return commandDispatchHost(this); }
    private turnStreamHost(): AgentConsoleTurnStreamHost { return turnStreamHost(this); }
    private sessionContentLoaderHost(): AgentConsoleSessionContentLoaderHost { return sessionContentLoaderHost(this); }
    private todoPlanCommandHost(): TodoPlanCommandHost { return todoPlanCommandHost(this); }
    private rpcCommandHost(): AgentConsoleRpcCommandHost { return rpcCommandHost(this); }
    private backgroundTaskCommandHost(): BackgroundTaskCommandHost { return backgroundTaskCommandHost(this); }
    protected async restoreGlobalKeymap(): Promise<void> { return restoreGlobalKeymapInState(this); }
    protected async persistGlobalKeymap(): Promise<void> { return persistGlobalKeymapInState(this); }
    protected async restoreTheme(): Promise<void> { return restoreThemeInState(this); }
    protected async applyTheme(value: string): Promise<boolean> { return applyThemeInState(this, value); }
    protected async restoreStatusline(): Promise<void> { return restoreStatuslineInState(this); }
    protected async restoreTitle(): Promise<void> { return restoreTitleInState(this); }
    protected async restoreRawMode(): Promise<void> { return restoreRawModeInState(this); }
    protected async restoreSettings(): Promise<void> { return restoreSettingsInState(this); }
    protected async persistSettings(patch: Partial<AgentConsoleSettingsData>): Promise<void> { return persistSettingsInState(this, patch); }
    protected getExportHandlerContext() { return getExportHandlerContext(this); }
    protected getDiagnosticsHandlerContext() { return getDiagnosticsHandlerContext(this); }
    protected harnessCommandHost(): HarnessCommandHost { return harnessCommandHost(this); }
    protected voiceCtx(): VoiceHandlerContext { return voiceCtx(this); }
    private reviewCtx(): ReviewHandlerContext { return reviewCtx(this); }
    protected codingTaskCtx(): CodingTaskHandlerContext { return codingTaskCtx(this); }
    private editCtx(): EditModeHandlerContext { return editCtx(this); }
    protected modelCtx(): ModelHandlerContext { return modelCtx(this); }
    protected sshHost(): AgentConsoleSshHost { return sshHost(this); }
    protected pwctx(): import('./AgentConsoleProviderWizardFlow').ProviderWizardContext { return pwctx(this); }
    protected gitSnapshotCommandHost(): GitSnapshotCommandHost { return gitSnapshotCommandHost(this); }
    protected shellCommandHost(): ShellCommandHost { return shellCommandHost(this); }

    async onInit(): Promise<void> {
        return bootstrapConsole(this as any);
    }

    onDestroy(): void {
        disposeConsole(this as any);
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
        return resolveAgentConsoleMentionDisplayFiles(
            input,
            (this.state.tools || []).map(tool => tool.name)
        );
    }

    protected async enrichPromptWithMentions(input: string): Promise<string> {
        return enrichPromptWithMentionsView(promptMentionHost(this), input);
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

    protected async bootstrapStateFromAppRpc(sessionId?: string): Promise<void> {
        if (!this.appRpc) {
            return;
        }
        const meta = await this.appRpc.request('app.state', sessionId ? { sessionId } : undefined, this.rpcRequestContext());
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
            sessionId: configuredSessionId || sessionId || (typeof meta.sessionId === 'string' ? meta.sessionId : undefined),
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
            await this.inputHistoryStore.save(this.state.inputHistoryController.entries(), this.resolveHistoryWorkspace(), this.state.sessionId);
        } catch (error) {
            this.state.setLastError(formatAgentUiNotice(this.translator, 'inputHistorySaveFailed', { error: error instanceof Error ? error.message : String(error) }));
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
        return parseWorktreeDiffArgs(args, this.translator);
    }

    protected describeWorktreeDiffScope(scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked'): string {
        return describeWorktreeDiffScope(scope, this.translator);
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
        return describeCodingTaskRollbackFn(task, this.translator);
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
        return buildCodingTaskSelectOptionFn(task, tasks, this.translator);
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

    protected buildCommandContext(abortSignal?: AbortSignal): CommandHandlerContext { return buildCommandContext(this, abortSignal); }

    protected async handleCommand(value: string): Promise<boolean> {
        return dispatchAgentConsoleCommand(this.commandDispatchHost(), value);
    }

    protected async handleMenuSelection(value: string): Promise<void> {
        return handleMenuSelection(this.state, (selected: string) => this.handleCommand(selected), value);
    }

    protected async submitMultilineDraft(): Promise<void> { this.state.setNotice(''); await submitMultilineDraftView(turnInputHost(this)); }
    async submit(): Promise<void> { this.state.setNotice(''); await submitView(turnInputHost(this)); }

    /**
     * `!cmd` runs a shell command; `!!` toggles multiline draft mode; a bare
     * `!` submits the draft in draft mode, otherwise shows the usage hint.
     * Returns true when the input was consumed as a shell command.
     */
    protected async handleShellBang(value: string): Promise<boolean> {
        return handleShellBangView(shellCommandHost(this), value);
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
            // `invoke` only runs tools already active for the session, so `!cmd`
            // silently failed against the gateway without activating first.
            await this.appRpc.request('tools.activate', { sessionId, name: 'terminal' }, this.rpcRequestContext()).catch(() => null);
            const result = await this.appRpc.request('tools.invoke', { sessionId, name: 'terminal', input: { command }, ...(this.workspace ? { workspace: this.workspace } : {}) }, this.rpcRequestContext());
            return result?.output;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.invoke !== 'function') {
            throw new Error(formatAgentUiNotice(this.translator, 'terminalToolUnavailable'));
        }
        if (typeof this.toolRegistry.isToolActive === 'function') {
            const active = await this.toolRegistry.isToolActive(sessionId, 'terminal');
            if (!active) {
                const activated = await this.activateToolForSession('terminal', sessionId);
                if (!activated) {
                    throw new Error(formatAgentUiNotice(this.translator, 'terminalToolNotActivated'));
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
        return this.state.focusLayers.shouldRenderTerminalCursor();
    }
    resolveTerminalCursorMode(): 'prompt' | 'bottom' {
        return this.state.focusLayers.resolveTerminalCursorMode();
    }

    resolveTerminalCursorStyle(): 'bar' {
        return 'bar';
    }

    shouldBlinkTerminalCursor(): boolean {
        return true;
    }

    protected get transcriptLayout() { return this.transcriptLayoutResolver?.resolve(this.state.consoleOptions.messageLayout) || resolveTranscriptLayout(this.state.consoleOptions.messageLayout); }
    shouldUseNativeScrollback(): boolean { return this.transcriptLayout.usesNativeScrollback; }
    shouldUseAlternateScreen(): boolean { return this.transcriptLayout.usesAlternateScreen; }
    shouldScrollViewport(): boolean { return !this.transcriptLayout.ownsHistoryScroll; }
    resolveConsoleLayout(): 'scrollback' | 'viewport' { return this.transcriptLayout.mode; }

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
        return loadSessionContentMessages(this.sessionContentLoaderHost(), sessionId);
    }

    protected async loadSessionPage(sessionId = this.state.sessionId): Promise<{ messages: AgentMessage[]; sections: AgentSessionSection[]; goalSummary?: any }> {
        return loadSessionContentPage(this.sessionContentLoaderHost(), sessionId);
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
            (items: any[], limit: number, fn: (item: any) => Promise<any>) => runWithConcurrency(items, limit, fn) as any,
            AgentConsoleComponent.SEARCH_CONCURRENCY
        );
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
        return refreshUsageDigest(this.sessionService, this.state, this.translator);
    }

    protected async refreshTurnDiagnosticsDigest(): Promise<void> {
        return refreshTurnDiagnosticsDigest(this.sessionService, this.state, this.translator);
    }

    protected async refreshCompactionDigest(): Promise<void> {
        return refreshCompactionDigest(this.sessionService, this.state, this.translator);
    }

    protected async refreshSummaryQualityDigest(): Promise<void> {
        return refreshSummaryQualityDigest(this.sessionService, this.state, this.translator);
    }

    protected async mergeTodoPlanForSessions(
        sessionId: string,
        sessions: Array<{ id: string; updatedAt?: number }>
    ): Promise<{ todos: AgentConsolePlanTodoItem[]; sourceSessionId?: string } | null> {
        return mergeTodoPlanForSessionsView(this.todoPlanCommandHost(), sessionId, sessions);
    }

    protected async loadLocalTodoPlan(sessionId: string): Promise<AgentConsolePlanTodoItem[]> {
        return loadLocalTodoPlan(sessionId, this.toolRegistry, this.state, (status: unknown) => normalizeTodoStatus(status)) as any;
    }

    /**
     * Todos belong to one session (one tab): never merge sibling sessions'
     * plans, or every tab in the same workspace shows the same Todos block.
     * Project-level views (`/threadplan`) opt into aggregation explicitly.
     */
    protected async refreshTodoPlan(sessionId = this.state.sessionId): Promise<void> {
        const merged = await this.mergeTodoPlanForSessions(sessionId, [{ id: sessionId }]);
        if (!merged) {
            return;
        }
        this.state.setPlanTodos(merged.todos, merged.sourceSessionId);
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
        return normalizeTodoStatus(status);
    }

    protected async invokeTool(name: string, input: any): Promise<any> {
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.invoke', { sessionId: this.state.sessionId, name, input, ...(this.workspace ? { workspace: this.workspace } : {}) }, this.rpcRequestContext());
            return result?.output;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.invoke !== 'function') return undefined;
        return this.toolRegistry.invoke(name, input, this.state.sessionId, undefined, this.state.workspace);
    }

    protected decodeGlobalKey(raw: string): string {
        return decodeGlobalKey(raw);
    }

    protected async handleGlobalKeyInput(raw: string): Promise<boolean> {
        return handleGlobalKeyInputView(globalKeyInputHost(this), raw);
    }

    protected async handleBrowserGlobalKeyInput(key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }): Promise<boolean> {
        return handleBrowserGlobalKeyInputView(globalKeyInputHost(this), key, modifiers);
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
        return executeGlobalKeyActionView(globalKeyInputHost(this), action);
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
        return collectHealthItems(this.appRpc, () => this.rpcRequestContext(), this.state, this.translator) as any;
    }

    protected canThreadNavigate(): boolean {
        return !!this.appRpc
            && this.state.focusLayers.hasMessageFocus()
            && !this.state.messageDetailOpen
            && !this.state.selectMenu;
    }

    protected canMessageNavigate(): boolean {
        return this.state.focusLayers.hasMessageFocus()
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
        openCommandPaletteView(terminalInputHost(this), query);
    }

    async handleTerminalInput(
        decoded: TerminalInputSequenceResult,
        chunk: ConsoleTextChunk
    ): Promise<void> {
        await handleTerminalInputView(terminalInputHost(this), decoded, chunk);
    }

    protected async requestTerminalExit(message?: string): Promise<void> {
        await requestTerminalExitView(terminalInputHost(this), message ?? this.closingSessionMessage());
    }

    protected closingSessionMessage(): string {
        return closingSessionMessageView(terminalInputHost(this));
    }

    protected async executeTurn(
        input: string,
        message?: AgentTurnMessageInput,
        profile?: string
    ): Promise<import('@tsdi/agent').AgentTurnResult | void> {
        if (this.appRpc) {
            await this.appRpc.request('run.turn', {
                sessionId: this.state.sessionId, input, workspace: this.workspace,
                ...(profile ? { profile } : {}),
                ...(message ? { message } : {})
            }, this.rpcRequestContext());
            return;
        }
        return this.runtime.runTurn(this.state.sessionId, input, undefined, message, profile, undefined, this.workspace);
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


}
