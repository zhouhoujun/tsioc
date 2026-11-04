import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import {
    ConsoleTextChunk,
    ConsoleTextInputChunkOptions,
    ConsoleTextInputChunkResult,
    DEFAULT_TERMINAL_COLUMNS
} from './console-ports';
import { projectTimelineContent } from './AgentConsoleTimelineProjection';
import { resolveDisplayMessages, resolveSessionFooter, resolveSessionHeader } from './AgentConsoleMessageProjection';
import { AgentMessage, AgentSessionSection, AgentSessionSectionInfo, AgentToolDefinition, ScheduledAgentTask, ContextPreparationReport, TimelineEntry, sortTimelineEntries, NavEntityType, NavFilter, NavSelection, NavTree, applyNavFilter, flattenNav, navigateCursor, resolveNavSelection, ThreadItemEvent, ThreadItemKind, ThreadItemStatus, normalizeThreadItemEvent, CommandExchangeRecord, compareCommandExchangeAsc, DEFAULT_RENDER_POLICY, HarnessProjection } from '@tsdi/agent';
import type { BackgroundTaskRecord } from '@tsdi/agent-tools';
import {
    AgentConsoleTheme,
    AgentConsoleThemeInput,
    AgentConsoleThemeStyles,
    agentConsoleThemeNames,
    defaultAgentConsoleTheme,
    mergeAgentConsoleTheme,
    resolveAgentConsoleThemeStyles
} from './AgentConsoleTheme';
import {
    AgentConsoleStatuslineField,
    defaultAgentConsoleStatusline
} from './AgentConsoleStatusline';
import {
    AgentConsoleCommandExecution,
    COMMAND_EXECUTION_CONTROL,
    CommandExecutionControlPort,
    AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP
} from '@tsdi/agent';
import {
    AgentConsoleCommandOutputHistoryEntry,
    CommandOutputStore,
    redactCommandOutputSecret
} from './AgentConsoleCommandOutputHistory';
import { AgentConsoleOverlayController } from './AgentConsoleOverlay';
import {
    AgentConsoleTitleField,
    composeAgentConsoleTerminalTitle,
    defaultAgentConsoleTitle
} from './AgentConsoleTitle';
import {
    AgentConsoleMentionCatalogItem,
    AgentConsoleWorkspaceMentionResolver
} from './AgentConsoleWorkspaceMentions';
import { AgentConsoleMessageStatusLabels } from './AgentConsoleMessageRenderers';
import { normalizeMessageLayout, resolveFinalAssistantMessageId } from './AgentConsoleViewport';
import { resolveTranscriptLayout, trackMessagesNewCount } from './AgentConsoleTranscriptLayout';
import { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import {
    AgentConsoleTimelineLabels,
    DEFAULT_TIMELINE_LABELS,
    EN_TIMELINE_LABELS,
    fillTimelineLabel,
    formatTimelineClockTime,
    formatTimelineSessionDuration,
    isError,
    TimelineWindowMessage,
    truncateTimelineRowText
} from './AgentConsoleTimelineWindow';
import { formatAgentUiLabel, formatAgentUiNotice } from './agent-ui.i18n';
import { formatReviewGroupMeta } from './AgentConsoleReviewPanelFormat';
import { formatTimelineEventInspectorLines } from './AgentConsoleTimelineEventInspector';
import {
    AGENT_CONSOLE_SUGGESTIONS_HINT,
    AGENT_CONSOLE_SUGGESTIONS_TITLE,
    applyAgentConsoleSuggestion,
    getAgentConsoleArgumentRange,
    getAgentConsoleInputTokenRange,
    getAgentConsoleMentionCandidates,
    isAgentConsoleSuggestionMenu,
    resolveAgentConsoleInputSuggestions,
} from './AgentConsoleSuggestions';
import { resolveDynamicArgumentValues } from './AgentConsoleArgumentValues';
import {
    AGENT_CONSOLE_OVERLAY_HINTS,
    AGENT_CONSOLE_OVERLAY_TITLES,
} from './AgentConsoleOverlayPresenter';
import { findTimelineLifecycleMessageIndex, isTerminalUiEventStatus, shouldApplyTimelineLifecycleUpdate } from './AgentConsoleTimelineLifecycle';
import { projectAgentConsoleArtifactMainline, projectAgentConsoleConversationMainline, projectAgentConsoleDecisionMainline, projectAgentConsoleDiagnosticMainline, projectAgentConsoleExecutionMainline, projectAgentConsoleTimelineDurations } from './AgentConsoleSessionContentPresenter';
import {
    VIM_DEFAULT_BINDINGS,
    isConsoleVimAction,
    resolveConsoleVimKey,
    ConsoleInputMode
} from './AgentConsoleVim';
import { AgentConsoleVimController, createAgentConsoleVimController } from './AgentConsoleVimController';
import {
    clampCommonTextCursor,
    processCommonTextInputChunk
} from '@tsdi/components/common';
import { agentConsoleAllCommandHints, agentConsoleCommandHints, getAgentConsoleCommandDefinition } from './AgentConsoleCommandRegistry';
import { AgentConsoleInputHistoryController, DefaultAgentConsoleInputHistoryController } from './AgentConsoleInputHistory';
import { AgentConsoleFocusLayers, DefaultAgentConsoleFocusLayers } from './AgentConsoleFocusLayers';
import { AgentConsoleCommandExecutionController, DefaultAgentConsoleCommandExecutionController } from './AgentConsoleCommandExecutionState';
import { appendPendingAttachment as appendPendingAttachmentInState, clearPendingAttachments as clearPendingAttachmentsInState, moveInputCursor as moveInputCursorInState, moveInputCursorToEdge as moveInputCursorToEdgeInState, setInput as setInputInState, setInputCursor as setInputCursorInState, setInputPlaceholder as setInputPlaceholderInState, setMessagesFocused as setMessagesFocusedInState, setPendingAttachments as setPendingAttachmentsInState, setPlanNudgesEnabled as setPlanNudgesEnabledInState, setTranscriptFollowProvider as setTranscriptFollowProviderInState, syncTranscriptFollowing as syncTranscriptFollowingInState } from './AgentConsoleInputState';
import { closeCommandOutputs as closeCommandOutputsInState, closeTextOverlay as closeTextOverlayInState, copySelectedCommandOutput as copySelectedCommandOutputInState, hasCommandOutputsFocus as hasCommandOutputsFocusInState, hasTextOverlayFocus as hasTextOverlayFocusInState, loadCommandOutputHistory as loadCommandOutputHistoryInState, moveCommandOutputSelection as moveCommandOutputSelectionInState, openCommandOutputs as openCommandOutputsInState, openTextOverlay as openTextOverlayInState, persistCommandOutput as persistCommandOutputInState, pushCommandOutput as pushCommandOutputInState, scrollCommandOutputsPage as scrollCommandOutputsPageInState, scrollCommandOutputsToEdge as scrollCommandOutputsToEdgeInState, scrollTextOverlay as scrollTextOverlayInState, scrollTextOverlayPage as scrollTextOverlayPageInState, scrollTextOverlayToEdge as scrollTextOverlayToEdgeInState, setCommandOutputStore as setCommandOutputStoreInState, setCommandOutputsFilter as setCommandOutputsFilterInState, setNotice as setNoticeInState, toggleCommandOutputs as toggleCommandOutputsInState } from './AgentConsoleOverlayState';
import { acceptSelectMenu as acceptSelectMenuInState, acceptSelectMenuIndex as acceptSelectMenuIndexInState, cancelSelectMenu as cancelSelectMenuInState, chooseSelectMenuIndex as chooseSelectMenuIndexInState, closeSelectMenu as closeSelectMenuInState, completeSelectMenu as completeSelectMenuInState, confirmSelectMenu as confirmSelectMenuInState, confirmSelectMenuAndKeepOpen as confirmSelectMenuAndKeepOpenInState, dismissSelectMenuLayer as dismissSelectMenuLayerInState, isArgumentSuggestionMenu as isArgumentSuggestionMenuInState, moveSelectMenu as moveSelectMenuInState, moveSelectMenuPage as moveSelectMenuPageInState, moveSelectMenuToEdge as moveSelectMenuToEdgeInState, openSelectMenu as openSelectMenuInState, openSubSelectMenu as openSubSelectMenuInState, resolveSelectMenu as resolveSelectMenuInState, resolveSelectedSelectMenuOption, selectAsync as selectAsyncInState, setSelectMenuIndex as setSelectMenuIndexInState, shouldSubmitConfirmedSelectMenuValue as shouldSubmitConfirmedSelectMenuValueInState } from './AgentConsoleSelectMenuState';
import { appendAssistantErrorMessage as appendAssistantErrorMessageInState, appendUiEventMessage as appendUiEventMessageInState, clearUiEventMessages as clearUiEventMessagesInState, createUiEventMessage as createUiEventMessageInState, getNavViewScroll as getNavViewScrollInState, isSameUiEventMessage as isSameUiEventMessageInState, markTimelineReconnecting as markTimelineReconnectingInState, navigateNav as navigateNavInState, projectCommandExchangeRecord as projectCommandExchangeRecordInState, projectThreadItem as projectThreadItemInState, qualifyUiEventKey as qualifyUiEventKeyInState, removeUiEventMessage as removeUiEventMessageInState, resolveNavSelectionTarget as resolveNavSelectionTargetInState, resolveUiEventDurationFallback as resolveUiEventDurationFallbackInState, seedCommandExchange as seedCommandExchangeInState, seedNavTree as seedNavTreeInState, seedTimeline as seedTimelineInState, setNavFilter as setNavFilterInState, setNavSelection as setNavSelectionInState, setNavViewScroll as setNavViewScrollInState, toggleTimelineCollapse as toggleTimelineCollapseInState, upsertUiEventMessage as upsertUiEventMessageInState, withoutUiEventMessages as withoutUiEventMessagesInState } from './AgentConsoleStreamProjectionState';
import { closeMessageDetail as closeMessageDetailInState, isMessageExpanded as isMessageExpandedInState, openMessageDetail as openMessageDetailInState, resolveMessageDetailLines, resolveMessageDetailMaxColumn, scrollMessageDetail as scrollMessageDetailInState, scrollMessageDetailColumns as scrollMessageDetailColumnsInState, scrollMessageDetailColumnsToEdge as scrollMessageDetailColumnsToEdgeInState, scrollMessageDetailPage as scrollMessageDetailPageInState, scrollMessageDetailToEdge as scrollMessageDetailToEdgeInState, setMessageExpanded as setMessageExpandedInState, toggleMessageExpanded as toggleMessageExpandedInState, toggleSelectedMessageExpanded as toggleSelectedMessageExpandedInState } from './AgentConsoleMessageDetailState';
import { buildTimelineEventRetryPayload as buildTimelineEventRetryPayloadInState, canRetryTimelineEvent as canRetryTimelineEventInState, closeTimelineEventInspector as closeTimelineEventInspectorInState, formatDuration as formatDurationInState, isFailedEventMessage as isFailedEventMessageInState, isTimelineEventMessage as isTimelineEventMessageInState, openTimelineEventInspector as openTimelineEventInspectorInState, resolveTimelineEventDetailLines, resolveTimelineEventDetailMaxColumn, scrollTimelineEventDetail as scrollTimelineEventDetailInState, scrollTimelineEventDetailColumns as scrollTimelineEventDetailColumnsInState, scrollTimelineEventDetailColumnsToEdge as scrollTimelineEventDetailColumnsToEdgeInState, scrollTimelineEventDetailPage as scrollTimelineEventDetailPageInState, scrollTimelineEventDetailToEdge as scrollTimelineEventDetailToEdgeInState } from './AgentConsoleTimelineInspector';
import {
    buildReviewAssessmentLines as buildReviewAssessmentLinesInState,
    buildReviewFoldedHunkSummary as buildReviewFoldedHunkSummaryInState,
    buildSideBySidePatchRows as buildSideBySidePatchRowsInState,
    clampReviewDetailScroll as clampReviewDetailScrollInState,
    filterReviewPatchLines as filterReviewPatchLinesInState,
    getReviewExportReport as getReviewExportReportInState,
    isReviewHunkFolded as isReviewHunkFoldedInState,
    parseReviewHunks as parseReviewHunksInState,
    renderReviewPatchLines as renderReviewPatchLinesInState,
    renderReviewPatchSideBySide as renderReviewPatchSideBySideInState,
    toggleReviewHunkFold as toggleReviewHunkFoldInState,
    toggleReviewSideBySide as toggleReviewSideBySideInState
} from './AgentConsoleReviewPatch';
import {
    buildPlanMessage as buildPlanMessageInState,
    clearPlanTodos as clearPlanTodosInState,
    formatElapsed as formatElapsedInState,
    hasActivePlanTodos as hasActivePlanTodosInState,
    jumpToNextBlockedPlanTodo as jumpToNextBlockedPlanTodoInState,
    jumpToNextFailedPlanTodo as jumpToNextFailedPlanTodoInState,
    movePlanTodoSelection as movePlanTodoSelectionInState,
    planTodoGlyph as planTodoGlyphInState,
    resolveFilteredPlanTodos,
    resolveGoalCriteriaProgress,
    resolvePlanTodoFilterLabel,
    resolveSelectedPlanTodo,
    resolveSelectedPlanTodoDetailLabel,
    setGoalSummary as setGoalSummaryInState,
    setPlanTodoFilter as setPlanTodoFilterInState,
    togglePlanTodoExpanded as togglePlanTodoExpandedInState
} from './AgentConsolePlanState';
import {
    applyPlanActionOptimistically as applyPlanActionOptimisticallyInState,
    confirmPlanAction as confirmPlanActionInState,
    dismissPlanAction as dismissPlanActionInState,
    isPlanActionApplicable as isPlanActionApplicableInState,
    planActionPromptLabel as planActionPromptLabelInState,
    requestPlanAction as requestPlanActionInState,
    retrySelectedPlanTodo as retrySelectedPlanTodoInState,
    rollbackPlanAction as rollbackPlanActionInState
} from './AgentConsolePlanActionState';
import {
    buildLegacyQuestionId as buildLegacyQuestionIdInState,
    choosePendingQuestion as choosePendingQuestionInState,
    dismissPendingQuestion as dismissPendingQuestionInState,
    finishPendingQuestion as finishPendingQuestionInState,
    markPendingQuestionExpired as markPendingQuestionExpiredInState,
    movePendingQuestionSelection as movePendingQuestionSelectionInState,
    movePendingQuestionSelectionPage as movePendingQuestionSelectionPageInState,
    movePendingQuestionSelectionToEdge as movePendingQuestionSelectionToEdgeInState,
    resolvePendingQuestionTotal,
    resumeAfterQuestionAnswer as resumeAfterQuestionAnswerInState,
    setPendingQuestion as setPendingQuestionInState,
    submitPendingQuestionInput as submitPendingQuestionInputInState
} from './AgentConsoleQuestionState';
import {
    moveApprovalSelection as moveApprovalSelectionInState,
    moveApprovalSelectionPage as moveApprovalSelectionPageInState,
    moveToolRunSelection as moveToolRunSelectionInState,
    moveToolRunSelectionPage as moveToolRunSelectionPageInState,
    moveToolSelection as moveToolSelectionInState,
    moveToolSelectionPage as moveToolSelectionPageInState,
    requestApprovalAttention as requestApprovalAttentionInState,
    resolveSelectedApproval,
    resolveSelectedTool,
    resolveSelectedToolRun,
    selectFirstApproval as selectFirstApprovalInState,
    selectFirstTool as selectFirstToolInState,
    selectFirstToolRun as selectFirstToolRunInState,
    selectLastApproval as selectLastApprovalInState,
    selectLastTool as selectLastToolInState,
    selectLastToolRun as selectLastToolRunInState,
    setApprovalsFocused as setApprovalsFocusedInState,
    setSelectedApprovalId as setSelectedApprovalIdInState,
    setSelectedToolName as setSelectedToolNameInState,
    setToolsFocused as setToolsFocusedInState
} from './AgentConsoleToolNavigation';
import {
    buildSelectedScheduledTaskCopyText as buildSelectedScheduledTaskCopyTextInState,
    buildSelectedSessionCopyText as buildSelectedSessionCopyTextInState,
    clampSessionSelectionToFilter as clampSessionSelectionToFilterInState,
    formatScheduledTimestamp as formatScheduledTimestampInState,
    formatSessionWorkspaceLabel as formatSessionWorkspaceLabelInState,
    moveScheduledTaskSelection as moveScheduledTaskSelectionInState,
    moveScheduledTaskSelectionPage as moveScheduledTaskSelectionPageInState,
    moveSessionSelection as moveSessionSelectionInState,
    moveSessionSelectionPage as moveSessionSelectionPageInState,
    resolveNavFilteredSessions,
    resolveSelectedScheduledTask,
    restoreSessionsViewState as restoreSessionsViewStateInState,
    persistSessionsViewState as persistSessionsViewStateInState,
    resolveSelectedSession,
    selectFirstScheduledTask as selectFirstScheduledTaskInState,
    selectFirstSession as selectFirstSessionInState,
    selectLastScheduledTask as selectLastScheduledTaskInState,
    selectLastSession as selectLastSessionInState,
    setJobsFocused as setJobsFocusedInState,
    setProjectsFocused as setProjectsFocusedInState,
    setScheduledTasks as setScheduledTasksInState,
    setSelectedScheduledTaskId as setSelectedScheduledTaskIdInState,
    setSelectedSessionId as setSelectedSessionIdInState,
    setSessionsFocused as setSessionsFocusedInState,
    setThreadsFocused as setThreadsFocusedInState,
    setToolRunsFocused as setToolRunsFocusedInState
} from './AgentConsoleSessionNavigation';
import {
    buildFileChangeMessage as buildFileChangeMessageInState,
    clearReview as clearReviewInState,
    closeReview as closeReviewInState,
    openReview as openReviewInState,
    syncReviewFileSelection,
    syncReviewGroupSelection
} from './AgentConsoleReviewLifecycle';
import {
    jumpReviewHunk as jumpReviewHunkInState,
    resolveReviewDetailLines,
    resolveReviewDetailMaxColumn,
    scrollReviewDetail as scrollReviewDetailInState,
    scrollReviewDetailColumns as scrollReviewDetailColumnsInState,
    scrollReviewDetailColumnsToEdge as scrollReviewDetailColumnsToEdgeInState,
    scrollReviewDetailPage as scrollReviewDetailPageInState,
    scrollReviewDetailToEdge as scrollReviewDetailToEdgeInState
} from './AgentConsoleReviewDetail';
import {
    moveReviewFileSelection as moveReviewFileSelectionInState,
    moveReviewGroupSelection as moveReviewGroupSelectionInState,
    resolveAggregateReviewFileSections,
    resolveReviewExecutionMode,
    resolveReviewFileSections,
    resolveReviewGroups,
    resolveSelectedReviewFileSection,
    resolveSelectedReviewGroup,
    setReviewPatchFilter as setReviewPatchFilterInState,
    setSelectedReviewFileIndex as setSelectedReviewFileIndexInState,
} from './AgentConsoleReviewNavigation';
import {
    clearAllReviewAnnotations as clearAllReviewAnnotationsInState,
    clearReviewFileAnnotation as clearReviewFileAnnotationInState,
    clearReviewHunkAnnotation as clearReviewHunkAnnotationInState,
    collectReviewConclusions as collectReviewConclusionsInState,
    approveAllReviewFiles as approveAllReviewFilesInState,
    approveAllReviewHunksForFile as approveAllReviewHunksForFileInState,
    computeFileRiskScore as computeFileRiskScoreInState,
    getReviewAnnotationSummary as getReviewAnnotationSummaryInState,
    getReviewHunkAnnotation as getReviewHunkAnnotationInState,
    rejectAllReviewFiles as rejectAllReviewFilesInState,
    rejectAllReviewHunksForFile as rejectAllReviewHunksForFileInState,
    setReviewFileAnnotation as setReviewFileAnnotationInState,
    setReviewHunkAnnotation as setReviewHunkAnnotationInState,
    writeReviewConclusions as writeReviewConclusionsInState
} from './AgentConsoleReviewAnnotations';
import {
    focusSelectedTaskLineageFilter as focusSelectedTaskLineageFilterInState,    moveTaskSelection as moveTaskSelectionInState,
    moveTaskSelectionPage as moveTaskSelectionPageInState,
    resolveFilteredReviewTaskChoices,
    resolveSelectedTask,
    resolveTaskLineageRootId,
    selectFirstTask as selectFirstTaskInState,
    selectLastTask as selectLastTaskInState,
    setSelectedReviewTaskId as setSelectedReviewTaskIdInState,
    setTaskFilter as setTaskFilterInState,
    setTasksFocused as setTasksFocusedInState,
    syncFilteredTaskSelection as syncFilteredTaskSelectionInState
} from './AgentConsoleReviewTaskState';
import type {
    AgentConsoleActivity,
    AgentConsoleApprovalRequest,
    AgentConsoleCommandOutputEntry,
    AgentConsoleContextPreparationSnapshot,
    AgentConsoleFocusLayer,
    AgentConsoleGoalSummary,
    AgentConsoleHealthItem,
    AgentConsoleOptions,
    AgentConsolePendingAttachment,
    AgentConsolePendingQuestion,
    AgentConsolePlanActionKind,
    AgentConsolePlanActionPrompt,
    AgentConsolePlanTodoItem,
    AgentConsoleProjectItem,
    AgentConsoleProviderWizardState,
    AgentConsoleReviewAnnotation,
    AgentConsoleReviewDiffSection,
    AgentConsoleReviewGroup,
    AgentConsoleReviewHunk,
    AgentConsoleReviewPatchFilter,
    AgentConsoleReviewTaskItem,
    AgentConsoleReviewWorker,
    AgentConsoleSelectMenu,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem,
    AgentConsoleSessionMeta,
    AgentConsoleTaskFilter,
    AgentConsoleTextOverlayState,
    AgentConsoleThreadItem,
    AgentConsoleTokenUsage,
    AgentConsoleToolItem,
    AgentConsoleToolRun,
    AgentConsoleUiEventOptions
} from './AgentConsoleStateTypes';
import { EN_MESSAGE_STATUS_LABELS, ZH_CONSOLE_HINTS, ZH_MESSAGE_STATUS_LABELS, defaultAgentConsoleOptions } from './AgentConsoleStateTypes';

export * from './AgentConsoleStateTypes';

@Injectable()
export class AgentConsoleSessionState {
    constructor(@Inject(COMMAND_EXECUTION_CONTROL) protected commandExecutionControl?: CommandExecutionControlPort, @Optional() @Inject(TranslatorService) public translator?: TranslatorService) {
        // Own copy of the defaults: applyLocaleDefaults() writes into
        // consoleOptions, and the field initializer shares the module-level
        // default object (mutating it would leak one host's locale into others).
        this.consoleOptions = { ...defaultAgentConsoleOptions };
        // The injected translator may not carry its final locale yet (the i18n
        // module can configure it after this state is constructed), so the
        // locale is re-applied when the session boots.
        this.applyLocaleDefaults(this.translator?.currentLocale);
    }

    /**
     * Host-locale option overrides (labels/hints). `setConsoleOptions` rebuilds
     * the defaults — re-apply these unless the host passed its own value — so
     * the timeline never mixes an English bundle with zh labels or vice versa.
     */
    protected localeOptionOverrides: Partial<Required<AgentConsoleOptions>> = {};

    /** Keys the host passed explicitly through `setConsoleOptions`. */
    protected hostProvidedOptions = new Set<string>();

    /** Align built-in labels and keyboard hints with the resolved host locale. */
    applyLocaleDefaults(locale?: string): void {
        const normalized = String(locale || '').trim().toLowerCase();
        this.localeOptionOverrides = normalized.startsWith('zh')
            ? { ...ZH_CONSOLE_HINTS, messageStatusLabels: ZH_MESSAGE_STATUS_LABELS, timelineLabels: DEFAULT_TIMELINE_LABELS }
            : normalized
                ? { messageStatusLabels: EN_MESSAGE_STATUS_LABELS, timelineLabels: EN_TIMELINE_LABELS }
                : {};
        for (const key of Object.keys(this.localeOptionOverrides)) {
            if (!this.hostProvidedOptions.has(key)) (this.consoleOptions as any)[key] = (this.localeOptionOverrides as any)[key];
        }
        // The plan row is built from translated copy; rebuild it when the host locale arrives.
        if (this.planTodos.length) this.planMessage = this.buildPlanMessage();
    }
    readonly inputHistoryController: AgentConsoleInputHistoryController = new DefaultAgentConsoleInputHistoryController(this);
    readonly focusLayers: AgentConsoleFocusLayers = new DefaultAgentConsoleFocusLayers(this);

    /** Derived from the focus layer stack: the composer owns the keyboard unless a layer claims it. */
    /** Localized labels for the inline suggestion menu (command groups, mention kinds). */
    protected suggestionLabels(): import('./AgentConsoleSuggestions').AgentConsoleSuggestionLabels {
        const label = (key: string, fallback: string) => this.translateLabel(key, undefined, fallback);
        return {
            describe: (key: string, fallback: string) => this.translateLabel(key, undefined, fallback),
            groupLabels: Object.fromEntries((['core', 'session', 'display', 'input', 'review', 'hooks', 'delegation', 'system'] as const)
                .map(group => [group, label(`agent.command.group.${group}`, group)])),
            mentionKinds: {
                folder: label('agent.mention.folder', 'folder'),
                directory: label('agent.mention.folder', 'folder'),
                file: label('agent.mention.file', 'file'),
                skill: label('agent.mention.skill', 'skill'),
                plugin: label('agent.mention.plugin', 'plugin')
            }
        };
    }

    /** Localized label for derived status/error strings (see formatAgentUiLabel). */
    translateLabel(key: string, params: Record<string, any> | undefined, fallback: string): string {
        return formatAgentUiLabel(this.translator, key, fallback, params);
    }

    get inputFocused(): boolean {
        return !this.focusLayers.blocksComposerInput();
    }
    readonly vimController: AgentConsoleVimController = createAgentConsoleVimController(this);
    private _commandExecutionController?: AgentConsoleCommandExecutionController;
    get commandExecutionController(): AgentConsoleCommandExecutionController {
        if (!this._commandExecutionController) {
            this._commandExecutionController = new DefaultAgentConsoleCommandExecutionController(this, {
                begin: (id, session) => this.requireCommandExecutionControl().begin(id, session),
                finish: id => this.requireCommandExecutionControl().finish(id),
                cancel: id => this.requireCommandExecutionControl().cancel(id),
                isCurrent: (id, session) => this.requireCommandExecutionControl().isCurrent(id, session),
                signal: (id, session) => this.requireCommandExecutionControl().signal(id, session)
            });
        }
        return this._commandExecutionController;
    }

    projectCommandExecution(requestId: string): void { this.syncCommandExecutionTranscript(requestId); }
    consoleOptions: Required<AgentConsoleOptions> = defaultAgentConsoleOptions;
    messageDetailVisibleLines = defaultAgentConsoleOptions.messageDetailVisibleLines;
    markdownContentWidth = 0;
    sessionId = 'console';
    input = '';
    inputSecret = false;
    providerWizardLabel = '';
    providerWizard?: AgentConsoleProviderWizardState;
    inputCursor = 0;
    /** Serializable focus projection shared by TUI and browser adapters. */
    focusStack: AgentConsoleFocusLayer[] = [];
    title = '';
    messages: AgentMessage[] = [];
    sections: AgentSessionSection[] = [];
    messagesFocused = false;
    /** Messages that arrived while the viewport transcript is scrolled up (0 = following latest). */
    messagesNewCount = 0;
    /** True when the platform transcript viewport is following the latest content. */
    transcriptFollowing = true;
    transcriptFollowProvider?: () => boolean;
    selectedMessageId = '';
    messageDetailOpen = false;
    expandedMessageIds: string[] = [];
    messageDetailTakesFocus = true;
    messageDetailScroll = 0;
    messageDetailColumnScroll = 0;
    timelineEventInspectorOpen = false;
    selectedTimelineEventId = '';
    timelineEventDetailScroll = 0;
    timelineEventDetailColumnScroll = 0;
    turnStartedAt = 0;
    status = 'idle';
    provider = '';
    model = '';
    modelProfile = '';
    oneShotModelProfile = '';
    planMode = false;
    yoloMode = false; securityLevel: import('./AgentConsolePolicyCommands').AgentConsoleSecurityLevel | '' = ''; restartAction?: (sessionId: string) => void; pairAction?: () => Promise<{ url?: string; urls?: string[]; qr?: string; code?: string; expiresAt?: number } | null>;
    workspace = '';
    statusline: AgentConsoleStatuslineField[] = [...defaultAgentConsoleStatusline];
    titleFields: AgentConsoleTitleField[] = [...defaultAgentConsoleTitle];
    gitBranch = '';
    projectKey = '';
    projectLabel = '';
    projectSummary = '';
    projectSessionCount = 0;
    summaryQualityDigest = '';
    usageDigest = '';
    compactionDigest = '';
    turnDiagnosticsDigest = '';
    projects: AgentConsoleProjectItem[] = [];
    projectsFocused = false;
    threads: AgentConsoleThreadItem[] = [];
    threadsFocused = false;
    toolRunsFocused = false;
    contextPreparation?: AgentConsoleContextPreparationSnapshot | null = null;
    tasksCount = 0;
    sessions: AgentConsoleSessionItem[] = [];
    openSessionIds: string[] = [];
    sessionsFocused = false;
    selectedSessionId = '';
    tasksFocused = false;
    jobsFocused = false;
    tools: AgentConsoleToolItem[] = [];
    toolsFocused = false;
    selectedToolName = '';
    selectedToolRunIndex = 0;
    approvalsFocused = false;
    selectedApprovalId = '';
    textOverlay: AgentConsoleTextOverlayState | null = null;
    commandOutputs: AgentConsoleCommandOutputEntry[] = [];
    commandOutputsOpen = false;
    commandOutputsFilter = '';
    commandOutputsFilterMode = false;
    commandOutputsSelectedIndex = 0;
    commandExecutions: AgentConsoleCommandExecution[] = [];
    commandOutputStore: CommandOutputStore | undefined;
    reviewOpen = false;
    gitSnapshotOpen = false;
    gitSnapshotCurrentRef = '';
    gitSnapshotDetailLines: string[] = [];
    gitSnapshotDetailScroll = 0;
    gitSnapshotDetailColumnScroll = 0;
    gitSnapshotHeaderLabel = '';
    gitSnapshotStatsLabel = '';
    reviewTask?: Record<string, any> | null;
    reviewDiff?: any | null;
    reviewWorkers: AgentConsoleReviewWorker[] = [];
    reviewTaskChoices: AgentConsoleReviewTaskItem[] = [];
    taskRecords: Record<string, any>[] = [];
    backgroundTaskFeed: BackgroundTaskRecord[] = [];
    backgroundTaskFilter: 'all' | 'running' | 'completed' | 'failed' | 'cancelled' = 'all';
    backgroundTaskQuery = '';
    harnessState: HarnessProjection | null = null;
    planTodos: AgentConsolePlanTodoItem[] = [];
    planTodoSourceSessionId = '';
    planTodoExpanded = false;
    planTodoFilter: 'all' | 'active' | 'blocked' | 'failed' = 'all';
    selectedPlanTodoIndex = -1;
    protected planEventSequence = 0;
    commandOutputSequence = 0;
    commandExecutionSequence = 0;
    commandExchangeSessionEpoch = 0;
    planId = '';
    planRevision = 0;
    goalSummary: AgentConsoleGoalSummary | null = null;
    planScope: 'project' | 'thread' | '' = '';
    pendingQuestion: AgentConsolePendingQuestion | null = null;
    /** Ordered multi-question queue. `pendingQuestion` projects the active (front) item. */
    pendingQuestionQueue: AgentConsolePendingQuestion[] = [];
    pendingQuestionSelectedIndex = 0;
    questionAction?: (input: { questionId: string; sessionId: string; action: 'answer' | 'dismiss'; answer?: string }) => Promise<void>;
    planMessage: AgentMessage | null = null;
    /** Ephemeral command lifecycle projections; never persisted as conversation history. */
    commandExecutionMessages: AgentMessage[] = [];
    fileChangeMessage: AgentMessage | null = null;
    selectedReviewTaskId = '';
    selectedReviewTaskCacheKey = '';
    selectedTaskFilter: AgentConsoleTaskFilter = 'all';
    selectedTaskLineageRootId = '';
    selectedReviewGroupIndex = 0;
    selectedReviewFileIndex = 0;
    selectedReviewHunkIndex = 0;
    foldedReviewHunks: Set<string> = new Set();
    selectedReviewPatchFilter: AgentConsoleReviewPatchFilter = 'all';
    reviewSideBySide = false;
    reviewFileAnnotations: Record<string, AgentConsoleReviewAnnotation> = {};
    reviewHunkAnnotations: Record<string, AgentConsoleReviewAnnotation> = {};
    reviewAnnotationCache: Record<string, Record<string, AgentConsoleReviewAnnotation>> = {};
    onReviewAnnotationsPersist?: (cache: Record<string, Record<string, AgentConsoleReviewAnnotation>>) => void;
    onReviewConclusionsWriteBack?: (conclusions: { files: Record<string, AgentConsoleReviewAnnotation>; hunks: Record<string, AgentConsoleReviewAnnotation>; summary: { totalFiles: number; approvedFiles: number; rejectedFiles: number; totalHunks: number; approvedHunks: number; rejectedHunks: number } }) => void;
    onSessionReconnected?: () => void;
    getAnnotationCache(): Record<string, Record<string, AgentConsoleReviewAnnotation>> {
        this.syncCurrentReviewAnnotationCache();
        return { ...this.reviewAnnotationCache };
    }
    setAnnotationCache(cache: Record<string, Record<string, AgentConsoleReviewAnnotation>>): void {
        this.reviewAnnotationCache = { ...(cache || {}) };
    }
    scheduledTasks: ScheduledAgentTask[] = [];
    selectedScheduledTaskId = '';
    reviewDetailScroll = 0;
    reviewDetailColumnScroll = 0;
    activities: AgentConsoleActivity[] = [];
    runningTools: string[] = [];
    toolRuns: AgentConsoleToolRun[] = [];
    tokenUsage: AgentConsoleTokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    };
    turnTokenUsage: AgentConsoleTokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    };
    protected turnTokenUsageBase: AgentConsoleTokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    };
    inputPrompt = this.consoleOptions.inputPrompt;
    inputContinuationPrompt = this.consoleOptions.inputContinuationPrompt;
    inputPlaceholder = this.consoleOptions.inputPlaceholder;
    vimMode = this.consoleOptions.vimMode;
    inputMode: ConsoleInputMode = 'insert';
    vimBindings: Record<string, string> = {};
    vimPendingKey = '';
    inputHistoryEntries: string[] = [];
    inputHistoryIndex = -1;
    inputHistoryDraft = '';
    inputLocked = false;
    sshShell: { hostId: string } | null = null;
    modalPromptActive = false;
    activeTurnEventScope = '';
    lastError = '';
    notice = '';
    pendingAttachments: AgentConsolePendingAttachment[] = [];
    queuedPromptCount = 0;
    showThinking = true;
    showTimestamps = true;
    showCriticalMarks = false;
    showToolOutput = true;
    showUsername = false;
    timelineViewMode: 'off' | 'compact' | 'steps' | 'verbose' = 'off';
    get timelineMode(): boolean {
        return this.timelineViewMode !== 'off';
    }
    timelineReconnecting = false;
    timelineStale = false;
    /** Collapsed turn groups (P290): turn scope key -> collapsed. Session state only, never persisted. */
    timelineCollapsedTurns: Record<string, boolean> = {};
    timelineSeedCount = 0;
    timelineTailSeq = -1;
    commandExchangeTailSeq = -1;
    commandExchangeSeedCount = 0;
    navTree: NavTree | null = null;
    navSeedCount = 0;
    navFilter: NavFilter = {};
    navSelection?: NavSelection;
    navViewScroll: Record<string, number> = {};
    planNudgesEnabled = true;
    whichKeyVisible = false;
    whichKeyBindings: Array<{ key: string; action: string }> = [];
    whichKeyLayout: 'compact' | 'grouped' = 'compact';
    whichKeyFilterCustom = false;
    whichKeyPage = 0;
    healthPopoverVisible = false;
    healthItems: AgentConsoleHealthItem[] = [];
    rawMode = false;
    theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    themeStyles: AgentConsoleThemeStyles = resolveAgentConsoleThemeStyles(defaultAgentConsoleTheme);
    selectMenu?: AgentConsoleSelectMenu;
    pendingApprovals: AgentConsoleApprovalRequest[] = []; modelUnavailableAction?: (failure: any) => void | Promise<void>; scrollTranscriptAction?: (rows: number) => boolean;
    submitAction?: () => Promise<void>;
    escapeAction?: () => boolean | Promise<boolean>;
    queueDraftAction?: () => boolean | Promise<boolean>;
    toggleHealthPopoverAction?: () => void | Promise<void>;
    selectMenuAction?: (value: string | undefined) => void | Promise<void>;
    copyFocusedTextAction?: (text: string, label: string) => void | Promise<void>;
    retryFailedEventAction?: (message: AgentMessage) => boolean | Promise<boolean>;
    activateSelectedSessionAction?: (sessionId: string) => void | Promise<void>;
    openSelectedTaskAction?: (taskId: string) => void | Promise<void>;
    cancelSelectedTaskAction?: (taskId: string) => void | Promise<void>;
    retrySelectedTaskAction?: (taskId: string) => void | Promise<void>;
    retrySelectedPlanTodoAction?: (todo: AgentConsolePlanTodoItem) => void | Promise<void>;
    planActionPrompt: AgentConsolePlanActionPrompt | null = null;
    planActionBus?: (action: AgentConsolePlanActionKind, stepId: string, payload?: Record<string, unknown>) => Promise<boolean>;
    planActionApplying = false;
    rollbackSelectedTaskAction?: (taskId: string) => void | Promise<void>;
    toggleSelectedScheduledTaskAction?: (taskId: string) => void | Promise<void>;
    cancelSelectedScheduledTaskAction?: (taskId: string) => void | Promise<void>;
    recoverSelectedScheduledTaskAction?: (taskId: string) => void | Promise<void>;
    activateSelectedToolAction?: (toolName: string) => void | Promise<void>;
    revertGitSnapshotFromDetailAction?: () => void | Promise<void>;
    resolveApprovalAction?: (decision: 'approve' | 'deny', requestId: string) => void | Promise<void>;
    /** Approve the request and auto-approve the rest of the session (`A`). */
    approvalAlwaysAllowAction?: (requestId: string) => void | Promise<void>;
    sessionTabsAction?: { select?: (id: string) => void; create?: () => void; close?: (id: string) => void };
    globalKeyInputAction?: (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }) => boolean | Promise<boolean>;
    protected injectedCommandHints: string[] = [];

    get commandHints(): string[] {
        return agentConsoleAllCommandHints(this.injectedCommandHints);
    }

    protected activeToolSet = new Set<string>();
    protected workspaceMentionResolver?: AgentConsoleWorkspaceMentionResolver;
    protected mentionCatalog: AgentConsoleMentionCatalogItem[] = [];
    protected workspaceSuggestionRequestId = 0;
    suppressSuggestionMenu = false;
    /** True once the user moved inside an open suggestion menu. */
    selectMenuTouched = false;
    setSuppressSuggestionMenu(suppressed: boolean): void { this.suppressSuggestionMenu = suppressed; }
    overlayController = new AgentConsoleOverlayController();

    configure(meta: AgentConsoleSessionMeta): this {
        // The injected translator can gain its final locale after this state is
        // constructed; align labels/hints before the first session renders.
        this.applyLocaleDefaults(this.translator?.currentLocale);
        const nextSessionId = String(meta.sessionId || '').trim();
        if (nextSessionId && nextSessionId !== this.sessionId) {
            this.commandExecutionController.cancelRunning();
            this.sessionId = nextSessionId;
            this.projectKey = '';
            this.projectLabel = '';
            this.projectSummary = '';
            this.projectSessionCount = 0;
            this.contextPreparation = null;
            this.commandExecutions = [];
            this.commandExecutionMessages = [];
            this.commandExchangeSessionEpoch++;
            this.commandOutputs = [];
            // A new session starts its durable replay cursors from the beginning.
            this.timelineTailSeq = -1;
            this.timelineSeedCount = 0;
            this.commandExchangeTailSeq = -1;
            this.commandExchangeSeedCount = 0;
            this.timelineReconnecting = false;
            this.timelineStale = false;
            this.activeTurnEventScope = '';
            void this.loadCommandOutputHistory();
        }
        if (meta.provider !== undefined) {
            this.provider = meta.provider;
        }
        if (meta.model !== undefined) {
            this.model = meta.model;
        }
        if (meta.modelProfile !== undefined) {
            this.modelProfile = meta.modelProfile;
        }
        if (meta.workspace !== undefined) {
            this.workspace = meta.workspace;
        }
        return this;
    }

    setTitle(title: string): void {
        this.title = title;
    }

    setProvider(provider: string): void {
        this.provider = provider;
    }

    setModel(model: string): void {
        this.model = model;
    }

    setWorkspace(workspace: string): void {
        this.workspace = workspace;
        this.refreshInputSuggestions();
    }

    setStatusline(statusline: AgentConsoleStatuslineField[]): void {
        this.statusline = [...(statusline || defaultAgentConsoleStatusline)];
    }

    setTitleFields(titleFields: AgentConsoleTitleField[]): void {
        this.titleFields = [...(titleFields || defaultAgentConsoleTitle)];
    }

    formatTerminalTitle(): string {
        return composeAgentConsoleTerminalTitle(
            {
                projectKey: this.projectKey,
                projectLabel: this.projectLabel,
                workspace: this.workspace,
                status: this.status,
                pendingApprovalCount: this.pendingApprovals.length,
                sessionId: this.sessionId,
                gitBranch: this.gitBranch,
                model: this.model,
                title: this.title
            },
            this.titleFields
        );
    }

    setGitBranch(gitBranch: string): void {
        this.gitBranch = String(gitBranch || '').trim();
    }

    setProjectContext(context?: {
        projectKey?: string;
        projectLabel?: string;
        projectSummary?: string;
        projectSessionCount?: number;
    }): void {
        this.projectKey = String(context?.projectKey || '').trim();
        this.projectLabel = String(context?.projectLabel || '').trim();
        this.projectSummary = String(context?.projectSummary || '').trim();
        this.projectSessionCount = Math.max(0, Number(context?.projectSessionCount || 0));
    }

    setSummaryQualityDigest(digest: string): void {
        this.summaryQualityDigest = String(digest || '').trim();
    }

    setUsageDigest(digest: string): void {
        this.usageDigest = String(digest || '').trim();
    }

    setCompactionDigest(digest: string): void {
        this.compactionDigest = String(digest || '').trim();
    }

    setTurnDiagnosticsDigest(digest: string): void {
        this.turnDiagnosticsDigest = String(digest || '').trim();
    }

    setContextPreparation(report?: ContextPreparationReport | null): void {
        if (!report) {
            this.contextPreparation = null;
            return;
        }
        this.contextPreparation = {
            ...report,
            summary: this.formatContextPreparationSummary(report)
        };
    }

    get contextPreparationSummary(): string {
        return this.contextPreparation?.summary || '';
    }

    get isSshShellActive(): boolean {
        return !!this.sshShell;
    }

    setModelProfile(modelProfile: string): void {
        this.modelProfile = modelProfile;
    }

    setOneShotModelProfile(modelProfile: string): void {
        this.oneShotModelProfile = String(modelProfile || '').trim();
    }

    setPlanMode(enabled: boolean): void { this.planMode = enabled; }
    setYoloMode(enabled: boolean): void { this.yoloMode = enabled; }

    get effectiveVimBindings(): Record<string, string> {
        return { ...VIM_DEFAULT_BINDINGS, ...this.vimBindings };
    }

    setVimMode(enabled: boolean): void {
        this.vimMode = !!enabled;
        if (!this.vimMode) {
            this.inputMode = 'insert';
            this.vimPendingKey = '';
        }
    }

    setInputMode(mode: ConsoleInputMode): void {
        if (!this.vimMode) {
            this.inputMode = 'insert';
            return;
        }
        this.inputMode = mode;
        if (mode === 'insert') {
            this.vimPendingKey = '';
        }
    }

    setVimBinding(key: string, action: string): boolean {
        return this.vimController.setBinding(key, action);
    }

    unsetVimBinding(key: string): boolean {
        return this.vimController.unsetBinding(key);
    }

    resetVimBindings(): void {
        this.vimController.resetBindings();
    }

    handleVimKey(key: string): boolean {
        return this.vimController.handleKey(key);
    }

    applyVimAction(action: string): boolean {
        return this.vimController.applyAction(action);
        /* switch (action) {
            case 'insert-mode':
                this.setInputMode('insert');
                break;
            case 'insert-start':
                this.moveInputCursorToEdge('start');
                this.setInputMode('insert');
                break;
            case 'insert-after':
                this.setInputCursor(this.inputCursor + 1);
                this.setInputMode('insert');
                break;
            case 'insert-end':
                this.moveInputCursorToEdge('end');
                this.setInputMode('insert');
                break;
            case 'newline-below':
                this.setInput(this.input ? `${this.input}\n` : '', this.input.length + 1);
                this.setInputMode('insert');
                break;
            case 'newline-above':
                this.setInput(this.input ? `\n${this.input}` : '', 0);
                this.setInputMode('insert');
                break;
            case 'history-prev':
                return this.inputHistoryController.navigate(-1);
            case 'history-next':
                return this.inputHistoryController.navigate(1);
            case 'cursor-left':
                this.moveInputCursor(-1);
                break;
            case 'cursor-right':
                this.moveInputCursor(1);
                break;
            case 'cursor-start':
                this.moveInputCursorToEdge('start');
                break;
            case 'cursor-end':
                this.moveInputCursorToEdge('end');
                break;
            case 'delete-char':
                if (this.inputCursor < this.input.length) {
                    this.setInput(
                        this.input.slice(0, this.inputCursor) + this.input.slice(this.inputCursor + 1),
                        this.inputCursor
                    );
                }
                break;
            case 'delete-line':
                this.setInput('', 0);
                break;
            case 'exit-insert':
                this.setInputMode('normal');
                break;
            default:
                return false;
        }
        return true; */
    }

    syncDerivedInputFocus(): void {
        this.focusLayers.sync();
    }

    beginSelectInteraction(): () => void {
        const previousInputLocked = this.inputLocked;
        this.inputLocked = true;
        this.modalPromptActive = true;
        let finished = false;
        return () => {
            if (finished) {
                return;
            }
            finished = true;
            this.modalPromptActive = false;
            this.inputLocked = previousInputLocked;
            void this.cancelSelectMenu();
        };
    }

    async promptSelect(title: string, options: AgentConsoleSelectOption[], initialIndex = 0, hint?: string): Promise<string | undefined> {
        const finishSelectInteraction = this.beginSelectInteraction();
        try {
            return await this.selectAsync(title, options, initialIndex, hint);
        } finally {
            finishSelectInteraction();
        }
    }

    get highlightedToolRun(): AgentConsoleToolRun | undefined {
        const active = this.toolRuns.find(item => item.status === 'running');
        if (active) {
            return active;
        }
        return this.toolRuns
            .slice()
            .sort((left, right) => right.updatedAt - left.updatedAt)[0];
    }

    get visibleActivities(): AgentConsoleActivity[] {
        return this.activities.filter(activity => activity.kind !== 'turn');
    }

    clearActivities(): void {
        if (!this.activities.length) {
            return;
        }
        this.activities = [];
    }

    /** Last assistant answer row; kept fully expanded in viewport mode while other long bodies collapse. */
    get displayMessages(): AgentMessage[] { return resolveDisplayMessages(this); }
    get sessionHeader(): TimelineWindowMessage | undefined { return resolveSessionHeader(this); }
    get sessionFooter(): TimelineWindowMessage | undefined { return resolveSessionFooter(this); }

    get finalAssistantMessageId(): string {
        return resolveFinalAssistantMessageId(this.messages);
    }

    /** Earliest session timestamp: first message createdAt → turn start → now. */

    setMessages(messages: AgentMessage[], preserveCommandExecutionMessages = false): void {
        const previousCount = this.messages.length;
        this.messages = messages.filter(message => {
            if (!message || typeof message.content !== 'string') return false;
            const content = message.content;
            const roleMarkers = content.match(/(?:^|\|\s*)(?:assistant|tool|user):/g) || [];
            return !(roleMarkers.length >= 2
                || (roleMarkers.length >= 1
                    && (content.includes('truncated') || content.includes('"path"') || content.includes('path":"'))));
        });
        if (!preserveCommandExecutionMessages) {
            this.commandExecutionMessages = [];
        }
        const messageUsage = messages.some(message => !!this.resolveUsagePayload(message?.metadata?.usage));
        if (messageUsage || !preserveCommandExecutionMessages) {
            this.tokenUsage = this.resolveTokenUsageFromMessages(messages);
        }
        const displayMessages = this.displayMessages;
        if (!displayMessages.length) {
            this.selectedMessageId = '';
            this.messageDetailOpen = false;
            this.messageDetailScroll = 0;
            this.messageDetailColumnScroll = 0;
        } else {
            const selectable = displayMessages.filter(m =>
                m.id !== '__plan_todo_inline__' && m.id !== '__file_change_inline__' && m.id !== '__timeline_plan_boundary__'
                    && m.metadata?.uiKind !== 'command-execution'
            );
            const shouldFollowLatest = !this.messagesFocused && !this.messageDetailOpen;
            if (shouldFollowLatest || !this.selectedMessageId || !selectable.some(item => item.id === this.selectedMessageId)) {
                this.selectedMessageId = selectable.length ? selectable[selectable.length - 1].id : '';
                this.messageDetailScroll = 0;
                this.messageDetailColumnScroll = 0;
            }
        }
        const following = this.transcriptFollowProvider ? this.transcriptFollowProvider() : true;
        this.transcriptFollowing = following;
        if (this.messagesFocused || !following) {
            this.messagesNewCount = trackMessagesNewCount(previousCount, this.messages.length, true, this.messagesNewCount);
        } else {
            this.messagesNewCount = 0;
        }
    }

    appendMessage(message: AgentMessage): void {
        this.setMessages([...this.messages, message], true);
    }

    setSections(sections: AgentSessionSection[]): void {
        this.sections = Array.isArray(sections) ? sections : [];
    }

    mergeMessagesPage(page: {
        messages: AgentMessage[];
        sections?: AgentSessionSection[];
        hasMore?: boolean;
        mode?: 'append' | 'prepend';
    }): void {
        const incoming = Array.isArray(page.messages) ? page.messages : [];
        if (Array.isArray(page.sections)) {
            this.sections = page.sections;
        }
        if (!incoming.length) {
            return;
        }
        const mode = page.mode === 'prepend' ? 'prepend' : 'append';
        const existingIds = new Set(this.messages.map(message => message.id));
        const fresh = incoming.filter(message => !existingIds.has(message.id));
        if (!fresh.length) {
            return;
        }
        this.setMessages(mode === 'prepend' ? [...fresh, ...this.messages] : [...this.messages, ...fresh], true);
    }

    beginTurnEventScope(scope?: string): string {
        this.activeTurnEventScope = String(scope || '').trim() || `turn-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        return this.activeTurnEventScope;
    }

    clearTurnEventScope(scope?: string): void {
        const resolvedScope = String(scope || '').trim();
        if (!resolvedScope || this.activeTurnEventScope === resolvedScope) {
            this.activeTurnEventScope = '';
        }
    }

    /**
     * Derive the per-step elapsed time when a terminal event replaces a still-running
     * timeline row that carries no explicit duration. The replacement row preserves the
     * original start time (createdAt), so the processed duration is always available
     * for the timeline UI even when the incoming event has no receipt duration.
     */

    /** Shared cross-host projection entry point for transcript thread items. */

    toggleTimelineCollapse(scopeKey: string): void { toggleTimelineCollapseInState(this, scopeKey); }
    qualifyUiEventKey(key: string): string { return qualifyUiEventKeyInState(this, key); }
    withoutUiEventMessages(messages: AgentMessage[] = this.messages): AgentMessage[] { return withoutUiEventMessagesInState(this, messages); }
    clearUiEventMessages(): void { clearUiEventMessagesInState(this); }
    removeUiEventMessage(eventKey: string): void { removeUiEventMessageInState(this, eventKey); }
    seedTimeline(entries: TimelineEntry[]): void { seedTimelineInState(this, entries); }
    seedCommandExchange(records: CommandExchangeRecord[]): void { seedCommandExchangeInState(this, records); }
    projectCommandExchangeRecord(record: CommandExchangeRecord): boolean { return projectCommandExchangeRecordInState(this, record); }
    markTimelineReconnecting(reconnecting: boolean): void { markTimelineReconnectingInState(this, reconnecting); }
    seedNavTree(tree: NavTree | null | undefined): void { seedNavTreeInState(this, tree); }
    setNavFilter(filter?: NavFilter): void { setNavFilterInState(this, filter); }
    setNavSelection(selection?: NavSelection): void { setNavSelectionInState(this, selection); }
    navigateNav(direction: 'up' | 'down', type?: NavEntityType): NavSelection | undefined { return navigateNavInState(this, direction, type); }
    resolveNavSelectionTarget(): NavSelection | undefined { return resolveNavSelectionTargetInState(this); }
    setNavViewScroll(viewId: string, scroll: number): void { setNavViewScrollInState(this, viewId, scroll); }
    getNavViewScroll(viewId: string): number { return getNavViewScrollInState(this, viewId); }
    appendUiEventMessage(content: string, options: AgentConsoleUiEventOptions = {}): void { appendUiEventMessageInState(this, content, options); }
    upsertUiEventMessage(eventKey: string, content: string, options: AgentConsoleUiEventOptions = {}): void { upsertUiEventMessageInState(this, eventKey, content, options); }
    resolveUiEventDurationFallback(existing: AgentMessage, incoming: AgentConsoleUiEventOptions): AgentConsoleUiEventOptions { return resolveUiEventDurationFallbackInState(this, existing, incoming); }
    projectThreadItem(event: ThreadItemEvent): void { projectThreadItemInState(this, event); }
    appendAssistantErrorMessage(message: string): void { appendAssistantErrorMessageInState(this, message); }
    createUiEventMessage(content: string, options: AgentConsoleUiEventOptions = {}): AgentMessage { return createUiEventMessageInState(this, content, options); }
    isSameUiEventMessage(left: AgentMessage | undefined, right: AgentMessage | undefined): boolean { return isSameUiEventMessageInState(this, left, right); }

    setSelectedMessageId(messageId: string): void {
        if (!messageId || !this.displayMessages.some(item => item.id === messageId)) {
            return;
        }
        this.selectedMessageId = messageId;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
    }

    isPlanTodoMessageSelected(): boolean {
        return this.selectedMessageId === '__plan_todo_inline__' && this.planTodos.length > 7;
    }

    focusLatestLongMessage(): boolean {
        if (this.input || this.inputLocked || this.modalPromptActive || this.focusLayers.hasBlockingSelectMenu()) {
            return false;
        }
        const messages = this.displayMessages;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            const message = messages[index];
            const content = String(message.content || '');
            if (content.split('\n').length > 8 || content.length > 800) {
                this.selectedMessageId = message.id;
                this.messageDetailOpen = false;
                this.messagesFocused = true;
                this.syncDerivedInputFocus();
                return true;
            }
        }
        if (!messages.length) {
            return false;
        }
        this.selectedMessageId = messages[messages.length - 1].id;
        this.messageDetailOpen = false;
        this.messagesFocused = true;
        this.syncDerivedInputFocus();
        return true;
    }

    get selectedMessage(): AgentMessage | undefined {
        return this.displayMessages.find(item => item.id === this.selectedMessageId);
    }

    get selectedTimelineEvent(): AgentMessage | undefined {
        if (!this.selectedTimelineEventId) {
            return undefined;
        }
        return this.displayMessages.find(item => item.id === this.selectedTimelineEventId);
    }

    /** Host hook: fetch one tool call's raw payload on demand (optional). */
    toolPayloadLoader?: (toolCallId: string) => Promise<string | undefined>;

    /** Raw payload shown in the event inspector (empty until the host answers). */
    timelineEventOutput = '';
    timelineEventOutputLoading = false;

    get hasTimelineEventInspectorFocus(): boolean {
        return !!this.timelineEventInspectorOpen;
    }

    isTimelineEventMessage(message?: AgentMessage | null): boolean { return isTimelineEventMessageInState(this, message); }
    isFailedEventMessage(message?: AgentMessage | null): boolean { return isFailedEventMessageInState(this, message); }
    openTimelineEventInspector(eventMessage?: AgentMessage): void { openTimelineEventInspectorInState(this, eventMessage); }
    closeTimelineEventInspector(): void { closeTimelineEventInspectorInState(this); }
    get timelineEventDetailLines(): string[] { return resolveTimelineEventDetailLines(this); }
    get timelineEventDetailMaxColumn(): number { return resolveTimelineEventDetailMaxColumn(this); }
    formatDuration(ms: number): string { return formatDurationInState(ms); }
    scrollTimelineEventDetail(delta: number): void { scrollTimelineEventDetailInState(this, delta); }
    scrollTimelineEventDetailPage(delta: number, pageSize?: number): void { scrollTimelineEventDetailPageInState(this, delta, pageSize); }
    scrollTimelineEventDetailToEdge(position: 'start' | 'end'): void { scrollTimelineEventDetailToEdgeInState(this, position); }
    scrollTimelineEventDetailColumns(delta: number): void { scrollTimelineEventDetailColumnsInState(this, delta); }
    scrollTimelineEventDetailColumnsToEdge(position: 'start' | 'end'): void { scrollTimelineEventDetailColumnsToEdgeInState(this, position); }
    canRetryTimelineEvent(): boolean { return canRetryTimelineEventInState(this); }
    buildTimelineEventRetryPayload(): { toolCallId?: string; receiptId?: string; attempt?: number; uiEventKey?: string } | null { return buildTimelineEventRetryPayloadInState(this); }

    isMessageExpanded(messageId: string): boolean { return isMessageExpandedInState(this, messageId); }
    setMessageExpanded(messageId: string, expanded: boolean): void { setMessageExpandedInState(this, messageId, expanded); }
    toggleMessageExpanded(messageId: string): void { toggleMessageExpandedInState(this, messageId); }
    toggleSelectedMessageExpanded(): boolean { return toggleSelectedMessageExpandedInState(this); }
    openMessageDetail(takeFocus = true): void { openMessageDetailInState(this, takeFocus); }
    closeMessageDetail(): void { closeMessageDetailInState(this); }
    scrollMessageDetail(delta: number): void { scrollMessageDetailInState(this, delta); }
    scrollMessageDetailPage(delta: number, pageSize?: number): void { scrollMessageDetailPageInState(this, delta, pageSize); }
    scrollMessageDetailToEdge(position: 'start' | 'end'): void { scrollMessageDetailToEdgeInState(this, position); }
    get messageDetailLines(): string[] { return resolveMessageDetailLines(this); }
    get messageDetailMaxColumn(): number { return resolveMessageDetailMaxColumn(this); }
    scrollMessageDetailColumns(delta: number): void { scrollMessageDetailColumnsInState(this, delta); }
    scrollMessageDetailColumnsToEdge(position: 'start' | 'end'): void { scrollMessageDetailColumnsToEdgeInState(this, position); }

    setStatus(status: string): void {
        const nextStatus = status || 'idle';
        if (this.status === nextStatus) {
            return;
        }
        if ((nextStatus === 'running' || nextStatus === 'reasoning') && !this.turnStartedAt) {
            this.turnStartedAt = Date.now();
        }
        // A cancelled turn is over too: clear the turn clock so the next turn's
        // "Working (Ns)" elapsed starts from zero (a stale clock made the second
        // turn after Ctrl+C resume the cancelled turn's timer).
        if (nextStatus === 'idle' || nextStatus === 'error' || nextStatus === 'cancelled') {
            this.turnStartedAt = 0;
        }
        this.status = nextStatus;
    }

    setTools(tools: AgentConsoleToolItem[]): void {
        this.tools = tools;
        if (!this.tools.length) {
            this.selectedToolName = '';
            this.toolsFocused = false;
        } else if (this.selectedToolName && this.tools.some(item => item.name === this.selectedToolName)) {
            // Preserve explicit tool selection when possible.
        } else {
            this.selectedToolName = this.tools[0].name;
        }
        this.refreshInputSuggestions();
    }

    setTokenUsage(usage?: Partial<AgentConsoleTokenUsage> | Record<string, any> | null): void {
        const source = this.resolveUsagePayload(usage);
        if (!source) return;

        const promptTokens = this.resolveUsageNumber(source, ['promptTokens', 'prompt_tokens', 'input_tokens']);
        const completionTokens = this.resolveUsageNumber(source, ['completionTokens', 'completion_tokens', 'output_tokens']);
        const explicitTotal = this.resolveUsageNumber(source, ['totalTokens', 'total_tokens']);
        const nextPromptTokens = promptTokens ?? this.turnTokenUsage.promptTokens;
        const nextCompletionTokens = completionTokens ?? this.turnTokenUsage.completionTokens;
        const totalTokens = explicitTotal
            ?? (promptTokens != null || completionTokens != null
                ? nextPromptTokens + nextCompletionTokens
                : this.turnTokenUsage.totalTokens);

        this.turnTokenUsage = {
            promptTokens: nextPromptTokens,
            completionTokens: nextCompletionTokens,
            totalTokens
        };
        this.tokenUsage = {
            promptTokens: this.turnTokenUsageBase.promptTokens + nextPromptTokens,
            completionTokens: this.turnTokenUsageBase.completionTokens + nextCompletionTokens,
            totalTokens: this.turnTokenUsageBase.totalTokens + totalTokens
        };
    }

    setTokenUsageAbsolute(usage?: Partial<AgentConsoleTokenUsage> | Record<string, any> | null): void {
        const source = this.resolveUsagePayload(usage);
        if (!source) return;

        const promptTokens = this.resolveUsageNumber(source, ['promptTokens', 'prompt_tokens', 'input_tokens']) ?? 0;
        const completionTokens = this.resolveUsageNumber(source, ['completionTokens', 'completion_tokens', 'output_tokens']) ?? 0;
        const totalTokens = this.resolveUsageNumber(source, ['totalTokens', 'total_tokens']) ?? (promptTokens + completionTokens);
        this.turnTokenUsageBase = { promptTokens, completionTokens, totalTokens };
        this.turnTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        this.tokenUsage = { promptTokens, completionTokens, totalTokens };
    }

    resetTurnTokenUsage(): void {
        this.turnTokenUsageBase = { ...this.tokenUsage };
        this.turnTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }

    get planNudgeActive(): boolean {
        if (!this.planNudgesEnabled || this.planMode) {
            return false;
        }
        const draft = String(this.input || '').trim();
        if (draft.length < 20 || draft.startsWith('/')) {
            return false;
        }
        const explicitPlanIntent = /(?:\bplan(?:ning)?\b|\bdesign\b|\barchitecture\b|方案|规划|设计|先不要改|不要(?:先)?修改|先别改)/i;
        return explicitPlanIntent.test(draft);
    }

    get inputPlaceholderLabel(): string {
        return this.input ? '' : this.inputPlaceholder;
    }

    get inputHintLabel(): string {
        const base = this.formatStatusFooter(this.model, this.modelProfile, this.workspace);
        const oneShotSummary = this.oneShotModelProfile
            ? `next model ${this.oneShotModelProfile}`
            : '';
        const attachmentSummary = this.pendingAttachments.length
            ? `${this.pendingAttachments.length} attachment${this.pendingAttachments.length === 1 ? '' : 's'}`
            : '';
        return [base, oneShotSummary, attachmentSummary].filter(Boolean).join(' · ');
    }

    setInput(value: string, cursor = value.length): void { setInputInState(this, value, cursor); }
    setPlanNudgesEnabled(enabled: boolean): void { setPlanNudgesEnabledInState(this, enabled); }
    setInputCursor(cursor: number): void { setInputCursorInState(this, cursor); }
    moveInputCursor(delta: number): void { moveInputCursorInState(this, delta); }
    moveInputCursorToEdge(position: 'start' | 'end'): void { moveInputCursorToEdgeInState(this, position); }
    setMessagesFocused(focused: boolean): void { setMessagesFocusedInState(this, focused); }
    setTranscriptFollowProvider(provider?: () => boolean): void { setTranscriptFollowProviderInState(this, provider); }
    syncTranscriptFollowing(): void { syncTranscriptFollowingInState(this); }
    setInputPlaceholder(value: string): void { setInputPlaceholderInState(this, value); }
    setPendingAttachments(attachments: AgentConsolePendingAttachment[]): void { setPendingAttachmentsInState(this, attachments); }
    appendPendingAttachment(attachment: AgentConsolePendingAttachment): void { appendPendingAttachmentInState(this, attachment); }
    clearPendingAttachments(): void { clearPendingAttachmentsInState(this); }

    setLastError(message: string): void {
        this.lastError = message;
    }

    setTasksCount(value: number): void {
        this.tasksCount = value;
    }

    setSessions(sessions: AgentConsoleSessionItem[]): void { this.sessions = sessions.slice(); this.clampSessionSelectionToFilter(); }

    setOpenSessionIds(ids: string[]): void { const seen = new Set<string>(); this.openSessionIds = (ids || []).map(id => String(id || '').trim()).filter(id => id && !seen.has(id) && !!seen.add(id)); }

    setProjects(projects: AgentConsoleProjectItem[]): void {
        this.projects = projects.slice();
    }

    setThreads(threads: AgentConsoleThreadItem[]): void {
        this.threads = threads.slice();
    }

    get navFilteredSessions(): AgentConsoleSessionItem[] {
        return resolveNavFilteredSessions(this);
    }

    clampSessionSelectionToFilter(): void {
        clampSessionSelectionToFilterInState(this);
    }

    setSessionsFocused(focused: boolean): void {
        setSessionsFocusedInState(this, focused);
    }

    restoreSessionsViewState(): void {
        restoreSessionsViewStateInState(this);
    }

    persistSessionsViewState(): void {
        persistSessionsViewStateInState(this);
    }

    setProjectsFocused(focused: boolean): void {
        setProjectsFocusedInState(this, focused);
    }

    setThreadsFocused(focused: boolean): void {
        setThreadsFocusedInState(this, focused);
    }

    setToolRunsFocused(focused: boolean): void {
        setToolRunsFocusedInState(this, focused);
    }

    setSelectedSessionId(sessionId: string): void {
        setSelectedSessionIdInState(this, sessionId);
    }

    moveSessionSelection(delta: number): void {
        moveSessionSelectionInState(this, delta);
    }

    moveSessionSelectionPage(delta: number, pageSize?: number): void {
        moveSessionSelectionPageInState(this, delta, pageSize);
    }

    selectFirstSession(): void {
        selectFirstSessionInState(this);
    }

    selectLastSession(): void {
        selectLastSessionInState(this);
    }

    get selectedSession(): AgentConsoleSessionItem | undefined {
        return resolveSelectedSession(this);
    }

    formatSessionWorkspaceLabel(workspace?: string): string {
        return formatSessionWorkspaceLabelInState(workspace);
    }

    buildSelectedSessionCopyText(): string {
        return buildSelectedSessionCopyTextInState(this);
    }

    protected buildSelectedToolRunCopyText(): string {
        const selected = this.selectedToolRun;
        if (!selected) {
            return '';
        }
        return [
            `${selected.name} [${selected.status}]`,
            selected.durationMs != null ? `duration=${selected.durationMs}ms` : '',
            selected.attemptCount && selected.attemptCount > 1 ? `attempt=#${selected.attemptCount}` : '',
            selected.executionMode ? `mode=${selected.executionMode}` : '',
            selected.inputSummary ? `in=${selected.inputSummary}` : '',
            selected.outputSummary ? `out=${selected.outputSummary}` : '',
            selected.error ? `error=${selected.error}` : ''
        ].filter(Boolean).join('\n');
    }

    setScheduledTasks(tasks: ScheduledAgentTask[]): void {
        setScheduledTasksInState(this, tasks);
    }

    setJobsFocused(focused: boolean): void {
        setJobsFocusedInState(this, focused);
    }

    setSelectedScheduledTaskId(taskId: string): void {
        setSelectedScheduledTaskIdInState(this, taskId);
    }

    moveScheduledTaskSelection(delta: number): void {
        moveScheduledTaskSelectionInState(this, delta);
    }

    moveScheduledTaskSelectionPage(delta: number, pageSize?: number): void {
        moveScheduledTaskSelectionPageInState(this, delta, pageSize);
    }

    selectFirstScheduledTask(): void {
        selectFirstScheduledTaskInState(this);
    }

    selectLastScheduledTask(): void {
        selectLastScheduledTaskInState(this);
    }

    get selectedScheduledTask(): ScheduledAgentTask | undefined {
        return resolveSelectedScheduledTask(this);
    }

    setTaskRecords(tasks: Record<string, any>[]): void {
        this.taskRecords = tasks.slice();
    }

    setBackgroundTaskFeed(tasks: BackgroundTaskRecord[]): void {
        this.backgroundTaskFeed = tasks.slice().sort((a, b) => b.startedAt - a.startedAt);
    }

    setHarnessState(projection: HarnessProjection | null): void {
        this.harnessState = projection;
    }

    upsertBackgroundTask(record: BackgroundTaskRecord): void {
        const index = this.backgroundTaskFeed.findIndex(item => item.id === record.id);
        const next = this.backgroundTaskFeed.slice();
        if (index >= 0) next[index] = { ...next[index], ...record };
        else next.push(record);
        this.setBackgroundTaskFeed(next);
    }

    get filteredBackgroundTasks(): BackgroundTaskRecord[] {
        const query = this.backgroundTaskQuery.trim().toLowerCase();
        return this.backgroundTaskFeed.filter(task =>
            (this.backgroundTaskFilter === 'all' || task.status === this.backgroundTaskFilter)
            && (!query || `${task.id} ${task.sessionId} ${task.goal}`.toLowerCase().includes(query))
        );
    }

    setPlanTodos(todos: AgentConsolePlanTodoItem[], sourceSessionId?: string, scope?: 'project' | 'thread', sequence?: number, revision?: number, planId?: string): void {
        if (sequence !== undefined && sequence <= this.planEventSequence) {
            return;
        }
        if (sequence !== undefined) {
            this.planEventSequence = sequence;
        }
        if (revision !== undefined && revision >= 0) {
            this.planRevision = revision;
        }
        if (planId) {
            this.planId = String(planId);
        }
        this.planTodos = todos.map(todo => {
            const pid = this.planId || (planId ? String(planId) : undefined);
            if (!pid) {
                return { ...todo };
            }
            return {
                ...todo,
                planId: pid,
                revision: this.planRevision
            };
        });
        if (this.planTodos.length <= 7) {
            this.planTodoExpanded = false;
        }
        this.planTodoSourceSessionId = String(sourceSessionId || '').trim();
        this.planScope = scope || '';
        this.planMessage = this.buildPlanMessage();
    }

    get planThreadKey(): string {
        return this.planId ? `${this.planId}#r${this.planRevision}` : '';
    }

    mergePlanCreated(
        steps: Array<Partial<AgentConsolePlanTodoItem> & { id: string; content: string }>,
        planId?: string,
        revision?: number,
        sequence?: number,
        sourceSessionId?: string,
        scope?: 'project' | 'thread'
    ): void {
        if (sequence !== undefined && sequence <= this.planEventSequence) {
            return;
        }
        if (sequence !== undefined) {
            this.planEventSequence = sequence;
        }
        this.planTodos = steps.map((step, index) => ({
            id: String(step.id || '').trim() || `step-${index}`,
            content: String(step.content || '').trim(),
            status: (step.status === 'cancelled' || step.status === 'failed' || step.status === 'in_progress' || step.status === 'completed' ? step.status : 'pending'),
            parentId: step.parentId,
            kind: step.kind,
            acceptance: step.acceptance,
            dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn.slice() : undefined,
            blockedBy: Array.isArray(step.blockedBy) ? step.blockedBy.slice() : undefined,
            estimate: step.estimate,
            owner: step.owner,
            evidenceIds: Array.isArray(step.evidenceIds) ? step.evidenceIds.slice() : undefined,
            receiptId: step.receiptId,
            testSummary: step.testSummary,
            diffSummary: step.diffSummary,
            reviewSummary: step.reviewSummary,
            error: step.error,
            elapsedMs: step.elapsedMs,
            planId: planId ? String(planId) : this.planId,
            revision: revision !== undefined && revision >= 0 ? revision : this.planRevision,
            updatedAt: Date.now()
        }));
        if (this.planTodos.length <= 7) {
            this.planTodoExpanded = false;
        }
        if (sourceSessionId !== undefined) {
            this.planTodoSourceSessionId = String(sourceSessionId || '').trim();
        }
        if (scope !== undefined) {
            this.planScope = scope || '';
        }
        if (planId) {
            this.planId = String(planId);
        }
        if (revision !== undefined && revision >= 0) {
            this.planRevision = revision;
        }
        this.planMessage = this.buildPlanMessage();
    }

    mergePlanStepStatus(
        planId: string,
        stepId: string,
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed',
        opts: { sequence?: number; owner?: string; reason?: string; error?: string; elapsedMs?: number } = {}
    ): boolean {
        const currentPlanId = String(planId || '').trim();
        if (currentPlanId && this.planId && currentPlanId !== this.planId) {
            return false;
        }
        if (opts.sequence !== undefined && opts.sequence <= this.planEventSequence) {
            return false;
        }
        const index = this.planTodos.findIndex(todo => todo.id === stepId);
        if (index < 0) {
            return false;
        }
        if (opts.sequence !== undefined) {
            this.planEventSequence = opts.sequence;
        }
        const current = this.planTodos[index];
        const next: AgentConsolePlanTodoItem = {
            ...current,
            status,
            planId: this.planId || currentPlanId,
            updatedAt: Date.now()
        };
        if (opts.owner !== undefined) {
            next.owner = opts.owner;
        }
        if (opts.reason !== undefined) {
            next.blockedReason = opts.reason;
            if (!next.blockedBy) {
                next.blockedBy = [];
            }
            if (!next.blockedBy.includes(stepId)) {
                next.blockedBy = [...next.blockedBy, stepId];
            }
        }
        if (opts.error !== undefined) {
            next.error = opts.error;
        }
        if (opts.elapsedMs !== undefined) {
            next.elapsedMs = opts.elapsedMs;
        }
        this.planTodos = [
            ...this.planTodos.slice(0, index),
            next,
            ...this.planTodos.slice(index + 1)
        ];
        this.planMessage = this.buildPlanMessage();
        return true;
    }

    // Cancel all remaining pending/in-progress steps. Sequence-guarded ONCE for the
    // whole bulk (not per step), so a single reused event sequence cannot drop later steps.
    cancelRemainingPlanSteps(planId?: string, sequence?: number): void {
        if (sequence !== undefined && sequence <= this.planEventSequence) {
            return;
        }
        if (sequence !== undefined) {
            this.planEventSequence = sequence;
        }
        let changed = false;
        this.planTodos = this.planTodos.map(todo => {
            if (todo.status === 'pending' || todo.status === 'in_progress') {
                changed = true;
                return { ...todo, status: 'cancelled' as const, planId: this.planId || (planId ? String(planId) : todo.planId), updatedAt: Date.now() };
            }
            return todo;
        });
        if (changed) {
            this.planMessage = this.buildPlanMessage();
        }
    }

    setGoalSummary(goal: AgentConsoleGoalSummary | null | undefined): void {
        setGoalSummaryInState(this, goal);
    }

    get goalCriteriaProgress(): { met: number; total: number } | null {
        return resolveGoalCriteriaProgress(this);
    }

    buildPlanMessage(): AgentMessage | null {
        return buildPlanMessageInState(this);
    }

    formatElapsed(ms: number): string {
        return formatElapsedInState(ms);
    }

    togglePlanTodoExpanded(): boolean {
        return togglePlanTodoExpandedInState(this);
    }

    planTodoGlyph(status: AgentConsolePlanTodoItem['status']): string {
        return planTodoGlyphInState(status);
    }

    hasActivePlanTodos(): boolean {
        return hasActivePlanTodosInState(this);
    }

    clearPlanTodos(): void {
        clearPlanTodosInState(this);
    }

    get filteredPlanTodos(): AgentConsolePlanTodoItem[] {
        return resolveFilteredPlanTodos(this);
    }

    get selectedPlanTodo(): AgentConsolePlanTodoItem | null {
        return resolveSelectedPlanTodo(this);
    }

    get planTodoFilterLabel(): string {
        return resolvePlanTodoFilterLabel(this);
    }

    setPlanTodoFilter(filter: 'all' | 'active' | 'blocked' | 'failed'): void {
        setPlanTodoFilterInState(this, filter);
    }

    movePlanTodoSelection(direction: -1 | 1): boolean {
        return movePlanTodoSelectionInState(this, direction);
    }

    jumpToNextBlockedPlanTodo(): boolean {
        return jumpToNextBlockedPlanTodoInState(this);
    }

    jumpToNextFailedPlanTodo(): boolean {
        return jumpToNextFailedPlanTodoInState(this);
    }

    get selectedPlanTodoDetailLabel(): string {
        return resolveSelectedPlanTodoDetailLabel(this);
    }

    setPendingQuestion(question: AgentConsolePendingQuestion | null): void {
        setPendingQuestionInState(this, question);
    }

    finishPendingQuestion(): AgentConsolePendingQuestion | null {
        return finishPendingQuestionInState(this);
    }

    /** Queue count exposed for `current/total` UI projection. */
    get pendingQuestionTotal(): number {
        return resolvePendingQuestionTotal(this);
    }

    markPendingQuestionExpired(questionId?: string): void {
        markPendingQuestionExpiredInState(this, questionId);
    }

    movePendingQuestionSelection(delta: number): void {
        movePendingQuestionSelectionInState(this, delta);
    }

    movePendingQuestionSelectionToEdge(edge: 'start' | 'end'): void {
        movePendingQuestionSelectionToEdgeInState(this, edge);
    }

    movePendingQuestionSelectionPage(direction: 1 | -1): void {
        movePendingQuestionSelectionPageInState(this, direction);
    }

    async choosePendingQuestion(index = this.pendingQuestionSelectedIndex): Promise<boolean> {
        return choosePendingQuestionInState(this, index);
    }

    buildLegacyQuestionId(question: AgentConsolePendingQuestion): string {
        return buildLegacyQuestionIdInState(question);
    }

    resumeAfterQuestionAnswer(): void {
        resumeAfterQuestionAnswerInState(this);
    }

    async dismissPendingQuestion(): Promise<boolean> {
        return dismissPendingQuestionInState(this);
    }

    async submitPendingQuestionInput(): Promise<boolean> {
        return submitPendingQuestionInputInState(this);
    }

    async retrySelectedPlanTodo(): Promise<boolean> {
        return retrySelectedPlanTodoInState(this);
    }

    isPlanActionApplicable(action: AgentConsolePlanActionKind, item: AgentConsolePlanTodoItem): boolean {
        return isPlanActionApplicableInState(action, item);
    }

    requestPlanAction(action: AgentConsolePlanActionKind, stepId: string, payload?: Record<string, unknown>): boolean {
        return requestPlanActionInState(this, action, stepId, payload);
    }

    planActionPromptLabel(action: AgentConsolePlanActionKind, item: AgentConsolePlanTodoItem): string {
        return planActionPromptLabelInState(action, item);
    }

    dismissPlanAction(): void {
        dismissPlanActionInState(this);
    }

    confirmPlanAction(): boolean {
        return confirmPlanActionInState(this);
    }

    applyPlanActionOptimistically(
        action: AgentConsolePlanActionKind,
        item: AgentConsolePlanTodoItem,
        payload?: Record<string, unknown>
    ): AgentConsolePlanTodoItem {
        return applyPlanActionOptimisticallyInState(this, action, item, payload);
    }

    rollbackPlanAction(stepId: string, previous: AgentConsolePlanTodoItem | null): void {
        rollbackPlanActionInState(this, stepId, previous);
    }

    setTasksFocused(focused: boolean): void {
        setTasksFocusedInState(this, focused);
    }

    setSelectedReviewTaskId(taskId: string): void {
        setSelectedReviewTaskIdInState(this, taskId);
    }

    get selectedTask(): Record<string, any> | undefined {
        return resolveSelectedTask(this);
    }

    get filteredReviewTaskChoices(): AgentConsoleReviewTaskItem[] {
        return resolveFilteredReviewTaskChoices(this);
    }

    formatScheduledTimestamp(value?: number): string {
        return formatScheduledTimestampInState(value);
    }

    buildSelectedScheduledTaskCopyText(): string {
        return buildSelectedScheduledTaskCopyTextInState(this);
    }

    setToolsFocused(focused: boolean): void {
        setToolsFocusedInState(this, focused);
    }

    setSelectedToolName(toolName: string): void {
        setSelectedToolNameInState(this, toolName);
    }

    moveToolSelection(delta: number): void {
        moveToolSelectionInState(this, delta);
    }

    moveToolSelectionPage(delta: number, pageSize?: number): void {
        moveToolSelectionPageInState(this, delta, pageSize);
    }

    selectFirstTool(): void {
        selectFirstToolInState(this);
    }

    selectLastTool(): void {
        selectLastToolInState(this);
    }

    get selectedTool(): AgentConsoleToolItem | undefined {
        return resolveSelectedTool(this);
    }

    moveToolRunSelection(delta: number): void {
        moveToolRunSelectionInState(this, delta);
    }

    moveToolRunSelectionPage(delta: number, pageSize?: number): void {
        moveToolRunSelectionPageInState(this, delta, pageSize);
    }

    selectFirstToolRun(): void {
        selectFirstToolRunInState(this);
    }

    selectLastToolRun(): void {
        selectLastToolRunInState(this);
    }

    get selectedToolRun(): AgentConsoleToolRun | undefined {
        return resolveSelectedToolRun(this);
    }

    setApprovalsFocused(focused: boolean): void {
        setApprovalsFocusedInState(this, focused);
    }

    requestApprovalAttention(): void {
        requestApprovalAttentionInState(this);
    }

    setSelectedApprovalId(approvalId: string): void {
        setSelectedApprovalIdInState(this, approvalId);
    }

    moveApprovalSelection(delta: number): void {
        moveApprovalSelectionInState(this, delta);
    }

    moveApprovalSelectionPage(delta: number, pageSize?: number): void {
        moveApprovalSelectionPageInState(this, delta, pageSize);
    }

    selectFirstApproval(): void {
        selectFirstApprovalInState(this);
    }

    selectLastApproval(): void {
        selectLastApprovalInState(this);
    }

    get selectedApproval(): AgentConsoleApprovalRequest | undefined {
        return resolveSelectedApproval(this);
    }

    setReviewTasks(tasks: AgentConsoleReviewTaskItem[]): void {
        this.reviewTaskChoices = tasks.slice();
        syncFilteredTaskSelectionInState(this);
    }

    openReview(
        task?: Record<string, any> | null,
        payload?: {
            diff?: any;
            workers?: AgentConsoleReviewWorker[];
            executionMode?: 'sequential' | 'parallel' | null;
        }
    ): void {
        openReviewInState(this, task, payload);
    }

    buildFileChangeMessage(): AgentMessage | null {
        return buildFileChangeMessageInState(this);
    }

    closeReview(): void {
        closeReviewInState(this);
    }

    openGitSnapshotDetail(header: string, lines: string[], stats?: string, ref?: string): void {
        this.gitSnapshotOpen = true;
        this.gitSnapshotCurrentRef = ref || '';
        this.gitSnapshotHeaderLabel = header;
        this.gitSnapshotStatsLabel = stats || '';
        this.gitSnapshotDetailLines = lines.slice();
        this.gitSnapshotDetailScroll = 0;
        this.gitSnapshotDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
    }

    closeGitSnapshotDetail(): void {
        if (!this.gitSnapshotOpen && this.gitSnapshotDetailScroll === 0 && this.gitSnapshotDetailColumnScroll === 0) {
            return;
        }
        this.gitSnapshotOpen = false;
        this.gitSnapshotCurrentRef = '';
        this.gitSnapshotDetailLines = [];
        this.gitSnapshotDetailScroll = 0;
        this.gitSnapshotDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
    }

    scrollGitSnapshotDetail(delta: number): void {
        if (!this.gitSnapshotOpen) {
            return;
        }
        const visible = this.consoleOptions.reviewDetailVisibleLines;
        const maxScroll = Math.max(0, this.gitSnapshotDetailLines.length - visible);
        this.gitSnapshotDetailScroll = Math.max(0, Math.min(maxScroll, this.gitSnapshotDetailScroll + delta));
    }

    scrollGitSnapshotDetailPage(delta: number, pageSize?: number): void {
        if (!this.gitSnapshotOpen) {
            return;
        }
        const resolvedPageSize = pageSize ?? this.consoleOptions.reviewDetailPageSize;
        this.scrollGitSnapshotDetail(delta * Math.max(1, resolvedPageSize));
    }

    scrollGitSnapshotDetailToEdge(position: 'start' | 'end'): void {
        if (!this.gitSnapshotOpen) {
            return;
        }
        const visible = this.consoleOptions.reviewDetailVisibleLines;
        this.gitSnapshotDetailScroll = position === 'start' ? 0 : Math.max(0, this.gitSnapshotDetailLines.length - visible);
    }

    scrollGitSnapshotDetailColumns(delta: number): void {
        if (!this.gitSnapshotOpen) {
            return;
        }
        this.gitSnapshotDetailColumnScroll = Math.max(0, this.gitSnapshotDetailColumnScroll + delta);
    }

    clearReview(): void {
        clearReviewInState(this);
    }

    get reviewExecutionMode(): 'sequential' | 'parallel' | null {
        return resolveReviewExecutionMode(this);
    }

    get reviewGroups(): AgentConsoleReviewGroup[] {
        return resolveReviewGroups(this);
    }

    get selectedReviewGroup(): AgentConsoleReviewGroup | undefined {
        return resolveSelectedReviewGroup(this);
    }

    get aggregateReviewFileSections(): AgentConsoleReviewDiffSection[] {
        return resolveAggregateReviewFileSections(this);
    }

    get reviewFileSections(): AgentConsoleReviewDiffSection[] {
        return resolveReviewFileSections(this);
    }

    moveReviewGroupSelection(delta: number): void {
        moveReviewGroupSelectionInState(this, delta);
    }

    setReviewPatchFilter(filter: AgentConsoleReviewPatchFilter): void {
        setReviewPatchFilterInState(this, filter);
    }

    setReviewFileAnnotation(status: 'approved' | 'rejected', comment?: string, filePath?: string): void {
        setReviewFileAnnotationInState(this, status, comment, filePath);
    }

    clearReviewFileAnnotation(filePath?: string): void {
        clearReviewFileAnnotationInState(this, filePath);
    }

    approveAllReviewFiles(comment?: string): void {
        approveAllReviewFilesInState(this, comment);
    }

    rejectAllReviewFiles(comment?: string): void {
        rejectAllReviewFilesInState(this, comment);
    }

    setReviewHunkAnnotation(status: 'approved' | 'rejected', comment?: string, filePath?: string, hunkIndex?: number): void {
        setReviewHunkAnnotationInState(this, status, comment, filePath, hunkIndex);
    }

    clearReviewHunkAnnotation(filePath?: string, hunkIndex?: number): void {
        clearReviewHunkAnnotationInState(this, filePath, hunkIndex);
    }

    getReviewHunkAnnotation(filePath: string, hunkIndex: number): AgentConsoleReviewAnnotation | undefined {
        return getReviewHunkAnnotationInState(this, filePath, hunkIndex);
    }

    approveAllReviewHunksForFile(comment?: string, filePath?: string): void {
        approveAllReviewHunksForFileInState(this, comment, filePath);
    }

    rejectAllReviewHunksForFile(comment?: string, filePath?: string): void {
        rejectAllReviewHunksForFileInState(this, comment, filePath);
    }

    collectReviewConclusions(): ReturnType<typeof collectReviewConclusionsInState> {
        return collectReviewConclusionsInState(this);
    }

    writeReviewConclusions(): ReturnType<typeof writeReviewConclusionsInState> {
        return writeReviewConclusionsInState(this);
    }

    clearAllReviewAnnotations(): void {
        clearAllReviewAnnotationsInState(this);
    }

    getReviewAnnotationSummary(): string[] {
        return getReviewAnnotationSummaryInState(this);
    }

    computeFileRiskScore(section: AgentConsoleReviewDiffSection): ReturnType<typeof computeFileRiskScoreInState> {
        return computeFileRiskScoreInState(section);
    }

    getReviewExportReport(): string[] {
        return getReviewExportReportInState(this);
    }

    buildReviewAssessmentLines(): string[] {
        return buildReviewAssessmentLinesInState(this);
    }

    filterReviewPatchLines(lines: string[]): string[] {
        return filterReviewPatchLinesInState(this, lines);
    }

    parseReviewHunks(section: AgentConsoleReviewDiffSection): AgentConsoleReviewHunk[] {
        return parseReviewHunksInState(this, section);
    }

    isReviewHunkFolded(groupKey: string, path: string, hunkIndex: number): boolean {
        return isReviewHunkFoldedInState(this, groupKey, path, hunkIndex);
    }

    toggleReviewHunkFold(): void {
        toggleReviewHunkFoldInState(this);
    }

    renderReviewPatchLines(section: AgentConsoleReviewDiffSection, groupKey: string): string[] {
        return renderReviewPatchLinesInState(this, section, groupKey);
    }

    toggleReviewSideBySide(): void {
        toggleReviewSideBySideInState(this);
    }

    get selectedReviewFileSection(): AgentConsoleReviewDiffSection | undefined {
        return resolveSelectedReviewFileSection(this);
    }

    setSelectedReviewFileIndex(index: number): void {
        setSelectedReviewFileIndexInState(this, index);
    }

    moveReviewFileSelection(delta: number): void {
        moveReviewFileSelectionInState(this, delta);
    }

    get reviewDetailLines(): string[] {
        return resolveReviewDetailLines(this);
    }

    get reviewDetailMaxColumn(): number {
        return resolveReviewDetailMaxColumn(this);
    }

    scrollReviewDetail(delta: number): void {
        scrollReviewDetailInState(this, delta);
    }

    scrollReviewDetailPage(delta: number, pageSize?: number): void {
        scrollReviewDetailPageInState(this, delta, pageSize);
    }

    scrollReviewDetailToEdge(position: 'start' | 'end'): void {
        scrollReviewDetailToEdgeInState(this, position);
    }

    jumpReviewHunk(direction: -1 | 1): void {
        jumpReviewHunkInState(this, direction);
    }

    scrollReviewDetailColumns(delta: number): void {
        scrollReviewDetailColumnsInState(this, delta);
    }

    scrollReviewDetailColumnsToEdge(position: 'start' | 'end'): void {
        scrollReviewDetailColumnsToEdgeInState(this, position);
    }

    /**
     * Persists a command output to the durable store when one is configured.
     * Never throws: persistence is best-effort and must not break the live ring.
     */

    /**
     * Injects a durable command-output store. When provided, results are
     * persisted and can be rehydrated via `loadCommandOutputHistory`.
     */

    /**
     * Hydrates the in-memory command-output ring from the durable store
     * (newest-first, capped at the ring cap). Used on configure/session switch.
     */

    get latestCommandExecution(): AgentConsoleCommandExecution | undefined {
        return this.commandExecutions[0];
    }

    setNotice(message: string): void { setNoticeInState(this, message); }
    openTextOverlay(title: string, lines: string[], visibleLines?: number): void { openTextOverlayInState(this, title, lines, visibleLines); }
    closeTextOverlay(): void { closeTextOverlayInState(this); }
    hasTextOverlayFocus(): boolean { return hasTextOverlayFocusInState(this); }
    pushCommandOutput(command: string, text: string, kind: AgentConsoleCommandOutputEntry['kind'] = 'result'): string { return pushCommandOutputInState(this, command, text, kind); }
    persistCommandOutput(entry: AgentConsoleCommandOutputEntry): Promise<void> { return persistCommandOutputInState(this, entry); }
    setCommandOutputStore(store: CommandOutputStore | undefined): void { setCommandOutputStoreInState(this, store); }
    async loadCommandOutputHistory(): Promise<void> { return loadCommandOutputHistoryInState(this); }
    openCommandOutputs(): void { openCommandOutputsInState(this); }
    closeCommandOutputs(): void { closeCommandOutputsInState(this); }
    toggleCommandOutputs(): void { toggleCommandOutputsInState(this); }
    hasCommandOutputsFocus(): boolean { return hasCommandOutputsFocusInState(this); }
    setCommandOutputsFilter(filter: string): void { setCommandOutputsFilterInState(this, filter); }
    moveCommandOutputSelection(delta: number): void { moveCommandOutputSelectionInState(this, delta); }
    copySelectedCommandOutput(): Promise<boolean> { return copySelectedCommandOutputInState(this); }
    scrollCommandOutputsToEdge(position: 'start' | 'end'): void { scrollCommandOutputsToEdgeInState(this, position); }
    scrollCommandOutputsPage(delta: number, pageSize?: number): void { scrollCommandOutputsPageInState(this, delta, pageSize); }
    scrollTextOverlay(delta: number): void { scrollTextOverlayInState(this, delta); }
    scrollTextOverlayPage(delta: number, pageSize?: number): void { scrollTextOverlayPageInState(this, delta, pageSize); }
    scrollTextOverlayToEdge(position: 'start' | 'end'): void { scrollTextOverlayToEdgeInState(this, position); }

    setCommandExecutionControl(control: CommandExecutionControlPort): void {
        this.commandExecutionControl = control;
        this._commandExecutionController = undefined;
    }

    protected requireCommandExecutionControl(): CommandExecutionControlPort {
        if (!this.commandExecutionControl) {
            throw new Error(formatAgentUiNotice(undefined, 'sessionStateRequiresCommandExecution'));
        }
        return this.commandExecutionControl;
    }

    /** Projects one command lifecycle into the shared, stable-key transcript. */
    protected syncCommandExecutionTranscript(requestId: string): void {
        const execution = this.commandExecutions.find(item => item.requestId === requestId);
        if (!execution) {
            return;
        }
        const details = [execution.command, execution.args].filter(Boolean).join(' ');
        const statusKey = execution.status === 'running' ? 'running'
            : execution.status === 'succeeded' ? 'completed'
                : execution.status === 'cancelled' ? 'cancelled' : 'failed';
        const status = this.translateLabel(`agent.command.status.${statusKey}`, undefined, statusKey);
        const suffix = execution.error ? `: ${execution.error}` : '';
        const content = `${details || this.translateLabel('agent.command.label', undefined, 'Command')} ${status}${suffix}`;
        this.projectThreadItem({
            kind: 'command',
            key: execution.requestId,
            sessionId: this.sessionId,
            content,
            status: execution.status === 'succeeded' ? 'success' : execution.status === 'failed' ? 'error' : execution.status === 'cancelled' ? 'cancelled' : execution.status === 'running' ? 'running' : undefined,
            sequence: execution.sequence,
            attempt: execution.attempt,
            command: execution.command,
            args: execution.args,
            outputIds: execution.outputIds,
            error: execution.error,
            retryable: execution.retryable,
            source: 'local'
        });
    }

    get visibleCommandOutputs(): AgentConsoleCommandOutputEntry[] {
        const needle = this.commandOutputsFilter.trim().toLowerCase();
        if (!needle) {
            return this.commandOutputs;
        }
        return this.commandOutputs.filter(entry =>
            entry.command.toLowerCase().includes(needle) || entry.text.toLowerCase().includes(needle)
        );
    }

    get textOverlayPageSize(): number {
        return this.textOverlay?.visibleLines ?? this.consoleOptions.reviewDetailVisibleLines;
    }

    get textOverlayVisibleLines(): string[] {
        if (!this.textOverlay) {
            return [];
        }
        const visible = this.textOverlayPageSize;
        return this.textOverlay.lines.slice(this.textOverlay.scroll, this.textOverlay.scroll + visible);
    }

    setCommandHints(commands: string[]): void {
        this.injectedCommandHints = Array.from(new Set(commands.filter(Boolean)));
        this.refreshInputSuggestions();
    }

    setWorkspaceMentionResolver(resolver?: AgentConsoleWorkspaceMentionResolver): void {
        this.workspaceMentionResolver = resolver;
        this.refreshInputSuggestions();
    }

    setMentionCatalog(catalog: AgentConsoleMentionCatalogItem[]): void {
        this.mentionCatalog = catalog.slice();
        this.refreshInputSuggestions();
    }

    setQueuedPromptCount(count: number): void {
        this.queuedPromptCount = Math.max(0, Math.floor(Number(count) || 0));
    }

    setShowThinking(value: boolean): void {
        this.showThinking = !!value;
    }

    setShowTimestamps(value: boolean): void {
        this.showTimestamps = !!value;
    }

    setShowCriticalMarks(value: boolean): void {
        this.showCriticalMarks = !!value;
    }

    setShowToolOutput(value: boolean): void {
        this.showToolOutput = !!value;
    }

    setShowUsername(value: boolean): void {
        this.showUsername = !!value;
    }

    setTimelineMode(value: boolean | 'off' | 'compact' | 'steps' | 'verbose'): void {
        if (typeof value === 'boolean') {
            this.timelineViewMode = value ? 'compact' : 'off';
        } else {
            this.timelineViewMode = value;
        }
    }

    get messageLayout(): 'scrollback' | 'viewport' {
        return normalizeMessageLayout(this.consoleOptions.messageLayout);
    }

    setMessageLayout(value: 'scrollback' | 'viewport' | 'stream'): void {
        this.consoleOptions = {
            ...this.consoleOptions,
            messageLayout: normalizeMessageLayout(value)
        };
    }

    setWhichKeyVisible(value: boolean): void {
        this.whichKeyVisible = !!value;
        if (!this.whichKeyVisible) {
            this.whichKeyBindings = [];
        }
    }

    setWhichKeyBindings(bindings: Array<{ key: string; action: string }>): void {
        this.whichKeyBindings = bindings.slice();
    }

    toggleWhichKeyLayout(): void {
        this.whichKeyLayout = this.whichKeyLayout === 'compact' ? 'grouped' : 'compact';
        this.whichKeyPage = 0;
    }

    toggleWhichKeyFilterCustom(): void {
        this.whichKeyFilterCustom = !this.whichKeyFilterCustom;
        this.whichKeyPage = 0;
    }

    setWhichKeyPage(page: number): void {
        this.whichKeyPage = Math.max(0, page);
    }

    setHealthPopoverVisible(value: boolean): void {
        this.healthPopoverVisible = !!value;
        if (!this.healthPopoverVisible) {
            this.healthItems = [];
        }
    }

    setHealthItems(items: AgentConsoleHealthItem[]): void {
        this.healthItems = items.slice();
    }

    setRawMode(value: boolean): void {
        this.rawMode = !!value;
    }

    setTheme(theme?: AgentConsoleThemeInput | null): void {
        this.theme = mergeAgentConsoleTheme(theme);
        this.themeStyles = resolveAgentConsoleThemeStyles(this.theme);
    }

    setConsoleOptions(options?: AgentConsoleOptions | null): void {
        this.hostProvidedOptions = new Set(Object.keys(options || {}).filter(key => (options as any)[key] !== undefined && !(key.endsWith('Hint') && (options as any)[key] === (defaultAgentConsoleOptions as any)[key])));
        this.consoleOptions = {
            ...defaultAgentConsoleOptions,
            ...(options || {})
        };
        for (const key of Object.keys(this.localeOptionOverrides) as Array<keyof AgentConsoleOptions>) {
            if (!options || (options as any)[key] === undefined || (key.endsWith('Hint') && (options as any)[key] === (defaultAgentConsoleOptions as any)[key])) {
                (this.consoleOptions as any)[key] = (this.localeOptionOverrides as any)[key];
            }
        }
        this.inputPrompt = this.consoleOptions.inputPrompt;
        this.inputContinuationPrompt = this.consoleOptions.inputContinuationPrompt;
        this.inputPlaceholder = this.consoleOptions.inputPlaceholder;
        this.vimMode = this.consoleOptions.vimMode;
        this.messageDetailVisibleLines = this.consoleOptions.messageDetailVisibleLines;
        if (!this.vimMode) {
            this.inputMode = 'insert';
            this.vimPendingKey = '';
        }
    }

    setMessageDetailVisibleLines(value: number): void {
        this.messageDetailVisibleLines = Math.max(1, Math.floor(Number(value) || defaultAgentConsoleOptions.messageDetailVisibleLines));
        const maxScroll = Math.max(0, this.messageDetailLines.length - this.messageDetailVisibleLines);
        this.messageDetailScroll = Math.min(this.messageDetailScroll, maxScroll);
    }
    setPendingApprovals(requests: AgentConsoleApprovalRequest[]): void {
        this.pendingApprovals = requests
            .slice()
            .sort((left, right) => left.createdAt - right.createdAt);
        if (!this.pendingApprovals.length) {
            this.selectedApprovalId = '';
            this.approvalsFocused = false;
        } else if (this.selectedApprovalId && this.pendingApprovals.some(item => item.id === this.selectedApprovalId)) {
            // Preserve explicit approval selection when possible.
        } else {
            this.selectedApprovalId = this.pendingApprovals[0].id;
        }
        this.syncDerivedInputFocus();
    }

    upsertPendingApproval(request: AgentConsoleApprovalRequest): void {
        // The same request can arrive twice (in-process event bridge plus the
        // streamed RPC chunk). The first arrival owns the identity details, so
        // a sparse duplicate must not erase the reason/input/timing of an
        // already known request.
        const existing = this.pendingApprovals.find(item => item.id === request.id);
        const merged = existing ? {
            ...existing,
            ...request,
            reason: existing.reason || request.reason,
            reasonDetail: existing.reasonDetail || request.reasonDetail,
            summary: existing.summary || request.summary,
            inputSummary: existing.inputSummary || request.inputSummary,
            createdAt: existing.createdAt || request.createdAt,
            timeoutMs: existing.timeoutMs || request.timeoutMs,
            expiresAt: existing.expiresAt || request.expiresAt
        } : request;
        const next = this.pendingApprovals.filter(item => item.id !== request.id);
        next.push(merged);
        this.pendingApprovals = next.sort((left, right) => left.createdAt - right.createdAt);
        if (!this.pendingApprovals.length) {
            this.selectedApprovalId = '';
            this.approvalsFocused = false;
        } else if (!this.pendingApprovals.some(item => item.id === this.selectedApprovalId)) {
            this.selectedApprovalId = this.pendingApprovals[0].id;
        }
        this.syncDerivedInputFocus();
    }

    removePendingApproval(requestId: string): void {
        const next = this.pendingApprovals.filter(item => item.id !== requestId);
        if (next.length === this.pendingApprovals.length) {
            return;
        }
        this.pendingApprovals = next;
        if (!this.pendingApprovals.length) {
            this.selectedApprovalId = '';
            this.approvalsFocused = false;
        } else if (!this.pendingApprovals.some(item => item.id === this.selectedApprovalId)) {
            this.selectedApprovalId = this.pendingApprovals[0].id;
        }
        this.syncDerivedInputFocus();
    }

    selectAsync(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string, kind?: string): Promise<string | undefined> { return selectAsyncInState(this, title, options, selectedIndex, hint, kind); }
    openSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string, kind?: string): void { openSelectMenuInState(this, title, options, selectedIndex, hint, kind); }
    closeSelectMenu(): void { closeSelectMenuInState(this); }
    async dismissSelectMenuLayer(): Promise<void> { return dismissSelectMenuLayerInState(this); }
    setSelectMenuIndex(index: number): void { setSelectMenuIndexInState(this, index); }
    moveSelectMenu(delta: number): void { moveSelectMenuInState(this, delta); }
    moveSelectMenuToEdge(edge: 'start' | 'end'): void { moveSelectMenuToEdgeInState(this, edge); }
    moveSelectMenuPage(direction: 1 | -1): void { moveSelectMenuPageInState(this, direction); }
    get selectedSelectMenuOption(): AgentConsoleSelectOption | undefined { return resolveSelectedSelectMenuOption(this); }
    isArgumentSuggestionMenu(menu: AgentConsoleSelectMenu | undefined): boolean { return isArgumentSuggestionMenuInState(this, menu); }
    shouldSubmitConfirmedSelectMenuValue(menu: AgentConsoleSelectMenu | undefined, value?: string): boolean { return shouldSubmitConfirmedSelectMenuValueInState(this, menu, value); }
    async confirmSelectMenu(value?: string): Promise<string | undefined> { return confirmSelectMenuInState(this, value); }
    async confirmSelectMenuAndKeepOpen(value?: string): Promise<string | undefined> { return confirmSelectMenuAndKeepOpenInState(this, value); }
    async completeSelectMenu(value?: string): Promise<string | undefined> { return completeSelectMenuInState(this, value); }
    async acceptSelectMenu(value?: string): Promise<{ value: string | undefined; submitted: boolean }> { return acceptSelectMenuInState(this, value); }
    async acceptSelectMenuIndex(index: number): Promise<{ value: string | undefined; submitted: boolean }> { return acceptSelectMenuIndexInState(this, index); }
    async chooseSelectMenuIndex(index: number): Promise<void> { return chooseSelectMenuIndexInState(this, index); }
    async cancelSelectMenu(): Promise<void> { return cancelSelectMenuInState(this); }
    async openSubSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<void> { return openSubSelectMenuInState(this, title, options, selectedIndex, hint); }
    async resolveSelectMenu(value: string | undefined): Promise<void> { return resolveSelectMenuInState(this, value); }

    setProviderWizard(patch: Partial<AgentConsoleProviderWizardState>): void {
        this.providerWizard = {
            ...(this.providerWizard || {
                open: true, phase: 'choose', stepIndex: 0, stepCount: 1,
                stepLabel: '', progress: '', prompt: '', help: '', hint: '', secret: false, summary: []
            }),
            ...patch
        };
    }

    closeProviderWizard(): void {
        this.providerWizard = undefined;
        this.inputSecret = false;
        this.inputPrompt = this.consoleOptions.inputPrompt;
    }

    /**
     * True when the open suggestion menu completes a subcommand/enum argument
     * (`/statusline l|ist`). Enter must then execute the completed command;
     * Tab stays a pure completion.
     */

    /** Tab: fill the input with the highlighted suggestion without executing it. */

    /**
     * Re-open the `/` or `@` suggestion menu for the current token.
     *
     * Esc closes the menu; without this, Tab could not bring it back and the
     * only way to continue was editing the text.
     */
    reopenInputSuggestions(): boolean {
        if (!getAgentConsoleInputTokenRange(this.input, this.inputCursor)?.token) {
            return false;
        }
        this.refreshInputSuggestions();
        return true;
    }

    refreshInputSuggestions(): void {
        if (this.selectMenu && !isAgentConsoleSuggestionMenu(this.selectMenu)) {
            return;
        }
        if (this.suppressSuggestionMenu) {
            this.suppressSuggestionMenu = false;
            return;
        }
        const currentInput = this.input;
        const currentCursor = this.inputCursor;
        const active = getAgentConsoleInputTokenRange(currentInput, currentCursor);
        const applySuggestions = (workspaceSuggestions: AgentConsoleSelectOption[] = []) => {
            const activeToken = getAgentConsoleInputTokenRange(this.input, this.inputCursor)?.token;
            const commandCandidates = activeToken === '/'
                ? agentConsoleCommandHints(this.injectedCommandHints)
                : this.commandHints;
            const options = resolveAgentConsoleInputSuggestions(
                this.input,
                this.inputCursor,
                commandCandidates,
                this.tools,
                workspaceSuggestions,
                this.suggestionLabels(),
                (command, index, words, token) => resolveDynamicArgumentValues({ tools: this.tools, sessions: this.sessions, mentionCatalog: this.mentionCatalog }, command, index, token)
            );
            if (!options.length) {
                if (isAgentConsoleSuggestionMenu(this.selectMenu)) {
                    this.selectMenu = undefined;
                    this.selectMenuAction = undefined;
                }
                this.syncDerivedInputFocus();
                return;
            }
            // Async workspace suggestions append after the first render; keeping
            // the previous value then parked the highlight on a tool mention
            // (`@tim` + Enter submitted `@time` instead of inserting the file).
            const selectedValue = this.selectMenuTouched ? this.selectedSelectMenuOption?.value : undefined;
            const selectedIndex = Math.max(0, options.findIndex(option => option.value === selectedValue));
            this.selectMenu = {
                title: AGENT_CONSOLE_SUGGESTIONS_TITLE,
                hint: this.consoleOptions.suggestionsHint,
                options,
                selectedIndex
            };
            this.syncDerivedInputFocus();
            this.selectMenuAction = async (value?: string) => {
                if (!value) {
                    return;
                }
                const next = applyAgentConsoleSuggestion(this.input, this.inputCursor, value);
                this.input = next.value;
                this.inputCursor = this.clampCursor(this.input, next.cursor);
                this.refreshInputSuggestions();
                this.syncDerivedInputFocus();
            };
        };

        applySuggestions();
        if (!active?.token?.startsWith('@') || !this.workspaceMentionResolver) {
            return;
        }
        const requestId = ++this.workspaceSuggestionRequestId;
        void this.workspaceMentionResolver.resolveSuggestions(this.workspace, active.token, undefined, this.mentionCatalog).then(options => {
            if (requestId !== this.workspaceSuggestionRequestId) {
                return;
            }
            if (this.input !== currentInput || this.inputCursor !== currentCursor) {
                return;
            }
            applySuggestions(options);
        }).catch(() => undefined);
    }

    setRunningTool(toolName: string): void {
        this.activeToolSet.add(toolName);
        this.runningTools = Array.from(this.activeToolSet.values()).sort();
    }

    clearRunningTool(toolName: string): void {
        this.activeToolSet.delete(toolName);
        this.runningTools = Array.from(this.activeToolSet.values()).sort();
    }

    clearToolActivity(): void {
        if (!this.activeToolSet.size && !this.runningTools.length && !this.toolRuns.length) {
            return;
        }
        this.activeToolSet.clear();
        this.runningTools = [];
        this.toolRuns = [];
    }

    pushActivity(kind: AgentConsoleActivity['kind'], message: string): void {
        const normalizedMessage = String(message || '').trim();
        const lastActivity = this.activities[this.activities.length - 1];
        if (normalizedMessage && lastActivity?.kind === kind && lastActivity.message === normalizedMessage) {
            return;
        }
        this.activities = [
            ...this.activities.slice(-(this.consoleOptions.activityHistoryLimit - 1)),
            {
                id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                kind,
                message: normalizedMessage,
                createdAt: Date.now()
            }
        ];
    }

    upsertToolRun(run: AgentConsoleToolRun): void {
        const next = this.toolRuns.filter(item => item.name !== run.name);
        next.unshift(run);
        this.toolRuns = next.slice(0, this.consoleOptions.storedToolRunsLimit);
        this.selectedToolRunIndex = Math.max(0, Math.min(this.selectedToolRunIndex, this.toolRuns.length - 1));
    }

    summarize(value: string): string {
        const text = value.replace(/\s+/g, ' ').trim();
        return text.length > this.consoleOptions.summaryMaxLength
            ? `${text.slice(0, this.consoleOptions.summaryMaxLength)}...`
            : text;
    }

    toToolItem(definition: AgentToolDefinition, active: boolean): AgentConsoleToolItem {
        return {
            name: definition.name,
            toolset: definition.toolset,
            active,
            activationKind: definition.activation?.kind
        };
    }

    protected resolveUsageNumber(usage: any, keys: string[]): number | undefined {
        if (!usage || typeof usage !== 'object') {
            return undefined;
        }
        for (const key of keys) {
            const value = usage[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
        }
        return undefined;
    }

    protected resolveUsagePayload(payload: any): Record<string, any> | undefined {
        if (!payload || typeof payload !== 'object') return undefined;
        const candidates = [
            payload.usage,
            payload.metadata?.usage,
            payload.message?.metadata?.usage,
            payload.response?.metadata?.usage,
            payload
        ];
        return candidates.find(candidate => candidate && typeof candidate === 'object'
            && this.resolveUsageNumber(candidate, [
                'promptTokens', 'prompt_tokens', 'input_tokens',
                'completionTokens', 'completion_tokens', 'output_tokens',
                'totalTokens', 'total_tokens'
            ]) != null);
    }

    protected resolveTokenUsageFromMessages(messages: AgentMessage[]): AgentConsoleTokenUsage {
        return messages.reduce<AgentConsoleTokenUsage>((total, message) => {
            const usage = message?.metadata?.usage;
            if (!usage || typeof usage !== 'object') {
                return total;
            }
            const promptTokens = this.resolveUsageNumber(usage, ['promptTokens', 'prompt_tokens', 'input_tokens']);
            const completionTokens = this.resolveUsageNumber(usage, ['completionTokens', 'completion_tokens', 'output_tokens']);
            const totalTokens = this.resolveUsageNumber(usage, ['totalTokens', 'total_tokens'])
                ?? (promptTokens != null || completionTokens != null
                    ? (promptTokens || 0) + (completionTokens || 0)
                    : 0);
            total.promptTokens += promptTokens || 0;
            total.completionTokens += completionTokens || 0;
            total.totalTokens += totalTokens || 0;
            return total;
        }, { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    }

    expandTabs(value: string): string {
        return String(value || '').replace(/\t/g, '    ');
    }

    stringifyReviewContent(value: any): string {
        if (value == null) {
            return '';
        }
        if (typeof value === 'string') {
            return value.trim();
        }
        if (typeof value?.text === 'string') {
            return value.text.trim();
        }
        if (typeof value?.diff === 'string') {
            return value.diff.trim();
        }
        if (typeof value?.output === 'string') {
            return value.output.trim();
        }
        if (typeof value?.output?.text === 'string') {
            return value.output.text.trim();
        }
        if (typeof value?.output?.diff === 'string') {
            return value.output.diff.trim();
        }
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }

    parseUnifiedDiffSections(diffText: string): AgentConsoleReviewDiffSection[] {
        const text = String(diffText || '').trim();
        if (!text) {
            return [];
        }

        const sourceLines = text.split('\n');
        const sections: AgentConsoleReviewDiffSection[] = [];
        let current: AgentConsoleReviewDiffSection | undefined;

        const pushCurrent = () => {
            if (current?.lines.length) {
                const joined = current.lines.join('\n');
                const renameFrom = /^rename from (.+)$/m.exec(joined)?.[1]?.trim();
                const renameTo = /^rename to (.+)$/m.exec(joined)?.[1]?.trim();
                if (renameTo) {
                    current.path = renameTo;
                    current.previousPath = renameFrom;
                    current.status = 'rename';
                } else if (/^new file mode /m.test(joined) || /^--- \/dev\/null$/m.test(joined)) {
                    current.status = 'add';
                } else if (/^deleted file mode /m.test(joined) || /^\+\+\+ \/dev\/null$/m.test(joined)) {
                    current.status = 'delete';
                } else {
                    current.status = 'update';
                }
                sections.push(current);
            }
        };

        for (const line of sourceLines) {
            if (line.startsWith('diff --git ')) {
                pushCurrent();
                current = {
                    path: this.resolveDiffPathFromHeader(line),
                    additions: 0,
                    deletions: 0,
                    lines: [line]
                };
                continue;
            }

            if (!current) {
                current = {
                    path: 'unknown',
                    additions: 0,
                    deletions: 0,
                    lines: []
                };
            }

            current.lines.push(line);
            if (line.startsWith('+++ ')) {
                current.path = this.resolveDiffPathFromMarker(line, current.path);
                continue;
            }
            if (line.startsWith('+') && !line.startsWith('+++')) {
                current.additions += 1;
                continue;
            }
            if (line.startsWith('-') && !line.startsWith('---')) {
                current.deletions += 1;
            }
        }

        pushCurrent();
        return sections;
    }

    protected resolveDiffPathFromHeader(line: string): string {
        const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(String(line || '').trim());
        if (!match) {
            return 'unknown';
        }
        return match[2] || match[1] || 'unknown';
    }

    protected resolveDiffPathFromMarker(line: string, fallback: string): string {
        const match = /^\+\+\+\s+(?:b\/)?(.+)$/.exec(String(line || '').trim());
        if (!match) {
            return fallback;
        }
        const path = String(match[1] || '').trim();
        return path && path !== '/dev/null' ? path : fallback;
    }

    buildSelectedApprovalCopyText(): string {
        const selected = this.selectedApproval;
        if (!selected) {
            return '';
        }
        return [
            `${selected.toolName} (${selected.id})`,
            selected.reason,
            selected.inputSummary || selected.summary
        ].filter(Boolean).join('\n');
    }

    buildSelectedReviewCopyText(): string {
        const header = [
            this.reviewTask?.title || this.selectedReviewTaskId || 'review',
            this.reviewTask?.id ? `(${this.reviewTask.id})` : '',
            this.reviewTask?.status ? `status=${this.reviewTask.status}` : '',
            this.reviewExecutionMode ? `mode=${this.reviewExecutionMode}` : '',
            this.selectedReviewGroup ? `group=${this.selectedReviewGroup.label}` : '',
            this.selectedReviewPatchFilter !== 'all' ? `patch=${this.selectedReviewPatchFilter}` : '',
            this.selectedReviewFileSection?.path ? `file=${this.selectedReviewFileSection.path}` : ''
        ].filter(Boolean).join(' ');
        return [header, ...this.reviewDetailLines].filter(Boolean).join('\n');
    }

    resetReviewDetailViewport(): void {
        this.reviewDetailScroll = 0;
        this.reviewDetailColumnScroll = 0;
    }

    buildSelectedReviewGroupMetaLines(group: AgentConsoleReviewGroup): string[] {
        const lines = [
            this.selectedReviewPatchFilter !== 'all' ? this.translateLabel('agent.menu.panel.review.patchFilter', { filter: this.selectedReviewPatchFilter }, `Patch Filter: ${this.selectedReviewPatchFilter}`) : '',
            group.kind === 'worker' && group.status ? this.translateLabel('agent.menu.panel.review.workerStatus', { status: group.status }, `Worker Status: ${group.status}`) : '',
            group.kind === 'worker' && group.branch ? this.translateLabel('agent.menu.panel.review.workerBranch', { branch: group.branch }, `Worker Branch: ${group.branch}`) : '',
            group.kind === 'worker' && group.worktreePath ? this.translateLabel('agent.menu.panel.review.workerWorktree', { path: group.worktreePath }, `Worker Worktree: ${group.worktreePath}`) : '',
            group.kind === 'worker' && group.actionIds?.length ? this.translateLabel('agent.menu.panel.review.workerActions', { ids: group.actionIds.join(', ') }, `Worker Actions: ${group.actionIds.join(', ')}`) : '',
            group.kind === 'worker' && group.error ? this.translateLabel('agent.menu.panel.review.workerError', { error: group.error }, `Worker Error: ${group.error}`) : ''
        ].filter(Boolean);
        return [
            ...lines
        ].filter(Boolean);
    }

    describeReviewGroup(group: AgentConsoleReviewGroup): string {
        const meta = { label: group.label, kind: group.kind, status: group.status, fileCount: group.sections.length, hasError: !!group.error };
        return formatReviewGroupMeta(meta, (key, fallback, params) => this.translateLabel(`agent.menu.panel.review.${key}`, params, fallback));
    }

    syncCurrentReviewAnnotationCache(): void {
        const cacheKey = this.getCurrentReviewAnnotationCacheKey();
        if (!cacheKey) {
            return;
        }
        const hasFileAnnots = Object.keys(this.reviewFileAnnotations).length > 0;
        const hasHunkAnnots = Object.keys(this.reviewHunkAnnotations).length > 0;
        if (hasFileAnnots || hasHunkAnnots) {
            this.reviewAnnotationCache[cacheKey] = { ...this.reviewFileAnnotations, ...this.reviewHunkAnnotations };
            return;
        }
        delete this.reviewAnnotationCache[cacheKey];
    }

    protected getCurrentReviewAnnotationCacheKey(): string {
        const explicit = String(this.selectedReviewTaskCacheKey || '').trim();
        if (explicit) {
            return explicit;
        }
        const taskChoice = this.reviewTaskChoices.find(item => item.id === this.selectedReviewTaskId);
        return this.resolveReviewAnnotationCacheKey(this.reviewTask)
            || this.resolveReviewAnnotationCacheKey(taskChoice)
            || String(this.selectedReviewTaskId || '').trim();
    }

    resolveReviewAnnotationCacheKey(task?: {
        id?: string;
        cacheKey?: string;
        sourceSessionId?: string;
        sessionId?: string;
    } | null): string {
        const explicit = String(task?.cacheKey || '').trim();
        if (explicit) {
            return explicit;
        }
        const taskId = String(task?.id || '').trim();
        if (!taskId) {
            return '';
        }
        const sourceSessionId = String(task?.sourceSessionId || task?.sessionId || '').trim();
        return sourceSessionId ? `${sourceSessionId}:${taskId}` : taskId;
    }

    protected buildSelectedTaskCopyText(): string {
        const selected = this.selectedTask;
        if (!selected) {
            return '';
        }
        const workerCount = Array.isArray(selected?.result?.workers) ? selected.result.workers.length : 0;
        return [
            `${selected.title || selected.id} (${selected.id})`,
            selected.status ? `status=${selected.status}` : '',
            selected?.result?.executionMode || selected?.metadata?.executionMode ? `mode=${selected?.result?.executionMode || selected?.metadata?.executionMode}` : '',
            `workers=${workerCount}`,
            typeof selected?.planning?.summary === 'string' ? selected.planning.summary : '',
            typeof selected?.goal === 'string' ? selected.goal : ''
        ].filter(Boolean).join('\n');
    }

    protected formatContextPreparationSummary(report: ContextPreparationReport): string {
        const t = (key: string, params: Record<string, any> | undefined, fallback: string) => formatAgentUiLabel(this.translator, key, fallback, params);
        return [
            t('agent.context.strategy', { strategy: report.strategy }, `context ${report.strategy}`),
            t('agent.context.level', { level: report.level }, `level ${report.level}`),
            report.summaryInserted ? t('agent.context.summary', undefined, 'summary') : t('agent.context.noSummary', undefined, 'no summary'),
            t('agent.context.messages', { before: report.beforeMessageCount, after: report.afterMessageCount }, `${report.beforeMessageCount}→${report.afterMessageCount} msgs`),
            t('agent.context.tokens', { before: report.beforeTokens, after: report.afterTokens }, `${report.beforeTokens}→${report.afterTokens} tok`),
            t('agent.context.saved', { ratio: report.compressionRatio }, `${report.compressionRatio}% saved`),
            t('agent.context.retained', { rate: report.retentionRate }, `${report.retentionRate}% retained`),
            report.preservedAnchorCount ? t('agent.context.anchors', { count: report.preservedAnchorCount }, `${report.preservedAnchorCount} anchors`) : '',
            report.toolMessagesCompacted ? t('agent.context.tools', { count: report.toolMessagesCompacted }, `${report.toolMessagesCompacted} tools`) : '',
            report.cumulativeTokenSavings ? t('agent.context.cumulative', { count: report.cumulativeTokenSavings }, `cum ${report.cumulativeTokenSavings} tok`) : ''
        ].filter(Boolean).join(' · ');
    }

    async handleFocusKey(key: string, transcriptNavigationController: AgentConsoleTranscriptNavigationController): Promise<boolean> {
        const normalized = String(key || '').trim().toLowerCase();
        if (!normalized) {
            return false;
        }
        const questionResult = this.focusLayers.handlePendingQuestionKey(normalized);
        if (questionResult !== undefined) return questionResult;
        const commandOutputsResult = this.focusLayers.handleCommandOutputsKey(normalized, transcriptNavigationController);
        if (commandOutputsResult !== undefined) return commandOutputsResult;
        const textOverlayResult = this.focusLayers.handleTextOverlayKey(normalized, transcriptNavigationController);
        if (textOverlayResult !== undefined) return textOverlayResult;
        const gitSnapshotResult = this.focusLayers.handleGitSnapshotKey(normalized, transcriptNavigationController);
        if (gitSnapshotResult !== undefined) return gitSnapshotResult;
        const reviewResult = this.focusLayers.handleReviewKey(normalized, transcriptNavigationController);
        if (reviewResult !== undefined) return reviewResult;
        const timelineInspectorResult = this.focusLayers.handleTimelineInspectorKey(normalized, transcriptNavigationController);
        if (timelineInspectorResult !== undefined) return timelineInspectorResult;
        const messageDetailResult = this.focusLayers.handleMessageDetailKey(normalized, transcriptNavigationController);
        if (messageDetailResult !== undefined) return messageDetailResult;
        const messageListResult = this.focusLayers.handleMessageListKey(normalized, transcriptNavigationController);
        if (messageListResult !== undefined) return messageListResult;
        const approvalResult = this.focusLayers.handleApprovalKey(normalized, transcriptNavigationController);
        if (approvalResult !== undefined) return approvalResult;
        if (this.tasksFocused) {
            if ((normalized === 'esc' || normalized === 'escape') && this.canCancelFocusedCodingTask()) {
                await this.cancelFocusedCodingTask();
                return true;
            }
            if (this.focusLayers.isDismissKey(normalized)) {
                await this.focusLayers.dismiss(transcriptNavigationController);
                return true;
            }
            if (this.hasActivePlanTodos()) {
                switch (normalized) {
                    case 'up':
                        this.movePlanTodoSelection(-1);
                        return true;
                    case 'down':
                        this.movePlanTodoSelection(1);
                        return true;
                    case 'home':
                        this.selectedPlanTodoIndex = 0;
                        return true;
                    case 'end': {
                        const filtered = this.filteredPlanTodos;
                        this.selectedPlanTodoIndex = filtered.length > 0 ? filtered.length - 1 : -1;
                        return true;
                    }
                    case 'pageup': {
                        const pfUp = this.filteredPlanTodos;
                        this.selectedPlanTodoIndex = pfUp.length > 0 ? 0 : -1;
                        return true;
                    }
                    case 'pagedown': {
                        const pfDown = this.filteredPlanTodos;
                        this.selectedPlanTodoIndex = pfDown.length > 0 ? pfDown.length - 1 : -1;
                        return true;
                    }
                    case 'f': {
                        const cycle: Array<'all' | 'active' | 'blocked' | 'failed'> = ['all', 'active', 'blocked', 'failed'];
                        const next = cycle[(cycle.indexOf(this.planTodoFilter) + 1) % cycle.length];
                        this.setPlanTodoFilter(next);
                        return true;
                    }
                    case 'j':
                        this.jumpToNextBlockedPlanTodo();
                        return true;
                    case 'k':
                        this.jumpToNextFailedPlanTodo();
                        return true;
                    case 'enter':
                        this.planTodoExpanded = !this.planTodoExpanded;
                        return true;
                    case 'e':
                        this.planTodoExpanded = !this.planTodoExpanded;
                        return true;
                    case 'r':
                        return this.retrySelectedPlanTodo();
                }
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedTaskCopyText(), this.translateLabel('agent.notice.copyLabelSelectedTask', undefined, 'selected task'));
                    return true;
                case 'enter':
                    if (this.selectedTask?.id) {
                        await this.openSelectedTaskAction?.(this.selectedTask.id);
                        return true;
                    }
                    return false;
                case 'r':
                    if (this.canRetryFocusedCodingTask()) {
                        await this.retryFocusedCodingTask();
                        return true;
                    }
                    return false;
                case 'x':
                    if (this.selectedTask?.id) {
                        await this.cancelSelectedTaskAction?.(this.selectedTask.id);
                        return true;
                    }
                    return false;
                case 'b':
                    if (this.selectedTask?.id) {
                        await this.rollbackSelectedTaskAction?.(this.selectedTask.id);
                        return true;
                    }
                    return false;
                case 'l':
                    return focusSelectedTaskLineageFilterInState(this);
                case 'f':
                    setTaskFilterInState(this, 'failed');
                    return true;
                case 'v':
                    setTaskFilterInState(this, 'rollback');
                    return true;
                case 'u':
                    setTaskFilterInState(this, 'all');
                    return true;
                case 'down':
                    moveTaskSelectionInState(this, 1);
                    return true;
                case 'up':
                    moveTaskSelectionInState(this, -1);
                    return true;
                case 'pageup':
                    moveTaskSelectionPageInState(this, -1);
                    return true;
                case 'pagedown':
                    moveTaskSelectionPageInState(this, 1);
                    return true;
                case 'home':
                    selectFirstTaskInState(this);
                    return true;
                case 'end':
                    selectLastTaskInState(this);
                    return true;
                default:
                    return false;
            }
        }
        if (this.jobsFocused) {
            if (this.focusLayers.isDismissKey(normalized)) {
                await this.focusLayers.dismiss(transcriptNavigationController);
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedScheduledTaskCopyText(), this.translateLabel('agent.notice.copyLabelScheduledJob', undefined, 'scheduled job'));
                    return true;
                case 'enter':
                case 'p':
                    if (this.selectedScheduledTask?.id) {
                        await this.toggleSelectedScheduledTaskAction?.(this.selectedScheduledTask.id);
                        return true;
                    }
                    return false;
                case 'x':
                    if (this.selectedScheduledTask?.id) {
                        await this.cancelSelectedScheduledTaskAction?.(this.selectedScheduledTask.id);
                        return true;
                    }
                    return false;
                case 'r':
                    if (this.selectedScheduledTask?.id) {
                        await this.recoverSelectedScheduledTaskAction?.(this.selectedScheduledTask.id);
                        return true;
                    }
                    return false;
                case 'down':
                    this.moveScheduledTaskSelection(1);
                    return true;
                case 'up':
                    this.moveScheduledTaskSelection(-1);
                    return true;
                case 'pageup':
                    this.moveScheduledTaskSelectionPage(-1);
                    return true;
                case 'pagedown':
                    this.moveScheduledTaskSelectionPage(1);
                    return true;
                case 'home':
                    this.selectFirstScheduledTask();
                    return true;
                case 'end':
                    this.selectLastScheduledTask();
                    return true;
                default:
                    return false;
            }
        }
        if (this.toolsFocused) {
            if (this.focusLayers.isDismissKey(normalized)) {
                await this.focusLayers.dismiss(transcriptNavigationController);
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.selectedTool?.name || '', this.translateLabel('agent.notice.copyLabelToolName', undefined, 'tool name'));
                    return true;
                case 'enter':
                case 'approve':
                    if (this.selectedTool?.name) {
                        await this.activateSelectedToolAction?.(this.selectedTool.name);
                        return true;
                    }
                    return false;
                case 'down':
                    this.moveToolSelection(1);
                    return true;
                case 'up':
                    this.moveToolSelection(-1);
                    return true;
                case 'pageup':
                    this.moveToolSelectionPage(-1);
                    return true;
                case 'pagedown':
                    this.moveToolSelectionPage(1);
                    return true;
                case 'home':
                    this.selectFirstTool();
                    return true;
                case 'end':
                    this.selectLastTool();
                    return true;
                default:
                    return false;
            }
        }
        if (this.toolRunsFocused) {
            if (this.focusLayers.isDismissKey(normalized)) {
                await this.focusLayers.dismiss(transcriptNavigationController);
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedToolRunCopyText(), this.translateLabel('agent.notice.copyLabelToolRun', undefined, 'tool run'));
                    return true;
                case 'down':
                    this.moveToolRunSelection(1);
                    return true;
                case 'up':
                    this.moveToolRunSelection(-1);
                    return true;
                case 'pageup':
                    this.moveToolRunSelectionPage(-1);
                    return true;
                case 'pagedown':
                    this.moveToolRunSelectionPage(1);
                    return true;
                case 'home':
                    this.selectFirstToolRun();
                    return true;
                case 'end':
                    this.selectLastToolRun();
                    return true;
                default:
                    return false;
            }
        }
        if (this.sessionsFocused) {
            return (await this.focusLayers.handleSessionsKey(normalized, transcriptNavigationController)) ?? false;
        }
        return false;
    }

    canCancelFocusedCodingTask(): boolean {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        const status = String(task?.status || '').trim();
        return !!task?.id && (status === 'planned' || status === 'running');
    }

    canRetryFocusedCodingTask(): boolean {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        if (!task?.id) {
            return false;
        }
        const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
        if (workers.some((worker: any) => worker?.status === 'failed')) {
            return true;
        }
        return Number(task?.result?.aggregate?.failedWorkers || 0) > 0;
    }

    async cancelFocusedCodingTask(): Promise<void> {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        if (task?.id) {
            await this.cancelSelectedTaskAction?.(task.id);
        }
    }

    async retryFocusedCodingTask(): Promise<void> {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        if (task?.id) {
            await this.retrySelectedTaskAction?.(task.id);
        }
    }

    get currentReviewLineageTasks(): AgentConsoleReviewTaskItem[] {
        const currentTask = this.reviewTask || this.selectedTask;
        const lineageRootId = this.resolveTaskLineageRootId(currentTask);
        if (!lineageRootId) {
            return [];
        }
        return this.reviewTaskChoices.filter(item => this.resolveTaskLineageRootId(item) === lineageRootId);
    }

    async navigateReviewLineage(delta: number): Promise<boolean> {
        const lineageTasks = this.currentReviewLineageTasks;
        if (lineageTasks.length < 2) {
            return false;
        }
        const selectedTaskId = String(this.reviewTask?.id || this.selectedReviewTaskId || '').trim();
        const currentIndex = lineageTasks.findIndex(item => item.id === selectedTaskId);
        if (currentIndex < 0) {
            return false;
        }
        const nextIndex = currentIndex + delta;
        if (nextIndex < 0 || nextIndex >= lineageTasks.length) {
            return false;
        }
        const nextTask = lineageTasks[nextIndex];
        if (!nextTask?.id) {
            return false;
        }
        await this.openSelectedTaskAction?.(nextTask.id);
        return true;
    }

    resolveTaskLineageRootId(task: Record<string, any> | undefined | null): string {
        return resolveTaskLineageRootId(task);
    }

    async processRawChunk(
        chunk: string,
        options: { submitOnEnter?: boolean; ctrlKey?: boolean; altKey?: boolean; hasSelectMenu?: boolean } = {}
    ): Promise<{ submitted: boolean; confirmedSelection: boolean }> {
        const next = this.processInputChunk(this.input, this.inputCursor, chunk, options);
        this.input = this.expandTabs(next.value);
        this.inputCursor = this.clampCursor(this.input, next.cursor);
        this.inputHistoryController.resetNavigation();
        let submitted = next.shouldSubmit;

        if (next.shouldConfirmSelection && this.selectMenu) {
            const accepted = await this.acceptSelectMenu();
            submitted = submitted || accepted.submitted;
        } else {
            this.refreshInputSuggestions();
            if (next.shouldSubmit && this.submitAction) {
                void this.submitAction();
            }
        }

        return {
            submitted,
            confirmedSelection: next.shouldConfirmSelection
        };
    }

    async processDecodedInput(
        decoded: { text: string; controlKey?: string; partial?: boolean },
        chunk: ConsoleTextChunk,
        options: {
            isClosed: boolean;
            onExit: (force?: boolean) => void;
            hasActiveTextPrompt: boolean;
            lastRenderedLines?: string[];
            transcriptNavigationController: AgentConsoleTranscriptNavigationController;
        }
    ): Promise<{ handled: boolean; action?: string; value?: string }> {
        if (options.isClosed) {
            return { handled: false };
        }

        const rawText = decoded.text;
        const controlKey = decoded.controlKey;
        if (decoded.partial) {
            return { handled: true };
        }

        if (rawText === '\u0003') {
            options.onExit(true);
            return { handled: true, action: 'exit' };
        }

        // A recalled entry can itself open the suggestion menu. Once history
        // browsing has started, keep up/down on history instead of letting the
        // newly opened menu steal the remaining navigation sequence.
        if ((controlKey === 'up' || controlKey === 'down')
            && this.inputHistoryIndex >= 0
            && !this.inputLocked
            && !this.modalPromptActive
            && !options.hasActiveTextPrompt) {
            const navigated = this.inputHistoryController.navigate(controlKey === 'up' ? -1 : 1);
            return { handled: true, action: 'historyNavigation', value: navigated ? 'navigated' : 'failed' };
        }

        if (this.focusLayers.handleMenuInput(controlKey || '', rawText)) {
            return { handled: true, action: 'menuInput' };
        }

        if (controlKey === 'pageup' || controlKey === 'pagedown') {
            const layout = resolveTranscriptLayout(this.consoleOptions.messageLayout);
            if (layout.ownsHistoryScroll || layout.wheelScrollsHistory || layout.mode === 'viewport') {
                const delta = controlKey === 'pageup' ? -1 : 1;
                // Page keys scroll the viewport; focusing messages here showed
                // the selection hint/colors on a harmless scroll.
                if (this.scrollTranscriptAction) { this.scrollTranscriptAction(delta * 10); this.syncTranscriptFollowing(); return { handled: true, action: 'transcriptScroll', value: controlKey }; }
                const nav = options.transcriptNavigationController as any;
                if (nav && typeof nav.scrollPage === 'function') nav.scrollPage(delta); else nav.scroll(delta);
                return { handled: true, action: 'transcriptScroll', value: controlKey };
            }
            return { handled: false };
        }

        if (this.focusLayers.hasBlockingSelectMenu()) {
            return { handled: true, action: 'menuBlocked' };
        }

        // While a question is pending, printable keys build a custom answer in
        // the composer (codex/opencode "type your own answer"). Once a draft is
        // present digits are part of that answer; with an empty draft a digit
        // still picks the numbered option below.
        //
        // The TUI decoder groups a fast keystroke burst (or a paste) into one
        // text run, so this must accept the whole printable run, not only
        // `length === 1`; otherwise typing a word was swallowed by the focus
        // layer and Enter answered the highlighted option instead.
        if (this.pendingQuestion && !controlKey && rawText && !/[\r\n]/.test(rawText)
            && !/[\u0000-\u001f\u007f]/.test(rawText)) {
            const singleDigit = rawText.length === 1 && /[0-9]/.test(rawText);
            if (!singleDigit || this.input) {
                this.setInput(`${this.input}${rawText}`, this.input.length + rawText.length);
                return { handled: true, action: 'textInputApplied', value: rawText };
            }
        }
        if (this.pendingQuestion && (controlKey === 'backspace' || rawText === '\b' || rawText === '\u007f')) {
            if (this.input) {
                this.setInput(this.input.slice(0, -1), Math.max(0, this.input.length - 1));
            }
            return { handled: true, action: 'textInputApplied' };
        }

        // Filter-mode typing must bypass resolveFocusShortcutKey (which remaps
        // a/d/y/q to approve/deny/copy/q) so command names filter literally.
        if (this.commandOutputsOpen && this.commandOutputsFilterMode) {
            if (controlKey === 'backspace' || rawText === '\u007f' || rawText === '\b') {
                this.setCommandOutputsFilter(this.commandOutputsFilter.slice(0, -1));
                return { handled: true, action: 'outputsFilter' };
            }
            if (!controlKey && rawText === '/') {
                this.commandOutputsFilterMode = false;
                this.setCommandOutputsFilter('');
                return { handled: true, action: 'outputsFilter' };
            }
            if (!controlKey && rawText && rawText.length === 1 && !/[\r\n]/.test(rawText)) {
                this.setCommandOutputsFilter(`${this.commandOutputsFilter}${rawText}`);
                return { handled: true, action: 'outputsFilter' };
            }
        }

        if (this.pendingQuestion || this.focusLayers.hasReviewFocus() || this.focusLayers.hasMessageDetailFocus() || this.focusLayers.hasMessageFocus() || this.focusLayers.hasApprovalFocus() || this.focusLayers.hasScheduledJobFocus() || this.focusLayers.hasToolFocus() || this.focusLayers.hasSessionFocus() || this.hasTextOverlayFocus() || this.hasCommandOutputsFocus()) {
            const focusKey = this.focusLayers.resolveShortcutKey(rawText, controlKey);
            if (focusKey) {
                const consumed = await this.handleFocusKey(focusKey, options.transcriptNavigationController);
                if (consumed) {
                    return { handled: true, action: 'focusKey' };
                }
            }
            // Focus layer did not consume the key: let up/down fall through
            // to history navigation, keep swallowing other keys.
            if (controlKey !== 'up' && controlKey !== 'down') {
                return { handled: true, action: 'focusKey' };
            }
        }

        if ((rawText === '\u001b' || rawText === '\u001b\u001b') && (!controlKey || controlKey === 'escape')) {
            if (this.vimMode && this.inputMode === 'insert') {
                this.setInputMode('normal');
                return { handled: true };
            }
            if (this.status === 'running' || this.status === 'reasoning') {
                return { handled: true, action: 'cancelTurn' };
            }
            await this.focusLayers.handleEscape(options.transcriptNavigationController);
            return { handled: true };
        }
        if (rawText === '\u001b\r' || rawText === '\u001b\n') {
            return { handled: true, action: 'altNewline' };
        }

        if (options.hasActiveTextPrompt && !controlKey && (rawText.includes('\r') || rawText.includes('\n'))) {
            return { handled: true, action: 'textPromptInput', value: rawText };
        }

        if (controlKey === 'return') {
            if (options.hasActiveTextPrompt) {
                return { handled: true, action: 'submitTextPrompt' };
            }
            if (!this.modalPromptActive && !this.inputLocked) {
                return { handled: true, action: 'submit', value: rawText };
            }
            return { handled: true };
        }

        if (controlKey === 'left' || controlKey === 'right' || controlKey === 'home' || controlKey === 'end') {
            if (this.focusLayers.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
                return { handled: true, action: 'draftNavigation', value: controlKey };
            }
            return { handled: true };
        }

        if (controlKey === 'up' || controlKey === 'down') {
            // Shell-like: up/down recalls history at the prompt unless a
            // blocking interaction (menu/lock/modal/text prompt) is active.
            if (!this.focusLayers.hasBlockingSelectMenu()
                && !this.inputLocked
                && !this.modalPromptActive
                && !options.hasActiveTextPrompt) {
                const navigated = this.inputHistoryController.navigate(controlKey === 'up' ? -1 : 1);
                return { handled: true, action: 'historyNavigation', value: navigated ? 'navigated' : 'failed' };
            }
            return { handled: true };
        }

        if (controlKey === 'tab') {
            if ((this.status === 'running' || this.status === 'reasoning') && this.input.trim()) {
                return { handled: true, action: 'queueDraft' };
            }
            return { handled: true };
        }

        if (controlKey === 'up' || controlKey === 'down' || controlKey === 'escape') {
            return { handled: true };
        }

        if (this.focusLayers.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
            return { handled: true, action: 'textInput', value: rawText };
        }

        return { handled: false };
    }

    clampCursor(value: string, cursor: number): number {
        return clampCommonTextCursor(value, cursor);
    }

    formatStatusFooter(model: string, profile: string, workspace: string): string {
        const parts = [model, profile, workspace].filter(Boolean);
        return parts.join(' · ') || 'idle';
    }

    processInputChunk(
        value: string,
        cursor: number,
        chunk: Uint8Array | string,
        options?: ConsoleTextInputChunkOptions
    ): ConsoleTextInputChunkResult {
        return processCommonTextInputChunk(value, cursor, chunk, options);
    }

    updateDraft(draft: string, cursor?: number): void {
        this.input = draft;
        this.inputCursor = this.clampCursor(draft, cursor ?? draft.length);
    }

    applyChunkToDraft(chunk: string, cursor: number): { value: string; cursor: number } {
        const next = this.processInputChunk(this.input, cursor, chunk);
        this.input = next.value;
        this.inputCursor = this.clampCursor(this.input, next.cursor);
        return next;
    }
}

