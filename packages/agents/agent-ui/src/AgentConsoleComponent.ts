import { ApplicationContext, formatCompactNumber } from '@tsdi/core';
import { Component, ComponentRef, OnDestroy, RNode } from '@tsdi/components';
import { AudioCaptureAdapter, AudioPlaybackAdapter, AudioPlaybackFormat, FileAdapter } from '@tsdi/common';
import {
    CLEAR_SCROLLBACK_SEQUENCE,
    ConsoleTextChunk,
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceAccessor,
    ConsoleTerminalSurfaceLifecycle,
    SelectMenuMouseEvent,
    TerminalInputSequenceResult
} from './console-ports';
import { Inject, Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import type { SshClient, SshConnectionManager, SshHostConfig, SshShellSession } from '@tsdi/agent-ssh';
import type { SandboxMode } from '@tsdi/agent/src/harness/sandbox-exec';
import {
    runExportCommand as runExportCommandFn,
    parseExportArgs as parseExportArgsFn,
    looksLikeExportPath,
    tryWriteSessionExport as tryWriteSessionExportFn,
    previewSessionExport as previewSessionExportFn,
    resolveFileAdapter as resolveFileAdapterFn,
    resolveExportTargetPath,
    resolvePathDirectory,
    resolveAttachmentTargetPath,
    describePendingAttachments,
    buildTurnMessageInput,
    runAttachCommand as runAttachCommandFn,
    loadPendingAttachment,
    resolveImageMediaType,
    resolveDocumentMediaType,
    resolveAnyMediaType,
    readFileBytes,
    normalizeBinaryChunk,
    concatUint8Arrays,
    encodeBase64
} from './AgentConsoleExportHandlers';
import { AGENT_CONSOLE_OVERLAY_HINTS, AGENT_CONSOLE_OVERLAY_TITLES } from './AgentConsoleOverlayPresenter';
import {
    formatSummaryQualityAggregate as fmtSummaryQualityAggregate,
    formatUsageSummary as fmtUsageSummary,
    formatCompactionHistoryAggregate as fmtCompactionHistoryAggregate,
    formatCompactionHistoryRecord as fmtCompactionHistoryRecord,
    formatCompactionHistoryTrend as fmtCompactionHistoryTrend,
    formatTurnDiagnosticsAggregate as fmtTurnDiagnosticsAggregate,
    formatTurnDiagnosticsTrend as fmtTurnDiagnosticsTrend,
    buildSummaryQualityRecordOption,
    parseTrendArgs
} from './AgentConsoleFormatters';
import { formatUsageWindow, formatCompactionHistoryRecord, formatCompactionHistoryTrend, formatTurnDiagnosticsAggregate, formatTurnDiagnosticsTrend } from './AgentConsoleFormatters';
import {
    openCompactionHistory,
    openCompactionHistoryTrend,
    openTurnDiagnostics as openTurnDiagnosticsFn,
    openUsage,
    openHarnessAudit,
    openHarnessProfile,
    openSummaryQualityRecords as openSummaryQualityRecordsFn
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
import { dismissEditMode, enterEditMode, EditModeHandlerContext, startEditTarget } from './AgentConsoleEditModeHandlers';
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
    AgentConsoleAppStatus,
    extractAgentConsoleAppMentions,
    resolveAgentConsoleApps
} from './AgentConsoleApps';
import { AgentConsoleStashStore } from './AgentConsoleStash';
import { formatAgentUiSessionClosingMessage } from './agent-ui.i18n';
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
    fuzzyMatchAgentConsoleCommand,
    isAgentConsoleGlobalAction,
    isAgentConsoleKeymapContext,
    isAgentConsoleMessageNavigationAction,
    isAgentConsoleThreadNavigationAction
} from './AgentConsoleKeymap';
import { VIM_ACTION_NAMES, isConsoleVimAction } from './AgentConsoleVim';
import type { BackgroundTaskCancelOutcome, BackgroundTaskManager, BackgroundTaskRecord, BackgroundTaskRestoreOutcome } from '@tsdi/agent-tools';
import { formatBackgroundTaskDetail } from './AgentConsoleBackgroundTaskFormat';
import { decodeGlobalKey, describePendingToolCall, describeStreamEventContent, formatToolCallLabel, resolveStreamEventLabel, resolveToolCallArgument, resolveToolEventKey, resolveToolEventName } from './AgentConsoleStreamHelpers';
import { buildGitSnapshotDiffLines } from './AgentConsoleGitView';
import { buildTurnDiagnosticsRecordOption, formatSummaryQualityTrend, openSummaryQualityRecords, parseCompactionHistoryTrendArgs, parseSummaryQualityTrendArgs, refreshCompactionDigest, refreshSummaryQualityDigest, refreshTurnDiagnosticsDigest, refreshUsageDigest, runHarnessStopCommand } from './AgentConsoleDiagnosticsView';
import { normalizeLoadedMessages } from './AgentConsoleMessageNormalization';
import { flattenProjectSessions, navigateThreadCycle, refreshCurrentSections, refreshProjects, refreshThreads, resolveCurrentProjectSessions, resolveProjectSessionsFor, resolveSessionProjectKey, resolveSessionThreadKey, resolveThreadKeyForSession, resolveThreadSessionsFor, selectProjectRepresentative } from './AgentConsoleProjectProjection';
import { ensureMessageAtTail, findStreamingAssistantMessageIndex, replaceStreamingAssistantMessage } from './AgentConsoleMessageState';
import { parseSlashCommandLine, handleMenuSelection, loadInputHistory } from './AgentConsoleInputHelpers';
import { listSshHosts, connectSshHost, forwardSshTunnel } from './AgentConsoleSshCommands';
import { selectApprovalRequest, refreshPendingApprovals } from './AgentConsoleApprovalView';
import { formatDelegationEdge, formatDelegationTree, pickDelegationGoal, shortenSessionId } from './AgentConsoleDelegationView';
import { runDisplayCommand, runExperimentalCommand, runTimelineModeCommand, runVimCommand, openSettingsKeybindsTab } from './AgentConsoleSettingsCommands';
import { AgentConsoleRuntimeHost, runFastCommand, runRawModeCommand, runStatusCommand, runStatuslineCommand, runThemeCommand, runTitleCommand } from './AgentConsoleRuntimeCommands';
import { runIdeCommand } from './AgentConsoleIdeCommands';
import { collectHealthItems } from './AgentConsoleHealthView';
import { searchSessionContent } from './AgentConsoleSessionSearch';
import { loadLocalTodoPlan } from './AgentConsoleTodoView';
import { refreshMentionCatalog } from './AgentConsoleMentions';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, AGENT_PERSONALITY_PRESETS, AgentConsoleAppRpc, AgentMessage, AgentOptions, AgentRuntime, AgentScheduler, AgentSessionSection, AgentSessionSectionInfo, AgentTurnMessageInput, ExchangeMetricsSnapshot, ProjectMemoryService, describeSandboxCapabilities, detectSandboxExecTool, normalizeAgentWorkspaceIdentity, SessionSearchMatch, ToolApprovalManager, ToolRegistry, defaultAgentOptions, initAgentsDoc, buildHarnessProjection, formatHarnessTreeLines, formatHarnessListLines, DelegationTreeNode } from '@tsdi/agent';
import { AgentConsoleSessionProjectGroup, AgentConsoleSessionService, AgentSessionExportFormat, AgentSessionExportResult } from './AgentConsoleSessionService';
import { CommandHandlerContext, COMMAND_HANDLERS } from './AgentConsoleCommandHandlers';
import { AGENT_WIZARD_PROVIDERS, AGENT_WIZARD_TIERS, AgentWizardProviderDef, AgentWizardStepDef, buildProviderWizardChoiceOptions, buildProviderWizardConfirmOptions, buildProviderWizardSteps, buildProviderWizardSummary, buildWizardStepHelp, resolveWizardPrefill, resolveWizardProviderDef, resolveWizardProviderName, resolveWizardTierLabel } from './AgentConsoleProviderWizard';
import { startProviderWizard, handleWizardEscape, cancelProviderWizard, resetProviderWizardComposer, showProviderWizardStep, openProviderWizardChoice, handleProviderWizardChoice, openProviderWizardConfirm, handleProviderWizardConfirm, openProviderWizardEditor, testProviderConnection, commitProviderWizard, advanceProviderWizard } from './AgentConsoleProviderWizardFlow';
import {
    getAgentConsoleCommandDefinition,
    getAgentConsoleCommandName,
    formatAgentConsoleCommandArgumentForm,
    formatAgentConsoleCommandArgumentTemplate,
    formatAgentConsoleCommandDiagnosticEcho,
    formatAgentConsoleCommandDiagnostics,
    parseAgentConsoleCommandArguments,
    resolveAgentConsoleCommandDescription
} from './AgentConsoleCommandRegistry';

const SSH_SHELL_DETACH_SEQUENCE = '\x1d';
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
    protected streamMessageText = '';
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

    protected formatUsageWindow(label: string, usage: Record<string, any>): string {
        return formatUsageWindow(label, usage);
    }

    protected formatUsageSummary(usage: Record<string, any>): string {
        return fmtUsageSummary(usage);
    }

    protected formatCompactionHistoryAggregate(aggregate: Record<string, any>): string {
        return fmtCompactionHistoryAggregate(aggregate);
    }

    protected async openSummaryQualityRecords(provider?: string): Promise<boolean> {
        return openSummaryQualityRecords(
            this.sessionService,
            (message: string) => this.notify(message),
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            provider
        );
    }

    protected buildSummaryQualityRecordOption(record: Record<string, any>): AgentConsoleSelectOption {
        return buildSummaryQualityRecordOption(record);
    }

    protected async openSummaryQualityTrend(
        provider?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Summary quality is unavailable without app RPC.');
            return true;
        }
        const trend = await this.sessionService.getSummaryQualityTrend({ provider, bucketSize, maxBuckets });
        if (!trend.length) {
            this.notify(
                provider
                    ? `No summary quality trend recorded for provider '${provider}'.`
                    : 'No summary quality trend recorded yet.'
            );
            return true;
        }
        this.pushCommandOutput('/quality trend', this.formatSummaryQualityTrend(trend).join(' | '));
        return true;
    }

    protected async runExportCommand(args: string): Promise<boolean> {
        return runExportCommandFn(this.getExportHandlerContext(), args);
    }

    protected parseExportArgs(args: string): { format: AgentSessionExportFormat; sessionId?: string; path?: string } {
        return parseExportArgsFn(args);
    }

    protected looksLikeExportPath(value: string): boolean {
        return looksLikeExportPath(value);
    }

    protected async tryWriteSessionExport(
        result: AgentSessionExportResult,
        requestedPath?: string
    ): Promise<string | undefined> {
        return tryWriteSessionExportFn(this.getExportHandlerContext(), result, requestedPath);
    }

    protected previewSessionExport(result: AgentSessionExportResult): void {
        previewSessionExportFn(this.getExportHandlerContext(), result);
    }

    protected resolveFileAdapter(): FileAdapter | null {
        return this.app?.get(FileAdapter, null) as FileAdapter | null;
    }

    protected resolveExportTargetPath(
        fileAdapter: FileAdapter,
        result: AgentSessionExportResult,
        requestedPath?: string
    ): string {
        return resolveExportTargetPath(fileAdapter, this.workspace, result, requestedPath);
    }

    protected resolvePathDirectory(targetPath: string, fileAdapter: FileAdapter): string {
        return resolvePathDirectory(targetPath, fileAdapter);
    }

    protected resolveAttachmentTargetPath(targetPath: string, fileAdapter: FileAdapter): string {
        return resolveAttachmentTargetPath(targetPath, this.workspace, fileAdapter);
    }

    protected describePendingAttachments(attachments: AgentConsolePendingAttachment[] = this.state.pendingAttachments): string {
        return describePendingAttachments(attachments);
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

    protected async loadPendingAttachment(targetPath: string, fileAdapter: FileAdapter): Promise<AgentConsolePendingAttachment> {
        return loadPendingAttachment(targetPath, this.workspace, fileAdapter);
    }

    /** @deprecated Use {@link loadPendingAttachment} instead. */
    protected async loadPendingImageAttachment(targetPath: string, fileAdapter: FileAdapter): Promise<AgentConsolePendingAttachment> {
        return this.loadPendingAttachment(targetPath, fileAdapter);
    }

    protected resolveImageMediaType(filePath: string): string | undefined {
        return resolveImageMediaType(filePath);
    }

    protected resolveDocumentMediaType(filePath: string): string | undefined {
        return resolveDocumentMediaType(filePath);
    }

    protected resolveAnyMediaType(filePath: string): string | undefined {
        return resolveAnyMediaType(filePath);
    }

    protected async readFileBytes(targetPath: string, fileAdapter: FileAdapter): Promise<Uint8Array> {
        return readFileBytes(targetPath, fileAdapter);
    }

    protected async normalizeBinaryChunk(chunk: any): Promise<Uint8Array> {
        return normalizeBinaryChunk(chunk);
    }

    protected concatUint8Arrays(chunks: Uint8Array[], total: number): Uint8Array {
        return concatUint8Arrays(chunks, total);
    }

    protected encodeBase64(bytes: Uint8Array): string {
        return encodeBase64(bytes);
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

    /**
     * Opens `/harness tree [sessionId]`: renders the delegation tree of the
     * resolved session overlaid with live background-task status via the
     * shared harness projection, and caches the projection on `harnessState`
     * so TUI and browser renderers draw from the same data.
     */
    protected async openHarnessTree(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Harness projection is unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId;
        if (!resolvedSessionId) {
            this.notify('No session selected. Run /harness tree <sessionId>.');
            return true;
        }
        const tree = await this.sessionService.getDelegationTree(resolvedSessionId);
        if (!tree) {
            this.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        const tasks = await this.sessionService.listAllBackgroundTasks({ delegationRoot: resolvedSessionId });
        const projection = buildHarnessProjection(tree as DelegationTreeNode, tasks as BackgroundTaskRecord[]);
        this.state.setHarnessState(projection);
        const lines = formatHarnessTreeLines(tree as DelegationTreeNode, projection);
        if (!lines.length) {
            this.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        this.pushCommandOutput('/harness tree', lines.join(' | '));
        return true;
    }

    /**
     * Opens `/harness list [sessionId]`: renders a flat delegation digest with
     * per-session worker status and plan/step aggregate summary from the shared
     * harness projection, then caches it on `harnessState`.
     */
    protected async openHarnessList(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Harness projection is unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId;
        if (!resolvedSessionId) {
            this.notify('No session selected. Run /harness list <sessionId>.');
            return true;
        }
        const tree = await this.sessionService.getDelegationTree(resolvedSessionId);
        if (!tree) {
            this.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        const tasks = await this.sessionService.listAllBackgroundTasks({ delegationRoot: resolvedSessionId });
        const projection = buildHarnessProjection(tree as DelegationTreeNode, tasks as BackgroundTaskRecord[]);
        this.state.setHarnessState(projection);
        const lines = formatHarnessListLines(projection);
        if (!lines.length) {
            this.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        this.pushCommandOutput('/harness list', lines.join(' | '));
        return true;
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
        if (!this.sessionService) {
            this.notify('Turn diagnostics are unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId;
        if (!resolvedSessionId) {
            this.notify('No session selected. Run /diagnostics list <sessionId>.');
            return true;
        }
        const records = await this.sessionService.listTurnDiagnostics(resolvedSessionId);
        if (!records.length) {
            this.notify(`No turn diagnostics recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        const options = records.map(record => this.buildTurnDiagnosticsRecordOption(record));
        await this.select(
            `Turn diagnostics records (${resolvedSessionId})`,
            options,
            0,
            `${records.length} record${records.length === 1 ? '' : 's'}`
        );
        return true;
    }

    protected buildTurnDiagnosticsRecordOption(record: Record<string, any>): AgentConsoleSelectOption {
        return buildTurnDiagnosticsRecordOption(record);
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
        if (!this.sessionService) {
            this.notify('Turn diagnostics are unavailable without app RPC.');
            return true;
        }
        const trend = await this.sessionService.getTurnDiagnosticsTrend(sessionId, { bucketSize, maxBuckets });
        if (!trend.length) {
            this.notify(
                sessionId
                    ? `No turn diagnostics trend recorded for session '${sessionId}'.`
                    : 'No turn diagnostics trend recorded yet.'
            );
            return true;
        }
        this.pushCommandOutput('/diagnostics trend', this.formatTurnDiagnosticsTrend(trend).join(' | '));
        return true;
    }

    /**
     * Opens `/delegation tree [sessionId] [status] [depth]`: renders the
     * persisted parent → child session tree rooted at the current (or given)
     * session as an indented tree with edge kind/status/timestamps inline.
     */
    protected async openDelegationTree(sessionId?: string, status?: string, depth?: number): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Delegation graph is unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId;
        if (!resolvedSessionId) {
            this.notify('No session selected. Run /delegation tree <sessionId>.');
            return true;
        }
        const tree = await this.sessionService.getDelegationTree(resolvedSessionId, { status, depth });
        if (!tree) {
            this.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        const lines = this.formatDelegationTree(tree);
        if (!lines.length) {
            this.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        this.pushCommandOutput('/delegation tree', lines.join(' | '));
        return true;
    }

    /**
     * Opens `/delegation lineage [sessionId]`: renders the persisted chain of
     * parent sessions above the current (or given) session, closest first.
     */
    protected async openDelegationLineage(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Delegation graph is unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId;
        if (!resolvedSessionId) {
            this.notify('No session selected. Run /delegation lineage <sessionId>.');
            return true;
        }
        const lineage = await this.sessionService.getDelegationLineage(resolvedSessionId);
        if (!lineage.length) {
            this.notify(`No parent delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        this.pushCommandOutput('/delegation lineage', lineage.map(edge => this.formatDelegationEdge(edge)).join(' → '));
        return true;
    }

    /**
     * Renders one delegation edge as a compact digest line, for example:
     * `parent-1 ⇢ child-1 · nested · completed · 12/1 10:00 → 12/1 10:05`.
     */
    protected formatDelegationEdge(edge: Record<string, any>): string {
        return formatDelegationEdge(edge);
    }

    /**
     * Renders a delegation tree node recursively as one line per edge with
     * tree branch prefixes (`└─`, `├─`) so the console digest stays readable.
     */
    protected formatDelegationTree(node: Record<string, any>): string[] {
        return formatDelegationTree(node);
    }

    protected pickDelegationGoal(edge: Record<string, any>): string {
        return pickDelegationGoal(edge);
    }

    protected shortenSessionId(sessionId: string): string {
        return shortenSessionId(sessionId);
    }

    /**
     * Opens `/delegation [list] [sessionId]`: lists flat delegation edges
     * touching the current (or given) session, newest edges first, as one
     * digest line per edge.
     */
    protected async openDelegationList(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Delegation graph is unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId || undefined;
        const edges = await this.sessionService.listDelegationEdges(
            resolvedSessionId ? { sessionId: resolvedSessionId } : { limit: 200 }
        );
        if (!edges.length) {
            this.notify(
                resolvedSessionId
                    ? `No delegation edges recorded for session '${resolvedSessionId}'.`
                    : 'No delegation edges recorded yet.'
            );
            return true;
        }
        this.pushCommandOutput('/delegation list', edges.map(edge => this.formatDelegationEdge(edge)).join(' | '));
        return true;
    }

    /**
     * Renders one compact aggregate line for turn diagnostics, for example:
     * `session-1 · 12 turns · empty 8.3% · repeated 16.7% · clarif 0% · 3 compact(s) · saved 25K tokens · 12/1–12/2`
     */
    protected formatTurnDiagnosticsAggregate(aggregate: Record<string, any>, sessionId?: string): string {
        return formatTurnDiagnosticsAggregate(aggregate, sessionId);
    }

    /**
     * Renders one compact line per session with an 8-level sparkline over time
     * buckets (`totalTokenSavings` normalized to the session maximum mapped to
     * ▁▂▃▄▅▆▇█), the bucket date range, the total turns, and the total tokens
     * saved, for example:
     * `session-1 ▃▅▇ (3d · 12/1–12/3 · 42 turns · saved 25k tokens)`
     */
    protected formatTurnDiagnosticsTrend(trend: Array<Record<string, any>>): string[] {
        return formatTurnDiagnosticsTrend(trend);
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

    /**
     * Renders one compact line per session with an 8-level sparkline over time
     * buckets (`avgCompressionRatio` mapped to ▁▂▃▄▅▆▇█), the bucket date
     * range, the total tokens saved, and the averaged compression ratio, for
     * example:
     * `session-1 ▃▅▇ (2d · 12/1–12/2 · saved 25k tokens · avg 62.5%)`
     */
    protected formatCompactionHistoryTrend(trend: Array<Record<string, any>>): string[] {
        return formatCompactionHistoryTrend(trend);
    }

    /**
     * Renders one compact line per compaction record, for example:
     * `compacted L3 312→224 msgs (88) · 84k→41k tokens (-51%) · saved 43k total`
     */
    protected formatCompactionHistoryRecord(record: Record<string, any>): string {
        return formatCompactionHistoryRecord(record);
    }

    /**
     * Renders one compact line per provider with an 8-level sparkline over time
     * buckets (`avgTotal` mapped to ▁▂▃▄▅▆▇█), the bucket date range, the
     * averaged total, and the fallback rate, for example:
     * `deepseek ▃▅▇ (2d · 12/1–12/2 · avg 75.0 · fb 33.3%)`
     */
    protected formatSummaryQualityTrend(trend: Array<Record<string, any>>): string[] {
        return formatSummaryQualityTrend(trend);
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
        const projectSessions = this.resolveCurrentProjectSessions();
        if (!projectSessions.length) {
            this.state.setProjectContext();
            this.updateTerminalTitle();
            return;
        }
        const representative = this.selectProjectRepresentative(projectSessions);
        const summary = projectSessions
            .slice()
            .sort((left, right) => {
                const activityDelta = (right.updatedAt || 0) - (left.updatedAt || 0);
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return String(left.id || '').localeCompare(String(right.id || ''));
            })
            .map(item => String(item.summary || '').trim())
            .find(Boolean) || '';
        this.state.setProjectContext({
            projectKey: representative ? this.resolveSessionProjectKey(representative) : undefined,
            projectLabel: representative?.projectLabel || representative?.projectId || representative?.focusSummary || representative?.workspace || representative?.primaryThreadId || representative?.rootRequest || representative?.id,
            projectSummary: summary,
            projectSessionCount: representative?.projectSessionCount || projectSessions.length
        });
        this.updateTerminalTitle();
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
        if (!requests.length) {
            this.notify(this.translator?.translate('agent.notice.noPendingApprovals') || 'No pending approvals.');
            return;
        }
        let selectedRequestIndex = 0;
        while (true) {
            const request = await this.selectApprovalRequest(requests, selectedRequestIndex);
            if (!request) {
                return;
            }
            selectedRequestIndex = Math.max(0, requests.findIndex(item => item.id === request.id));
            const detail = [
                `Tool: ${request.toolName}`,
                `Reason: ${request.reason}`,
                request.inputSummary ? `Input: ${request.inputSummary}` : 'Input: -',
                `Timeout: ${request.timeoutMs}ms`,
                request.expiresAt ? `Expires: ${new Date(request.expiresAt).toLocaleTimeString()}` : ''
            ].join('\n');
            const action = await this.select(`Approval ${request.id.slice(0, 8)}`, [
                {
                    label: 'Approve',
                    value: 'approve',
                    description: 'Allow this request',
                    detail
                },
                {
                    label: 'Deny',
                    value: 'deny',
                    description: 'Reject this request',
                    detail
                },
                {
                    label: 'Copy input',
                    value: 'copy-input',
                    description: 'Copy request input summary',
                    detail
                }
            ], 0, this.state.consoleOptions.selectHint);
            if (!action) {
                if (requests.length === 1) {
                    return;
                }
                continue;
            }
            if (action === 'approve') {
                const approved = await this.applyApprovalDecision('approve', request.id);
                this.notify(approved
                    ? `Approved ${request.toolName} (${request.id.slice(0, 8)}).`
                    : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
                await this.refreshPendingApprovals();
                return;
            }
            if (action === 'deny') {
                const denied = await this.applyApprovalDecision('deny', request.id);
                this.notify(denied
                    ? `Denied ${request.toolName} (${request.id.slice(0, 8)}).`
                    : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
                await this.refreshPendingApprovals();
                return;
            }
            if (action === 'copy-input') {
                await this.copyFocusedTextActionHandler(request.inputSummary || request.summary, 'approval input');
                return;
            }
        }
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
        const text = String(input || '');
        const appMentions = extractAgentConsoleAppMentions(text);
        const matches = text.match(/(^|\s)@([^\s@]+)/g) || [];
        const mentions = Array.from(new Set(matches.map(item => item.trim())));
        if (!mentions.length && !appMentions.length) {
            return text;
        }
        const toolMap = new Map((this.state.tools || []).map(tool => [tool.name, tool]));
        const contextLines = (await Promise.all(mentions.map(async mention => {
            const name = mention.slice(1);
            switch (name) {
                case 'workspace':
                    return [`Workspace: ${this.state.workspace}`];
                case 'session':
                    return [`Session: ${this.state.sessionId}`];
                case 'model':
                    return [`Model: ${this.state.provider} / ${this.state.model}`];
                case 'tools':
                    return [`Tools: ${(this.state.tools || []).map(tool => tool.name).join(', ') || '(none)'}`];
                default: {
                    const tool = toolMap.get(name);
                    if (tool) {
                        return [`Tool ${tool.name}: toolset=${tool.toolset || 'default'}, active=${tool.active === false ? 'no' : 'yes'}`];
                    }
                    return await this.workspaceMentionsProvider?.resolveContext(this.state.workspace, name, this.mentionCatalog) || [];
                }
            }
        }))).flat();
        const apps = this.resolveApps();
        const appContextLines = appMentions.map(id => {
            const app = apps.find(item => item.id === id)!;
            return `Connector ${app.name}: id=${app.id}, status=${app.statusLabel}, capabilities=${app.description}`;
        });
        if (!contextLines.length && !appContextLines.length) {
            return text;
        }
        return [
            '[Mention Context]',
            ...contextLines,
            ...appContextLines,
            '',
            text
        ].join('\n');
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
        if (!this.draftLines.length) { return; }
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return;
        }
        const draft = this.draftLines.join('\n');
        const prompt = await this.enrichPromptWithMentions(draft);
        const attachments = this.state.pendingAttachments.slice();
        const turnMessage = this.buildTurnMessageInput(prompt, attachments);
        const profile = this.consumePendingTurnModelProfile();
        this.draftLines = [];
        this.multilineMode = false;
        this.state.pushInputHistory(draft);
        await this.persistInputHistory();
        this.clearStreamingMessageState();
        const turnScope = this.state.beginTurnEventScope();
        const userMsg: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            parts: turnMessage?.parts,
            createdAt: Date.now()
        };
        const asstMsg: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
            const baseMessages = this.state.messages.slice();
            this.state.setInput('');
            this.state.setStatus('running');
            this.state.setLastError('');
            this.state.clearPendingAttachments();
            this.state.clearActivities();
            this.state.pushActivity('turn', this.state.summarize(draft));
            this.state.setMessages([...baseMessages, userMsg, asstMsg]);
            this.updateTerminalTitle();
        try {
            await this.runTurnStream(prompt, asstMsg, turnMessage, profile);
            this.clearStreamingMessageState();
            this.ensureMessageAtTail(asstMsg.id);
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                    this.updateTerminalTitle();
                }
        } catch (error: any) {
            this.clearStreamingMessageState();
                this.state.setStatus('error');
                this.state.setLastError(error.message || 'Unknown');
                this.state.pushActivity('error', error.message || 'Unknown');
                this.state.appendAssistantErrorMessage(error.message || 'Unknown');
                this.updateTerminalTitle();
        } finally {
            this.state.clearTurnEventScope(turnScope);
        }
    }
    async submit(): Promise<void> {
        const value = this.state.input.trim();
        if (!value) { return; }
        if (this.state.providerWizard?.open && this.state.providerWizard?.phase === 'enter') {
            await this.advanceProviderWizard(value);
            return;
        }
        const editTargetId = this.editTargetMessageId;
        const editConsumed = !!editTargetId;
        if (editTargetId) {
            this.editTargetMessageId = '';
            this.lastEditSessionMessageId = '';
            this.editDismissedAt = 0;
        }
        if (this.shellMultilineMode && !editConsumed && !value.startsWith('!') && !value.startsWith('/')) {
            this.state.pushInputHistory(value);
            const persistHistory = this.persistInputHistory();
            this.state.setInput('');
            this.shellDraftLines.push(value);
            await persistHistory;
            this.notify(`Shell draft +${this.shellDraftLines.length} line(s). Submit with '!' alone, exit with '!!'.`);
            return;
        }
        if (value.startsWith('!')) {
            this.state.pushInputHistory(value);
            const persistHistory = this.persistInputHistory();
            this.state.setInput('');
            if (await this.handleShellBang(value)) {
                await persistHistory;
                return;
            }
            await persistHistory;
            this.state.setInput(value, value.length);
            return;
        }
        if (value.startsWith('/')) {
            this.state.pushInputHistory(value);
            const persistHistory = this.persistInputHistory();
            this.state.setInput('');
            if (await this.handleCommand(value)) {
                await persistHistory;
                return;
            }
            await persistHistory;
            this.state.setInput(value, value.length);
        }
        let steer = false;
        if (this.isTurnInProgress()) {
            if (this.isSteerModeEnabled() && !this.multilineMode) {
                // P128 steer: awaiting the in-flight stream settles microtask
                // order so the old submit's finally (status reset) runs first.
                steer = true;
                await this.interruptTurn();
                if (this.activeTurnRun) await this.activeTurnRun.catch(() => undefined);
        } else if (this.isQueueModeEnabled()) {
            this.enqueuePrompt(value);
            return;
        } else {
            this.notifyBusyState();
            return;
        }
    }
        if (editConsumed && !value.startsWith('/') && !value.startsWith('!') && this.state.sessionId) {
            const messages = this.state.messages.slice();
            const editedIndex = messages.findIndex(message => message.id === editTargetId);
            const hasLaterTurns = editedIndex >= 0 && editedIndex < messages.length - 1;
            if (hasLaterTurns) {
                const source = this.state.sessionId;
                let branchId = '';
                if (editedIndex > 0) {
                    branchId = await this.sessionService?.forkSession(source, messages[editedIndex - 1].id) || '';
                } else {
                    const fresh = await this.sessionService?.ensureSession();
                    branchId = fresh?.id || '';
                }
                if (branchId && branchId !== source) {
                    await this.openSession(branchId);
                    this.notify(`Branched into ${branchId} with your edited prompt (original preserved).`);
                }
            }
        }
        const turnSessionId = this.state.sessionId;
        if (!steer) {
            this.state.pushInputHistory(value);
            await this.persistInputHistory();
        }
        if (this.multilineMode) {
            this.draftLines.push(value);
            return;
        }
        const prompt = await this.enrichPromptWithMentions(value);
        const attachments = this.state.pendingAttachments.slice();
        const turnMessage = this.buildTurnMessageInput(prompt, attachments);
        const profile = this.consumePendingTurnModelProfile();
        this.clearStreamingMessageState();
        const turnScope = this.state.beginTurnEventScope();
        const mentionFiles = this.resolveMentionDisplayFiles(value);
        const userMetadata: Record<string, any> = {};
        if (steer) {
            userMetadata.kind = 'steer';
        }
        if (mentionFiles.length) {
            userMetadata.mentionFiles = mentionFiles;
        }
        const userMessage: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            parts: turnMessage?.parts,
            createdAt: Date.now(),
            ...(Object.keys(userMetadata).length ? { metadata: userMetadata } : {})
        };
        const assistantMessage: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
            const baseMessages = this.state.messages.slice();
            this.state.setInput('');
            this.state.setStatus('running');
            this.state.setLastError('');
            this.state.clearPendingAttachments();
            this.state.clearActivities();
            this.state.pushActivity('turn', this.state.summarize(value));
            this.state.setMessages([...baseMessages, userMessage, assistantMessage]);
            this.state.resetTurnTokenUsage();
            this.updateTerminalTitle();

        try {
            const turnRun = this.runTurnStream(prompt, assistantMessage, turnMessage, profile);
            this.activeTurnRun = turnRun;
            await turnRun;
        } catch (error: any) {
            const message = error?.message || String(error || 'Unknown error');
                this.state.setStatus('error');
                this.state.setLastError(message);
                this.state.pushActivity('error', message);
                this.state.appendAssistantErrorMessage(message);
                this.updateTerminalTitle();
        } finally {
            this.activeTurnRun = null;
            this.ensureMessageAtTail(assistantMessage.id);
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                    this.updateTerminalTitle();
                }
                this.state.setTasksCount(this.scheduler.getTasks().length);
            void this.refreshTurnArtifacts();
            this.state.clearTurnEventScope(turnScope);
            void this.drainQueuedPrompts(turnSessionId);
        }
    }

    /**
     * `!cmd` runs a shell command; `!!` toggles multiline draft mode; a bare
     * `!` submits the draft in draft mode, otherwise shows the usage hint.
     * Returns true when the input was consumed as a shell command.
     */
    protected async handleShellBang(value: string): Promise<boolean> {
        if (value === '!!') {
            this.shellMultilineMode = !this.shellMultilineMode;
            if (this.shellMultilineMode) {
                this.shellDraftLines = [];
                this.notify('Shell multiline draft mode: type lines, then submit with `!` to run. `!!` exits.');
            } else {
                this.notify(this.shellDraftLines.length
                    ? 'Shell multiline draft discarded.'
                    : 'Shell multiline draft mode exited.');
                this.shellDraftLines = [];
            }
            return true;
        }
        const command = value.slice(1).trim();
        if (!this.shellMultilineMode) {
            if (!command) {
                this.notify('Usage: `!<command>` runs a local shell command. `!!` enters multiline draft mode.');
                return true;
            }
            await this.runShellCommand(command);
            return true;
        }
        if (!command) {
            const draft = this.shellDraftLines.join('\n');
            if (!draft) {
                this.notify('Shell draft is empty. Type lines first, then submit with `!` to run.');
                return true;
            }
            this.shellDraftLines = [];
            this.shellMultilineMode = false;
            await this.runShellCommand(draft);
            return true;
        }
        this.shellDraftLines.push(command);
        this.notify(`Shell draft +${this.shellDraftLines.length} line(s). Submit with '!' alone, exit with '!!'.`);
        return true;
    }

    /**
     * Runs a shell command via the terminal tool as a read-only `type: 'shell'`
     * message. The message stays in the UI state and never enters model context.
     */
    protected async runShellCommand(command: string): Promise<void> {
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return;
        }
        const messageId = `shell-${Date.now()}`;
        const shellMessage: AgentMessage = {
            id: messageId,
            role: 'tool',
            name: 'terminal',
            content: `$ ${command}`,
            createdAt: Date.now(),
            metadata: { type: 'shell', status: 'running' }
        };
        this.state.appendMessage(shellMessage);
        try {
            const result = await this.invokeTerminalTool(command);
            const stdout = String(result?.stdout ?? '');
            const stderr = String(result?.stderr ?? '');
            const exitCode = result?.exitCode;
            const body = [stdout, stderr].filter(Boolean).join('\n');
            const exitSuffix = exitCode === 0 || exitCode === undefined
                ? ''
                : `\n[exit code: ${exitCode}]`;
            this.updateShellMessage(messageId, {
                content: [`$ ${command}`, body, exitSuffix].filter(Boolean).join('\n\n'),
                metadata: {
                    type: 'shell',
                    status: exitCode === 0 || exitCode === undefined ? 'success' : 'failed',
                    exitCode: exitCode ?? 0,
                    error: exitCode !== 0 && exitCode !== undefined
                }
            });
        } catch (error: any) {
            const message = error?.message || String(error || 'Unknown error');
            this.updateShellMessage(messageId, {
                content: `$ ${command}\n\n${message}`,
                metadata: { type: 'shell', status: 'failed', error: true }
            });
        }
    }

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
        this.scheduleStreamingPendingNotice();
        const stream = this.appRpc?.stream?.('run.turn_stream', {
            sessionId: this.state.sessionId,
            input: prompt,
            ...(profile ? { profile } : {}),
            ...(message ? { message } : {})
        });
        if (stream) {
            try {
                for await (const chunk of stream) {
                    this.consumeStreamChunk(chunk, assistantMessage);
                }
            } finally {
                this.clearStreamingMessageState();
            }
            assistantMessage.metadata = {
                ...(assistantMessage.metadata || {}),
                streaming: false
            };
            this.replaceStreamingAssistantMessage(assistantMessage);
            return;
        }

        const runtime: any = this.runtime;
        if (typeof runtime?.runStreamingTurn === 'function') {
            for await (const chunk of runtime.runStreamingTurn(this.state.sessionId, prompt, undefined, message, profile)) {
                this.consumeStreamChunk(chunk, assistantMessage);
            }
            assistantMessage.metadata = {
                ...(assistantMessage.metadata || {}),
                streaming: false
            };
            this.replaceStreamingAssistantMessage(assistantMessage);
            return;
        }

        const result = await this.executeTurn(prompt, message, profile);
        if (result && 'message' in result) {
            assistantMessage.content = result.message.content;
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                    this.updateTerminalTitle();
                }
        }
    }

    protected consumeStreamChunk(chunk: any, assistantMessage: AgentMessage): void {
            this.state.setTokenUsage(chunk);
            if (chunk?.type === 'event') {
                this.consumeStreamEventChunk(chunk);
                return;
            }
            if (chunk?.type === 'text' && chunk.content) {
                this.clearStreamingPendingNotice();
                assistantMessage.content += chunk.content;
                this.scheduleStreamingAssistantMessageFlush(assistantMessage);
                return;
            }
            if (chunk?.type === 'reasoning' && chunk.content) {
                this.clearStreamingPendingNotice();
                this.state.setStatus('reasoning');
                this.updateTerminalTitle();
                this.state.pushActivity('model', `Reasoning: ${this.state.summarize(chunk.content)}`);
                this.state.upsertUiEventMessage(this.state.qualifyUiEventKey('reasoning'), 'Reasoning about implementation', {
                    eventType: 'reasoning',
                    label: 'think',
                    status: 'running'
                });
                return;
            }
            if (chunk?.type === 'tool_call') {
                this.clearStreamingPendingNotice();
                const content = this.describePendingToolCall(chunk);
                const eventKey = this.qualifyTurnUiEventKey(this.resolveToolEventKey('tool_call', chunk));
                this.state.pushActivity('tool', `Tool call: ${this.state.summarize(String(content || chunk.content || ''))}`);
                if (eventKey) {
                    this.state.upsertUiEventMessage(eventKey, content, {
                        eventType: 'tool_call',
                        label: 'tool',
                        status: 'running',
                        toolCallId: String(chunk?.toolCallId || '').trim() || undefined,
                        receiptId: String(chunk?.receiptId || chunk?.receipt?.receiptId || '').trim() || undefined,
                        attempt: Number(chunk?.attemptCount || chunk?.receipt?.attemptCount) || undefined,
                        source: 'stream',
                        sequence: Number(chunk?.sequence) || undefined
                    });
                } else {
                    this.state.appendUiEventMessage(content, {
                        eventType: 'tool_call',
                        label: 'tool',
                        status: 'running'
                    });
                }
                if (String(chunk.content || '').includes('todo')) {
                    void this.refreshTodoPlan();
                }
                return;
            }
            if (chunk?.type === 'done' && chunk.message) {
                this.clearStreamingPendingNotice();
                assistantMessage.content = chunk.message.content || assistantMessage.content;
                assistantMessage.metadata = {
                    ...(chunk.message.metadata || {}),
                    streaming: false
                };
                this.replaceStreamingAssistantMessage(assistantMessage);
                this.state.setTokenUsage(chunk.message.metadata?.usage);
            }
    }

    protected consumeStreamEventChunk(chunk: any): void {
        const eventType = String(chunk?.eventType || 'state').trim() || 'state';
        if (eventType === 'approval_requested') {
            const toolName = String(chunk?.toolName || 'tool');
            const inputSummary = String(chunk?.inputSummary || chunk?.command || chunk?.input || '').trim();
            this.state.upsertPendingApproval({
                id: String(chunk?.approvalId || `approval-${Date.now()}`),
                toolName,
                sessionId: this.state.sessionId,
                reason: String(chunk?.content || `Approval required for ${toolName}`),
                summary: String(chunk?.content || ''),
                hasInput: true,
                inputSummary: inputSummary || undefined,
                createdAt: Date.now(),
                timeoutMs: Number(chunk?.timeoutMs) || 0
            } as AgentConsoleApprovalRequest);
            this.state.requestApprovalAttention();
            this.state.pushActivity('tool', `Approval required for ${toolName}`);
            return;
        }
        if (eventType === 'approval_completed' || eventType === 'approval_failed') {
            void this.refreshPendingApprovals();
            return;
        }
        if (eventType === 'compensation') {
            const compensated = Number(chunk?.compensated || 0);
            if (compensated > 0) {
                this.state.pushActivity(
                    'rollback',
                    `Rolled back ${compensated} side-effecting tool call${compensated === 1 ? '' : 's'}`
                );
            }
            return;
        }
        if (eventType === 'context_prepared') {
            if (chunk?.report) {
                    this.state.setContextPreparation(chunk.report);
                    this.state.pushActivity(
                        'model',
                        `Context ${chunk.report.strategy}: ${chunk.report.beforeTokens}→${chunk.report.afterTokens}`
                    );
                return;
            }
            const contextContent = String(chunk?.content || '').trim();
            if (contextContent) {
                this.state.pushActivity('model', contextContent);
            }
            return;
        }
        if (eventType === 'turn_diagnostics') {
            const diagnostics = chunk?.diagnostics || {};
            const compactionCount = Number(diagnostics.compactionCount ?? 0);
            const totalSavings = Number(diagnostics.totalTokenSavings ?? 0);
            const promptCache = diagnostics.promptCache;
            const parts: string[] = [];
            if (compactionCount > 0 || totalSavings > 0) {
                parts.push(`${compactionCount} compaction${compactionCount === 1 ? '' : 's'}, ${totalSavings} tokens saved`);
            }
            if (promptCache) {
                const support = String(promptCache.supported || 'none');
                const applied = promptCache.applied ? 'applied' : 'not applied';
                const cachedTokens = Number(promptCache.observedCachedPromptTokens ?? 0);
                parts.push(`prompt cache ${support} (${applied}${cachedTokens ? `, ${cachedTokens} cached tokens` : ''})`);
            }
            if (parts.length) {
                this.state.pushActivity('model', `Turn diagnostics: ${parts.join('; ')}`);
                return;
            }
            const diagnosticsContent = String(chunk?.content || '').trim();
            if (diagnosticsContent) {
                this.state.pushActivity('model', diagnosticsContent);
            }
            return;
        }
        const content = this.describeStreamEventContent(eventType, chunk);
        if (!content) {
            return;
        }
        const label = String(chunk?.label || this.resolveStreamEventLabel(eventType)).trim() || 'state';
        const status = this.normalizeUiEventStatus(chunk?.status);
        const eventKey = this.qualifyTurnUiEventKey(this.resolveToolEventKey(eventType, chunk))
            || (eventType === 'turn_started'
                ? this.state.qualifyUiEventKey('turn-start')
                : eventType === 'reasoning'
                    ? this.state.qualifyUiEventKey('reasoning')
                    : undefined);
            if (eventKey) {
                this.state.upsertUiEventMessage(eventKey, content, {
                    eventType,
                    label,
                    status,
                    toolCallId: String(chunk?.toolCallId || '').trim() || undefined,
                    receiptId: String(chunk?.receiptId || chunk?.receipt?.receiptId || '').trim() || undefined,
                    attempt: Number(chunk?.attemptCount || chunk?.receipt?.attemptCount) || undefined,
                    source: 'stream',
                    sequence: Number(chunk?.sequence) || undefined
                });
                return;
            }
            this.state.appendUiEventMessage(content, {
                eventType,
                label,
                status,
                source: 'stream',
                sequence: Number(chunk?.sequence) || undefined
            });
    }

    protected describeStreamEventContent(eventType: string, chunk: any): string {
        return describeStreamEventContent(eventType, chunk, this.translator);
    }

    protected resolveToolEventKey(eventType: string, chunk: any): string | undefined {
        return resolveToolEventKey(eventType, chunk);
    }

    protected qualifyTurnUiEventKey(key: string | undefined): string | undefined {
        const resolvedKey = String(key || '').trim();
        return resolvedKey ? this.state.qualifyUiEventKey(resolvedKey) : undefined;
    }

    protected resolveToolEventName(chunk: any): string {
        return resolveToolEventName(chunk);
    }

    protected describePendingToolCall(chunk: any): string {
        return describePendingToolCall(chunk, this.translator);
    }

    protected formatToolCallLabel(call: any): string {
        return formatToolCallLabel(call, this.translator);
    }

    protected resolveToolCallArgument(input: any): string {
        return resolveToolCallArgument(input);
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

    // STREAM LAYOUT CONTRACT: stream uses native terminal scrollback for the
    // whole session, including while a turn is streaming, so multi-turn history
    // is never clipped to the viewport. Only explicit dynamic mode windows.
    shouldUseNativeScrollback(): boolean {
        return this.state.consoleOptions.messageLayout !== 'dynamic';
    }

    getTerminalRenderedLines(): string[] {
        return this.surfaceAccessor?.getLastRenderedLines() || [];
    }

    getTerminalRenderedText(stripAnsi: (value: string) => string): string {
        return this.surfaceAccessor?.getLastRenderedText(stripAnsi) || '';
    }

    protected scheduleStreamingAssistantMessageFlush(message: AgentMessage): void {
        this.streamMessageText = message.content || '';
        if (!this.destroyed) this.flushStreamingAssistantMessage(message);
    }

    protected flushStreamingAssistantMessage(message?: AgentMessage): void {
        if (this.destroyed) {
            this.streamMessageText = '';
            return;
        }
        const current = this.state.messages.slice();
        const targetIndex = this.findStreamingAssistantMessageIndex(current, message);
        if (targetIndex >= 0) {
            const currentMessage = current[targetIndex];
            if (String(currentMessage.content || '') === this.streamMessageText
                && currentMessage.metadata?.streaming === true) {
                return;
            }
            current[targetIndex] = {
                ...(message || currentMessage),
                content: this.streamMessageText,
                metadata: {
                    ...(message?.metadata || currentMessage.metadata || {}),
                    streaming: true
                }
            };
            this.state.setMessages(current);
        }
    }

    protected replaceStreamingAssistantMessage(message: AgentMessage): void {
        replaceStreamingAssistantMessage(this.state, this.destroyed, message);
    }

    protected clearStreamingMessageState(): void {
        this.streamMessageText = '';
        this.clearStreamingPendingNotice();
    }

    protected scheduleStreamingPendingNotice(): void {
        // Waiting state is represented by the reactive turn status; no timer-driven notice.
    }

    protected clearStreamingPendingNotice(): void {
        // Pending notice lifecycle is driven by incoming stream/turn events.
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
        if (!this.appRpc) {
            const todos = await this.loadLocalTodoPlan(sessionId);
            if (sessionId !== this.state.sessionId) {
                return null;
            }
            if (!todos.length) {
                this.state.clearPlanTodos();
                return null;
            }
            return { todos, sourceSessionId: sessionId };
        }
        const relatedSessions = sessions
            .slice()
            .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
        const results = await Promise.allSettled(relatedSessions.map(async session => ({
            sessionId: session.id,
            updatedAt: session.updatedAt || 0,
            result: await this.appRpc!.request('todo.get', { sessionId: session.id })
        })));
        const merged = new Map<string, { id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }>();
        let latestAnyTodoSessionId: string | undefined;
        let latestActiveTodoSessionId: string | undefined;
        for (const entry of results) {
            if (entry.status !== 'fulfilled') {
                continue;
            }
            const value = entry.value;
            const todos = Array.isArray(value.result?.todos)
                ? value.result.todos.map((item: any) => ({
                    id: String(item?.id || '').trim(),
                    content: String(item?.content || '').trim(),
                    status: this.normalizeTodoStatus(item?.status)
                })).filter((item: any) => !!item.id && !!item.content)
                : [];
            if (!todos.length) {
                continue;
            }
            latestAnyTodoSessionId ||= value.sessionId;
            if (!latestActiveTodoSessionId && todos.some((todo: any) => todo.status === 'pending' || todo.status === 'in_progress')) {
                latestActiveTodoSessionId = value.sessionId;
            }
            for (const todo of todos) {
                if (!merged.has(todo.id)) {
                    merged.set(todo.id, todo);
                }
            }
        }
        const activeTodos = Array.from(merged.values()).filter(todo => todo.status === 'pending' || todo.status === 'in_progress');
        const nextTodos = activeTodos.length ? activeTodos : Array.from(merged.values());
        const sourceSessionId = activeTodos.length
            ? latestActiveTodoSessionId || latestAnyTodoSessionId
            : latestAnyTodoSessionId;
        if (sessionId !== this.state.sessionId) {
            return null;
        }
        if (!nextTodos.length) {
            this.state.clearPlanTodos();
            return null;
        }
        return { todos: nextTodos, sourceSessionId: sourceSessionId || sessionId };
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

    protected normalizeUiEventStatus(status: unknown): 'running' | 'success' | 'failed' | 'error' {
        switch (String(status || '').trim()) {
            case 'success':
            case 'failed':
            case 'error':
                return status as 'success' | 'failed' | 'error';
            case 'cancelled':
                return 'failed';
            default:
                return 'running';
        }
    }

    protected resolveStreamEventLabel(eventType: string): string {
        return resolveStreamEventLabel(eventType);
    }

    protected findStreamingAssistantMessageIndex(messages: AgentMessage[], message?: AgentMessage): number {
        return findStreamingAssistantMessageIndex(messages, message);
    }

    protected dispatchTerminalMouseAt(mouse: SelectMenuMouseEvent): void {
        this.surfaceAccessor?.dispatchMouse?.(mouse);
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
        const parsed = String(args || '').trim();
        if (!parsed || parsed.toLowerCase() === 'list') {
            const stashes = await this.stashStore?.load(this.resolveHistoryWorkspace()) || {};
            const names = Object.keys(stashes);
            if (!names.length) {
                this.notify(this.translator?.translate('agent.notice.noStashedDrafts') || 'No stashed drafts. Use /stash push <name> to save the current draft.');
                return true;
            }
            this.pushCommandOutput('/stash list', `Stashed drafts: ${names.map(name => `${name} (${stashes[name].length} chars)`).join(', ')}.`);
            return true;
        }
        const [verb, ...rest] = parsed.split(/\s+/);
        const requested = rest.join(' ').trim();
        if (verb.toLowerCase() === 'push' || verb.toLowerCase() === 'save') {
            const draft = String(this.state.input || '').trim();
            if (!draft) {
                this.notify(this.translator?.translate('agent.notice.emptyStash') || 'Nothing to stash: the draft is empty.');
                return true;
            }
            const name = requested || 'default';
            const stashes = await this.stashStore?.load(this.resolveHistoryWorkspace()) || {};
            stashes[name] = draft;
            try {
                await this.stashStore?.save(this.resolveHistoryWorkspace(), stashes);
            } catch (error: any) {
                this.notify(error?.message || 'Failed to stash the draft.');
                return true;
            }
            this.notify(`Draft stashed as "${name}".`);
            return true;
        }
        if (verb.toLowerCase() === 'pop' || verb.toLowerCase() === 'restore') {
            const name = requested || 'default';
            const stashes = await this.stashStore?.load(this.resolveHistoryWorkspace()) || {};
            if (!(name in stashes)) {
                this.notify(`No stash named "${name}". Available: ${Object.keys(stashes).join(', ') || 'none'}.`);
                return true;
            }
            this.state.updateDraft(stashes[name]);
            delete stashes[name];
            try {
                await this.stashStore?.save(this.resolveHistoryWorkspace(), stashes);
            } catch (error: any) {
                this.notify(error?.message || 'Restored the draft, but failed to remove the stash.');
                return true;
            }
            this.notify(`Restored stash "${name}" into the draft.`);
            return true;
        }
        if (verb.toLowerCase() === 'rm' || verb.toLowerCase() === 'drop' || verb.toLowerCase() === 'delete') {
            const name = requested || 'default';
            const stashes = await this.stashStore?.load(this.resolveHistoryWorkspace()) || {};
            if (!(name in stashes)) {
                this.notify(`No stash named "${name}". Available: ${Object.keys(stashes).join(', ') || 'none'}.`);
                return true;
            }
            delete stashes[name];
            try {
                await this.stashStore?.save(this.resolveHistoryWorkspace(), stashes);
            } catch (error: any) {
                this.notify(error?.message || 'Failed to remove the stash.');
                return true;
            }
            this.notify(`Removed stash "${name}".`);
            return true;
        }
        this.notify(this.translator?.translate('agent.notice.stashUsage') || 'Usage: /stash [list|push <name>|pop <name>|rm <name>]');
        return true;
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
        let summary: Array<{ stage: string; commands: string[]; functions: string[] }> = [];
        if (this.appRpc) {
            try {
                const result = await this.appRpc.request('hooks.list', {}, this.rpcRequestContext());
                if (Array.isArray(result)) {
                    summary = result;
                }
            } catch {
                summary = [];
            }
        }
        if (!summary.length) {
            summary = this.runtime.getHookSummary();
        }
        const stages = summary.filter(entry => entry.commands.length > 0 || entry.functions.length > 0);
        if (!stages.length) {
            this.notify('No hooks registered. Configure hooks in agent options (hooks.beforeTurn, hooks.afterTool, ...).');
            return true;
        }
        const lines = stages.map(entry => {
            const commands = entry.commands.length ? `cmd: ${entry.commands.join('; ')}` : '';
            const functions = entry.functions.length ? `fn: ${entry.functions.join(', ')}` : '';
            return `${entry.stage}${commands ? ` [${commands}]` : ''}${functions ? ` [${functions}]` : ''}`;
        });
        this.pushCommandOutput('/hooks', `Registered hooks:\n${lines.join('\n')}`);
        return true;
    }

    protected async runMemoriesCommand(args?: string): Promise<boolean> {
        const raw = String(args || '').trim();
        const parsed = raw.toLowerCase();
        const current = this.options.ui?.memoryInjection !== false;
        if (!parsed) {
            this.notify(`Memory injection ${current ? 'ON' : 'OFF'}. Use /memories list|add|remove or on|off.`);
            return true;
        }
        if (parsed === 'list' || parsed === 'injected') {
            const projectId = this.resolveProjectMemoryId();
            const records: Array<{ key: string; value: string }> = this.appRpc
                ? await this.appRpc.request('project_memory.list', { sessionId: this.state.sessionId }, this.rpcRequestContext()).catch(() => [])
                : (projectId && this.projectMemory ? await this.projectMemory.list(projectId) : []);
            if (!records.length) {
                this.notify(projectId ? 'No project memories.' : 'Project memory requires a project or workspace.');
                return true;
            }
            this.pushCommandOutput('/memories list', `Project memories (${records.length}):\n${records.map(record => `- ${record.key}: ${record.value}`).join('\n')}`);
            return true;
        }
        if (parsed.startsWith('add ')) {
            const projectId = this.resolveProjectMemoryId();
            const body = raw.slice(4).trim();
            const separator = body.indexOf('=') >= 0 ? body.indexOf('=') : body.indexOf(' ');
            if (!projectId || (!this.appRpc && !this.projectMemory) || separator <= 0 || !body.slice(separator + 1).trim()) {
                this.notify('Usage: /memories add <key>=<value>');
                return true;
            }
            const input = { sessionId: this.state.sessionId, projectId, key: body.slice(0, separator).trim(), value: body.slice(separator + 1).trim(), conflict: 'replace' as const };
            const record = this.appRpc
                ? await this.appRpc.request('project_memory.add', input, this.rpcRequestContext())
                : await this.projectMemory!.add(input);
            this.notify(`Project memory saved: ${record.key}`);
            return true;
        }
        if (parsed.startsWith('remove ') || parsed.startsWith('rm ')) {
            const projectId = this.resolveProjectMemoryId();
            const target = raw.slice(raw.indexOf(' ') + 1).trim();
            const result = this.appRpc
                ? await this.appRpc.request('project_memory.remove', { sessionId: this.state.sessionId, target }, this.rpcRequestContext()).catch(() => ({ removed: 0 }))
                : { removed: projectId && this.projectMemory ? await this.projectMemory.remove(projectId, target) : 0 };
            const removed = Number(result?.removed || 0);
            this.notify(removed ? `Removed ${removed} project memory record${removed === 1 ? '' : 's'}.` : `Project memory not found: ${target || '-'}`);
            return true;
        }
        const enabled = parsed === 'on';
        if (parsed !== 'on' && parsed !== 'off') {
            this.notify('Usage: /memories [on|off|list|injected|add <key>=<value>|remove <id-or-key>]');
            return true;
        }
        this.options.ui = { ...(this.options.ui || {}), memoryInjection: enabled };
        this.notify(enabled ? 'Memory injection enabled.' : 'Memory injection disabled.');
        return true;
    }

    protected resolveProjectMemoryId(): string {
        const consoleOptions = this.options.ui?.console as Record<string, any> | undefined;
        return String(this.state.projectKey || consoleOptions?.workspace || '').trim();
    }

    protected async runFastCommand(args?: string): Promise<boolean> {
        return runFastCommand(this.runtimeHost(), args);
    }

    protected async runPersonalityCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim();
        const parts = parsed.split(/\s+/).filter(Boolean);
        const verb = parts[0]?.toLowerCase() ?? '';
        const names = Object.keys(AGENT_PERSONALITY_PRESETS);
        if (!verb) {
            const active = this.options.ui?.personality;
            this.notify(`Personality: ${active || 'none'}. Available: ${names.join(', ')}. Use /personality set <name> or unset.`);
            return true;
        }
        if (verb === 'list') {
            const lines = names.map(name => `${name === this.options.ui?.personality ? '*' : ' '} ${name}`);
            this.pushCommandOutput('/personality list', `Personality presets:\n${lines.join('\n')}`);
            return true;
        }
        if (verb === 'set') {
            const name = parts[1] ?? '';
            if (!name || !AGENT_PERSONALITY_PRESETS[name]) {
                this.notify(`Unknown personality preset "${name}". Available: ${names.join(', ')}.`);
                return true;
            }
            this.options.ui = { ...(this.options.ui || {}), personality: name };
            this.notify(`Personality set to ${name}.`);
            return true;
        }
        if (verb === 'unset') {
            this.options.ui = { ...(this.options.ui || {}), personality: undefined };
            this.notify(this.translator?.translate('agent.notice.personalityCleared') || 'Personality cleared.');
            return true;
        }
        this.notify(this.translator?.translate('agent.notice.personalityUsage') || 'Usage: /personality [list|set <name>|unset]');
        return true;
    }

    protected async runDebugConfigCommand(): Promise<boolean> {
        const model = this.options.model || {};
        const ui = this.options.ui || {};
        const profiles = (model.profiles || {}) as Record<string, unknown>;
        const activeProfile = String(model.defaultProfile || this.state.modelProfile || 'default');
        const experimental = (ui.experimental || {}) as Record<string, boolean>;
        const lines = [
            `model: ${String(model.provider || '-')} / ${String(model.model || '-')}`,
            `profile: ${activeProfile}${Object.keys(profiles).length ? ` (available: ${Object.keys(profiles).join(', ')})` : ''}`,
            `ui.title: ${ui.title || '(default)'}`,
            `ui.statusline: ${Array.isArray(ui.statusline) ? ui.statusline.join(', ') : '(default)'}`,
            `ui.memoryInjection: ${ui.memoryInjection !== false ? 'on' : 'off'}`,
            `ui.personality: ${ui.personality || '(none)'}`,
            `ui.queueMode: ${ui.queueMode || 'off'}`,
            `ui.planNudges: ${ui.planNudges !== false ? 'on' : 'off'}`,
            `experimental: ${Object.keys(experimental).length ? Object.entries(experimental).map(([name, enabled]) => `${name}=${enabled ? 'on' : 'off'}`).join(', ') : '(none)'}`,
            `session: ${this.state.sessionId} · workspace: ${this.workspace || '(none)'}`
        ];
        this.pushCommandOutput('/debug-config', `Debug config:\n${lines.join('\n')}`);
        return true;
    }

    protected async runSettingsCommand(): Promise<boolean> {
        const tab = await this.select('Settings', [
            { label: 'General', value: 'general', description: 'theme, language, input toggles' },
            { label: 'Keybinds', value: 'keybinds', description: 'record, conflict detection, reset' },
            { label: 'Providers', value: 'providers', description: 'model profiles and provider' }
        ], 0, 'enter select   esc close');
        if (!tab) return true;
        if (tab === 'general') return this.openSettingsGeneralTab();
        if (tab === 'keybinds') return this.openSettingsKeybindsTab();
        if (tab === 'providers') return this.openSettingsProvidersTab();
        return true;
    }

    protected async openSettingsGeneralTab(): Promise<boolean> {
        const option = await this.select('Settings · General', [
            { label: `Theme: ${this.activeThemeName}`, value: 'theme', description: 'apply and save a UI theme' },
            { label: `Language: ${this.translator?.currentLocale || 'en'}`, value: 'language', description: 'switch UI language' },
            { label: `Vim mode: ${this.state.vimMode ? 'on' : 'off'}`, value: 'vim', description: 'vim-style normal/insert input mode' },
            { label: `Raw mode: ${this.state.rawMode ? 'on' : 'off'}`, value: 'raw', description: 'plain-text scrollback rendering' },
            { label: `Thinking: ${this.state.showThinking ? 'shown' : 'hidden'}`, value: 'thinking', description: 'reasoning message visibility' },
            { label: `Yolo mode: ${this.yoloMode ? 'on' : 'off'}`, value: 'yolo', description: 'automatically approve gated tools' },
            { label: `Timestamps: ${this.state.showTimestamps ? 'shown' : 'hidden'}`, value: 'timestamps', description: 'message timestamp visibility' },
            { label: `Tool output: ${this.state.showToolOutput ? 'shown' : 'hidden'}`, value: 'tooloutput', description: 'tool output visibility in messages' },
            { label: `Username: ${this.state.showUsername ? 'shown' : 'hidden'}`, value: 'username', description: 'username label visibility' },
            { label: `Window title: ${this.options.ui?.terminalTitle === false ? 'off' : 'on'}`, value: 'title', description: 'terminal/document title sync' }
        ], 0, 'enter apply   esc close');
        if (!option) return true;
        if (option === 'theme') {
            await this.runThemeCommand();
            return true;
        }
        if (option === 'language') {
            return this.openSettingsLanguage();
        }
        if (option === 'vim') {
            await this.runVimCommand('');
            try {
                await this.persistSettings({ vimMode: this.state.vimMode });
            } catch (error: any) {
                this.notify(error?.message || 'Failed to save vim mode.');
            }
            return true;
        }
        if (option === 'raw') {
            return this.runRawModeCommand();
        }
        if (option === 'thinking') {
            this.state.setShowThinking(!this.state.showThinking);
            this.notify(this.state.showThinking ? 'Showing reasoning messages.' : 'Hiding reasoning messages.');
            try {
                await this.persistSettings({ showThinking: this.state.showThinking });
            } catch (error: any) {
                this.notify(error?.message || 'Failed to save thinking visibility.');
            }
            return true;
        }
        if (option === 'yolo') {
            await this.setYoloMode(!this.yoloMode);
            return true;
        }
        if (option === 'title') {
            const enabled = this.options.ui?.terminalTitle !== false;
            this.options.ui = { ...(this.options.ui || {}), terminalTitle: !enabled };
            this.notify(!enabled ? 'Window title sync enabled.' : 'Window title sync disabled.');
            return true;
        }
        if (option === 'timestamps') {
            return this.runDisplayCommand('');
        }
        if (option === 'tooloutput') {
            this.state.setShowToolOutput(!this.state.showToolOutput);
            try {
                await this.persistSettings({ showToolOutput: this.state.showToolOutput });
            } catch (error: any) {
                this.notify(error?.message || 'Failed to save tool output visibility.');
                return true;
            }
            this.notify(this.state.showToolOutput ? 'Showing tool output in messages.' : 'Hiding tool output in messages.');
            return true;
        }
        if (option === 'username') {
            this.state.setShowUsername(!this.state.showUsername);
            try {
                await this.persistSettings({ showUsername: this.state.showUsername });
            } catch (error: any) {
                this.notify(error?.message || 'Failed to save username visibility.');
                return true;
            }
            this.notify(this.state.showUsername ? 'Showing the username label.' : 'Hiding the username label.');
            return true;
        }
        return true;
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
        const locales = this.translator?.availableLocales?.length
            ? this.translator.availableLocales
            : ['en', 'zh-CN'];
        const current = this.translator?.currentLocale || 'en';
        const selected = await this.select('Settings · Language', locales.map(locale => ({
            label: `${locale === current ? '● ' : '  '}${locale}`,
            value: locale,
            description: locale === current ? 'current language' : 'switch and save'
        })), Math.max(0, locales.indexOf(current)), 'enter apply   esc close');
        if (!selected) return true;
        this.translator?.setLocale(selected);
        try {
            await this.persistSettings({ language: selected });
        } catch (error: any) {
            this.notify(error?.message || `Switched to ${selected}, but failed to save the language.`);
            return true;
        }
        this.notify(`Language set to ${selected}.`);
        return true;
    }

    protected async openSettingsKeybindsTab(): Promise<boolean> {
        return openSettingsKeybindsTab(
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            (args: string) => this.runKeymapCommand(args)
        );
    }

    protected async openSettingsProvidersTab(): Promise<boolean> {
        const option = await this.select('Settings · Providers', [
            { label: 'Model profiles', value: 'model', description: 'switch the active model profile' },
            { label: `Thinking level: ${this.modelReasoningEffort}`, value: 'thinking-level', description: 'set model reasoning effort' },
            { label: 'Fast/strong profile', value: 'fast', description: 'switch between fast and strong profiles' },
            { label: 'Session status', value: 'status', description: 'show current model / archetype / modes' }
        ], 0, 'enter select   esc close');
        if (!option) return true;
        if (option === 'model') {
            await this.openModelSwitcher();
            return true;
        }
        if (option === 'thinking-level') {
            return this.openSettingsThinkingLevel();
        }
        if (option === 'fast') {
            return this.runFastCommand();
        }
        if (option === 'status') {
            await this.runStatusCommand();
            return true;
        }
        return true;
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
        const query = String(args || '').trim();
        const result = await this.invokeTool('skill_list', query ? { query } : {}).catch(() => undefined);
        const skills = Array.isArray(result?.skills) ? result.skills : [];
        if (!skills.length) {
            this.notify(query ? `No skills match "${query}".` : 'No skills available.');
            return true;
        }
        if (query) {
            this.pushCommandOutput(`/skills ${query}`, skills.map((skill: any) => this.formatSkillLine(skill)).join('\n'));
            return true;
        }
        const selected = await this.select('Skills', skills.map((skill: any) => ({
            label: `${skill.id}${String(skill.category || '').trim() ? ` [${skill.category}]` : ''}`,
            value: String(skill.id || ''),
            description: String(skill.summary || ''),
            detail: [
                `Title: ${String(skill.title || skill.id || '-')}`,
                String(skill.summary || '') ? `Summary: ${skill.summary}` : '',
                Array.isArray(skill.aliases) && skill.aliases.length ? `Aliases: ${skill.aliases.join(', ')}` : '',
                String(skill.source || '') ? `Source: ${skill.source}` : ''
            ].filter(Boolean).join('\n')
        })), 0, 'enter detail   esc close');
        if (!selected) return true;
        const detail = await this.invokeTool('read_skill', { id: selected }).catch(() => undefined);
        this.pushCommandOutput(`/skills ${selected}`, detail?.skill
            ? this.formatSkillDetail(detail.skill)
            : skills.map((skill: any) => this.formatSkillLine(skill)).join('\n'));
        return true;
    }

    protected formatSkillLine(skill: any): string {
        const parts = [String(skill.id || '')];
        if (String(skill.category || '').trim()) parts.push(`[${skill.category}]`);
        if (String(skill.summary || '').trim()) parts.push(String(skill.summary));
        return parts.join(' ');
    }

    protected formatSkillDetail(skill: any): string {
        const lines = [
            `Skill: ${String(skill.id || '')}`,
            String(skill.title || '') ? `Title: ${skill.title}` : '',
            String(skill.summary || '') ? `Summary: ${skill.summary}` : '',
            Array.isArray(skill.aliases) && skill.aliases.length ? `Aliases: ${skill.aliases.join(', ')}` : '',
            String(skill.content || '') ? `Content: ${skill.content}` : '',
            String(skill.source || '') ? `Source: ${skill.source}` : ''
        ];
        return lines.filter(Boolean).join('\n');
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
        const requested = String(args || '').trim();
        const result = await this.invokeTool('plugins', requested
            ? { action: 'inspect', id: requested }
            : { action: 'list' }).catch(() => undefined);
        const plugins = Array.isArray(result?.plugins) ? result.plugins : [];
        if (!plugins.length) {
            this.notify(requested ? `No plugin "${requested}" installed.` : 'No plugins installed.');
            return true;
        }
        if (requested) {
            this.pushCommandOutput(`/plugins ${requested}`, plugins.map((plugin: any) => this.formatPluginDetail(plugin, result?.contributions)).join('\n'));
            return true;
        }
        this.pushCommandOutput('/plugins', plugins.map((plugin: any) => this.formatPluginLine(plugin)).join('\n'));
        return true;
    }

    protected resolveApps(): AgentConsoleAppStatus[] {
        const config = (this.options.ui?.console as any)?.connectors;
        return resolveAgentConsoleApps(config && typeof config === 'object' ? config : undefined);
    }

    protected resolveAppAuthorizer(): AgentConsoleAppAuthorizer | undefined {
        const authorizer = (this.options.ui?.console as any)?.authorizeConnector
            || (this.options.ui as any)?.authorizeConnector;
        return typeof authorizer === 'function' ? authorizer : undefined;
    }

    protected async runAppsCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().replace(/^\$/, '').toLowerCase();
        const apps = this.resolveApps();
        if (requested) {
            let app = apps.find(item => item.id === requested);
            if (!app) {
                this.notify(`Unknown connector "${requested}". Use /apps to browse available connectors.`);
                return true;
            }
            if (!app.authorized) {
                const authorize = this.resolveAppAuthorizer();
                if (!authorize) {
                    this.insertAppMention(app);
                    return true;
                }
                let authorized = false;
                try {
                    authorized = await authorize(app);
                } catch (error) {
                    this.notify(`${app.name} authorization failed: ${error instanceof Error ? error.message : String(error)}`);
                    return true;
                }
                if (!authorized) {
                    this.notify(`${app.name} authorization was cancelled.`);
                    return true;
                }
                app = { ...app, authorized: true, statusLabel: 'connected' };
            }
            this.insertAppMention(app);
            return true;
        }
        const selected = await this.select('Apps', apps.map(app => ({
            label: `${app.name} · ${app.statusLabel}`,
            value: app.id,
            description: `${app.category} · ${app.description}`
        })), 0, 'enter insert   esc close');
        if (selected) {
            const app = apps.find(item => item.id === selected);
            if (app) this.insertAppMention(app);
        }
        return true;
    }

    protected insertAppMention(app: AgentConsoleAppStatus): void {
        const current = String(this.state.input || '');
        const spacer = current && !/\s$/.test(current) ? ' ' : '';
        const next = `${current}${spacer}$${app.id} `;
        this.state.updateDraft(next, next.length);
        this.notify(`${app.name} connector inserted · ${app.statusLabel}.`);
    }

    protected formatPluginLine(plugin: any): string {
        const name = String(plugin?.manifest?.name || plugin.id || '');
        const scope = String(plugin?.scope || '').trim();
        const description = String(plugin?.manifest?.description || '').trim();
        return `${name}${scope ? ` [${scope}]` : ''}${description ? ` · ${description}` : ''}`;
    }

    protected formatPluginDetail(plugin: any, contributions?: any): string {
        const lines = [
            `Plugin: ${String(plugin?.manifest?.name || plugin.id || '')}`,
            `Id: ${String(plugin.id || '')}`,
            String(plugin?.manifest?.description || '') ? `Description: ${plugin.manifest.description}` : '',
            String(plugin?.scope || '') ? `Scope: ${plugin.scope}` : '',
            String(plugin?.version || '') ? `Version: ${plugin.version}` : ''
        ];
        const skills = Array.isArray(contributions?.skills) ? contributions.skills : [];
        if (skills.length) lines.push(`Skills: ${skills.map((skill: any) => String(skill.id || '')).join(', ')}`);
        return lines.filter(Boolean).join('\n');
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
        const parsed = String(args || '').trim();
        const parts = parsed.split(/\s+/).filter(Boolean);
        if (!this.backgroundTasks) {
            this.notify('Background task manager not available in this environment.');
            return true;
        }
        const sub = (parts[0] || '').toLowerCase();
        if (sub === 'show') {
            const taskId = parts[1];
            if (!taskId) {
                this.notify('Usage: /ps show <taskId>');
                return true;
            }
            const task = this.findBackgroundTask(taskId);
            if (!task) {
                this.notify(`No background task ${taskId}.`);
                return true;
            }
            this.pushCommandOutput(`/ps show ${taskId}`, this.formatBackgroundTaskDetail(task));
            return true;
        }
        if (sub === 'stop') {
            const taskIds = parts.slice(1);
            if (!taskIds.length) {
                this.notify('Usage: /ps stop <taskId> [<taskId> ...]');
                return true;
            }
            const manager = this.backgroundTasks as BackgroundTaskManager & { cancelBatch?: (ids: string[]) => BackgroundTaskCancelOutcome[] };
            const outcomes = typeof manager.cancelBatch === 'function'
                ? manager.cancelBatch(taskIds)
                : taskIds.map(id => {
                      const ok = manager.cancel(id);
                      return { id, cancelled: ok, reason: ok ? undefined : ('not-running' as const) };
                  });
            const cancelled = outcomes.filter(o => o.cancelled);
            const lines = [`Cancelled ${cancelled.length}/${outcomes.length} background task(s).`];
            for (const o of outcomes) {
                lines.push(
                    o.cancelled
                        ? `  \u2713 ${o.id}`
                        : `  \u2717 ${o.id} - ${o.reason === 'not-found' ? 'not found' : 'not running'}`
                );
            }
            if (cancelled.length) {
                lines.push('Undo: /ps undo');
            }
            this.pushCommandOutput('/ps stop', lines.join('\n'));
            return true;
        }
        if (sub === 'undo') {
            const taskIds = parts.slice(1);
            const manager = this.backgroundTasks as BackgroundTaskManager & { restoreBatch?: (ids: string[]) => BackgroundTaskRestoreOutcome[] };
            if (typeof manager.restoreBatch !== 'function') {
                this.notify('Undo is not supported by this background task manager.');
                return true;
            }
            const outcomes = manager.restoreBatch(taskIds);
            const restored = outcomes.filter(o => o.restored);
            const lines = [`Restored ${restored.length}/${outcomes.length} background task(s).`];
            for (const o of outcomes) {
                lines.push(
                    o.restored
                        ? `  \u2713 ${o.id}`
                        : `  \u2717 ${o.id} - ${this.describeRestoreFailure(o.reason)}`
                );
            }
            this.pushCommandOutput('/ps undo', lines.join('\n'));
            return true;
        }
        const filter = (parts[0] || 'current').toLowerCase();
        const allowed = new Set(['current', 'all', 'running', 'completed', 'failed', 'cancelled']);
        if (!allowed.has(filter)) {
            this.notify('Usage: /ps [all|running|completed|failed|cancelled] | /ps show <taskId> | /ps stop <taskId> [...] | /ps undo [...]');
            return true;
        }
        const manager = this.backgroundTasks as BackgroundTaskManager & { listAll?: () => BackgroundTaskRecord[] };
        const allTasks = this.state.backgroundTaskFeed.length
            ? this.state.backgroundTaskFeed
            : typeof manager.listAll === 'function'
                ? manager.listAll()
                : manager.list(this.state.sessionId);
        const tasks = allTasks.filter(task =>
            (filter === 'all' || filter === 'current' ? filter === 'all' || task.sessionId === this.state.sessionId : true)
            && (['running', 'completed', 'failed', 'cancelled'].includes(filter) ? task.status === filter : true)
        );
        if (!tasks.length) {
            this.notify(`No ${filter === 'all' ? '' : filter + ' '}background tasks.`);
            return true;
        }
        const lines = tasks.map(task => {
            const status = String(task.status).toUpperCase();
            const meta = task.finishedAt ? ` (${new Date(task.finishedAt).toLocaleTimeString()})` : '';
            return `${status}${meta} ${task.id} [session ${task.sessionId}] - ${task.goal}`;
        });
        this.pushCommandOutput(`/ps ${filter}`, `Background tasks (${filter}):\n${lines.join('\n')}`);
        return true;
    }

    private findBackgroundTask(taskId: string): BackgroundTaskRecord | undefined {
        const manager = this.backgroundTasks as BackgroundTaskManager & { listAll?: () => BackgroundTaskRecord[] };
        if (this.state.backgroundTaskFeed.length) {
            return this.state.backgroundTaskFeed.find(task => task.id === taskId);
        }
        const records = typeof manager.listAll === 'function' ? manager.listAll() : [];
        return records.find(task => task.id === taskId);
    }

    private describeRestoreFailure(reason?: 'not-found' | 'not-cancelled' | 'already-finished'): string {
        if (reason === 'not-found') {
            return 'not found';
        }
        if (reason === 'not-cancelled') {
            return 'not cancelled';
        }
        return 'run already finished';
    }

    private formatBackgroundTaskDetail(task: BackgroundTaskRecord): string {
        return formatBackgroundTaskDetail(task);
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
        // Raw terminals encode Ctrl+C as ETX. Handle it before keymap/focus
        // routing so an active turn is always cancellable.
        if (raw === '\u0003' || raw === '\u0003'.toString()) {
            if (this.isTurnInProgress()) {
                await this.interruptTurn();
                return true;
            }
        }
        if (this.keymapRecording) {
            if (raw === '\u001b') {
                this.keymapRecording = undefined;
                this.notify('Keymap recording cancelled.');
                return true;
            }
            const key = this.decodeGlobalKey(raw);
            if (key) {
                const { context, action } = this.keymapRecording;
                this.keymapRecording = undefined;
                if (this.globalKeymap!.set(key, action, context)) {
                    await this.persistGlobalKeymap();
                    this.notify(`Keymap set: ${key} -> ${action} (${context}).`);
                } else {
                    this.notify(`Cannot bind ${key}: unknown action ${action}.`);
                }
            }
            return true;
        }
        if (raw === '\u001b' && this.state.whichKeyVisible) {
            this.state.setWhichKeyVisible(false);
            return true;
        }
        // Escape must cancel an active turn even when an input/focus panel is
        // currently active; focus dismissal is only for idle consoles.
        if (raw === '\u001b' && this.isTurnInProgress()) {
            await this.interruptTurn();
            return true;
        }
        if (raw === '\u001b' && (this.state.selectMenu || this.state.isAnyFocusActive())) return false;
        if (raw === '\u001b') {
            const action = this.globalKeymap!.resolve('escape', this.resolveKeymapContext());
            if (action === 'interrupt-turn') {
                if (!this.isTurnInProgress()) return this.handleIdleEscape();
                await this.interruptTurn();
                return true;
            }
            if (!action) return false;
            await this.executeGlobalKeyAction(action);
            return true;
        }
        const key = this.decodeGlobalKey(raw);
        if (!key) {
            if (raw === '\u001b') this.globalKeyPending = '';
            return false;
        }
        if (this.state.whichKeyVisible && key !== 'ctrl+alt+k') {
            if (key === 'n') {
                this.state.setWhichKeyPage(this.state.whichKeyPage + 1);
                this.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'p') {
                this.state.setWhichKeyPage(this.state.whichKeyPage - 1);
                this.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'l' || key === 'L') {
                this.state.toggleWhichKeyLayout();
                this.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'f' || key === 'F') {
                this.state.toggleWhichKeyFilterCustom();
                this.refreshWhichKeyBindings();
                return true;
            }
            this.state.setWhichKeyVisible(false);
        }
        return this.handleGlobalKeySequence(key);
    }

    protected async handleGlobalKeySequence(key: string): Promise<boolean> {
        const sequence = this.globalKeyPending ? `${this.globalKeyPending} ${key}` : key;
        const context = this.resolveKeymapContext();
        const action = this.globalKeymap!.resolve(sequence, context);
        const isPrefix = Object.keys(this.globalKeymap!.effectiveBindings(context)).some(binding => binding.startsWith(`${sequence} `));
        if (isPrefix && !action) {
            this.globalKeyPending = sequence;
            return true;
        }
        if (this.globalKeyPending) {
            this.globalKeyPending = '';
            if (!action) return true;
        }
        if (!action) return false;
        if (isAgentConsoleThreadNavigationAction(action) && !this.canThreadNavigate()) return false;
        if (isAgentConsoleMessageNavigationAction(action) && !this.canMessageNavigate()) {
            const canEnterTranscript = action === 'message-page-up'
                && !this.state.hasMessageFocus()
                && !this.state.messageDetailOpen
                && !this.state.selectMenu;
            if (!canEnterTranscript) return false;
        }
        return await this.executeGlobalKeyAction(action);
    }

    protected async handleBrowserGlobalKeyInput(key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }): Promise<boolean> {
        const ctrlKey = !!(modifiers.ctrlKey || modifiers.metaKey);
        const altKey = !!modifiers.altKey;
        const rawKey = String(key || '').toLowerCase();
        // TUI raw mode delivers Ctrl+C as the ETX control character rather
        // than a `c` key with ctrlKey metadata.
        if (rawKey === '\u0003' && this.isTurnInProgress()) {
            await this.interruptTurn();
            return true;
        }
        const normalizedKey = ctrlKey
            ? (altKey ? `ctrl+alt+${rawKey}` : `ctrl+${rawKey}`)
            : /^f\d{1,2}$/.test(rawKey)
                ? (modifiers.shiftKey ? `shift+${rawKey}` : rawKey)
                : modifiers.shiftKey && /^[A-Z]$/.test(String(key || ''))
                    ? `shift+${rawKey}`
                    : rawKey;
        const arrowKeys: Record<string, string> = {
            arrowup: 'up',
            arrowdown: 'down',
            arrowleft: 'left',
            arrowright: 'right'
        };
        const navKeys: Record<string, string> = {
            pageup: 'pageup',
            pagedown: 'pagedown',
            home: 'home',
            end: 'end'
        };
        const functionKeys: Record<string, string> = {
            f1: 'f1', f2: 'f2', f3: 'f3', f4: 'f4',
            f5: 'f5', f6: 'f6', f7: 'f7', f8: 'f8',
            f9: 'f9', f10: 'f10', f11: 'f11', f12: 'f12',
            'shift+f1': 'shift+f1', 'shift+f2': 'shift+f2', 'shift+f3': 'shift+f3', 'shift+f4': 'shift+f4',
            'shift+f5': 'shift+f5', 'shift+f6': 'shift+f6', 'shift+f7': 'shift+f7', 'shift+f8': 'shift+f8',
            'shift+f9': 'shift+f9', 'shift+f10': 'shift+f10', 'shift+f11': 'shift+f11', 'shift+f12': 'shift+f12'
        };
        const mappedKey = arrowKeys[normalizedKey] || navKeys[normalizedKey] || functionKeys[normalizedKey] || normalizedKey;
        if (this.keymapRecording) {
            if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
                this.keymapRecording = undefined;
                this.notify('Keymap recording cancelled.');
                return true;
            }
            if (mappedKey) {
                const { context, action } = this.keymapRecording;
                this.keymapRecording = undefined;
                if (this.globalKeymap!.set(mappedKey, action, context)) {
                    await this.persistGlobalKeymap();
                    this.notify(`Keymap set: ${mappedKey} -> ${action} (${context}).`);
                } else {
                    this.notify(`Cannot bind ${mappedKey}: unknown action ${action}.`);
                }
            }
            return true;
        }
        if (this.state.hasCommandOutputsFocus()) {
            if (this.state.commandOutputsFilterMode) {
                if (!ctrlKey && normalizedKey === 'backspace') {
                    this.state.setCommandOutputsFilter(this.state.commandOutputsFilter.slice(0, -1));
                    return true;
                }
                if (!ctrlKey && normalizedKey === '/') {
                    this.state.commandOutputsFilterMode = false;
                    this.state.setCommandOutputsFilter('');
                    return true;
                }
                if (!ctrlKey && key.length === 1 && !/[\r\n]/.test(key)) {
                    this.state.setCommandOutputsFilter(`${this.state.commandOutputsFilter}${key}`);
                    return true;
                }
            }
            if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
                this.state.commandOutputsFilterMode = false;
                await this.state.dismissFocusLayer();
                return true;
            }
            if (!ctrlKey && mappedKey) {
                if (await this.state.handleFocusKey(mappedKey)) return true;
                if (key.length === 1) return true;
                return false;
            }
        }
        if (this.state.selectMenu?.title?.startsWith('Command palette')) {
            if (normalizedKey === 'ctrl+p') return this.handleGlobalKeySequence(normalizedKey);
            if (!ctrlKey && normalizedKey === 'backspace') {
                this.openCommandPalette(this.commandPaletteQuery.slice(0, -1));
                return true;
            }
            if (!ctrlKey && key.length === 1) {
                this.openCommandPalette(`${this.commandPaletteQuery}${key}`);
                return true;
            }
            return false;
        }
        if (this.state.whichKeyVisible) {
            if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
                this.state.setWhichKeyVisible(false);
                return true;
            }
            if (mappedKey && this.globalKeymap!.resolve(mappedKey, this.resolveKeymapContext()) !== 'which-key-toggle') {
                this.state.setWhichKeyVisible(false);
            }
        }
        // In a terminal, Ctrl+C is commonly configured as copy while idle,
        // but must act as an interrupt during an active turn. Keep the idle
        // binding untouched so copy continues to work.
        if (ctrlKey && rawKey === 'c' && this.isTurnInProgress()) {
            await this.interruptTurn();
            return true;
        }
        if (ctrlKey && rawKey === 'c') {
            // Raw-mode terminals do not emit SIGINT. Preserve the familiar
            // shell behaviour for an idle console; when text is selected the
            // terminal emulator consumes Ctrl+C for copy before this handler.
            void this.requestTerminalExit();
            return true;
        }
        if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey) && this.isTurnInProgress()) {
            await this.interruptTurn();
            return true;
        }
        if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey) && (this.state.selectMenu || this.state.isAnyFocusActive())) {
            this.globalKeyPending = '';
            return false;
        }
        if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
            const action = this.globalKeymap!.resolve('escape', this.resolveKeymapContext());
            if (action === 'interrupt-turn') {
                if (!this.isTurnInProgress()) return this.handleIdleEscape();
                await this.interruptTurn();
                return true;
            }
            if (!action) return false;
            await this.executeGlobalKeyAction(action);
            return true;
        }
        if (!ctrlKey && !arrowKeys[normalizedKey] && !navKeys[normalizedKey] && !functionKeys[normalizedKey] && key.length !== 1 && !this.globalKeyPending) return false;
        return this.handleGlobalKeySequence(mappedKey);
    }

    /**
     * P130 edit-last-message Esc state machine (G55/G70):
     * edit-active Esc dismisses (records target for step-back); idle double
     * Esc within the configured editEscapeWindowMs re-enters at the previous message, or
     * at the last editable user message when no dismissal is recent.
     */
    protected async handleIdleEscape(): Promise<boolean> {
        const now = Date.now();
        const withinWindow = now - this.lastEscapeAt <= this.state.consoleOptions.editEscapeWindowMs;
        this.lastEscapeAt = now;
        if (this.editTargetMessageId) {
            this.dismissEditMode();
            return true;
        }
        if (withinWindow) {
            this.lastEscapeAt = 0;
            await this.enterEditMode();
            return true;
        }
        return false;
    }

    protected getEditableUserMessages(): AgentMessage[] {
        return this.state.messages.filter(message =>
            message.role === 'user'
            && message.metadata?.kind !== 'steer'
            && !!String(message.content || '').trim()
        );
    }

    protected extractEditableMessageText(message: AgentMessage): string {
        const content = String(message?.content || '');
        const marker = '[Mention Context]';
        if (content.startsWith(marker)) {
            const separator = content.indexOf('\n\n', marker.length);
            if (separator >= 0) {
                return content.slice(separator + 2);
            }
        }
        return content;
    }

    protected getEditableImageParts(message: AgentMessage): Array<{ imageUrl: string; mediaType?: string; name?: string }> {
        const images: Array<{ imageUrl: string; mediaType?: string; name?: string }> = [];
        for (const part of message?.parts || []) {
            if (part?.type === 'image' && part?.imageUrl) {
                images.push({ imageUrl: part.imageUrl, mediaType: part.mediaType, name: part.name });
            }
        }
        return images;
    }

    private editCtx(): EditModeHandlerContext {
        return {
            state: this.state,
            notify: (message, duration) => this.notify(message, duration),
            editEscapeWindowMs: this.state.consoleOptions.editEscapeWindowMs,
            getEditableUserMessages: () => this.getEditableUserMessages(),
            extractEditableMessageText: target => this.extractEditableMessageText(target),
            getEditableImageParts: target => this.getEditableImageParts(target),
            getTargetMessageId: () => this.editTargetMessageId,
            setTargetMessageId: value => { this.editTargetMessageId = value; },
            getLastSessionMessageId: () => this.lastEditSessionMessageId,
            setLastSessionMessageId: value => { this.lastEditSessionMessageId = value; },
            getDismissedAt: () => this.editDismissedAt,
            setDismissedAt: value => { this.editDismissedAt = value; },
            getDraftBefore: () => this.editDraftBefore,
            setDraftBefore: value => { this.editDraftBefore = value; },
            getAttachmentsBefore: () => this.editAttachmentsBefore,
            setAttachmentsBefore: value => { this.editAttachmentsBefore = value; }
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
        if (action === 'command-palette') {
            this.openCommandPalette();
            return true;
        }
        if (action === 'interrupt-turn') {
            await this.interruptTurn();
            return true;
        }
        if (action === 'theme') {
            await this.handleCommand('/theme');
            return true;
        }
        if (action === 'toggle-thinking') {
            this.state.setShowThinking(!this.state.showThinking);
            this.notify(this.state.showThinking ? 'Showing reasoning messages.' : 'Hiding reasoning messages.');
            return true;
        }
        if (action === 'open-editor') {
            await this.runEditorCommand();
            return true;
        }
        if (action === 'thread-child-first') {
            return this.navigateThreadChildFirst();
        }
        if (action === 'thread-cycle-next') {
            return this.navigateThreadCycle(1);
        }
        if (action === 'thread-cycle-prev') {
            return this.navigateThreadCycle(-1);
        }
        if (action === 'thread-parent') {
            return this.navigateThreadParent();
        }
        if (action === 'message-page-up') {
            if (!this.state.hasMessageFocus()) {
                return this.state.focusLatestLongMessage();
            }
            this.state.moveMessageSelectionPage(-1);
            return true;
        }
        if (action === 'message-page-down') {
            this.state.moveMessageSelectionPage(1);
            return true;
        }
        if (action === 'message-half-page-up') {
            this.state.moveMessageSelectionPage(-1, Math.max(1, Math.floor(this.state.consoleOptions.messageSelectionPageSize / 2)));
            return true;
        }
        if (action === 'message-half-page-down') {
            this.state.moveMessageSelectionPage(1, Math.max(1, Math.floor(this.state.consoleOptions.messageSelectionPageSize / 2)));
            return true;
        }
        if (action === 'message-line-up') {
            this.state.moveMessageSelectionPage(-1, 1);
            return true;
        }
        if (action === 'message-line-down') {
            this.state.moveMessageSelectionPage(1, 1);
            return true;
        }
        if (action === 'message-first') {
            this.state.selectFirstMessage();
            return true;
        }
        if (action === 'message-last') {
            this.state.selectLastMessage();
            return true;
        }
        if (action === 'message-last-user') {
            this.state.selectLastUserMessage();
            return true;
        }
        if (action === 'model-favorite-toggle') {
            await this.toggleModelFavorite();
            return true;
        }
        if (action === 'model-cycle-recent') {
            await this.cycleRecentModel(1);
            return true;
        }
        if (action === 'model-cycle-recent-back') {
            await this.cycleRecentModel(-1);
            return true;
        }
        if (action === 'model-variant-cycle') {
            await this.cycleModelVariant();
            return true;
        }
        if (action === 'which-key-toggle') {
            this.toggleWhichKeyOverlay();
            return true;
        }
        if (action === 'which-key-layout-toggle') {
            this.state.toggleWhichKeyLayout();
            if (this.state.whichKeyVisible) {
                this.refreshWhichKeyBindings();
            }
            return true;
        }
        if (action === 'which-key-pending-toggle') {
            this.state.toggleWhichKeyFilterCustom();
            if (this.state.whichKeyVisible) {
                this.refreshWhichKeyBindings();
            }
            return true;
        }
        if (action === 'status-health') {
            await this.toggleHealthPopover();
            return true;
        }
        if (action === 'timeline-mode') {
            await this.runTimelineModeCommand();
            return true;
        }
        if (action === 'queue-follow-up') {
            return this.queueDraft();
        }
        if (action === 'clear-scrollback') {
            return this.clearScrollback();
        }
        const commands: Record<Exclude<AgentConsoleGlobalAction, 'command-palette' | 'theme' | 'interrupt-turn' | 'toggle-thinking' | 'open-editor' | 'thread-child-first' | 'thread-cycle-next' | 'thread-cycle-prev' | 'thread-parent' | 'message-page-up' | 'message-page-down' | 'message-half-page-up' | 'message-half-page-down' | 'message-line-up' | 'message-line-down' | 'message-first' | 'message-last' | 'message-last-user' | 'model-favorite-toggle' | 'model-cycle-recent' | 'model-cycle-recent-back' | 'model-variant-cycle' | 'which-key-toggle' | 'which-key-layout-toggle' | 'which-key-pending-toggle' | 'status-health' | 'timeline-mode' | 'queue-follow-up' | 'clear-scrollback'>, string> = {
            'new-session': '/new',
            compact: '/compact',
            export: '/export',
            undo: '/undo',
            redo: '/redo',
            sessions: '/sessions',
            model: '/model',
            archetypes: '/archetype',
            status: '/status',
            copy: '/copy',
            'command-outputs': '/outputs'
        };
        await this.handleCommand(commands[action]);
        return true;
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
        this.commandPaletteQuery = query;
        const commands = this.state.commandHints
            .filter(command => fuzzyMatchAgentConsoleCommand(command, query))
            .map(command => {
                const definition = getAgentConsoleCommandDefinition(command);
                const form = formatAgentConsoleCommandArgumentForm(definition);
                return {
                    label: command,
                    value: command,
                    description: [
                        resolveAgentConsoleCommandDescription(command) || 'command',
                        formatAgentConsoleCommandArgumentTemplate(definition)
                    ].filter(Boolean).join(' '),
                    detail: form.length ? form.join('\n') : undefined
                };
            });
        this.state.openSelectMenu(query ? `${AGENT_CONSOLE_OVERLAY_TITLES.palette}: ${query}` : AGENT_CONSOLE_OVERLAY_TITLES.palette, commands, 0, AGENT_CONSOLE_OVERLAY_HINTS.palette);
        this.state.selectMenuAction = async value => {
            this.commandPaletteQuery = '';
            if (value) await this.handleCommand(value);
        };
    }

    protected async handleCommandPaletteInput(decoded: TerminalInputSequenceResult, raw: string): Promise<boolean> {
        if (!this.state.selectMenu?.title?.startsWith('Command palette')) return false;
        if ((decoded.controlKey as string | undefined) === 'backspace' || raw === '\u007f' || raw === '\b') {
            this.openCommandPalette(this.commandPaletteQuery.slice(0, -1));
            return true;
        }
        if (decoded.controlKey || raw === '\u001b' || raw === '\r' || raw === '\n') return false;
        if (raw && !/[\u0000-\u001f\u007f]/.test(raw)) {
            this.openCommandPalette(`${this.commandPaletteQuery}${raw}`);
            return true;
        }
        return false;
    }

    async handleTerminalInput(
        decoded: TerminalInputSequenceResult,
        chunk: ConsoleTextChunk
    ): Promise<void> {
        if (this.closing) {
            return;
        }
        this.syncConsoleMessageDetailViewport();
        if (decoded.mouse) {
            this.dispatchTerminalMouseAt(decoded.mouse);
            return;
        }
        if (decoded.partial) {
            return;
        }
        this.surfaceAccessor?.notifyNonMouseInput?.();
        if (this.state.isSshShellActive && this.sshShell) {
            const raw = typeof chunk === 'string' ? chunk : chunk.toString();
            if (raw === SSH_SHELL_DETACH_SEQUENCE) {
                await this.detachSshShell('detached');
                return;
            }
            this.sshShell.write(raw);
            return;
        }
        const rawChunk = typeof chunk === 'string' ? chunk : chunk.toString();
        if (await this.handleCommandPaletteInput(decoded, rawChunk)) {
            return;
        }
        if (await this.handleGlobalKeyInput(rawChunk)) {
            return;
        }
        if (this.state.vimMode && !this.state.isAnyFocusActive() && this.state.inputMode === 'normal') {
            const raw = typeof chunk === 'string' ? chunk : chunk.toString();
            if (decoded.controlKey === 'return') {
                return;
            }
            if (!decoded.controlKey && raw && raw !== '\u001b' && !/[\u0000-\u001f\u007f]/.test(raw)) {
                this.state.handleVimKey(raw);
                return;
            }
        }
        const submitOnEnter = /[\r\n]/.test(rawChunk);
        const outcome = await this.state.processDecodedInput(decoded, chunk, {
            isClosed: this.destroyed,
            onExit: () => {
                void this.requestTerminalExit(this.closingSessionMessage());
            },
            hasActiveTextPrompt: false,
            lastRenderedLines: this.getTerminalRenderedLines()
        });
        if (!outcome.handled && decoded.text) {
            await this.state.processRawChunk(decoded.text, {
                submitOnEnter,
                hasSelectMenu: !!this.state.selectMenu
            });
            return;
        }
        switch (outcome.action) {
            case 'submit':
                // Keep terminal input dispatch available while the turn runs so
                // Esc/Ctrl+C can reach the cancellation path immediately.
                void this.submit();
                return;
            case 'cancelTurn':
                if (this.isTurnInProgress()) {
                    const cancelled = await this.sessionService?.cancelTurn(this.state.sessionId) ?? false;
                    this.notify(cancelled
                        ? 'Cancelling current turn...'
                        : 'No running turn to cancel.');
                }
                return;
            case 'queueDraft':
                this.queueDraft();
                return;
            case 'textInput':
                await this.state.processRawChunk(rawChunk, {
                    submitOnEnter,
                    hasSelectMenu: !!this.state.selectMenu
                });
                return;
            case 'draftNavigation':
                switch (outcome.value) {
                    case 'left':
                        this.state.moveInputCursor(-1);
                        return;
                    case 'right':
                        this.state.moveInputCursor(1);
                        return;
                    case 'home':
                        this.state.moveInputCursorToEdge('start');
                        return;
                    case 'end':
                        this.state.moveInputCursorToEdge('end');
                        return;
                    default:
                        return;
                }
            case 'altNewline':
                await this.state.processRawChunk('\n', {
                    submitOnEnter: false,
                    altKey: true,
                    hasSelectMenu: !!this.state.selectMenu
                });
                return;
            default:
                return;
        }
    }

    protected async requestTerminalExit(message?: string): Promise<void> {
        const exitMessage = String(message || '').trim();
        if (this.closing) {
            return;
        }
        this.closing = true;
        if (!this.app) {
            if (exitMessage) {
                this.notify(exitMessage);
            }
            this.surfaceAccessor?.stopTerminal?.();
            return;
        }
        this.surfaceAccessor?.stopTerminal?.();
        const rawWriter = this.surfaceAccessor?.writeRawTerminalData;
        const wroteExitMessage = !!exitMessage && typeof rawWriter === 'function';
        if (wroteExitMessage) {
            rawWriter.call(this.surfaceAccessor, `${exitMessage}\n`);
        }
        try {
            await this.app.close();
        } catch {
            // Teardown must not surface as an unhandled rejection: the Ctrl+C
            // path invokes this fire-and-forget, and /exit awaits it. The core
            // destroy() fix guarantees super.destroy() (component onDestroy:
            // terminal restore + history persist) still runs even when a
            // @Shutdown handler throws during runners.stop().
        }
        if (exitMessage && !wroteExitMessage && typeof globalThis.console?.log === 'function') {
            globalThis.console.log(exitMessage);
        }
    }

    protected closingSessionMessage(): string {
        const translated = this.translator?.translate('agent.session.closing', {
            sessionId: this.state.sessionId
        });
        if (translated && translated !== 'agent.session.closing') {
            return translated;
        }
        return formatAgentUiSessionClosingMessage(this.translator?.currentLocale, this.state.sessionId);
    }

    /** Keep the console detail page proportional to the active terminal. */
    protected syncConsoleMessageDetailViewport(): void {
        if (this.state.consoleOptions.messageToggleInteraction !== 'enter') {
            return;
        }
        const rows = this.surfaceAccessor?.getTerminalSize?.().rows;
        if (!Number.isFinite(rows)) {
            return;
        }
        const visibleLines = Math.max(8, Math.min(40, Math.floor(Number(rows)) - 6));
        if (this.state.messageDetailVisibleLines !== visibleLines) {
            this.state.setMessageDetailVisibleLines(visibleLines);
        }
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
        const sessionId = this.state.sessionId;
        const mode = String(args || '').trim().toLowerCase();
        const modes = ['disabled', 'explicit', 'proactive'];
        try {
            if (!mode || mode === 'default') {
                if (mode === 'default') {
                    if (this.appRpc) {
                        await this.appRpc.request('session.delegation_mode.set', { sessionId, mode: 'default' }, this.rpcRequestContext());
                    } else {
                        this.runtime.setSessionDelegationMode(sessionId, null);
                    }
                    this.notify('Delegation mode reset to the configured default.');
                    return;
                }
                const current = await this.getSessionDelegationMode(sessionId);
                this.notify(`Delegation mode: ${current}. Valid modes: ${modes.join(' | ')}.`);
                return;
            }
            if (!modes.includes(mode)) {
                this.notify(`Invalid delegation mode "${mode}". Valid modes: ${modes.join(' | ')}.`);
                return;
            }
            if (this.appRpc) {
                await this.appRpc.request('session.delegation_mode.set', { sessionId, mode }, this.rpcRequestContext());
            } else {
                this.runtime.setSessionDelegationMode(sessionId, mode as import('@tsdi/agent').AgentDelegationMode);
            }
            this.notify(`Session ${sessionId} delegation mode set to "${mode}".`);
        } catch (error) {
            this.notify(`Failed to set delegation mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runVimCommand(args: string): Promise<void> {
        return runVimCommand(args, this.state, (message: string) => this.notify(message));
    }

    protected resolveKeymapContext(): AgentConsoleKeymapContext {
        if (this.state.hasApprovalFocus()) return 'approval';
        if (this.state.hasMessageFocus() || this.state.hasMessageDetailFocus() || this.state.hasTextOverlayFocus()) return 'pager';
        if (this.state.hasSessionFocus() || this.state.hasTaskFocus() || this.state.hasScheduledJobFocus()
            || this.state.hasToolFocus() || this.state.hasBlockingSelectMenu()) return 'list';
        if (this.state.inputFocused && !this.state.isAnyFocusActive()) return 'composer';
        return 'global';
    }

    protected async runKeymapCommand(args: string): Promise<void> {
        const rawTokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        const first = (rawTokens[0] || '').toLowerCase();
        const isScopeToken = ['global', 'vim', 'composer', 'list', 'approval', 'pager'].includes(first);
        const scope = isScopeToken && (rawTokens.length > 1 || first !== 'list')
            ? rawTokens.shift()!.toLowerCase()
            : '';
        const context: AgentConsoleKeymapContext = isAgentConsoleKeymapContext(scope) ? scope : 'global';
        const tokens = rawTokens;
        const action = (tokens[0] || 'list').toLowerCase();
        if (action === 'list') {
            const globalEntries = Object.entries(this.globalKeymap!.effectiveBindings(context)).map(([key, value]) => `${key} -> ${value}`);
            const vimEntries = Object.entries(this.state.effectiveVimBindings).map(([key, value]) => `vim:${key} -> ${value}`);
            const entries = [...(scope === 'vim' ? [] : globalEntries), ...(scope === '' || scope === 'vim' ? vimEntries : [])];
            if (!entries.length) {
                this.notify('No key bindings.');
                return;
            }
            this.state.openTextOverlay(scope ? `keymap ${scope}` : 'keymap', entries);
            return;
        }
        if (action === 'set') {
            const key = tokens[1];
            const target = tokens[2];
            if (!key || !target) {
                this.notify('Usage: /keymap [global|composer|list|approval|pager|vim] set <key> <action>');
                return;
            }
            if (scope !== 'vim' && isAgentConsoleGlobalAction(target) && this.globalKeymap!.set(key, target, context)) {
                await this.persistGlobalKeymap();
                const conflicts = this.globalKeymap!.conflicts(key, target, context);
                const conflictText = conflicts.length
                    ? `  conflicts with ${conflicts.map(({ context: c, action: a }) => `${c}:${a}`).join(', ')}`
                    : '';
                this.notify(`Keymap set: ${key} -> ${target}${conflictText}`);
                return;
            }
            if ((scope === 'vim' || scope === '') && isConsoleVimAction(target) && this.state.setVimBinding(key, target)) {
                this.notify(`Vim keymap set: ${key} -> ${target}`);
                return;
            }
            this.notify(`Unknown keymap action: ${target}  (global: ${AGENT_CONSOLE_GLOBAL_ACTIONS.join(', ')}; vim: ${VIM_ACTION_NAMES.join(', ')})`);
            return;
        }
        if (action === 'unset') {
            const key = tokens[1];
            if (!key) {
                this.notify('Usage: /keymap [global|composer|list|approval|pager|vim] unset <key>');
                return;
            }
            if (scope !== 'vim' && this.globalKeymap!.unset(key, context)) {
                await this.persistGlobalKeymap();
                this.notify(`${context === 'global' ? 'Global' : context} keymap unset: ${key}`);
                return;
            }
            if ((scope === 'vim' || scope === '') && this.state.unsetVimBinding(key)) {
                this.notify(`Vim keymap unset: ${key} (default restored if any)`);
                return;
            }
            this.notify(`No binding for key: ${key}`);
            return;
        }
        if (action === 'reset') {
            if (scope === '' || scope === 'vim') this.state.resetVimBindings();
            if (scope === '' || scope === 'global' || isAgentConsoleKeymapContext(scope)) {
                this.globalKeymap!.reset(scope === '' ? undefined : context);
                await this.persistGlobalKeymap();
            }
            this.notify('Keymap reset to defaults.');
            return;
        }
        if (action === 'record') {
            const target = tokens[1];
            if (!target) {
                this.notify('Usage: /keymap [global|composer|list|approval|pager|vim] record <action>');
                return;
            }
            if (scope === 'vim' || !isAgentConsoleGlobalAction(target)) {
                this.notify(`Unknown keymap action: ${target}  (global: ${AGENT_CONSOLE_GLOBAL_ACTIONS.join(', ')})`);
                return;
            }
            this.keymapRecording = { context, action: target };
            this.notify(`Recording key for ${target} (${context}) — press a key now, Esc to cancel.`);
            return;
        }
        this.notify('Usage: /keymap [global|composer|list|approval|pager|vim] [list|set <key> <action>|unset <key>|reset|record <action>]');
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
        const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        if (!tokens.length || tokens[0].toLowerCase() === 'status') {
            await this.showSandboxCapabilities();
            return;
        }
        const area = tokens[0].toLowerCase();
        if (area === 'readonly' || area === 'plan') {
            await this.runPlanCommand(tokens.slice(1).join(' '));
            return;
        }
        if (area !== 'sandbox') {
            this.notify('Usage: /permissions [readonly on|off] | [sandbox default|off|workspace|network-block]');
            return;
        }

        const rawMode = String(tokens[1] || '').trim().toLowerCase();
        if (!rawMode) {
            const mode = await this.getSessionSandboxMode(this.state.sessionId);
            this.notify(`Sandbox mode ${mode}.`);
            return;
        }
        if (!['default', 'off', 'workspace', 'network-block'].includes(rawMode)) {
            this.notify('Sandbox mode must be one of: default, off, workspace, network-block.');
            return;
        }
        try {
            await this.setSessionSandboxMode(this.state.sessionId, rawMode === 'default' ? null : rawMode as SandboxMode);
            this.notify(`Sandbox mode set to ${rawMode}.`);
        } catch (error) {
            this.notify(`Failed to set sandbox mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async showSandboxCapabilities(): Promise<void> {
        const platform = (globalThis as { process?: { platform?: string } }).process?.platform;
        const probe = await detectSandboxExecTool(platform);
        const proxy = this.options?.sandbox?.proxy;
        const capabilities = describeSandboxCapabilities(platform, probe, !!(proxy?.http || proxy?.https));
        const mode = await this.getSessionSandboxMode(this.state.sessionId).catch(() => 'default');
        const lines = [`sandbox ${mode} · ${platform || 'unknown'} · ${probe.tool || 'process fallback'}`];
        for (const item of capabilities) {
            lines.push(`${item.capability} ${item.supported ? 'supported' : 'degraded'} · ${item.enforcement}`);
        }
        if (proxy?.required) {
            lines.push(`proxy required · ${proxy.http || proxy.https ? 'configured' : 'missing'}`);
        }
        this.notify(lines.join('\n'));
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
        const sessionId = this.state.sessionId;
        const [command = 'show', ...rest] = String(args || '').trim().split(/\s+/);
        try {
            if (command === 'create') {
                const parts = rest.join(' ').split('|').map(item => item.trim());
                if (parts.length < 2 || !parts[0] || !parts[1]) { this.notify('Usage: /goal create <title> | <objective> | criterion 1; criterion 2'); return; }
                const input = { title: parts[0], objective: parts[1], successCriteria: (parts[2] || '').split(';').map(item => item.trim()).filter(Boolean) };
                const goal = this.appRpc ? await this.appRpc.request('goal.create', { sessionId, ...input }, this.rpcRequestContext()) : await this.runtime.createGoal(input, sessionId);
                this.notify(`Goal ${goal.id} created: ${goal.title}`); return;
            }
            if (command === 'list') {
                const goals = this.appRpc ? await this.appRpc.request('goal.list', {}, this.rpcRequestContext()) : await this.runtime.listGoals();
                this.notify(goals.length ? goals.map((goal: any) => `${goal.id} [${goal.status}] ${goal.title}`).join('\n') : 'No goals.'); return;
            }
            if (command === 'link') {
                const goalId = rest[0]; if (!goalId) { this.notify('Usage: /goal link <goalId>'); return; }
                if (this.appRpc) await this.appRpc.request('goal.link', { sessionId, goalId }, this.rpcRequestContext()); else await this.runtime.linkSessionGoal(sessionId, goalId);
                this.notify(`Goal ${goalId} linked.`); return;
            }
            if (command === 'complete' || command === 'reopen') {
                const goal = this.appRpc ? await this.appRpc.request(`goal.${command}`, { sessionId, goalId: rest[0] }, this.rpcRequestContext()) : await (async () => {
                    const linked = rest[0] ? await this.runtime.getGoal(rest[0]) : await this.runtime.getSessionGoal(sessionId);
                    if (!linked) throw new Error('No goal linked to this session.');
                    return this.runtime.updateGoal(linked.id, { status: command === 'complete' ? 'completed' : 'active' });
                })();
                this.notify(`Goal ${goal.id} is ${goal.status}.`); return;
            }
            const goal = this.appRpc ? await this.appRpc.request('goal.get', { sessionId, goalId: command === 'show' ? rest[0] : command }, this.rpcRequestContext()) : await (command === 'show' ? (rest[0] ? this.runtime.getGoal(rest[0]) : this.runtime.getSessionGoal(sessionId)) : this.runtime.getGoal(command));
            this.notify(goal ? `${goal.id} [${goal.status}] ${goal.title}\n${goal.objective}\n${goal.successCriteria.map((item: string) => `- ${item}`).join('\n')}` : 'No goal linked to this session.');
        } catch (error) { this.notify(`Goal command failed: ${error instanceof Error ? error.message : String(error)}`); }
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
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            this.notify('No current session for git snapshots.');
            return;
        }
        const parts = args.split(/\s+/).filter(Boolean);
        const operation = parts[0] || 'list';
        const ref = parts[1] || '';
        if (operation === 'revert' || operation === 'restore') {
            if (!ref) {
                this.notify('Usage: /git-snapshots revert <messageId>');
                return;
            }
            const confirmed = await this.select(
                `Revert working tree to snapshot of message ${ref}?`,
                [
                    { label: 'revert', value: 'yes', detail: 'restore the working tree from this snapshot' },
                    { label: 'cancel', value: 'no', detail: 'keep the current working tree' }
                ],
                1,
                this.state.consoleOptions.selectHint
            );
            if (confirmed !== 'yes') {
                return;
            }
            const result = await this.sessionService.revertGitStepSnapshot(sessionId, ref);
            if (result?.reverted === true) {
                this.notify(`Working tree reverted to snapshot of message ${ref}. Use /git-snapshots unrevert to restore.`);
            } else {
                this.notify(`Revert failed: ${String(result?.error || 'unknown error')}`);
            }
            return;
        }
        if (operation === 'unrevert') {
            const confirmed = await this.select(
                'Restore the working tree captured before the last git revert?',
                [
                    { label: 'unrevert', value: 'yes', detail: 'restore the working tree' },
                    { label: 'cancel', value: 'no', detail: 'keep the reverted working tree' }
                ],
                1,
                this.state.consoleOptions.selectHint
            );
            if (confirmed !== 'yes') {
                return;
            }
            const result = await this.sessionService.unrevertGitStepSnapshot(sessionId);
            if (result?.reverted === true) {
                this.notify('Working tree restored after last git revert.');
            } else {
                this.notify(`Unrevert failed: ${String(result?.error || 'unknown error')}`);
            }
            return;
        }
        if (operation === 'diff') {
            if (!ref) {
                this.notify('Usage: /git-snapshots diff <messageId|snapshotId>');
                return;
            }
            await this.openGitSnapshotDiff(ref);
            return;
        }
        if (operation !== 'list') {
            this.notify('Usage: /git-snapshots [list|diff <ref>|revert <messageId>|unrevert]');
            return;
        }
        await this.openGitSnapshotList();
    }

    protected async openGitSnapshotList(): Promise<void> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            this.notify('No current session for git snapshots.');
            return;
        }
        const snapshots = await this.sessionService.listGitStepSnapshots(sessionId);
        if (!snapshots.length) {
            this.notify('No git step snapshots for the current session. Run an agent turn in a git workspace first.');
            return;
        }
        const choice = await this.select(
            `Git step snapshots (${snapshots.length})`,
            snapshots.map((snapshot, index) => {
                const label = String(snapshot.label || snapshot.messageId || `snapshot-${index + 1}`).trim();
                const createdAt = snapshot.timestamp ? ` · ${new Date(snapshot.timestamp).toLocaleString()}` : '';
                const ds = snapshot.diffStats;
                const diffLabel = ds ? ` · +${ds.totalAdditions}/-${ds.totalDeletions} (${ds.filesChanged} file${ds.filesChanged === 1 ? '' : 's'})` : '';
                return {
                    label: `${label}${createdAt}${diffLabel}`,
                    value: String(snapshot.messageId || snapshot.id || index),
                    detail: String(snapshot.id || '')
                };
            }),
            0,
            this.state.consoleOptions.selectHint
        );
        if (!choice) {
            return;
        }
        await this.openGitSnapshotDiff(choice);
    }

    protected async openGitSnapshotDiff(ref: string): Promise<void> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            this.notify('No current session for git snapshot diff.');
            return;
        }
        const diff = await this.sessionService.diffGitStepSnapshot(sessionId, ref);
        if (!diff) {
            this.notify(`No git step snapshot found for ${ref}.`);
            return;
        }
        const lines = this.buildGitSnapshotDiffLines(diff);
        if (!lines.length) {
            this.notify(`Snapshot ${ref} has no working tree changes to show.`);
            return;
        }
        const fileCount = Array.isArray(diff.files) ? diff.files.length : 0;
        this.state.closeReview();
        this.state.openGitSnapshotDetail(
            `git snapshot ${ref}`,
            lines,
            [`ref ${ref}`, fileCount ? `files ${fileCount}` : 'files -'].join(' · '),
            ref
        );
    }

    protected async revertGitSnapshotFromDetail(): Promise<void> {
        const ref = this.state.gitSnapshotCurrentRef;
        const sessionId = this.state.sessionId;
        if (!ref || !sessionId || !this.sessionService) {
            this.notify('No git snapshot selected for revert.');
            return;
        }
        const confirmed = await this.select(
            `Revert working tree to snapshot ${ref}?`,
            [
                { label: 'revert', value: 'yes', detail: 'restore the working tree from this snapshot' },
                { label: 'cancel', value: 'no', detail: 'keep the current working tree' }
            ],
            1,
            this.state.consoleOptions.selectHint
        );
        if (confirmed !== 'yes') {
            return;
        }
        const result = await this.sessionService.revertGitStepSnapshot(sessionId, ref);
        if (result?.reverted === true) {
            this.notify(`Working tree reverted to snapshot ${ref}. Use /git-snapshots unrevert to restore.`);
            this.state.closeGitSnapshotDetail();
        } else {
            this.notify(`Revert failed: ${String(result?.error || 'unknown error')}`);
        }
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
        const definitions = await this.loadTools(sessionId);
        if (!definitions.length) {
            if (sessionId === this.state.sessionId) {
                this.state.setTools([]);
            }
            return;
        }
        const tools = await Promise.all(definitions.map(async def => {
            const active = this.appRpc
                ? def.activation?.activated ?? true
                : this.toolRegistry && typeof this.toolRegistry.isToolActive === 'function'
                ? await this.toolRegistry.isToolActive(sessionId, def.name)
                : def.activation?.activated ?? true;
            return this.state.toToolItem(def, active);
        }));
        tools.sort((a, b) => a.name.localeCompare(b.name));
        if (sessionId !== this.state.sessionId) {
            return;
        }
        this.state.setTools(tools);
    }

}
