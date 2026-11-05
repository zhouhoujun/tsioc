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
import { processDecodedInput } from './AgentConsoleDecodedInputState';
import { applyAbsoluteTokenUsage, applyTokenUsage, resetTurnTokenUsage as resetTurnTokenUsageInState, resolveTokenUsageFromMessages, resolveUsagePayload } from './AgentConsoleTokenUsageState';
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
import { resolveTranscriptLayout } from './AgentConsoleTranscriptLayout';
import { clearRunningToolInState, clearToolActivityInState, pushActivityInState, removePendingApprovalInState, setPendingApprovalsInState, setRunningToolInState, upsertPendingApprovalInState, upsertToolRunInState } from './AgentConsoleExecutionState';
import { projectCommandExecutionInState } from './AgentConsoleCommandExecutionState';
import { appendMessageInState, mergeMessagesPageInState, setMessagesInState } from './AgentConsoleMessageState';
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
import { refreshInputSuggestions } from './AgentConsoleSuggestionRefresh';
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
    setPlanTodos as setPlanTodosInState,
    mergePlanCreated as mergePlanCreatedInState,
    mergePlanStepStatus as mergePlanStepStatusInState,
    cancelRemainingPlanSteps as cancelRemainingPlanStepsInState,
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
import { parseUnifiedDiffSections as parseUnifiedDiffSectionsInState, stringifyReviewContent as stringifyReviewContentInState } from './AgentConsoleReviewPatch';
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
    writeReviewConclusions as writeReviewConclusionsInState,
    getAnnotationCache as getAnnotationCacheInState,
    setAnnotationCache as setAnnotationCacheInState,
    syncCurrentReviewAnnotationCache as syncCurrentReviewAnnotationCacheInState,
    getCurrentReviewAnnotationCacheKey as getCurrentReviewAnnotationCacheKeyInState
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
import { handleJobsFocusedKey, handleTasksFocusedKey, handleToolRunsFocusedKey, handleToolsFocusedKey } from './AgentConsoleFocusedPanelKeys';
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
import { AgentConsoleSessionMetaHost } from './AgentConsoleSessionMetaHost';

export * from './AgentConsoleStateTypes';

@Injectable()
export class AgentConsoleSessionState extends AgentConsoleSessionMetaHost {
    protected self(): AgentConsoleSessionState { return this; }
    constructor(@Inject(COMMAND_EXECUTION_CONTROL) protected commandExecutionControl?: CommandExecutionControlPort, @Optional() @Inject(TranslatorService) public translator?: TranslatorService) {
        super();
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
    suggestionLabels(): import('./AgentConsoleSuggestions').AgentConsoleSuggestionLabels {
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

    getAnnotationCache(): Record<string, Record<string, AgentConsoleReviewAnnotation>> {
        return getAnnotationCacheInState(this);
    }
    setAnnotationCache(cache: Record<string, Record<string, AgentConsoleReviewAnnotation>>): void {
        setAnnotationCacheInState(this, cache);
    }
    get timelineMode(): boolean {
        return this.timelineViewMode !== 'off';
    }
    get commandHints(): string[] {
        return agentConsoleAllCommandHints(this.injectedCommandHints);
    }

    setSuppressSuggestionMenu(suppressed: boolean): void { this.suppressSuggestionMenu = suppressed; }
    overlayController = new AgentConsoleOverlayController();

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
    setStatus(status: string): void {
        const nextStatus = status || 'idle';
        if (this.status === nextStatus) {
            return;
        }
        if ((nextStatus === 'running' || nextStatus === 'reasoning') && !this.turnStartedAt) {
            this.turnStartedAt = Date.now();
        }
        // A cancelled turn is over too: clear the clock so the next turn starts at zero.
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
        applyTokenUsage(this, usage);
    }

    setTokenUsageAbsolute(usage?: Partial<AgentConsoleTokenUsage> | Record<string, any> | null): void {
        applyAbsoluteTokenUsage(this, usage);
    }

    resetTurnTokenUsage(): void {
        resetTurnTokenUsageInState(this);
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

    get latestCommandExecution(): AgentConsoleCommandExecution | undefined {
        return this.commandExecutions[0];
    }

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

    projectCommandExecution(requestId: string): void { projectCommandExecutionInState(this, requestId); }

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

    setPendingApprovals(requests: AgentConsoleApprovalRequest[]): void { setPendingApprovalsInState(this, requests); }

    upsertPendingApproval(request: AgentConsoleApprovalRequest): void { upsertPendingApprovalInState(this, request); }

    removePendingApproval(requestId: string): void { removePendingApprovalInState(this, requestId); }

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
        refreshInputSuggestions(this);
    }

    setRunningTool(toolName: string): void { setRunningToolInState(this, toolName); }

    clearRunningTool(toolName: string): void { clearRunningToolInState(this, toolName); }

    clearToolActivity(): void { clearToolActivityInState(this); }

    pushActivity(kind: AgentConsoleActivity['kind'], message: string): void { pushActivityInState(this, kind, message); }

    upsertToolRun(run: AgentConsoleToolRun): void { upsertToolRunInState(this, run); }

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

    expandTabs(value: string): string {
        return String(value || '').replace(/\t/g, '    ');
    }

    stringifyReviewContent(value: any): string {
        return stringifyReviewContentInState(value);
    }

    parseUnifiedDiffSections(diffText: string): AgentConsoleReviewDiffSection[] {
        return parseUnifiedDiffSectionsInState(diffText);
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
            return handleTasksFocusedKey(this, normalized, transcriptNavigationController);
        }
        if (this.jobsFocused) {
            return handleJobsFocusedKey(this, normalized, transcriptNavigationController);
        }
        if (this.toolsFocused) {
            return handleToolsFocusedKey(this, normalized, transcriptNavigationController);
        }
        if (this.toolRunsFocused) {
            return handleToolRunsFocusedKey(this, normalized, transcriptNavigationController);
        }
        if (this.sessionsFocused) {
            return (await this.focusLayers.handleSessionsKey(normalized, transcriptNavigationController)) ?? false;
        }
        return false;
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
        return processDecodedInput(this, decoded, chunk, options);
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

