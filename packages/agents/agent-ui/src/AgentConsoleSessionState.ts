import { Inject, Injectable } from '@tsdi/ioc';
import {
    ConsoleTextChunk,
    ConsoleTextInputChunkOptions,
    ConsoleTextInputChunkResult,
    DEFAULT_TERMINAL_COLUMNS
} from './console-ports';
import { AgentMessage, AgentSessionSection, AgentSessionSectionInfo, AgentToolDefinition, ScheduledAgentTask, ContextPreparationReport, TimelineEntry, sortTimelineEntries, NavEntityType, NavFilter, NavSelection, NavTree, applyNavFilter, flattenNav, navigateCursor, resolveNavSelection, ThreadItemEvent, ThreadItemKind, ThreadItemStatus, normalizeThreadItemEvent, CommandExchangeRecord, compareCommandExchangeAsc, DEFAULT_RENDER_POLICY, HarnessProjection } from '@tsdi/agent';
import type { BackgroundTaskRecord } from '@tsdi/agent-tools';
import {
    AgentConsoleTheme,
    AgentConsoleThemeInput,
    AgentConsoleThemeStyles,
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
    AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP,
    createBeginCommandExecutionAction,
    createCompleteCommandExecutionAction,
    createFailCommandExecutionAction,
    createLinkCommandOutputAction,
    reduceAgentConsoleCommandExecution
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
import {
    AgentConsoleTimelineLabels,
    DEFAULT_TIMELINE_LABELS,
    fillTimelineLabel,
    formatTimelineClockTime,
    formatTimelineSessionDuration,
    isError,
    TimelineWindowMessage,
    truncateTimelineRowText
} from './AgentConsoleTimelineWindow';
import { resolveHumanStatusWord } from './AgentConsoleTimelineEventPresenter';
import {
    AGENT_CONSOLE_SUGGESTIONS_HINT,
    AGENT_CONSOLE_SUGGESTIONS_TITLE,
    applyAgentConsoleSuggestion,
    getAgentConsoleInputTokenRange,
    getAgentConsoleMentionCandidates,
    isAgentConsoleSuggestionMenu,
    resolveAgentConsoleInputSuggestions,
} from './AgentConsoleSuggestions';
import {
    AGENT_CONSOLE_OVERLAY_HINTS,
    AGENT_CONSOLE_OVERLAY_TITLES,
} from './AgentConsoleOverlayPresenter';
import { findTimelineLifecycleMessageIndex, shouldApplyTimelineLifecycleUpdate } from './AgentConsoleTimelineLifecycle';
import { projectAgentConsoleConversationMainline, projectAgentConsoleExecutionMainline } from './AgentConsoleSessionContentPresenter';
import {
    VIM_DEFAULT_BINDINGS,
    isConsoleVimAction,
    resolveConsoleVimKey,
    ConsoleInputMode
} from './AgentConsoleVim';
import {
    clampCommonTextCursor,
    processCommonTextInputChunk,
    shouldSkipCommonHistoryEntry
} from '@tsdi/components/common';
import {
    agentConsoleCommandHints,
    getAgentConsoleCommandDefinition
} from './AgentConsoleCommandRegistry';

export interface AgentConsoleToolItem {
    name: string;
    toolset?: string;
    active: boolean;
    activationKind?: string;
}

export type AgentConsoleHealthStatus = 'ok' | 'warn' | 'error' | 'unknown';

export interface AgentConsoleHealthItem {
    id: string;
    label: string;
    status: AgentConsoleHealthStatus;
    detail?: string;
}

export interface AgentConsoleSessionItem {
    id: string;
    current: boolean;
    workspace?: string;
    updatedAt?: number;
    messageCount?: number;
    summary?: string;
    title?: string;
    pinned?: boolean;
    archived?: boolean;
    projectKey?: string;
    projectId?: string;
    primaryThreadId?: string;
    originThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
    projectLabel?: string;
    projectSessionCount?: number;
    sections?: AgentSessionSectionInfo[];
}

export interface AgentConsoleProjectItem {
    key: string;
    label: string;
    sessionCount: number;
    lastActive?: number;
}

export interface AgentConsoleThreadItem {
    key: string;
    label: string;
    sessionCount: number;
    lastActive?: number;
    sections?: AgentSessionSectionInfo[];
}

export interface AgentConsoleContextPreparationSnapshot extends ContextPreparationReport {
    summary: string;
}

export interface AgentConsoleActivity {
    id: string;
    kind: 'turn' | 'tool' | 'model' | 'error' | 'rollback' | 'plan';
    message: string;
    createdAt: number;
}

export interface AgentConsoleUiEventOptions {
    eventType?: string;
    label?: string;
    status?: 'running' | 'success' | 'failed' | 'error';
    eventKey?: string;
    durationMs?: number;
    /** Stable execution identity for running-to-terminal event replacement. */
    toolCallId?: string;
    receiptId?: string;
    attempt?: number;
    source?: 'local' | 'remote' | 'stream';
    sequence?: number;
    category?: string;
}

export interface AgentConsoleToolRun {
    name: string;
    status: 'running' | 'success' | 'error';
    durationMs?: number;
    message: string;
    inputSummary?: string;
    outputSummary?: string;
    error?: string;
    attemptCount?: number;
    executionMode?: 'sequential' | 'parallel';
    receiptId?: string;
    toolCallId?: string;
    updatedAt: number;
}

export interface AgentConsoleTokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface AgentConsoleApprovalRequest {
    id: string;
    toolName: string;
    sessionId: string;
    reason: string;
    summary: string;
    hasInput: boolean;
    inputSummary?: string;
    createdAt: number;
    timeoutMs: number;
    expiresAt: number;
}

export interface AgentConsoleScheduledTaskItem {
    id: string;
    sessionId: string;
    prompt: string;
    scheduleType?: string | null;
    paused?: boolean;
    running?: boolean;
    cancelled?: boolean;
    runAt?: number;
    nextRunAt?: number;
    lastRunAt?: number;
    runCount?: number;
    failureCount?: number;
    lastError?: string;
    updatedAt?: number;
}

export interface AgentConsoleReviewTaskItem {
    id: string;
    title: string;
    cacheKey?: string;
    sourceSessionId?: string;
    status?: string;
    executionMode?: 'sequential' | 'parallel' | null;
    workerCount?: number;
    rollbackAvailable?: boolean;
    rollbackMode?: string;
    checkpointSummary?: string;
    retryOfTaskId?: string;
    lineageRootTaskId?: string;
    retryDepth?: number;
    lineageTaskCount?: number;
    updatedAt?: number;
    detail?: string;
}

export type AgentConsoleTaskFilter = 'all' | 'failed' | 'rollback' | 'lineage';
export type AgentConsoleReviewPatchFilter = 'all' | 'additions';

export interface AgentConsoleReviewWorker {
    workerId: string;
    actionIds?: string[];
    status?: string;
    branch?: string;
    worktreePath?: string;
    diff?: any;
    output?: any;
    error?: string;
}

export interface AgentConsoleReviewDiffSection {
    path: string;
    additions: number;
    deletions: number;
    lines: string[];
}

export interface AgentConsoleReviewHunk {
    header: string;
    context: string;
    startIndex: number;
    endIndex: number;
    additions: number;
    deletions: number;
}

export interface AgentConsoleReviewAnnotation {
    status: 'approved' | 'rejected';
    comment?: string;
    createdAt?: string;
}

export interface AgentConsoleReviewGroup {
    key: string;
    kind: 'aggregate' | 'worker';
    label: string;
    status?: string;
    workerId?: string;
    branch?: string;
    worktreePath?: string;
    actionIds?: string[];
    error?: string;
    diffText?: string;
    sections: AgentConsoleReviewDiffSection[];
}

export interface AgentConsolePlanTodoItem {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
    parentId?: string;
    kind?: 'task' | 'milestone' | 'bug' | 'feature' | 'chore';
    acceptance?: string;
    dependsOn?: string[];
    blockedBy?: string[];
    estimate?: string;
    owner?: string;
    error?: string;
    elapsedMs?: number;
    updatedAt?: number;
    planId?: string;
    revision?: number;
    blockedReason?: string;
    evidenceIds?: string[];
    receiptId?: string;
    testSummary?: string;
    diffSummary?: string;
    reviewSummary?: string;
}

export type AgentConsolePlanActionKind = 'complete' | 'retry' | 'block' | 'unblock' | 'assign';

export interface AgentConsolePlanActionPrompt {
    action: AgentConsolePlanActionKind;
    stepId: string;
    label: string;
    confirmLabel: string;
    denyLabel: string;
    payload?: Record<string, unknown>;
}

export interface AgentConsoleGoalSummary {
    id: string;
    title: string;
    successCriteria: string[];
    status?: string;
}

export interface AgentConsoleSessionMeta {
    sessionId?: string;
    provider?: string;
    model?: string;
    modelProfile?: string;
    workspace?: string;
}

export interface AgentConsolePendingAttachment {
    id: string;
    kind: 'image' | 'file';
    path: string;
    name: string;
    mediaType?: string;
    imageUrl?: string;
    dataUrl?: string;
}

export type AgentConsoleOverlayOptionMode = 'execute' | 'insert' | 'submenu';

export interface AgentConsoleSelectOption {
    label: string;
    value: string;
    description?: string;
    detail?: string | Record<string, any> | any[];
    group?: string;
    mode?: AgentConsoleOverlayOptionMode;
    disabledReason?: string;
    shortcut?: string;
}

export interface AgentConsoleSelectMenu {
    title: string;
    hint?: string;
    options: AgentConsoleSelectOption[];
    selectedIndex: number;
    parentMenu?: AgentConsoleSelectMenu;
    parentMenuAction?: (value: string | undefined) => void | Promise<void>;
}

export interface AgentConsoleOptions {
    inputPrompt?: string;
    inputPlaceholder?: string;
    inputContinuationPrompt?: string;
    vimMode?: boolean;
    emptyValueLabel?: string;
    noneValueLabel?: string;
    statusVisibleLines?: number;
    sessionsVisibleItems?: number;
    messagesVisibleItems?: number;
    /** Transcript layout: stream keeps conversation rows flowing; dynamic windows them. */
    messageLayout?: 'stream' | 'dynamic';
    messageDetailVisibleLines?: number;
    /** v19-A8: auxiliary tool/event/file-change/system/error content preview lines (policy render, default 8). */
    auxiliaryPreviewLines?: number;
    /** v19-A8: reasoning content preview lines (policy render, default 4). */
    reasoningPreviewLines?: number;
    /** v19-A8: trailing question lines kept visible when a question tail is present (policy render, default 6). */
    questionTailVisibleLines?: number;
    messageSelectionPageSize?: number;
    messageDetailPageSize?: number;
    sessionSelectionPageSize?: number;
    selectDetailVisibleLines?: number;
    toolsVisibleItems?: number;
    toolSelectionPageSize?: number;
    approvalsVisibleItems?: number;
    approvalSelectionPageSize?: number;
    reviewDetailVisibleLines?: number;
    reviewDetailPageSize?: number;
    toolRunsVisibleItems?: number;
    selectVisibleOptions?: number;
    storedToolRunsLimit?: number;
    activityVisibleItems?: number;
    activityHistoryLimit?: number;
    searchSessionLimit?: number;
    editEscapeWindowMs?: number;
    summaryMaxLength?: number;
    toolRunSummaryMaxLength?: number;
    sessionHint?: string;
    messagesHint?: string;
    toolsHint?: string;
    toolRunsHint?: string;
    approvalsHint?: string;
    reviewDetailHint?: string;
    messageDetailHint?: string;
    messageDetailClosedHint?: string;
    selectHint?: string;
    selectCloseHint?: string;
    suggestionsHint?: string;
    brandWidth?: number;
    messageStatusLabels?: AgentConsoleMessageStatusLabels;
    messageStatusSymbol?: string;
    timelineLabels?: AgentConsoleTimelineLabels;
    username?: string;
    shareBaseUrl?: string;
    workingPresentation?: 'compact' | 'dashboard';
    showStatusline?: boolean;
    /** Platform display policy. The console TUI keeps replies compact without wall-clock metadata. */
    showMessageTimestamps?: boolean;
    /** Platform-specific wording for expandable messages. */
    messageToggleInteraction?: 'click' | 'enter';
    workspace?: string;
    connectors?: Record<string, unknown>;
    authorizeConnector?: (appId: string) => boolean | Promise<boolean>;
}

export const defaultAgentConsoleOptions: Required<AgentConsoleOptions> = {
    inputPrompt: '> ',
    inputPlaceholder: 'Ask code or files',
    inputContinuationPrompt: '  ',
    vimMode: false,
    emptyValueLabel: '-',
    noneValueLabel: 'none',
    statusVisibleLines: 8,
    sessionsVisibleItems: 6,
    messagesVisibleItems: 7,
    messageLayout: 'stream',
    messageDetailVisibleLines: 6,
    auxiliaryPreviewLines: DEFAULT_RENDER_POLICY.auxiliaryPreviewLines,
    reasoningPreviewLines: DEFAULT_RENDER_POLICY.reasoningPreviewLines,
    questionTailVisibleLines: DEFAULT_RENDER_POLICY.questionTailVisibleLines,
    messageSelectionPageSize: 6,
    messageDetailPageSize: 5,
    sessionSelectionPageSize: 5,
    selectDetailVisibleLines: 6,
    toolsVisibleItems: 4,
    toolSelectionPageSize: 4,
    approvalsVisibleItems: 4,
    approvalSelectionPageSize: 4,
    reviewDetailVisibleLines: 8,
    reviewDetailPageSize: 6,
    toolRunsVisibleItems: 3,
    selectVisibleOptions: 12,
    storedToolRunsLimit: 8,
    activityVisibleItems: 3,
    activityHistoryLimit: 30,
    searchSessionLimit: 100,
    editEscapeWindowMs: 400,
    summaryMaxLength: 80,
    toolRunSummaryMaxLength: 400,
    sessionHint: 'up/down move   pg jump   enter switch   y copy   esc',
    messagesHint: 'up/down move   pg jump   enter open   y copy   esc',
    toolsHint: 'up/down move   pg jump   enter activate   y copy   esc',
    toolRunsHint: 'up/down move   pg jump   y copy   esc',
    approvalsHint: AGENT_CONSOLE_OVERLAY_HINTS.approvals,
    reviewDetailHint: ', . group   [ ] file   { } hunk jump   f fold hunk   s side-by-side   a additions   u all   p prev lineage   n next lineage   r retry   up/down scroll   left/right pan   pg jump   y copy   /review approve|reject|summary|approve-all|clear-all   esc',
    messageDetailHint: 'up/down scroll   left/right pan   pg jump   y copy   esc',
    messageDetailClosedHint: 'enter to open',
    selectHint: AGENT_CONSOLE_OVERLAY_HINTS.select,
    selectCloseHint: 'up/down move   enter close   q close',
    suggestionsHint: AGENT_CONSOLE_SUGGESTIONS_HINT,
    brandWidth: DEFAULT_TERMINAL_COLUMNS,
    messageStatusLabels: {
        running: '正在执行',
        success: '成功',
        failed: '失败',
        error: '错误'
    },
    messageStatusSymbol: '',
    timelineLabels: DEFAULT_TIMELINE_LABELS,
    username: 'you',
    shareBaseUrl: '',
    workingPresentation: 'dashboard',
    showStatusline: true,
    showMessageTimestamps: true,
    messageToggleInteraction: 'click',
    workspace: '',
    connectors: undefined as unknown as Record<string, unknown>,
    authorizeConnector: undefined as unknown as (appId: string) => boolean | Promise<boolean>,
};

export interface AgentConsoleTextOverlayState {
    title: string;
    lines: string[];
    scroll: number;
}

export interface AgentConsolePendingQuestion {
    questionId?: string;
    sessionId?: string;
    question: string;
    options: string[];
    context?: string;
    severity: 'low' | 'medium' | 'high';
    createdAt?: number;
    updatedAt: number;
    expiresAt?: number;
    status?: 'pending' | 'submitting' | 'answered' | 'dismissed' | 'expired';
    answer?: string;
    error?: string;
}

/** Cross-platform focus layers. The stack is the single keyboard-routing projection. */
export type AgentConsoleFocusLayer =
    | 'composer'
    | 'messages'
    | 'plan'
    | 'review'
    | 'tool'
    | 'tool-runs'
    | 'approval'
    | 'question'
    | 'overlay'
    | 'select'
    | 'sessions'
    | 'projects'
    | 'threads'
    | 'jobs'
    | 'message-detail'
    | 'timeline-inspector'
    | 'git-snapshot'
    | 'command-outputs';

export interface AgentConsoleCommandOutputEntry {
    id: string;
    command: string;
    text: string;
    ts: number;
    kind: 'result' | 'error' | 'notice';
}

export const AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP = 20;

@Injectable()
export class AgentConsoleSessionState {
    constructor(@Inject(COMMAND_EXECUTION_CONTROL) protected commandExecutionControl?: CommandExecutionControlPort) {}
    consoleOptions: Required<AgentConsoleOptions> = defaultAgentConsoleOptions;
    messageDetailVisibleLines = defaultAgentConsoleOptions.messageDetailVisibleLines;
    sessionId = 'console';
    input = '';
    inputCursor = 0;
    inputFocused = true;
    /** Serializable focus projection shared by TUI and browser adapters. */
    focusStack: AgentConsoleFocusLayer[] = [];
    title = '';
    messages: AgentMessage[] = [];
    sections: AgentSessionSection[] = [];
    messagesFocused = false;
    selectedMessageId = '';
    messageDetailOpen = false;
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
    protected commandOutputStore: CommandOutputStore | undefined;
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
    protected commandOutputSequence = 0;
    protected commandExecutionSequence = 0;
    protected commandExchangeSessionEpoch = 0;
    planId = '';
    planRevision = 0;
    goalSummary: AgentConsoleGoalSummary | null = null;
    planScope: 'project' | 'thread' | '' = '';
    pendingQuestion: AgentConsolePendingQuestion | null = null;
    /** Ordered multi-question queue. `pendingQuestion` projects the active (front) item. */
    pendingQuestionQueue: AgentConsolePendingQuestion[] = [];
    pendingQuestionSelectedIndex = 0;
    questionAction?: (input: { questionId: string; sessionId: string; action: 'answer' | 'dismiss'; answer?: string }) => Promise<void>;
    protected planMessage: AgentMessage | null = null;
    /** Ephemeral command lifecycle projections; never persisted as conversation history. */
    protected commandExecutionMessages: AgentMessage[] = [];
    protected fileChangeMessage: AgentMessage | null = null;
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
    protected reviewAnnotationCache: Record<string, Record<string, AgentConsoleReviewAnnotation>> = {};
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
    pendingApprovals: AgentConsoleApprovalRequest[] = [];
    submitAction?: () => Promise<void>;
    queueDraftAction?: () => boolean | Promise<boolean>;
    toggleHealthPopoverAction?: () => void | Promise<void>;
    selectMenuAction?: (value: string | undefined) => void | Promise<void>;
    copyFocusedTextAction?: (text: string, label: string) => void | Promise<void>;
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
    globalKeyInputAction?: (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }) => boolean | Promise<boolean>;
    protected injectedCommandHints: string[] = [];

    get commandHints(): string[] {
        return agentConsoleCommandHints(this.injectedCommandHints);
    }

    protected activeToolSet = new Set<string>();
    protected workspaceMentionResolver?: AgentConsoleWorkspaceMentionResolver;
    protected mentionCatalog: AgentConsoleMentionCatalogItem[] = [];
    protected workspaceSuggestionRequestId = 0;
    protected suppressSuggestionMenu = false;
    protected overlayController = new AgentConsoleOverlayController();

    configure(meta: AgentConsoleSessionMeta): this {
        const nextSessionId = String(meta.sessionId || '').trim();
        if (nextSessionId && nextSessionId !== this.sessionId) {
            this.cancelRunningCommandExecutions();
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
            // P269/P271: per-session monotonic seq — a stale tail from the
            // previous session would skip the new session's low-seq events on
            // reconnect replay, so reset the timeline cursor with the switch.
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

    setPlanMode(enabled: boolean): void {
        this.planMode = enabled;
    }

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
        const normalizedKey = String(key || '').trim();
        if (!normalizedKey || !isConsoleVimAction(action)) {
            return false;
        }
        this.vimBindings = { ...this.vimBindings, [normalizedKey]: action };
        return true;
    }

    unsetVimBinding(key: string): boolean {
        const normalizedKey = String(key || '').trim();
        if (!normalizedKey || !this.vimBindings[normalizedKey]) {
            return false;
        }
        const next = { ...this.vimBindings };
        delete next[normalizedKey];
        this.vimBindings = next;
        return true;
    }

    resetVimBindings(): void {
        this.vimBindings = {};
        this.vimPendingKey = '';
    }

    handleVimKey(key: string): boolean {
        if (!this.vimMode || this.inputMode !== 'normal') {
            return false;
        }
        const resolution = resolveConsoleVimKey(key, this.effectiveVimBindings, this.vimPendingKey || undefined);
        if (resolution.pending !== undefined) {
            this.vimPendingKey = resolution.pending;
            return true;
        }
        this.vimPendingKey = '';
        if (resolution.action) {
            return this.applyVimAction(resolution.action);
        }
        return false;
    }

    applyVimAction(action: string): boolean {
        switch (action) {
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
                return this.navigateInputHistory(-1);
            case 'history-next':
                return this.navigateInputHistory(1);
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
        return true;
    }

    protected syncDerivedInputFocus(): void {
        this.rebuildFocusStack();
        this.inputFocused = !this.sessionsFocused
            && !this.toolRunsFocused
            && !this.projectsFocused
            && !this.threadsFocused
            && !this.tasksFocused
            && !this.jobsFocused
            && !this.toolsFocused
            && !this.approvalsFocused
            && !this.reviewOpen
            && !this.messagesFocused
            && !this.pendingQuestion
            && !this.timelineEventInspectorOpen
            && !this.hasMessageDetailFocus()
            && !this.commandOutputsOpen
            && !(this.selectMenu && !isAgentConsoleSuggestionMenu(this.selectMenu));
    }

    protected rebuildFocusStack(): void {
        const layers: AgentConsoleFocusLayer[] = [];
        if (this.messagesFocused) layers.push('messages');
        if (this.threadsFocused) layers.push('threads');
        if (this.projectsFocused) layers.push('projects');
        if (this.sessionsFocused) layers.push('sessions');
        if (this.toolRunsFocused) layers.push('tool-runs');
        if (this.toolsFocused) layers.push('tool');
        if (this.jobsFocused) layers.push('jobs');
        if (this.tasksFocused) layers.push('plan');
        if (this.approvalsFocused) layers.push('approval');
        if (this.pendingQuestion) layers.push('question');
        if (this.selectMenu && !isAgentConsoleSuggestionMenu(this.selectMenu)) layers.push('select');
        if (this.textOverlay) layers.push('overlay');
        if (this.messageDetailOpen && this.messageDetailTakesFocus) layers.push('message-detail');
        if (this.timelineEventInspectorOpen) layers.push('timeline-inspector');
        if (this.reviewOpen) layers.push('review');
        if (this.gitSnapshotOpen) layers.push('git-snapshot');
        if (this.commandOutputsOpen) layers.push('command-outputs');
        this.focusStack = layers;
    }

    get activeFocusLayer(): AgentConsoleFocusLayer | undefined {
        return this.focusStack[this.focusStack.length - 1];
    }

    get focusLayers(): readonly AgentConsoleFocusLayer[] {
        return this.focusStack.slice();
    }

    pushFocusLayer(layer: AgentConsoleFocusLayer): readonly AgentConsoleFocusLayer[] {
        const next = this.focusStack.filter(item => item !== layer);
        next.push(layer);
        this.focusStack = next;
        return this.focusLayers;
    }

    popFocusLayer(): AgentConsoleFocusLayer | undefined {
        const layer = this.focusStack.pop();
        this.focusStack = this.focusStack.slice();
        return layer;
    }

    replaceFocusLayer(layer: AgentConsoleFocusLayer): readonly AgentConsoleFocusLayer[] {
        this.focusStack = this.focusStack.length
            ? [...this.focusStack.slice(0, -1), layer]
            : [layer];
        return this.focusLayers;
    }

    consumeFocusLayer(layer: AgentConsoleFocusLayer): boolean {
        if (this.activeFocusLayer !== layer) return false;
        this.popFocusLayer();
        return true;
    }

    hasBlockingSelectMenu(): boolean {
        return !!this.selectMenu && !isAgentConsoleSuggestionMenu(this.selectMenu);
    }

    hasSessionFocus(): boolean {
        return !!this.sessionsFocused;
    }

    hasTaskFocus(): boolean {
        return !!this.tasksFocused;
    }

    hasScheduledJobFocus(): boolean {
        return !!this.jobsFocused;
    }

    hasToolFocus(): boolean {
        return !!this.toolsFocused;
    }

    hasApprovalFocus(): boolean {
        return !!this.approvalsFocused;
    }

    hasReviewFocus(): boolean {
        return !!this.reviewOpen;
    }

    hasMessageFocus(): boolean {
        return !!this.messagesFocused;
    }

    hasMessageDetailFocus(): boolean {
        return !!this.messageDetailOpen && !!this.messageDetailTakesFocus;
    }

    isAnyFocusActive(): boolean {
        return !!this.pendingQuestion
            || this.hasBlockingSelectMenu()
            || this.hasSessionFocus()
            || this.hasTaskFocus()
            || this.hasScheduledJobFocus()
            || this.hasToolFocus()
            || this.hasApprovalFocus()
            || this.hasReviewFocus()
            || this.hasMessageFocus()
            || this.hasTimelineEventInspectorFocus
            || this.hasMessageDetailFocus()
            || this.hasTextOverlayFocus()
            || this.hasCommandOutputsFocus();
    }

    shouldRenderTerminalCursor(): boolean {
        return this.inputFocused
            || this.isAnyFocusActive()
            || this.inputLocked
            || this.modalPromptActive;
    }

    resolveTerminalCursorMode(): 'prompt' | 'bottom' {
        return this.isAnyFocusActive()
            || this.inputLocked
            || this.modalPromptActive
            ? 'bottom'
            : 'prompt';
    }

    shouldRouteDraftNavigation(hasActiveTextPrompt: boolean): boolean {
        return !this.hasToolFocus()
            && !this.hasApprovalFocus()
            && !this.hasReviewFocus()
            && !this.hasBlockingSelectMenu()
            && !this.hasSessionFocus()
            && !this.hasMessageFocus()
            && !this.hasMessageDetailFocus()
            && !this.pendingQuestion
            && !this.inputLocked
            && !this.modalPromptActive
            && !hasActiveTextPrompt;
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

    get displayMessages(): AgentMessage[] {
        const filtered = projectAgentConsoleConversationMainline(
            this.messages.filter(message => this.isDisplayMessage(message))
        );
        if (this.planMessage) {
            let lastUserIndex = -1;
            for (let index = filtered.length - 1; index >= 0; index--) {
                if (String(filtered[index]?.role || '').toLowerCase() === 'user') {
                    lastUserIndex = index;
                    break;
                }
            }
            if (lastUserIndex >= 0) {
                filtered.splice(lastUserIndex + 1, 0, this.planMessage);
            } else {
                filtered.unshift(this.planMessage);
            }
        }
        if (this.fileChangeMessage) {
            filtered.push(this.fileChangeMessage);
        }
        filtered.push(...this.commandExecutionMessages);
        if (this.timelineMode) {
            const active = this.planTodos.find(todo => todo.status === 'in_progress')
                || this.planTodos.find(todo => todo.status === 'pending');
            if (active) {
                const index = this.planTodos.indexOf(active) + 1;
                filtered.push({
                    id: '__timeline_plan_boundary__',
                    role: 'assistant',
                    content: truncateTimelineRowText(fillTimelineLabel(
                        this.consoleOptions.timelineLabels.boundaryStep || DEFAULT_TIMELINE_LABELS.boundaryStep,
                        {
                            index,
                            total: this.planTodos.length,
                            content: active.content
                        }
                    )),
                    createdAt: Date.now(),
                    metadata: {
                        uiKind: 'timeline-boundary',
                        planIndex: index,
                        planTotal: this.planTodos.length,
                        planStepId: active.id,
                        planStepStatus: active.status,
                        planStepContent: active.content,
                        planStepElapsedMs: typeof active.elapsedMs === 'number' && Number.isFinite(active.elapsedMs)
                            ? active.elapsedMs
                            : undefined
                    }
                } as AgentMessage);
            }
        }
        return projectAgentConsoleExecutionMainline(filtered);
    }

    /** Earliest session timestamp: first message createdAt → turn start → now. */
    private get timelineSessionStartTime(): number {
        const created = this.messages
            .map(message => Number(message?.createdAt))
            .filter(ts => Number.isFinite(ts) && ts > 0);
        if (created.length) {
            return Math.min(...created);
        }
        if (this.turnStartedAt > 0) {
            return this.turnStartedAt;
        }
        return Date.now();
    }

    get sessionHeader(): TimelineWindowMessage | undefined {
        if (!this.timelineMode) {
            return undefined;
        }
        const labels = this.consoleOptions.timelineLabels;
        const start = this.timelineSessionStartTime;
        const parts: string[] = [];
        const title = String(this.title || '').trim();
        if (title) {
            parts.push(title);
        }
        parts.push(fillTimelineLabel(labels?.headerStart || DEFAULT_TIMELINE_LABELS.headerStart, {
            time: formatTimelineClockTime(start)
        }));
        // P302: the turn header carries session context and start time only.
        // Current step position/status lives on the step boundary row, and the
        // error count on the session footer (P303) / event rows — not here.
        return {
            id: '__timeline_session_header__',
            role: 'assistant',
            content: truncateTimelineRowText(parts.join(' · ')),
            createdAt: start,
            metadata: { uiKind: 'timeline-header' }
        };
    }

    get sessionFooter(): TimelineWindowMessage | undefined {
        if (!this.timelineMode) {
            return undefined;
        }
        const labels = this.consoleOptions.timelineLabels;
        const start = this.timelineSessionStartTime;
        const statusWord = this.status === 'error'
            ? labels?.footerFailed || DEFAULT_TIMELINE_LABELS.footerFailed
            : this.status === 'running' || this.status === 'reasoning'
                ? labels?.footerRunning || DEFAULT_TIMELINE_LABELS.footerRunning
                : labels?.footerDone || DEFAULT_TIMELINE_LABELS.footerDone;
        const parts: string[] = [statusWord];
        parts.push(fillTimelineLabel(labels?.footerDuration || DEFAULT_TIMELINE_LABELS.footerDuration, {
            duration: formatTimelineSessionDuration(Math.max(0, Date.now() - start))
        }));
        const errorCount = this.messages.filter(m => m.metadata?.uiKind === 'event' && isError(m.metadata)).length;
        if (errorCount > 0) {
            parts.push(fillTimelineLabel(labels?.footerErrors || DEFAULT_TIMELINE_LABELS.footerErrors, { count: errorCount }));
        }
        return {
            id: '__timeline_session_footer__',
            role: 'assistant',
            content: truncateTimelineRowText(parts.join(' · ')),
            createdAt: Date.now(),
            metadata: { uiKind: 'timeline-footer' }
        };
    }

    setMessages(messages: AgentMessage[], preserveCommandExecutionMessages = false): void {
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
        this.tokenUsage = this.resolveTokenUsageFromMessages(messages);
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

    toggleTimelineCollapse(scopeKey: string): void {
        const key = String(scopeKey || '').trim();
        if (!key || key === this.activeTurnEventScope) {
            return;
        }
        const next = { ...this.timelineCollapsedTurns };
        if (next[key]) {
            delete next[key];
        } else {
            next[key] = true;
        }
        this.timelineCollapsedTurns = next;
    }

    qualifyUiEventKey(key: string): string {
        const resolvedKey = String(key || '').trim();
        if (!resolvedKey) {
            return '';
        }
        const scope = String(this.activeTurnEventScope || '').trim();
        return scope ? `${scope}:${resolvedKey}` : resolvedKey;
    }

    withoutUiEventMessages(messages: AgentMessage[] = this.messages): AgentMessage[] {
        return messages.filter(message => message?.metadata?.uiKind !== 'event');
    }

    clearUiEventMessages(): void {
        const filtered = this.withoutUiEventMessages();
        if (filtered.length === this.messages.length) {
            return;
        }
        this.setMessages(filtered, true);
    }

    removeUiEventMessage(eventKey: string): void {
        const key = String(eventKey || '').trim();
        if (!key) return;
        const filtered = this.messages.filter(message => message?.metadata?.uiKind !== 'event' || message?.metadata?.uiEventKey !== key);
        if (filtered.length !== this.messages.length) this.setMessages(filtered, true);
    }

    seedTimeline(entries: TimelineEntry[]): void {
        let seedCount = 0;
        let changed = false;
        // Bulk history load: apply all entries in ONE render cycle instead of
        // one setMessages per entry (600 reactive cascades = minutes of sync
        // work). Replicates upsertUiEventMessage dedup on a working array.
        const pending = this.messages.slice();
        const eventIndexes = new Map<string, number>();
        pending.forEach((message, index) => {
            const eventKey = message?.metadata?.uiKind === 'event' ? message.metadata.uiEventKey : undefined;
            if (eventKey) eventIndexes.set(eventKey, index);
        });
        for (const entry of sortTimelineEntries(entries).filter(item => !item.sessionId || item.sessionId === this.sessionId)) {
            const key = this.qualifyUiEventKey(projectTimelineKey(entry));
            if (!key) {
                continue;
            }
            const options: AgentConsoleUiEventOptions = {
                eventType: entry.kind,
                label: entry.kind,
                status: entry.status === 'failed' ? 'error' : entry.status === 'running' ? 'running' : 'success',
                eventKey: key,
                durationMs: entry.durationMs,
                toolCallId: entry.toolCallId,
                receiptId: entry.receiptId,
                attempt: entry.attempt,
                source: 'remote',
                sequence: entry.sequence
            };
            const text = String(projectTimelineContent(entry) || '').trim();
            if (text) {
                const existingIndex = eventIndexes.get(key);
                if (existingIndex !== undefined) {
                    const existing = pending[existingIndex];
                    const nextMessage = this.createUiEventMessage(text, {
                        ...options,
                        id: existing.id,
                        createdAt: existing.createdAt
                    });
                    if (!this.isSameUiEventMessage(existing, nextMessage)) {
                        pending[existingIndex] = nextMessage;
                        changed = true;
                    }
                } else {
                    pending.push(this.createUiEventMessage(text, options));
                    eventIndexes.set(key, pending.length - 1);
                    changed = true;
                }
            }
            seedCount += 1;
        }
        if (changed) {
            this.setMessages(pending, true);
        }
        if (seedCount > 0) {
            this.timelineSeedCount = seedCount;
        }
        if (entries.length) {
            this.timelineTailSeq = Math.max(...entries.map(entry => entry.lastSeq ?? -1));
        }
    }

    seedCommandExchange(records: CommandExchangeRecord[]): void {
        const list = Array.isArray(records) ? records : [];
        if (!list.length) {
            return;
        }
        const ordered = list.filter(record => !record.sessionId || record.sessionId === this.sessionId).sort(compareCommandExchangeAsc);
        let seedCount = 0;
        const accepted: CommandExchangeRecord[] = [];
        for (const record of ordered) {
            if (record.sessionEpoch !== this.commandExchangeSessionEpoch) {
                continue;
            }
            accepted.push(record);
        }
        const commands = accepted.filter(record => toThreadItemKind(record.kind) === 'command');
        const others = accepted.filter(record => toThreadItemKind(record.kind) !== 'command');
        for (const record of [...others, ...commands]) {
            if (this.projectCommandExchangeRecord(record)) {
                seedCount += 1;
            }
        }
        if (seedCount > 0) {
            this.commandExchangeSeedCount = seedCount;
        }
        this.commandExchangeTailSeq = Math.max(ordered[ordered.length - 1].seq, this.commandExchangeTailSeq);
    }

    protected projectCommandExchangeRecord(record: CommandExchangeRecord): boolean {
        const kind = toThreadItemKind(record.kind);
        const key = String(record.key || '').trim();
        if (!kind || !key) {
            return false;
        }
        const status = normalizeReplayStatus(record.status);
        this.projectThreadItem({
            kind,
            key,
            sessionId: record.sessionId || this.sessionId,
            content: record.content || record.command || 'Command',
            status,
            sequence: record.sequence,
            attempt: record.attempt,
            durationMs: record.durationMs,
            receiptId: record.receipt,
            toolCallId: record.toolCallId,
            command: record.command,
            args: record.args,
            outputIds: record.outputIds,
            error: record.error,
            retryable: record.retryable,
            source: 'replay'
        });
        return true;
    }

    markTimelineReconnecting(reconnecting: boolean): void {
        this.timelineReconnecting = reconnecting;
        this.timelineStale = reconnecting;
    }

    seedNavTree(tree: NavTree | null | undefined): void {
        if (!tree || !Array.isArray(tree.sessions)) {
            return;
        }
        this.navTree = tree;
        this.navSeedCount = tree.totalSessions ?? tree.sessions.length;
    }

    setNavFilter(filter?: NavFilter): void {
        if (!filter) {
            this.navFilter = {};
        } else {
            const next: NavFilter = {};
            if (filter.text) {
                next.text = String(filter.text).trim();
            }
            if (filter.status) {
                next.status = filter.status;
            }
            if (filter.stage) {
                next.stage = filter.stage;
            }
            if (filter.workspace) {
                next.workspace = String(filter.workspace).trim();
            }
            if (filter.projectId) {
                next.projectId = String(filter.projectId).trim();
            }
            if (filter.threadId) {
                next.threadId = String(filter.threadId).trim();
            }
            if (filter.pinnedOnly) {
                next.pinnedOnly = true;
            }
            this.navFilter = next;
        }
        this.navSelection = this.resolveNavSelectionTarget();
    }

    setNavSelection(selection?: NavSelection): void {
        if (!selection) {
            this.navSelection = undefined;
            return;
        }
        this.navSelection = { type: selection.type || 'session', id: selection.id, index: selection.index };
    }

    navigateNav(direction: 'up' | 'down', type?: NavEntityType): NavSelection | undefined {
        if (!this.navTree) {
            return undefined;
        }
        const next = navigateCursor(this.navSelection, applyNavFilter(this.navTree, this.navFilter), direction, type);
        if (next) {
            this.navSelection = next;
        }
        return next;
    }

    resolveNavSelectionTarget(): NavSelection | undefined {
        if (!this.navTree) {
            return undefined;
        }
        const node = resolveNavSelection(this.navSelection, applyNavFilter(this.navTree, this.navFilter));
        if (!node) {
            return undefined;
        }
        return { type: node.type, id: node.id, index: this.navSelection?.index ?? -1 };
    }

    setNavViewScroll(viewId: string, scroll: number): void {
        const key = String(viewId || '').trim();
        if (!key) {
            return;
        }
        this.navViewScroll = { ...this.navViewScroll, [key]: Math.max(0, Math.floor(Number(scroll) || 0)) };
    }

    getNavViewScroll(viewId: string): number {
        const key = String(viewId || '').trim();
        if (!key) {
            return 0;
        }
        return this.navViewScroll[key] ?? 0;
    }

    appendUiEventMessage(content: string, options: AgentConsoleUiEventOptions = {}): void {
        const text = String(content || '').trim();
        if (!text) {
            return;
        }
        const next = this.messages.slice();
        next.push(this.createUiEventMessage(text, options));
        this.setMessages(next, true);
    }

    upsertUiEventMessage(
        eventKey: string,
        content: string,
        options: AgentConsoleUiEventOptions = {}
    ): void {
        const text = String(content || '').trim();
        if (!text) {
            return;
        }
        const next = this.messages.slice();
        const existingIndex = findTimelineLifecycleMessageIndex(next, {
            eventKey,
            toolCallId: options.toolCallId,
            receiptId: options.receiptId
        });
        if (existingIndex >= 0) {
            const existing = next[existingIndex];
            if (!shouldApplyTimelineLifecycleUpdate(existing, options)) {
                return;
            }
            const nextMessage = this.createUiEventMessage(text, {
                ...options,
                eventKey,
                id: existing.id,
                createdAt: existing.createdAt
            });
            if (this.isSameUiEventMessage(existing, nextMessage)) {
                return;
            }
            next[existingIndex] = nextMessage;
        } else {
            next.push(this.createUiEventMessage(text, {
                ...options,
                eventKey
            }));
        }
        this.setMessages(next, true);
    }

    /** Shared cross-host projection entry point for transcript thread items. */
    projectThreadItem(event: ThreadItemEvent): void {
        const normalized = normalizeThreadItemEvent(event);
        if (!normalized.key || !normalized.content) return;
        if (normalized.kind === 'command') {
            const executionId = `__command_execution_${normalized.key}__`;
            const message: AgentMessage = {
                id: executionId,
                role: 'assistant',
                content: normalized.content,
                createdAt: Date.now(),
                metadata: {
                    uiKind: 'command-execution',
                    uiEventKey: normalized.key,
                    command: normalized.command,
                    args: normalized.args,
                    requestId: normalized.key,
                    status: normalized.status === 'success' ? 'succeeded' : normalized.status,
                    sequence: normalized.sequence,
                    attempt: normalized.attempt || 1,
                    outputIds: normalized.outputIds?.slice() || [],
                    error: normalized.error,
                    retryable: normalized.retryable
                }
            };
            const next = this.commandExecutionMessages.slice();
            const index = next.findIndex(item => item.id === executionId);
            if (index >= 0) next[index] = { ...message, createdAt: next[index].createdAt };
            else next.push(message);
            this.commandExecutionMessages = next;
            return;
        }
        this.upsertUiEventMessage(this.qualifyUiEventKey(normalized.key), normalized.content, {
            eventType: normalized.kind,
            label: normalized.kind,
            status: normalized.status === 'error' ? 'error' : normalized.status === 'success' ? 'success' : normalized.status === 'running' ? 'running' : undefined,
            eventKey: normalized.key,
            toolCallId: normalized.toolCallId,
            receiptId: normalized.receiptId,
            attempt: normalized.attempt,
            durationMs: normalized.durationMs,
            source: normalized.source === 'remote' ? 'remote' : 'local',
            sequence: normalized.sequence,
            category: normalized.category
        });
    }

    appendAssistantErrorMessage(message: string): void {
        const text = String(message || '').trim();
        const currentMessages = this.messages.slice();
        while (currentMessages.length) {
            const lastMessage = currentMessages[currentMessages.length - 1];
            if (lastMessage?.role === 'assistant' && !String(lastMessage.content || '').trim()) {
                currentMessages.pop();
                continue;
            }
            break;
        }
        const lastMessage = currentMessages[currentMessages.length - 1];
        const nextContent = text ? `Error: ${text}` : 'Error';
        if (lastMessage?.role === 'assistant'
            && lastMessage?.metadata?.error
            && String(lastMessage.content || '').trim() === nextContent) {
            return;
        }
        currentMessages.push({
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            content: nextContent,
            createdAt: Date.now(),
            metadata: {
                error: true
            }
        });
        this.setMessages(currentMessages, true);
    }

    protected createUiEventMessage(
        content: string,
        options: AgentConsoleUiEventOptions & { id?: string; createdAt?: number } = {}
    ): AgentMessage {
        return {
            id: options.id || `ui-event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            role: 'assistant',
            content,
            createdAt: options.createdAt ?? Date.now(),
            metadata: {
                uiKind: 'event',
                uiEventType: options.eventType || 'state',
                uiEventLabel: options.label || 'state',
                uiEventKey: options.eventKey,
                durationMs: options.durationMs,
                status: options.status || 'running',
                category: options.category,
                timeline: {
                    source: options.source || 'local',
                    sequence: options.sequence,
                    toolCallId: options.toolCallId,
                    receiptId: options.receiptId,
                    attempt: options.attempt
                }
            }
        };
    }

    protected isSameUiEventMessage(left: AgentMessage | undefined, right: AgentMessage | undefined): boolean {
        if (!left || !right) {
            return false;
        }
        const leftMetadata = left.metadata || {};
        const rightMetadata = right.metadata || {};
        return String(left.content || '').trim() === String(right.content || '').trim()
            && leftMetadata.uiKind === rightMetadata.uiKind
            && leftMetadata.uiEventType === rightMetadata.uiEventType
            && leftMetadata.uiEventLabel === rightMetadata.uiEventLabel
            && leftMetadata.uiEventKey === rightMetadata.uiEventKey
            && leftMetadata.durationMs === rightMetadata.durationMs
            && leftMetadata.status === rightMetadata.status
            && leftMetadata.category === rightMetadata.category
            && leftMetadata.timeline?.source === rightMetadata.timeline?.source
            && leftMetadata.timeline?.sequence === rightMetadata.timeline?.sequence
            && leftMetadata.timeline?.toolCallId === rightMetadata.timeline?.toolCallId
            && leftMetadata.timeline?.receiptId === rightMetadata.timeline?.receiptId
            && leftMetadata.timeline?.attempt === rightMetadata.timeline?.attempt;
    }

    setMessagesFocused(focused: boolean): void {
        this.messagesFocused = focused;
        const displayMessages = this.displayMessages;
        if (focused && !this.selectedMessageId && displayMessages.length) {
            this.selectedMessageId = displayMessages[displayMessages.length - 1].id;
        }
        if (!focused) {
            this.timelineEventInspectorOpen = false;
            this.selectedTimelineEventId = '';
            this.timelineEventDetailScroll = 0;
            this.timelineEventDetailColumnScroll = 0;
            this.messageDetailOpen = false;
            this.messageDetailScroll = 0;
            this.messageDetailColumnScroll = 0;
        }
        this.syncDerivedInputFocus();
    }

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

    moveMessageSelection(delta: number): void {
        const displayMessages = this.displayMessages;
        if (!displayMessages.length) {
            return;
        }
        const currentIndex = Math.max(0, displayMessages.findIndex(item => item.id === this.selectedMessageId));
        const nextIndex = (currentIndex + delta + displayMessages.length) % displayMessages.length;
        this.selectedMessageId = displayMessages[nextIndex].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
    }

    moveMessageSelectionPage(delta: number, pageSize?: number): void {
        const displayMessages = this.displayMessages;
        if (!displayMessages.length) {
            return;
        }
        const currentIndex = Math.max(0, displayMessages.findIndex(item => item.id === this.selectedMessageId));
        const resolvedPageSize = pageSize ?? this.consoleOptions.messageSelectionPageSize;
        const nextIndex = Math.max(0, Math.min(displayMessages.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedMessageId = displayMessages[nextIndex].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
    }

    selectFirstMessage(): void {
        const displayMessages = this.displayMessages;
        if (!displayMessages.length) {
            return;
        }
        this.selectedMessageId = displayMessages[0].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
    }

    selectLastMessage(): void {
        const displayMessages = this.displayMessages;
        if (!displayMessages.length) {
            return;
        }
        this.selectedMessageId = displayMessages[displayMessages.length - 1].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
    }

    focusLatestLongMessage(): boolean {
        if (this.input || this.inputLocked || this.modalPromptActive || this.hasBlockingSelectMenu()) {
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

    selectLastUserMessage(): void {
        const displayMessages = this.displayMessages;
        for (let index = displayMessages.length - 1; index >= 0; index -= 1) {
            const message = displayMessages[index];
            if (String(message.role || '').toLowerCase() === 'user'
                && message.metadata?.kind !== 'steer'
                && !!String(message.content || '').trim()) {
                this.selectedMessageId = message.id;
                this.messageDetailScroll = 0;
                this.messageDetailColumnScroll = 0;
                return;
            }
        }
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

    protected isTimelineEventMessage(message?: AgentMessage | null): boolean {
        if (!message) {
            return false;
        }
        const metadata = message.metadata || {};
        if (metadata.uiKind !== 'event') {
            return false;
        }
        return metadata.uiEventType === 'tool_invoked'
            || metadata.uiEventType === 'tool_completed'
            || metadata.uiEventType === 'tool_failed'
            || metadata.uiEventType === 'plan_step_failed'
            || metadata.uiEventType === 'plan_step_blocked'
            || metadata.uiEventType === 'approval'
            || metadata.uiEventType === 'approval_request';
    }

    openTimelineEventInspector(eventMessage?: AgentMessage): void {
        const target = eventMessage || this.selectedMessage;
        if (!target || !this.isTimelineEventMessage(target)) {
            return;
        }
        this.selectedTimelineEventId = target.id;
        this.timelineEventInspectorOpen = true;
        this.timelineEventDetailScroll = 0;
        this.timelineEventDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
    }

    closeTimelineEventInspector(): void {
        if (!this.timelineEventInspectorOpen) {
            return;
        }
        this.timelineEventInspectorOpen = false;
        this.selectedTimelineEventId = '';
        this.timelineEventDetailScroll = 0;
        this.timelineEventDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
    }

    get hasTimelineEventInspectorFocus(): boolean {
        return !!this.timelineEventInspectorOpen;
    }

    get timelineEventDetailLines(): string[] {
        const event = this.selectedTimelineEvent;
        if (!event) {
            return [];
        }
        const m = event.metadata || {};
        const timeline = m.timeline || {};
        const status = m.status || 'running';
        const eventType = m.uiEventType || 'unknown';
        const durationMs = m.durationMs;
        const attempt = timeline.attempt;
        const sequence = timeline.sequence;
        const source = timeline.source || 'local';
        const toolCallId = timeline.toolCallId || '';
        const receiptId = timeline.receiptId || '';
        const labels = { ...DEFAULT_TIMELINE_LABELS, ...(this.consoleOptions.timelineLabels || {}) };

        const lines: string[] = [];
        lines.push(`── Event Inspector ──────────────────────────`);
        lines.push('');
        const content = String(event.content || '');
        if (content) {
            content.split('\n').forEach(line => lines.push(line));
        } else {
            lines.push('(no content)');
        }
        lines.push('');
        lines.push(`Status:     ${resolveHumanStatusWord(status, labels)}`);
        if (durationMs != null) {
            lines.push(`Duration:   ${this.formatDuration(durationMs)}`);
        }
        lines.push('');
        lines.push(`── Diagnostic ──────────────────────────────`);
        lines.push(`Type:       ${eventType}`);
        if (sequence != null) {
            lines.push(`Sequence:   ${sequence}`);
        }
        lines.push(`Source:     ${source}`);
        if (toolCallId) {
            lines.push(`ToolCallID: ${toolCallId}`);
        }
        if (receiptId) {
            lines.push(`ReceiptID:  ${receiptId}`);
        }
        if (attempt != null && attempt > 1) {
            lines.push(`Attempt:    ${attempt}`);
        }
        lines.push('');
        lines.push(`── Key Bindings ─────────────────────────────`);
        lines.push(`  r       retry tool call (if failed)`);
        lines.push(`  copy    copy event detail`);
        lines.push(`  ↑/↓     scroll detail`);
        lines.push(`  PgUp/PgDn  scroll page`);
        lines.push(`  ←/→     scroll columns`);
        lines.push(`  Home/End   jump to start/end`);
        lines.push(`  Enter/Esc  close inspector`);
        return lines;
    }

    get timelineEventDetailMaxColumn(): number {
        return this.timelineEventDetailLines.reduce((max, line) => Math.max(max, line.length), 0);
    }

    protected formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        const s = ms / 1000;
        if (s < 60) {
            return `${s.toFixed(1)}s`;
        }
        const m = Math.floor(s / 60);
        const rem = s - m * 60;
        return `${m}m ${rem.toFixed(0)}s`;
    }

    scrollTimelineEventDetail(delta: number): void {
        if (!this.timelineEventInspectorOpen) {
            return;
        }
        const lines = this.timelineEventDetailLines;
        const maxScroll = Math.max(0, lines.length - this.messageDetailVisibleLines);
        this.timelineEventDetailScroll = Math.max(0, Math.min(maxScroll, this.timelineEventDetailScroll + delta));
    }

    scrollTimelineEventDetailPage(delta: number, pageSize?: number): void {
        if (!this.timelineEventInspectorOpen) {
            return;
        }
        const resolvedPageSize = pageSize ?? Math.max(1, this.messageDetailVisibleLines - 1);
        this.scrollTimelineEventDetail(delta * Math.max(1, resolvedPageSize));
    }

    scrollTimelineEventDetailToEdge(position: 'start' | 'end'): void {
        if (!this.timelineEventInspectorOpen) {
            return;
        }
        const lines = this.timelineEventDetailLines;
        this.timelineEventDetailScroll = position === 'start'
            ? 0
            : Math.max(0, lines.length - this.messageDetailVisibleLines);
    }

    scrollTimelineEventDetailColumns(delta: number): void {
        if (!this.timelineEventInspectorOpen) {
            return;
        }
        const maxScroll = Math.max(0, this.timelineEventDetailMaxColumn - 1);
        this.timelineEventDetailColumnScroll = Math.max(0, Math.min(maxScroll, this.timelineEventDetailColumnScroll + delta));
    }

    scrollTimelineEventDetailColumnsToEdge(position: 'start' | 'end'): void {
        if (!this.timelineEventInspectorOpen) {
            return;
        }
        this.timelineEventDetailColumnScroll = position === 'start'
            ? 0
            : Math.max(0, this.timelineEventDetailMaxColumn - 1);
    }

    protected canRetryTimelineEvent(): boolean {
        if (!this.timelineEventInspectorOpen) {
            return false;
        }
        const event = this.selectedTimelineEvent;
        if (!event) {
            return false;
        }
        return event.metadata?.uiEventType === 'tool_failed'
            || event.metadata?.status === 'error'
            || event.metadata?.status === 'failed';
    }

    protected buildTimelineEventRetryPayload(): { toolCallId?: string; receiptId?: string; attempt?: number; uiEventKey?: string } | null {
        const event = this.selectedTimelineEvent;
        if (!event) {
            return null;
        }
        const m = event.metadata || {};
        return {
            toolCallId: m.timeline?.toolCallId,
            receiptId: m.timeline?.receiptId,
            attempt: m.timeline?.attempt,
            uiEventKey: m.uiEventKey
        };
    }

    openMessageDetail(takeFocus = true): void {
        if (!this.selectedMessage) {
            return;
        }
        this.messageDetailOpen = true;
        this.messageDetailTakesFocus = takeFocus;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
    }

    closeMessageDetail(): void {
        if (!this.messageDetailOpen && this.messageDetailScroll === 0) {
            return;
        }
        this.messageDetailOpen = false;
        this.messageDetailTakesFocus = true;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
    }

    scrollMessageDetail(delta: number): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const lines = this.messageDetailLines;
        const maxScroll = Math.max(0, lines.length - this.messageDetailVisibleLines);
        this.messageDetailScroll = Math.max(0, Math.min(maxScroll, this.messageDetailScroll + delta));
    }

    scrollMessageDetailPage(delta: number, pageSize?: number): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const resolvedPageSize = pageSize ?? Math.max(1, this.messageDetailVisibleLines - 1);
        this.scrollMessageDetail(delta * Math.max(1, resolvedPageSize));
    }

    scrollMessageDetailToEdge(position: 'start' | 'end'): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const lines = this.messageDetailLines;
        this.messageDetailScroll = position === 'start'
            ? 0
            : Math.max(0, lines.length - this.messageDetailVisibleLines);
    }

    get messageDetailLines(): string[] {
        if (!this.selectedMessage) {
            return [];
        }
        return String(this.selectedMessage?.content || '')
            .replace(/\r/g, '')
            .split('\n')
            .map(line => this.expandTabs(line));
    }

    protected isDisplayMessage(message?: AgentMessage | null): boolean {
        if (!message) {
            return false;
        }
        if (String(message.role || '').toLowerCase() === 'tool') {
            return false;
        }
        if (!this.timelineMode && message.metadata?.uiKind === 'event') {
            const eventType = String(message.metadata?.uiEventType || '').toLowerCase();
            const status = String(message.metadata?.status || '').toLowerCase();
            const routineTurn = eventType === 'turn_started' || eventType === 'turn_completed' ||
                (eventType === 'turn' && status !== 'failed' && status !== 'error' && status !== 'cancelled');
            if (routineTurn) {
                return false;
            }
        }
        if (!this.showThinking && message?.metadata?.uiEventType === 'reasoning') {
            return false;
        }
        if (String(message.role || '').toLowerCase() === 'assistant'
            && Array.isArray(message.metadata?.toolCalls)
            && message.metadata.toolCalls.length
            && (!this.timelineMode || !String(message.content || '').trim())) {
            return false;
        }
        if (String(message.role || '').toLowerCase() === 'assistant'
            && message.metadata?.streaming === true
            && !String(message.content || '').trim()) {
            return false;
        }
        return true;
    }

    get messageDetailMaxColumn(): number {
        return this.messageDetailLines.reduce((max, line) => Math.max(max, line.length), 0);
    }

    scrollMessageDetailColumns(delta: number): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const maxScroll = Math.max(0, this.messageDetailMaxColumn - 1);
        this.messageDetailColumnScroll = Math.max(0, Math.min(maxScroll, this.messageDetailColumnScroll + delta));
    }

    scrollMessageDetailColumnsToEdge(position: 'start' | 'end'): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        this.messageDetailColumnScroll = position === 'start'
            ? 0
            : Math.max(0, this.messageDetailMaxColumn - 1);
    }

    setStatus(status: string): void {
        const nextStatus = status || 'idle';
        if (this.status === nextStatus) {
            return;
        }
        if ((nextStatus === 'running' || nextStatus === 'reasoning') && !this.turnStartedAt) {
            this.turnStartedAt = Date.now();
        }
        if (nextStatus === 'idle' || nextStatus === 'error') {
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
        const promptTokens = this.resolveUsageNumber(usage, ['promptTokens', 'prompt_tokens', 'input_tokens']);
        const completionTokens = this.resolveUsageNumber(usage, ['completionTokens', 'completion_tokens', 'output_tokens']);
        const totalTokens = this.resolveUsageNumber(usage, ['totalTokens', 'total_tokens'])
            ?? (promptTokens != null || completionTokens != null
                ? (promptTokens || 0) + (completionTokens || 0)
                : undefined);

        this.tokenUsage = {
            promptTokens: promptTokens || 0,
            completionTokens: completionTokens || 0,
            totalTokens: totalTokens || 0
        };
    }

    setInput(value: string, cursor = value.length): void {
        this.input = value;
        this.inputCursor = this.clampCursor(this.input, cursor);
        this.refreshInputSuggestions();
        this.syncDerivedInputFocus();
    }

    setPlanNudgesEnabled(enabled: boolean): void {
        this.planNudgesEnabled = enabled;
    }

    get planNudgeLabel(): string {
        if (!this.planNudgesEnabled || this.planMode) {
            return '';
        }
        const draft = String(this.input || '').trim();
        if (draft.length < 20 || draft.startsWith('/')) {
            return '';
        }
        const explicitPlanIntent = /(?:\bplan(?:ning)?\b|\bdesign\b|\barchitecture\b|方案|规划|设计|先不要改|不要(?:先)?修改|先别改)/i;
        return explicitPlanIntent.test(draft) ? 'Planning intent detected · use /plan' : '';
    }

    pushInputHistory(value: string): void {
        const trimmed = String(value || '').trim();
        if (!trimmed) {
            return;
        }
        this.inputHistoryEntries = [trimmed, ...this.inputHistoryEntries.filter(item => item !== trimmed)].slice(0, 200);
        this.inputHistoryIndex = -1;
        this.inputHistoryDraft = '';
    }

    navigateInputHistory(delta: number): boolean {
        if (!this.inputHistoryEntries.length) {
            return false;
        }
        if (this.inputHistoryIndex === -1 && this.input.includes('\n')) {
            return false;
        }
        if (delta < 0) {
            if (this.inputHistoryIndex === -1) {
                this.inputHistoryDraft = this.input;
            }
            const nextIndex = this.findInputHistoryIndex(this.inputHistoryIndex + 1, 1);
            if (nextIndex < 0) {
                return false;
            }
            this.inputHistoryIndex = nextIndex;
        } else {
            if (this.inputHistoryIndex === -1) {
                return false;
            }
            const nextIndex = this.findInputHistoryIndex(this.inputHistoryIndex - 1, -1);
            if (nextIndex < 0) {
                this.inputHistoryIndex = -1;
                this.setInput(this.inputHistoryDraft, this.inputHistoryDraft.length);
                return true;
            }
            this.inputHistoryIndex = nextIndex;
        }
        const next = this.inputHistoryEntries[this.inputHistoryIndex] || '';
        this.setInput(next, next.length);
        return true;
    }

    resetInputHistoryNavigation(): void {
        this.inputHistoryIndex = -1;
        this.inputHistoryDraft = '';
    }

    getInputHistoryEntries(): string[] {
        return this.inputHistoryEntries.slice();
    }

    setInputHistoryEntries(entries: string[]): void {
        this.inputHistoryEntries = Array.from(new Set((entries || []).filter(Boolean)));
        this.inputHistoryIndex = -1;
        this.inputHistoryDraft = '';
    }

    protected findInputHistoryIndex(startIndex: number, step: number): number {
        for (let index = startIndex; index >= 0 && index < this.inputHistoryEntries.length; index += step) {
            if (!this.shouldSkipHistoryEntry(this.inputHistoryEntries[index])) {
                return index;
            }
        }
        return -1;
    }

    setInputCursor(cursor: number): void {
        this.inputCursor = this.clampCursor(this.input, cursor);
        this.refreshInputSuggestions();
        this.syncDerivedInputFocus();
    }

    moveInputCursor(delta: number): void {
        this.suppressSuggestionMenu = true;
        this.setInputCursor(this.inputCursor + delta);
    }

    moveInputCursorToEdge(position: 'start' | 'end'): void {
        this.suppressSuggestionMenu = true;
        this.setInputCursor(position === 'start' ? 0 : this.input.length);
    }

    setInputFocused(focused: boolean): void {
        this.inputFocused = !!focused;
    }

    setInputPlaceholder(value: string): void {
        this.inputPlaceholder = String(value || '').trim();
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

    setPendingAttachments(attachments: AgentConsolePendingAttachment[]): void {
        this.pendingAttachments = attachments.slice();
    }

    appendPendingAttachment(attachment: AgentConsolePendingAttachment): void {
        this.pendingAttachments = [...this.pendingAttachments, attachment];
    }

    clearPendingAttachments(): void {
        if (!this.pendingAttachments.length) {
            return;
        }
        this.pendingAttachments = [];
    }

    setLastError(message: string): void {
        this.lastError = message;
    }

    setTasksCount(value: number): void {
        this.tasksCount = value;
    }

    setSessions(sessions: AgentConsoleSessionItem[]): void {
        this.sessions = sessions.slice();
        this.clampSessionSelectionToFilter();
    }

    get navFilteredSessions(): AgentConsoleSessionItem[] {
        const filter = this.navFilter;
        if (!filter || (!filter.text && !filter.workspace && !filter.projectId && !filter.threadId && !filter.pinnedOnly)) {
            return this.sessions;
        }
        const text = String(filter.text || '').trim().toLowerCase();
        const workspace = String(filter.workspace || '').trim();
        const projectId = String(filter.projectId || '').trim();
        const threadId = String(filter.threadId || '').trim();
        return this.sessions.filter(session => {
            if (text) {
                const haystack = [
                    session.id,
                    session.title,
                    session.summary,
                    session.workspace,
                    session.projectKey,
                    session.projectId,
                    session.primaryThreadId
                ].filter(Boolean).map(value => String(value).toLowerCase()).join(' ');
                if (!haystack.includes(text)) {
                    return false;
                }
            }
            if (workspace && String(session.workspace || '') !== workspace) {
                return false;
            }
            if (projectId && session.projectId !== projectId && session.projectKey !== projectId) {
                return false;
            }
            if (threadId && session.primaryThreadId !== threadId) {
                return false;
            }
            if (filter.pinnedOnly && session.pinned !== true) {
                return false;
            }
            return true;
        });
    }

    protected clampSessionSelectionToFilter(): void {
        const list = this.navFilteredSessions;
        if (!list.length) {
            this.selectedSessionId = '';
        } else if (this.selectedSessionId && list.some(item => item.id === this.selectedSessionId)) {
            // Preserve explicit selection when the session list refreshes.
        } else {
            this.selectedSessionId = list.find(item => item.current)?.id || list[0].id;
        }
    }

    setSessionsFocused(focused: boolean): void {
        this.sessionsFocused = focused;
        if (focused) {
            this.restoreSessionsViewState();
        } else {
            this.persistSessionsViewState();
        }
        this.syncDerivedInputFocus();
    }

    protected restoreSessionsViewState(): void {
        const list = this.navFilteredSessions;
        if (!list.length) {
            this.selectedSessionId = '';
            return;
        }
        const savedScroll = this.getNavViewScroll('sessions');
        if (savedScroll > 0 && savedScroll < list.length) {
            this.selectedSessionId = list[savedScroll].id;
        } else if (!this.selectedSessionId || !list.some(item => item.id === this.selectedSessionId)) {
            this.selectedSessionId = list.find(item => item.current)?.id || list[0].id;
        }
        const index = list.findIndex(item => item.id === this.selectedSessionId);
        if (index >= 0) {
            this.setNavSelection({ type: 'session', id: this.selectedSessionId, index });
        }
    }

    protected persistSessionsViewState(): void {
        const list = this.navFilteredSessions;
        if (!list.length) {
            return;
        }
        const index = Math.max(0, list.findIndex(item => item.id === this.selectedSessionId));
        this.setNavViewScroll('sessions', index);
    }

    setProjects(projects: AgentConsoleProjectItem[]): void {
        this.projects = projects.slice();
    }

    setProjectsFocused(focused: boolean): void {
        this.projectsFocused = focused;
        if (focused && !this.selectedSessionId && this.sessions.length) {
            this.selectedSessionId = this.sessions.find(item => item.current)?.id || this.sessions[0].id;
        }
        this.syncDerivedInputFocus();
    }

    setThreads(threads: AgentConsoleThreadItem[]): void {
        this.threads = threads.slice();
    }

    setThreadsFocused(focused: boolean): void {
        this.threadsFocused = focused;
        if (focused && !this.selectedSessionId && this.sessions.length) {
            this.selectedSessionId = this.sessions.find(item => item.current)?.id || this.sessions[0].id;
        }
        this.syncDerivedInputFocus();
    }

    setToolRunsFocused(focused: boolean): void {
        this.toolRunsFocused = focused;
        this.syncDerivedInputFocus();
    }

    setSelectedSessionId(sessionId: string): void {
        if (!sessionId || !this.navFilteredSessions.some(item => item.id === sessionId)) {
            return;
        }
        this.selectedSessionId = sessionId;
    }

    moveSessionSelection(delta: number): void {
        const list = this.navFilteredSessions;
        if (!list.length) {
            return;
        }
        const currentIndex = Math.max(0, list.findIndex(item => item.id === this.selectedSessionId));
        const nextIndex = (currentIndex + delta + list.length) % list.length;
        this.selectedSessionId = list[nextIndex].id;
    }

    moveSessionSelectionPage(delta: number, pageSize?: number): void {
        const list = this.navFilteredSessions;
        if (!list.length) {
            return;
        }
        const currentIndex = Math.max(0, list.findIndex(item => item.id === this.selectedSessionId));
        const resolvedPageSize = pageSize ?? this.consoleOptions.sessionSelectionPageSize;
        const nextIndex = Math.max(0, Math.min(list.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedSessionId = list[nextIndex].id;
    }

    selectFirstSession(): void {
        const list = this.navFilteredSessions;
        if (!list.length) {
            return;
        }
        this.selectedSessionId = list[0].id;
    }

    selectLastSession(): void {
        const list = this.navFilteredSessions;
        if (!list.length) {
            return;
        }
        this.selectedSessionId = list[list.length - 1].id;
    }

    get selectedSession(): AgentConsoleSessionItem | undefined {
        return this.navFilteredSessions.find(item => item.id === this.selectedSessionId);
    }

    protected formatSessionWorkspaceLabel(workspace?: string): string {
        const text = String(workspace || '').trim();
        if (!text) {
            return '';
        }
        const segments = text.split(/[\\/]/).filter(Boolean);
        return segments[segments.length - 1] || text;
    }

    protected buildSelectedSessionCopyText(): string {
        const selected = this.selectedSession;
        if (!selected) {
            return '';
        }
        return [
            selected.id,
            selected.workspace ? `workspace=${selected.workspace}` : '',
            selected.messageCount != null ? `messageCount=${selected.messageCount}` : '',
            selected.updatedAt != null ? `updatedAt=${new Date(selected.updatedAt).toISOString()}` : ''
        ].filter(Boolean).join('\n');
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
        this.scheduledTasks = tasks.slice();
        if (!this.scheduledTasks.length) {
            this.selectedScheduledTaskId = '';
        } else if (this.selectedScheduledTaskId && this.scheduledTasks.some(item => item.id === this.selectedScheduledTaskId)) {
            // Preserve explicit selection when possible.
        } else {
            this.selectedScheduledTaskId = this.scheduledTasks[0].id;
        }
    }

    setJobsFocused(focused: boolean): void {
        this.jobsFocused = focused;
        if (focused && !this.selectedScheduledTaskId && this.scheduledTasks.length) {
            this.selectedScheduledTaskId = this.scheduledTasks[0].id;
        }
        this.syncDerivedInputFocus();
    }

    setSelectedScheduledTaskId(taskId: string): void {
        if (!taskId || !this.scheduledTasks.some(item => item.id === taskId)) {
            return;
        }
        this.selectedScheduledTaskId = taskId;
    }

    moveScheduledTaskSelection(delta: number): void {
        if (!this.scheduledTasks.length) {
            return;
        }
        const currentIndex = Math.max(0, this.scheduledTasks.findIndex(item => item.id === this.selectedScheduledTaskId));
        const nextIndex = (currentIndex + delta + this.scheduledTasks.length) % this.scheduledTasks.length;
        this.selectedScheduledTaskId = this.scheduledTasks[nextIndex].id;
    }

    moveScheduledTaskSelectionPage(delta: number, pageSize?: number): void {
        if (!this.scheduledTasks.length) {
            return;
        }
        const currentIndex = Math.max(0, this.scheduledTasks.findIndex(item => item.id === this.selectedScheduledTaskId));
        const resolvedPageSize = pageSize ?? this.consoleOptions.sessionsVisibleItems;
        const nextIndex = Math.max(0, Math.min(this.scheduledTasks.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedScheduledTaskId = this.scheduledTasks[nextIndex].id;
    }

    selectFirstScheduledTask(): void {
        if (!this.scheduledTasks.length) {
            return;
        }
        this.selectedScheduledTaskId = this.scheduledTasks[0].id;
    }

    selectLastScheduledTask(): void {
        if (!this.scheduledTasks.length) {
            return;
        }
        this.selectedScheduledTaskId = this.scheduledTasks[this.scheduledTasks.length - 1].id;
    }

    get selectedScheduledTask(): ScheduledAgentTask | undefined {
        return this.scheduledTasks.find(item => item.id === this.selectedScheduledTaskId);
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
        this.goalSummary = goal ? {
            id: String(goal.id || ''), title: String(goal.title || ''),
            successCriteria: Array.isArray(goal.successCriteria) ? goal.successCriteria.map(String) : [],
            status: goal.status
        } : null;
        this.planMessage = this.buildPlanMessage();
    }

    get goalCriteriaProgress(): { met: number; total: number } | null {
        const criteria = this.goalSummary?.successCriteria || [];
        if (!criteria.length) return null;
        const planText = this.planTodos.map(item => item.content).join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
        const met = criteria.filter(item => planText.includes(String(item).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim())).length;
        return { met, total: criteria.length };
    }

    protected buildPlanMessage(): AgentMessage | null {
        if (!this.planTodos.length) {
            return null;
        }
        const total = this.planTodos.length;
        const activeCount = this.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress').length;
        const completedCount = this.planTodos.filter(item => item.status === 'completed').length;
        const inProgressCount = this.planTodos.filter(item => item.status === 'in_progress').length;
        const cancelledCount = this.planTodos.filter(item => item.status === 'cancelled').length;
        const failedCount = this.planTodos.filter(item => item.status === 'failed').length;
        const blockedCount = this.planTodos.filter(item => item.blockedBy && item.blockedBy.length > 0).length;
        const summary = activeCount === 0
            ? `Plan completed: ${completedCount}/${total} steps, ${cancelledCount + failedCount} failures`
            : '';
        const goalProgress = this.goalCriteriaProgress;
        const goalLine = goalProgress ? `goal: ${goalProgress.met}/${goalProgress.total} criteria met` : '';
        const collapsible = total > 7;
        const barWidth = Math.min(total, 20);
        const doneCount = completedCount + inProgressCount;
        const filled = Math.round((barWidth * doneCount) / total);
        const bar = '▓'.repeat(filled) + '░'.repeat(barWidth - filled);
        const filtered = this.filteredPlanTodos;
        const filterLabel = this.planTodoFilter !== 'all' ? ` [${this.planTodoFilter}]` : '';
        const items = filtered.map((item, index) => {
            const marker = this.selectedPlanTodoIndex === index ? '›' : ' ';
            const hierarchy = item.parentId ? '  ' : '';
            const blocked = item.blockedBy?.length ? ` ← blocked by ${item.blockedBy.join(',')}` : '';
            const depends = item.dependsOn?.length ? ` needs ${item.dependsOn.join(',')}` : '';
            const owner = item.owner ? ` (${item.owner})` : '';
            const estimate = item.estimate ? ` ~${item.estimate}` : '';
            const elapsed = item.elapsedMs ? ` ${this.formatElapsed(item.elapsedMs)}` : '';
            const error = item.status === 'failed' && item.error ? ` err: ${item.error}` : '';
            const evidence = item.evidenceIds?.length ? ` evidence[${item.evidenceIds.length}]` : '';
            return `${marker}${hierarchy}${index + 1}. ${this.planTodoGlyph(item.status)} ${item.content}${owner}${estimate}${elapsed}${depends}${blocked}${evidence}${error}`;
        });
        const summaryHeader = `plan ${doneCount}/${total} ${bar}${filterLabel} · active ${activeCount}${blockedCount ? ` · blocked ${blockedCount}` : ''}${failedCount ? ` · failed ${failedCount}` : ''}`;
        const visibleContent = collapsible && !this.planTodoExpanded && this.planTodoFilter === 'all'
            ? `Plan ${total} steps (${completedCount} done${failedCount ? `, ${failedCount} failed` : ''}${blockedCount ? `, ${blockedCount} blocked` : ''})`
            : activeCount > 0 || (this.planTodoFilter !== 'all' && filtered.length > 0)
                ? [summaryHeader, ...items].join('\n')
                : '';
        const detailLine = this.selectedPlanTodoDetailLabel;
        return {
            id: '__plan_todo_inline__',
            role: 'assistant',
            content: [visibleContent, summary, goalLine, detailLine].filter(Boolean).join('\n'),
            createdAt: Date.now(),
            metadata: {
                uiKind: 'plan-todo',
                planItems: this.planTodos,
                planTodoSourceSessionId: this.planTodoSourceSessionId,
                planScope: this.planScope,
                planCollapsed: collapsible && !this.planTodoExpanded,
                planTodoExpanded: this.planTodoExpanded,
                planTodoFilter: this.planTodoFilter,
                selectedPlanTodoIndex: this.selectedPlanTodoIndex,
                planId: this.planId,
                planRevision: this.planRevision,
                planThreadKey: this.planThreadKey
            }
        };
    }

    formatElapsed(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${m}m${s}s`;
    }

    togglePlanTodoExpanded(): boolean {
        if (this.planTodos.length <= 7) {
            return false;
        }
        this.planTodoExpanded = !this.planTodoExpanded;
        this.planMessage = this.buildPlanMessage();
        return true;
    }

    protected planTodoGlyph(status: AgentConsolePlanTodoItem['status']): string {
        switch (status) {
            case 'completed':
                return '✓';
            case 'cancelled':
                return '⊘';
            case 'in_progress':
                return '▸';
            case 'failed':
                return '✗';
            default:
                return '☐';
        }
    }

    hasActivePlanTodos(): boolean {
        return this.planTodos.some(item => item.status === 'pending' || item.status === 'in_progress');
    }

    clearPlanTodos(): void {
        if (!this.planTodos.length && !this.planScope) {
            return;
        }
        this.planTodos = [];
        this.planTodoExpanded = false;
        this.planTodoFilter = 'all';
        this.selectedPlanTodoIndex = -1;
        this.goalSummary = null;
        this.planTodoSourceSessionId = '';
        this.planScope = '';
        this.planMessage = null;
    }

    get filteredPlanTodos(): AgentConsolePlanTodoItem[] {
        if (this.planTodoFilter === 'all') {
            return this.planTodos;
        }
        switch (this.planTodoFilter) {
            case 'active':
                return this.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress');
            case 'blocked':
                return this.planTodos.filter(item => (item.blockedBy && item.blockedBy.length > 0) || item.status === 'pending');
            case 'failed':
                return this.planTodos.filter(item => item.status === 'failed' || item.status === 'cancelled');
            default:
                return this.planTodos;
        }
    }

    get selectedPlanTodo(): AgentConsolePlanTodoItem | null {
        const filtered = this.filteredPlanTodos;
        if (this.selectedPlanTodoIndex < 0 || this.selectedPlanTodoIndex >= filtered.length) {
            return null;
        }
        return filtered[this.selectedPlanTodoIndex];
    }

    get planTodoFilterLabel(): string {
        switch (this.planTodoFilter) {
            case 'active': return 'active';
            case 'blocked': return 'blocked';
            case 'failed': return 'failed';
            default: return 'all';
        }
    }

    setPlanTodoFilter(filter: 'all' | 'active' | 'blocked' | 'failed'): void {
        this.planTodoFilter = filter;
        this.selectedPlanTodoIndex = -1;
        this.planMessage = this.buildPlanMessage();
    }

    movePlanTodoSelection(direction: -1 | 1): boolean {
        const filtered = this.filteredPlanTodos;
        if (!filtered.length) {
            this.selectedPlanTodoIndex = -1;
            return false;
        }
        if (this.selectedPlanTodoIndex < 0) {
            this.selectedPlanTodoIndex = direction > 0 ? 0 : filtered.length - 1;
        } else {
            this.selectedPlanTodoIndex = Math.max(0, Math.min(filtered.length - 1, this.selectedPlanTodoIndex + direction));
        }
        return true;
    }

    jumpToNextBlockedPlanTodo(): boolean {
        const filtered = this.filteredPlanTodos;
        if (!filtered.length) return false;
        const start = this.selectedPlanTodoIndex < 0 ? 0 : this.selectedPlanTodoIndex + 1;
        for (let i = start; i < filtered.length; i++) {
            if (filtered[i].blockedBy && filtered[i].blockedBy!.length > 0) {
                this.selectedPlanTodoIndex = i;
                return true;
            }
        }
        for (let i = 0; i < start; i++) {
            if (filtered[i].blockedBy && filtered[i].blockedBy!.length > 0) {
                this.selectedPlanTodoIndex = i;
                return true;
            }
        }
        return false;
    }

    jumpToNextFailedPlanTodo(): boolean {
        const filtered = this.filteredPlanTodos;
        if (!filtered.length) return false;
        const start = this.selectedPlanTodoIndex < 0 ? 0 : this.selectedPlanTodoIndex + 1;
        for (let i = start; i < filtered.length; i++) {
            if (filtered[i].status === 'failed' || filtered[i].status === 'cancelled') {
                this.selectedPlanTodoIndex = i;
                return true;
            }
        }
        for (let i = 0; i < start; i++) {
            if (filtered[i].status === 'failed' || filtered[i].status === 'cancelled') {
                this.selectedPlanTodoIndex = i;
                return true;
            }
        }
        return false;
    }

    get selectedPlanTodoDetailLabel(): string {
        const item = this.selectedPlanTodo;
        if (!item) return '';
        const parts = [
            `#${item.id} ${item.content}`,
            `status ${item.status}`,
            item.kind ? `kind ${item.kind}` : '',
            item.owner ? `owner ${item.owner}` : '',
            item.estimate ? `estimate ${item.estimate}` : '',
            item.dependsOn?.length ? `depends on ${item.dependsOn.join(', ')}` : '',
            item.blockedBy?.length ? `blocked by ${item.blockedBy.join(', ')}` : '',
            item.blockedReason ? `reason: ${item.blockedReason}` : '',
            item.acceptance ? `acceptance: ${item.acceptance}` : '',
            item.error ? `error: ${item.error}` : '',
            item.elapsedMs ? `elapsed ${item.elapsedMs}ms` : '',
            item.evidenceIds?.length ? `evidence ${item.evidenceIds.join(', ')}` : '',
            item.receiptId ? `receipt ${item.receiptId}` : '',
            item.testSummary ? `test: ${item.testSummary}` : '',
            item.diffSummary ? `diff: ${item.diffSummary}` : '',
            item.reviewSummary ? `review: ${item.reviewSummary}` : ''
        ];
        return parts.filter(Boolean).join('\n');
    }

    setPendingQuestion(question: AgentConsolePendingQuestion | null): void {
        if (question && question.sessionId && question.sessionId !== this.sessionId) return;
        if (!question) {
            this.pendingQuestionQueue = [];
            this.pendingQuestion = null;
            this.pendingQuestionSelectedIndex = 0;
            this.syncDerivedInputFocus();
            return;
        }
        const existingIndex = this.pendingQuestionQueue.findIndex(item => item.questionId === question.questionId);
        if (existingIndex >= 0) {
            const existing = this.pendingQuestionQueue[existingIndex];
            if ((existing.updatedAt || 0) > (question.updatedAt || 0)) return;
            if (existing.status === 'answered' || existing.status === 'dismissed') return;
            this.pendingQuestionQueue[existingIndex] = { ...existing, ...question };
        } else {
            this.pendingQuestionQueue.push(question);
        }
        this.pendingQuestion = this.pendingQuestionQueue[0] ?? null;
        this.pendingQuestionSelectedIndex = 0;
        this.syncDerivedInputFocus();
    }

    /**
     * Pop the front question after it is answered/dismissed/expired and advance
     * the active item to the next in the queue. Returns the removed question.
     */
    finishPendingQuestion(): AgentConsolePendingQuestion | null {
        const finished = this.pendingQuestionQueue.shift() ?? null;
        this.pendingQuestion = this.pendingQuestionQueue[0] ?? null;
        this.pendingQuestionSelectedIndex = 0;
        this.syncDerivedInputFocus();
        return finished;
    }

    /** Queue count exposed for `current/total` UI projection. */
    get pendingQuestionTotal(): number {
        return this.pendingQuestionQueue.length;
    }

    markPendingQuestionExpired(questionId?: string): void {
        const target = questionId
            ? this.pendingQuestionQueue.find(item => item.questionId === questionId)
            : this.pendingQuestionQueue[0];
        if (!target) return;
        target.status = 'expired';
    }

    movePendingQuestionSelection(delta: number): void {
        const count = this.pendingQuestion?.options.length || 0;
        if (!count) return;
        this.pendingQuestionSelectedIndex = (this.pendingQuestionSelectedIndex + delta + count) % count;
    }

    movePendingQuestionSelectionToEdge(edge: 'start' | 'end'): void {
        const count = this.pendingQuestion?.options.length || 0;
        if (!count) return;
        this.pendingQuestionSelectedIndex = edge === 'start'
            ? this.overlayController.homeIndex(count)
            : this.overlayController.endIndex(count);
    }

    movePendingQuestionSelectionPage(direction: 1 | -1): void {
        const count = this.pendingQuestion?.options.length || 0;
        if (!count) return;
        this.pendingQuestionSelectedIndex = this.overlayController.pageIndex(
            this.pendingQuestionSelectedIndex,
            direction,
            count
        );
    }

    async choosePendingQuestion(index = this.pendingQuestionSelectedIndex): Promise<boolean> {
        const option = this.pendingQuestion?.options[index];
        if (!option) return false;
        this.pendingQuestionSelectedIndex = index;
        this.setInput(option, option.length);
        const question = this.pendingQuestion;
        if (!question) return false;
        // Standalone/legacy hosts retain the previous compose-only behavior.
        if (!this.questionAction) {
            this.setInputFocused(true);
            return true;
        }
        if (question.expiresAt && Date.now() > question.expiresAt) {
            question.status = 'expired';
            question.error = undefined;
            this.finishPendingQuestion();
            this.setInputFocused(true);
            return true;
        }
        question.status = 'submitting';
        question.error = undefined;
        try {
            await this.questionAction({
                questionId: question.questionId || this.buildLegacyQuestionId(question),
                sessionId: question.sessionId || this.sessionId,
                action: 'answer',
                answer: option
            });
            question.status = 'answered';
            question.answer = option;
            this.finishPendingQuestion();
            this.setInputFocused(true);
        } catch (error: any) {
            const message = error?.message || String(error || 'Question response failed');
            if (/expired/i.test(message)) {
                question.status = 'expired';
                question.error = undefined;
                this.finishPendingQuestion();
            } else {
                question.status = 'pending';
                question.error = message;
            }
        }
        return true;
    }

    protected buildLegacyQuestionId(question: AgentConsolePendingQuestion): string {
        return `legacy-question-${question.question}`;
    }

    async retrySelectedPlanTodo(): Promise<boolean> {
        const item = this.selectedPlanTodo;
        if (!item || item.status !== 'failed') return false;
        this.planTodos = this.planTodos.map(todo => todo.id === item.id
            ? { ...todo, status: 'pending', error: undefined, blockedBy: undefined, elapsedMs: undefined }
            : todo);
        this.planMessage = this.buildPlanMessage();
        await this.retrySelectedPlanTodoAction?.(item);
        return true;
    }

    isPlanActionApplicable(action: AgentConsolePlanActionKind, item: AgentConsolePlanTodoItem): boolean {
        switch (action) {
            case 'complete':
                return item.status === 'pending' || item.status === 'in_progress';
            case 'retry':
                return item.status === 'failed' || item.status === 'cancelled';
            case 'block':
                return item.status !== 'completed' && item.status !== 'cancelled'
                    && !(item.blockedBy && item.blockedBy.length > 0);
            case 'unblock':
                return !!(item.blockedBy && item.blockedBy.length > 0) || !!item.blockedReason;
            case 'assign':
                return item.status !== 'completed' && item.status !== 'cancelled';
            default:
                return false;
        }
    }

    requestPlanAction(action: AgentConsolePlanActionKind, stepId: string, payload?: Record<string, unknown>): boolean {
        const item = this.planTodos.find(todo => todo.id === stepId);
        if (!item || !this.isPlanActionApplicable(action, item)) {
            return false;
        }
        if (action === 'retry') {
            const previous = this.applyPlanActionOptimistically(action, item, payload);
            void this.dispatchPlanAction(action, stepId, payload)
                .then(ok => { if (!ok) this.rollbackPlanAction(stepId, previous); })
                .catch(() => this.rollbackPlanAction(stepId, previous));
            return true;
        }
        this.planActionPrompt = {
            action,
            stepId,
            label: this.planActionPromptLabel(action, item),
            confirmLabel: action === 'block' ? 'Block' : action === 'unblock' ? 'Unblock' : action === 'assign' ? 'Assign' : 'Complete',
            denyLabel: 'Cancel',
            payload
        };
        return true;
    }

    protected planActionPromptLabel(action: AgentConsolePlanActionKind, item: AgentConsolePlanTodoItem): string {
        const whom = item.content ? `'${String(item.content).slice(0, 40)}'` : `step ${item.id}`;
        switch (action) {
            case 'complete': return `Mark ${whom} as complete?`;
            case 'block': return `Block ${whom}?`;
            case 'unblock': return `Unblock ${whom}?`;
            case 'assign': return `Assign ${whom}?`;
            default: return `Apply action to ${whom}?`;
        }
    }

    dismissPlanAction(): void {
        this.planActionPrompt = null;
    }

    confirmPlanAction(): boolean {
        const prompt = this.planActionPrompt;
        if (!prompt) return false;
        const item = this.planTodos.find(todo => todo.id === prompt.stepId);
        if (!item) {
            this.planActionPrompt = null;
            return false;
        }
        const previous = this.applyPlanActionOptimistically(prompt.action, item, prompt.payload);
        this.planActionPrompt = null;
        void this.dispatchPlanAction(prompt.action, prompt.stepId, prompt.payload)
            .then(ok => { if (!ok) this.rollbackPlanAction(prompt.stepId, previous); })
            .catch(() => this.rollbackPlanAction(prompt.stepId, previous));
        return true;
    }

    protected applyPlanActionOptimistically(
        action: AgentConsolePlanActionKind,
        item: AgentConsolePlanTodoItem,
        payload?: Record<string, unknown>
    ): AgentConsolePlanTodoItem {
        this.planActionApplying = true;
        const next: AgentConsolePlanTodoItem = { ...item, updatedAt: Date.now() };
        switch (action) {
            case 'complete':
                next.status = 'completed';
                break;
            case 'retry':
                next.status = 'pending';
                next.error = undefined;
                next.blockedBy = undefined;
                next.blockedReason = undefined;
                next.elapsedMs = undefined;
                break;
            case 'block': {
                const reason = typeof payload?.reason === 'string' ? payload.reason : 'blocked by user';
                next.status = next.status === 'failed' ? 'pending' : next.status;
                next.blockedReason = reason;
                next.blockedBy = [...(next.blockedBy ?? []), next.id];
                break;
            }
            case 'unblock':
                next.blockedBy = undefined;
                next.blockedReason = undefined;
                break;
            case 'assign':
                next.owner = typeof payload?.owner === 'string' ? payload.owner : next.owner;
                break;
            default:
                break;
        }
        this.planTodos = this.planTodos.map(todo => todo.id === item.id ? next : todo);
        this.planMessage = this.buildPlanMessage();
        return item;
    }

    rollbackPlanAction(stepId: string, previous: AgentConsolePlanTodoItem | null): void {
        this.planActionApplying = false;
        if (!previous) return;
        this.planTodos = this.planTodos.map(todo => todo.id === stepId ? previous : todo);
        this.planMessage = this.buildPlanMessage();
    }

    protected async dispatchPlanAction(action: AgentConsolePlanActionKind, stepId: string, payload?: Record<string, unknown>): Promise<boolean> {
        if (this.planActionBus) {
            const ok = await this.planActionBus(action, stepId, payload);
            if (ok) {
                this.planActionApplying = false;
            }
            return ok;
        }
        if (action === 'retry') {
            const item = this.planTodos.find(todo => todo.id === stepId);
            if (item) {
                await this.retrySelectedPlanTodoAction?.(item);
            }
            this.planActionApplying = false;
            return true;
        }
        this.planActionApplying = false;
        return true;
    }

    setTasksFocused(focused: boolean): void {
        this.tasksFocused = focused;
        if (focused && !this.selectedReviewTaskId && this.filteredReviewTaskChoices.length) {
            this.selectedReviewTaskId = this.filteredReviewTaskChoices[0].id;
            this.selectedReviewTaskCacheKey = this.resolveReviewAnnotationCacheKey(this.filteredReviewTaskChoices[0]);
        }
        this.syncDerivedInputFocus();
    }

    setSelectedReviewTaskId(taskId: string): void {
        const matched = this.reviewTaskChoices.find(item => item.id === taskId);
        if (!taskId || !matched) {
            return;
        }
        this.selectedReviewTaskId = taskId;
        this.selectedReviewTaskCacheKey = this.resolveReviewAnnotationCacheKey(matched);
    }

    moveTaskSelection(delta: number): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            return;
        }
        const currentIndex = Math.max(0, tasks.findIndex(item => item.id === this.selectedReviewTaskId));
        const nextIndex = (currentIndex + delta + tasks.length) % tasks.length;
        this.selectedReviewTaskId = tasks[nextIndex].id;
        this.selectedReviewTaskCacheKey = this.resolveReviewAnnotationCacheKey(tasks[nextIndex]);
    }

    moveTaskSelectionPage(delta: number, pageSize?: number): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            return;
        }
        const currentIndex = Math.max(0, tasks.findIndex(item => item.id === this.selectedReviewTaskId));
        const resolvedPageSize = pageSize ?? this.consoleOptions.sessionSelectionPageSize;
        const nextIndex = Math.max(0, Math.min(tasks.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedReviewTaskId = tasks[nextIndex].id;
        this.selectedReviewTaskCacheKey = this.resolveReviewAnnotationCacheKey(tasks[nextIndex]);
    }

    selectFirstTask(): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            return;
        }
        this.selectedReviewTaskId = tasks[0].id;
        this.selectedReviewTaskCacheKey = this.resolveReviewAnnotationCacheKey(tasks[0]);
    }

    selectLastTask(): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            return;
        }
        this.selectedReviewTaskId = tasks[tasks.length - 1].id;
        this.selectedReviewTaskCacheKey = this.resolveReviewAnnotationCacheKey(tasks[tasks.length - 1]);
    }

    get selectedTask(): Record<string, any> | undefined {
        return this.taskRecords.find(item => item?.id === this.selectedReviewTaskId);
    }

    get filteredReviewTaskChoices(): AgentConsoleReviewTaskItem[] {
        switch (this.selectedTaskFilter) {
            case 'failed':
                return this.reviewTaskChoices.filter(item => this.isFailedTaskChoice(item));
            case 'rollback':
                return this.reviewTaskChoices.filter(item => !!item.rollbackAvailable);
            case 'lineage':
                return this.selectedTaskLineageRootId
                    ? this.reviewTaskChoices.filter(item => this.resolveTaskLineageRootId(item) === this.selectedTaskLineageRootId)
                    : this.reviewTaskChoices;
            default:
                return this.reviewTaskChoices;
        }
    }

    setTaskFilter(filter: AgentConsoleTaskFilter): void {
        if (this.selectedTaskFilter === filter) {
            return;
        }
        this.selectedTaskFilter = filter;
        if (filter !== 'lineage') {
            this.selectedTaskLineageRootId = '';
        }
        this.syncFilteredTaskSelection();
    }

    focusSelectedTaskLineageFilter(): boolean {
        const rootId = this.resolveTaskLineageRootId(this.selectedTask);
        if (!rootId) {
            return false;
        }
        this.selectedTaskFilter = 'lineage';
        this.selectedTaskLineageRootId = rootId;
        this.syncFilteredTaskSelection();
        return true;
    }

    protected formatScheduledTimestamp(value?: number): string {
        return typeof value === 'number' && Number.isFinite(value)
            ? new Date(value).toISOString()
            : '';
    }

    protected buildSelectedScheduledTaskCopyText(): string {
        const selected = this.selectedScheduledTask;
        if (!selected) {
            return '';
        }
        return [
            `${selected.id} (${selected.scheduleType || 'once'})`,
            selected.prompt,
            selected.paused ? 'paused' : '',
            selected.running ? 'running' : '',
            selected.cancelled ? 'cancelled' : '',
            selected.runAt ? `runAt=${this.formatScheduledTimestamp(selected.runAt)}` : '',
            selected.nextRunAt ? `nextRunAt=${this.formatScheduledTimestamp(selected.nextRunAt)}` : '',
            selected.lastRunAt ? `lastRunAt=${this.formatScheduledTimestamp(selected.lastRunAt)}` : '',
            selected.runCount != null ? `runCount=${selected.runCount}` : '',
            selected.failureCount != null ? `failureCount=${selected.failureCount}` : '',
            selected.lastError ? `lastError=${selected.lastError}` : ''
        ].filter(Boolean).join('\n');
    }

    get scheduledTaskDetailLines(): string[] {
        const selected = this.selectedScheduledTask;
        if (!selected) {
            return [];
        }
        return [
            `session ${selected.sessionId}`,
            `schedule ${selected.scheduleType || 'once'}`,
            `status ${selected.cancelled ? 'cancelled' : selected.running ? 'running' : selected.paused ? 'paused' : 'idle'}`,
            selected.prompt ? `prompt ${selected.prompt}` : '',
            selected.runAt ? `runAt ${this.formatScheduledTimestamp(selected.runAt)}` : '',
            selected.nextRunAt ? `nextRunAt ${this.formatScheduledTimestamp(selected.nextRunAt)}` : '',
            selected.lastRunAt ? `lastRunAt ${this.formatScheduledTimestamp(selected.lastRunAt)}` : '',
            selected.runCount != null ? `runCount ${selected.runCount}` : '',
            selected.failureCount != null ? `failureCount ${selected.failureCount}` : '',
            selected.manualRecoveryRequired ? 'manual recovery required' : '',
            selected.alertOnFailure ? 'alert on failure' : '',
            selected.lastError ? `lastError ${selected.lastError}` : ''
        ].filter(Boolean);
    }

    setToolsFocused(focused: boolean): void {
        this.toolsFocused = focused;
        if (focused && !this.selectedToolName && this.tools.length) {
            this.selectedToolName = this.tools[0].name;
        }
        this.syncDerivedInputFocus();
    }

    setSelectedToolName(toolName: string): void {
        if (!toolName || !this.tools.some(item => item.name === toolName)) {
            return;
        }
        this.selectedToolName = toolName;
    }

    moveToolSelection(delta: number): void {
        if (!this.tools.length) {
            return;
        }
        const currentIndex = Math.max(0, this.tools.findIndex(item => item.name === this.selectedToolName));
        const nextIndex = (currentIndex + delta + this.tools.length) % this.tools.length;
        this.selectedToolName = this.tools[nextIndex].name;
    }

    moveToolSelectionPage(delta: number, pageSize?: number): void {
        if (!this.tools.length) {
            return;
        }
        const currentIndex = Math.max(0, this.tools.findIndex(item => item.name === this.selectedToolName));
        const resolvedPageSize = pageSize ?? this.consoleOptions.toolSelectionPageSize;
        const nextIndex = Math.max(0, Math.min(this.tools.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedToolName = this.tools[nextIndex].name;
    }

    selectFirstTool(): void {
        if (!this.tools.length) {
            return;
        }
        this.selectedToolName = this.tools[0].name;
    }

    selectLastTool(): void {
        if (!this.tools.length) {
            return;
        }
        this.selectedToolName = this.tools[this.tools.length - 1].name;
    }

    get selectedTool(): AgentConsoleToolItem | undefined {
        return this.tools.find(item => item.name === this.selectedToolName);
    }

    moveToolRunSelection(delta: number): void {
        if (!this.toolRuns.length) {
            return;
        }
        const nextIndex = (this.selectedToolRunIndex + delta + this.toolRuns.length) % this.toolRuns.length;
        this.selectedToolRunIndex = Math.max(0, Math.min(this.toolRuns.length - 1, nextIndex));
    }

    moveToolRunSelectionPage(delta: number, pageSize?: number): void {
        if (!this.toolRuns.length) {
            return;
        }
        const resolvedPageSize = pageSize ?? this.consoleOptions.toolSelectionPageSize;
        const nextIndex = this.selectedToolRunIndex + (delta * Math.max(1, resolvedPageSize));
        this.selectedToolRunIndex = Math.max(0, Math.min(this.toolRuns.length - 1, nextIndex));
    }

    selectFirstToolRun(): void {
        if (!this.toolRuns.length) {
            return;
        }
        this.selectedToolRunIndex = 0;
    }

    selectLastToolRun(): void {
        if (!this.toolRuns.length) {
            return;
        }
        this.selectedToolRunIndex = this.toolRuns.length - 1;
    }

    get selectedToolRun(): AgentConsoleToolRun | undefined {
        return this.toolRuns[this.selectedToolRunIndex];
    }

    setApprovalsFocused(focused: boolean): void {
        this.approvalsFocused = focused;
        if (focused && !this.selectedApprovalId && this.pendingApprovals.length) {
            this.selectedApprovalId = this.pendingApprovals[0].id;
        }
        this.syncDerivedInputFocus();
    }

    setSelectedApprovalId(approvalId: string): void {
        if (!approvalId || !this.pendingApprovals.some(item => item.id === approvalId)) {
            return;
        }
        this.selectedApprovalId = approvalId;
    }

    moveApprovalSelection(delta: number): void {
        if (!this.pendingApprovals.length) {
            return;
        }
        const currentIndex = Math.max(0, this.pendingApprovals.findIndex(item => item.id === this.selectedApprovalId));
        const nextIndex = (currentIndex + delta + this.pendingApprovals.length) % this.pendingApprovals.length;
        this.selectedApprovalId = this.pendingApprovals[nextIndex].id;
    }

    moveApprovalSelectionPage(delta: number, pageSize?: number): void {
        if (!this.pendingApprovals.length) {
            return;
        }
        const currentIndex = Math.max(0, this.pendingApprovals.findIndex(item => item.id === this.selectedApprovalId));
        const resolvedPageSize = pageSize ?? this.consoleOptions.approvalSelectionPageSize;
        const nextIndex = Math.max(0, Math.min(this.pendingApprovals.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedApprovalId = this.pendingApprovals[nextIndex].id;
    }

    selectFirstApproval(): void {
        if (!this.pendingApprovals.length) {
            return;
        }
        this.selectedApprovalId = this.pendingApprovals[0].id;
    }

    selectLastApproval(): void {
        if (!this.pendingApprovals.length) {
            return;
        }
        this.selectedApprovalId = this.pendingApprovals[this.pendingApprovals.length - 1].id;
    }

    get selectedApproval(): AgentConsoleApprovalRequest | undefined {
        return this.pendingApprovals.find(item => item.id === this.selectedApprovalId);
    }

    setReviewTasks(tasks: AgentConsoleReviewTaskItem[]): void {
        this.reviewTaskChoices = tasks.slice();
        this.syncFilteredTaskSelection();
    }

    openReview(
        task?: Record<string, any> | null,
        payload?: {
            diff?: any;
            workers?: AgentConsoleReviewWorker[];
            executionMode?: 'sequential' | 'parallel' | null;
        }
    ): void {
        const preferredGroupKey = this.selectedReviewGroup?.key;
        const preferredFilePath = this.selectedReviewFileSection?.path;
        this.syncCurrentReviewAnnotationCache();
        if (task !== undefined) {
            this.reviewTask = task || null;
        }
        if (payload) {
            this.reviewDiff = payload.diff ?? null;
            this.reviewWorkers = Array.isArray(payload.workers) ? payload.workers.slice() : [];
        }
        this.fileChangeMessage = this.buildFileChangeMessage();
        const selectedTaskId = String(this.reviewTask?.id || this.selectedReviewTaskId || '').trim();
        if (selectedTaskId) {
            this.selectedReviewTaskId = selectedTaskId;
            const executionMode = payload?.executionMode ?? this.reviewExecutionMode;
            const existingIndex = this.reviewTaskChoices.findIndex(item => item.id === selectedTaskId);
            const nextItem: AgentConsoleReviewTaskItem = {
                id: selectedTaskId,
                title: String(this.reviewTask?.title || selectedTaskId),
                cacheKey: this.resolveReviewAnnotationCacheKey(this.reviewTask),
                sourceSessionId: this.reviewTask?.sourceSessionId || this.reviewTask?.sessionId,
                status: this.reviewTask?.status,
                executionMode,
                retryOfTaskId: this.reviewTask?.metadata?.retrySourceTaskId || this.reviewTask?.metadata?.retryOfTaskId,
                lineageRootTaskId: this.reviewTask?.metadata?.retryOfTaskId || this.reviewTask?.id,
                retryDepth: typeof this.reviewTask?.metadata?.retrySequence === 'number' ? this.reviewTask.metadata.retrySequence : undefined,
                updatedAt: this.reviewTask?.updatedAt,
                detail: typeof this.reviewDiff?.summary === 'string' ? this.reviewDiff.summary : undefined
            };
            if (existingIndex >= 0) {
                this.reviewTaskChoices = this.reviewTaskChoices.map(item => item.id === selectedTaskId ? {
                    ...item,
                    ...nextItem
                } : item);
            } else {
                this.reviewTaskChoices = [nextItem, ...this.reviewTaskChoices];
            }
            this.selectedReviewTaskCacheKey = this.resolveReviewAnnotationCacheKey(this.reviewTask) || this.resolveReviewAnnotationCacheKey(nextItem) || selectedTaskId;
            const cached = this.reviewAnnotationCache[this.selectedReviewTaskCacheKey] || this.reviewAnnotationCache[selectedTaskId];
            if (cached) {
                const fileAnnots: Record<string, AgentConsoleReviewAnnotation> = {};
                const hunkAnnots: Record<string, AgentConsoleReviewAnnotation> = {};
                for (const [key, val] of Object.entries(cached)) {
                    const hashIdx = key.lastIndexOf('#');
                    if (hashIdx > 0 && /^\d+$/.test(key.slice(hashIdx + 1))) {
                        hunkAnnots[key] = val;
                    } else {
                        fileAnnots[key] = val;
                    }
                }
                this.reviewFileAnnotations = fileAnnots;
                this.reviewHunkAnnotations = hunkAnnots;
            } else {
                this.reviewFileAnnotations = {};
                this.reviewHunkAnnotations = {};
            }
        }
        if (!this.reviewTask && !this.reviewDiff && !this.reviewWorkers.length) {
            return;
        }
        this.syncReviewGroupSelection(preferredGroupKey);
        this.syncReviewFileSelection(preferredFilePath);
        this.reviewOpen = true;
        this.selectedReviewHunkIndex = 0;
        this.resetReviewDetailViewport();
        this.syncDerivedInputFocus();
    }

    protected buildFileChangeMessage(): AgentMessage | null {
        const files = this.aggregateReviewFileSections;
        if (!files.length) {
            return null;
        }
        const content = [
            `files changed: ${files.length}`,
            ...files.map(file => `${file.path} (+${file.additions} -${file.deletions})`)
        ].join('\n');
        return {
            id: '__file_change_inline__',
            role: 'assistant',
            content,
            createdAt: Date.now(),
            metadata: { uiKind: 'file-change', reviewTaskId: this.reviewTask?.id }
        };
    }

    closeReview(): void {
        if (!this.reviewOpen && this.reviewDetailScroll === 0 && this.reviewDetailColumnScroll === 0) {
            return;
        }
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
        this.reviewOpen = false;
        this.resetReviewDetailViewport();
        this.syncDerivedInputFocus();
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
        this.syncCurrentReviewAnnotationCache();
        this.reviewTask = null;
        this.reviewDiff = null;
        this.reviewWorkers = [];
        this.reviewTaskChoices = [];
        this.taskRecords = [];
        this.selectedReviewTaskId = '';
        this.selectedReviewTaskCacheKey = '';
        this.selectedTaskFilter = 'all';
        this.selectedTaskLineageRootId = '';
        this.selectedReviewGroupIndex = 0;
        this.selectedReviewFileIndex = 0;
        this.selectedReviewHunkIndex = 0;
        this.foldedReviewHunks.clear();
        this.selectedReviewPatchFilter = 'all';
        this.reviewSideBySide = false;
        this.reviewFileAnnotations = {};
        this.reviewHunkAnnotations = {};
        this.reviewOpen = false;
        this.resetReviewDetailViewport();
        this.syncDerivedInputFocus();
    }

    get reviewExecutionMode(): 'sequential' | 'parallel' | null {
        const mode = this.reviewTask?.result?.executionMode
            ?? this.reviewTask?.metadata?.executionMode
            ?? null;
        return mode === 'parallel' || mode === 'sequential' ? mode : null;
    }

    get reviewGroups(): AgentConsoleReviewGroup[] {
        const groups: AgentConsoleReviewGroup[] = [];
        const aggregateText = this.stringifyReviewContent(this.reviewDiff);
        if (aggregateText || this.reviewDiff || this.reviewTask?.result?.diff) {
            groups.push({
                key: 'aggregate',
                kind: 'aggregate',
                label: 'aggregate',
                status: this.reviewTask?.status,
                diffText: aggregateText,
                sections: this.parseUnifiedDiffSections(aggregateText)
            });
        }
        for (let index = 0; index < this.reviewWorkers.length; index++) {
            const worker = this.reviewWorkers[index];
            const diffText = this.stringifyReviewContent(worker.diff ?? worker.output);
            groups.push({
                key: `worker:${worker.workerId || index + 1}`,
                kind: 'worker',
                label: worker.workerId || `worker-${index + 1}`,
                status: worker.status,
                workerId: worker.workerId,
                branch: worker.branch,
                worktreePath: worker.worktreePath,
                actionIds: worker.actionIds,
                error: worker.error,
                diffText,
                sections: this.parseUnifiedDiffSections(diffText)
            });
        }
        return groups;
    }

    get selectedReviewGroup(): AgentConsoleReviewGroup | undefined {
        const groups = this.reviewGroups;
        if (!groups.length) {
            return undefined;
        }
        const nextIndex = Math.max(0, Math.min(groups.length - 1, this.selectedReviewGroupIndex));
        return groups[nextIndex];
    }

    get aggregateReviewFileSections(): AgentConsoleReviewDiffSection[] {
        return this.parseUnifiedDiffSections(this.stringifyReviewContent(this.reviewDiff));
    }

    get reviewFileSections(): AgentConsoleReviewDiffSection[] {
        return this.selectedReviewGroup?.sections || this.aggregateReviewFileSections;
    }

    setSelectedReviewGroupIndex(index: number): void {
        const groups = this.reviewGroups;
        if (!groups.length) {
            return;
        }
        const nextIndex = Math.max(0, Math.min(groups.length - 1, index));
        if (nextIndex === this.selectedReviewGroupIndex) {
            return;
        }
        this.selectedReviewGroupIndex = nextIndex;
        this.selectedReviewFileIndex = 0;
        this.selectedReviewHunkIndex = 0;
        this.resetReviewDetailViewport();
    }

    moveReviewGroupSelection(delta: number): void {
        const groups = this.reviewGroups;
        if (!groups.length) {
            return;
        }
        const nextIndex = (this.selectedReviewGroupIndex + delta + groups.length) % groups.length;
        if (nextIndex === this.selectedReviewGroupIndex) {
            return;
        }
        this.selectedReviewGroupIndex = nextIndex;
        this.selectedReviewFileIndex = 0;
        this.selectedReviewHunkIndex = 0;
        this.resetReviewDetailViewport();
    }

    setReviewPatchFilter(filter: AgentConsoleReviewPatchFilter): void {
        if (this.selectedReviewPatchFilter === filter) {
            return;
        }
        this.selectedReviewPatchFilter = filter;
        this.resetReviewDetailViewport();
    }

    setReviewFileAnnotation(status: 'approved' | 'rejected', comment?: string, filePath?: string): void {
        if (!this.reviewOpen) return;
        const path = filePath ?? this.selectedReviewFileSection?.path;
        if (!path) return;
        this.reviewFileAnnotations[path] = {
            status,
            comment,
            createdAt: new Date().toISOString()
        };
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    clearReviewFileAnnotation(filePath?: string): void {
        if (!this.reviewOpen) return;
        const path = filePath ?? this.selectedReviewFileSection?.path;
        if (!path) return;
        delete this.reviewFileAnnotations[path];
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    approveAllReviewFiles(comment?: string): void {
        if (!this.reviewOpen) return;
        const sections = this.reviewFileSections;
        for (const section of sections) {
            this.reviewFileAnnotations[section.path] = {
                status: 'approved',
                comment,
                createdAt: new Date().toISOString()
            };
        }
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    rejectAllReviewFiles(comment?: string): void {
        if (!this.reviewOpen) return;
        const sections = this.reviewFileSections;
        for (const section of sections) {
            this.reviewFileAnnotations[section.path] = {
                status: 'rejected',
                comment,
                createdAt: new Date().toISOString()
            };
        }
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    /** Generate a hunk annotation key from file path and hunk index. */
    protected hunkAnnotationKey(filePath: string, hunkIndex: number): string {
        return `${filePath}#${hunkIndex}`;
    }

    /** Set an annotation on a specific hunk within a file. */
    setReviewHunkAnnotation(status: 'approved' | 'rejected', comment?: string, filePath?: string, hunkIndex?: number): void {
        if (!this.reviewOpen) return;
        const path = filePath ?? this.selectedReviewFileSection?.path;
        const idx = hunkIndex ?? this.selectedReviewHunkIndex;
        if (!path) return;
        this.reviewHunkAnnotations[this.hunkAnnotationKey(path, idx)] = {
            status,
            comment,
            createdAt: new Date().toISOString()
        };
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    /** Clear annotation on a specific hunk. */
    clearReviewHunkAnnotation(filePath?: string, hunkIndex?: number): void {
        if (!this.reviewOpen) return;
        const path = filePath ?? this.selectedReviewFileSection?.path;
        const idx = hunkIndex ?? this.selectedReviewHunkIndex;
        if (!path) return;
        delete this.reviewHunkAnnotations[this.hunkAnnotationKey(path, idx)];
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    /** Get annotation for a specific hunk. */
    getReviewHunkAnnotation(filePath: string, hunkIndex: number): AgentConsoleReviewAnnotation | undefined {
        return this.reviewHunkAnnotations[this.hunkAnnotationKey(filePath, hunkIndex)];
    }

    /** Approve all hunks within a given file (or the currently selected file). */
    approveAllReviewHunksForFile(comment?: string, filePath?: string): void {
        if (!this.reviewOpen) return;
        const path = filePath ?? this.selectedReviewFileSection?.path;
        if (!path) return;
        const section = this.reviewFileSections.find(s => s.path === path);
        if (!section) return;
        const hunks = this.parseReviewHunks(section);
        for (let i = 0; i < hunks.length; i++) {
            this.reviewHunkAnnotations[this.hunkAnnotationKey(path, i)] = {
                status: 'approved',
                comment,
                createdAt: new Date().toISOString()
            };
        }
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    /** Reject all hunks within a given file (or the currently selected file). */
    rejectAllReviewHunksForFile(comment?: string, filePath?: string): void {
        if (!this.reviewOpen) return;
        const path = filePath ?? this.selectedReviewFileSection?.path;
        if (!path) return;
        const section = this.reviewFileSections.find(s => s.path === path);
        if (!section) return;
        const hunks = this.parseReviewHunks(section);
        for (let i = 0; i < hunks.length; i++) {
            this.reviewHunkAnnotations[this.hunkAnnotationKey(path, i)] = {
                status: 'rejected',
                comment,
                createdAt: new Date().toISOString()
            };
        }
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    /** Collect all annotations (file + hunk) into a structured object for write-back. */
    collectReviewConclusions(): { files: Record<string, AgentConsoleReviewAnnotation>; hunks: Record<string, AgentConsoleReviewAnnotation>; summary: { totalFiles: number; approvedFiles: number; rejectedFiles: number; totalHunks: number; approvedHunks: number; rejectedHunks: number } } {
        const fileEntries = Object.entries(this.reviewFileAnnotations);
        const hunkEntries = Object.entries(this.reviewHunkAnnotations);
        return {
            files: { ...this.reviewFileAnnotations },
            hunks: { ...this.reviewHunkAnnotations },
            summary: {
                totalFiles: fileEntries.length,
                approvedFiles: fileEntries.filter(([, a]) => a.status === 'approved').length,
                rejectedFiles: fileEntries.filter(([, a]) => a.status === 'rejected').length,
                totalHunks: hunkEntries.length,
                approvedHunks: hunkEntries.filter(([, a]) => a.status === 'approved').length,
                rejectedHunks: hunkEntries.filter(([, a]) => a.status === 'rejected').length
            }
        };
    }

    /** Serialize conclusions and fire write-back callback for the host to persist. */
    writeReviewConclusions(): { files: Record<string, AgentConsoleReviewAnnotation>; hunks: Record<string, AgentConsoleReviewAnnotation>; summary: { totalFiles: number; approvedFiles: number; rejectedFiles: number; totalHunks: number; approvedHunks: number; rejectedHunks: number } } {
        const conclusions = this.collectReviewConclusions();
        this.onReviewConclusionsWriteBack?.(conclusions);
        return conclusions;
    }

    clearAllReviewAnnotations(): void {
        if (!this.reviewOpen) return;
        this.reviewFileAnnotations = {};
        this.reviewHunkAnnotations = {};
        this.syncCurrentReviewAnnotationCache();
        this.onReviewAnnotationsPersist?.(this.getAnnotationCache());
    }

    getReviewAnnotationSummary(): string[] {
        const lines: string[] = [];
        const fileEntries = Object.entries(this.reviewFileAnnotations);
        const hunkEntries = Object.entries(this.reviewHunkAnnotations);
        if (!fileEntries.length && !hunkEntries.length) {
            lines.push('No annotations.');
            return lines;
        }
        if (fileEntries.length) {
            const approved = fileEntries.filter(([, a]) => a.status === 'approved').length;
            const rejected = fileEntries.filter(([, a]) => a.status === 'rejected').length;
            lines.push(`File Annotations: ${approved} approved, ${rejected} rejected`);
            for (const [path, annot] of fileEntries) {
                lines.push(`  ${annot.status === 'approved' ? '✓' : '✗'} ${path}${annot.comment ? ` — ${annot.comment}` : ''}`);
            }
        }
        if (hunkEntries.length) {
            const hApproved = hunkEntries.filter(([, a]) => a.status === 'approved').length;
            const hRejected = hunkEntries.filter(([, a]) => a.status === 'rejected').length;
            lines.push(`Hunk Annotations: ${hApproved} approved, ${hRejected} rejected`);
            for (const [key, annot] of hunkEntries) {
                lines.push(`  ${annot.status === 'approved' ? '✓' : '✗'} ${key}${annot.comment ? ` — ${annot.comment}` : ''}`);
            }
        }
        return lines;
    }

    computeFileRiskScore(section: AgentConsoleReviewDiffSection): { score: number; level: 'low' | 'medium' | 'high' | 'critical' } {
        const rawScore = section.additions * 1 + section.deletions * 0.5;
        if (rawScore < 10) return { score: 1, level: 'low' };
        if (rawScore < 30) return { score: 3, level: 'low' };
        if (rawScore < 60) return { score: 5, level: 'medium' };
        if (rawScore < 120) return { score: 7, level: 'high' };
        return { score: 10, level: 'critical' };
    }

    getReviewExportReport(): string[] {
        const lines: string[] = [];
        const task = this.filteredReviewTaskChoices.find(t => t.id === this.selectedReviewTaskId);
        lines.push(`# Review Report`);
        lines.push(`Task: ${(task?.title ?? this.selectedReviewTaskId) || '(none)'}`);
        lines.push(`Date: ${new Date().toISOString()}`);
        lines.push(`Status: ${task?.status ?? 'unknown'}`);
        lines.push('');
        const fileEntries = Object.entries(this.reviewFileAnnotations);
        const hunkEntries = Object.entries(this.reviewHunkAnnotations);
        if (!fileEntries.length && !hunkEntries.length) {
            lines.push('No annotations.');
            return lines;
        }
        if (fileEntries.length) {
            const approved = fileEntries.filter(([, a]) => a.status === 'approved');
            const rejected = fileEntries.filter(([, a]) => a.status === 'rejected');
            lines.push(`## File Annotations`);
            lines.push(`- Approved: ${approved.length}`);
            lines.push(`- Rejected: ${rejected.length}`);
            lines.push('');
            for (const [path, annot] of fileEntries) {
                lines.push(`- ${annot.status === 'approved' ? '✓' : '✗'} ${path}${annot.comment ? `: ${annot.comment}` : ''}`);
            }
            lines.push('');
        }
        if (hunkEntries.length) {
            const hApproved = hunkEntries.filter(([, a]) => a.status === 'approved');
            const hRejected = hunkEntries.filter(([, a]) => a.status === 'rejected');
            lines.push(`## Hunk Annotations`);
            lines.push(`- Approved: ${hApproved.length}`);
            lines.push(`- Rejected: ${hRejected.length}`);
            lines.push('');
            for (const [key, annot] of hunkEntries) {
                lines.push(`- ${annot.status === 'approved' ? '✓' : '✗'} ${key}${annot.comment ? `: ${annot.comment}` : ''}`);
            }
            lines.push('');
        }
        return lines;
    }

    get selectedReviewFileSection(): AgentConsoleReviewDiffSection | undefined {
        const sections = this.reviewFileSections;
        if (!sections.length) {
            return undefined;
        }
        const nextIndex = Math.max(0, Math.min(sections.length - 1, this.selectedReviewFileIndex));
        return sections[nextIndex];
    }

    setSelectedReviewFileIndex(index: number): void {
        const sections = this.reviewFileSections;
        if (!sections.length) {
            return;
        }
        const nextIndex = Math.max(0, Math.min(sections.length - 1, index));
        if (nextIndex === this.selectedReviewFileIndex) {
            return;
        }
        this.selectedReviewFileIndex = nextIndex;
        this.selectedReviewHunkIndex = 0;
        this.resetReviewDetailViewport();
    }

    moveReviewFileSelection(delta: number): void {
        const sections = this.reviewFileSections;
        if (!sections.length) {
            return;
        }
        const nextIndex = (this.selectedReviewFileIndex + delta + sections.length) % sections.length;
        if (nextIndex === this.selectedReviewFileIndex) {
            return;
        }
        this.selectedReviewFileIndex = nextIndex;
        this.selectedReviewHunkIndex = 0;
        this.resetReviewDetailViewport();
    }

    get reviewDetailLines(): string[] {
        const lines: string[] = [];
        const summary = this.reviewDiff?.summary ?? this.reviewTask?.result?.diff?.summary;
        if (summary) {
            lines.push(`Summary: ${summary}`);
        }
        lines.push(...this.buildReviewAssessmentLines());

        const rollback = this.reviewTask?.result?.rollback;
        if (rollback) {
            const rollbackParts = [
                rollback.available === true ? 'available' : 'unavailable',
                rollback.mode ? `mode ${rollback.mode}` : '',
                rollback.checkpointId ? `checkpoint ${rollback.checkpointId}` : '',
                rollback.rolledBackAt ? `applied ${new Date(rollback.rolledBackAt).toISOString()}` : '',
                rollback.reason ? rollback.reason : ''
            ].filter(Boolean);
            if (rollbackParts.length) {
                lines.push(`Rollback: ${rollbackParts.join(' · ')}`);
            }
        }

        const retryWorkerIds = Array.isArray(this.reviewTask?.metadata?.retryOfWorkerIds)
            ? this.reviewTask.metadata.retryOfWorkerIds.filter((item: any) => typeof item === 'string' && item)
            : [];
        if (retryWorkerIds.length) {
            lines.push(`Retry Workers: ${retryWorkerIds.join(', ')}`);
        }
        const carryForwardWorkerIds = Array.isArray(this.reviewTask?.metadata?.carryForwardWorkerIds)
            ? this.reviewTask.metadata.carryForwardWorkerIds.filter((item: any) => typeof item === 'string' && item)
            : [];
        if (carryForwardWorkerIds.length) {
            lines.push(`Carry Forward: ${carryForwardWorkerIds.join(', ')}`);
        }
        const checkpoints = Array.isArray(this.reviewTask?.metadata?.checkpoints)
            ? this.reviewTask?.metadata?.checkpoints
            : [];
        if (checkpoints.length) {
            const available = checkpoints.filter((entry: any) => entry?.status === 'available').length;
            const applied = checkpoints.filter((entry: any) => entry?.status === 'applied').length;
            const invalidated = checkpoints.filter((entry: any) => entry?.status === 'invalidated').length;
            lines.push(`Checkpoints: ${checkpoints.length} total · ${available} available · ${applied} applied · ${invalidated} invalidated`);
        }

        const groups = this.reviewGroups;
        if (groups.length) {
            const selectedGroup = this.selectedReviewGroup || groups[0];
            lines.push(`Groups: ${groups.length}`);
            for (let index = 0; index < groups.length; index++) {
                const group = groups[index];
                const marker = index === this.selectedReviewGroupIndex ? '›' : ' ';
                lines.push(`${marker} [${index + 1}/${groups.length}] ${this.describeReviewGroup(group)}`);
            }
            if (selectedGroup) {
                lines.push(`Current Group: ${this.describeReviewGroup(selectedGroup)}`);
                const groupMetaLines = this.buildSelectedReviewGroupMetaLines(selectedGroup);
                if (groupMetaLines.length) {
                    lines.push(...groupMetaLines);
                }
                const sections = selectedGroup.sections;
                if (sections.length) {
                    const selectedSection = this.selectedReviewFileSection || sections[0];
                    lines.push(`Files: ${sections.length}`);
                    for (let index = 0; index < sections.length; index++) {
                        const section = sections[index];
                        const marker = index === this.selectedReviewFileIndex ? '›' : ' ';
                        const annot = this.reviewFileAnnotations[section.path];
                        const annotMark = annot ? (annot.status === 'approved' ? ' ✓' : ' ✗') : '';
                        lines.push(`${marker} [${index + 1}/${sections.length}] ${section.path} (+${section.additions} -${section.deletions})${annotMark}`);
                    }
                    if (selectedSection) {
                        const annot = this.reviewFileAnnotations[selectedSection.path];
                        const annotLine = annot
                            ? `  Annotation: ${annot.status === 'approved' ? 'approved' : 'rejected'}${annot.comment ? ` · ${annot.comment}` : ''}`
                            : '  [a]pprove  [r]eject  [c]lear annotation';
                        lines.push(`Current File: ${selectedSection.path} (+${selectedSection.additions} -${selectedSection.deletions})`);
                        lines.push(annotLine);
                        lines.push(...this.renderReviewPatchLines(selectedSection, selectedGroup.key));
                    }
                } else if (selectedGroup.diffText) {
                    lines.push('Current Patch');
                    lines.push(...this.filterReviewPatchLines(selectedGroup.diffText.split('\n')));
                } else if (selectedGroup.error) {
                    lines.push(`Current Error: ${selectedGroup.error}`);
                }
            }
        }

        if (!groups.length && !lines.length) {
            lines.push('No diff captured.');
        }

        return lines.map(line => this.expandTabs(line));
    }

    get reviewDetailMaxColumn(): number {
        return this.reviewDetailLines.reduce((max, line) => Math.max(max, line.length), 0);
    }

    scrollReviewDetail(delta: number): void {
        if (!this.reviewOpen) {
            return;
        }
        const lines = this.reviewDetailLines;
        const maxScroll = Math.max(0, lines.length - this.consoleOptions.reviewDetailVisibleLines);
        this.reviewDetailScroll = Math.max(0, Math.min(maxScroll, this.reviewDetailScroll + delta));
    }

    scrollReviewDetailPage(delta: number, pageSize?: number): void {
        if (!this.reviewOpen) {
            return;
        }
        const resolvedPageSize = pageSize ?? this.consoleOptions.reviewDetailPageSize;
        this.scrollReviewDetail(delta * Math.max(1, resolvedPageSize));
    }

    scrollReviewDetailToEdge(position: 'start' | 'end'): void {
        if (!this.reviewOpen) {
            return;
        }
        const lines = this.reviewDetailLines;
        this.reviewDetailScroll = position === 'start'
            ? 0
            : Math.max(0, lines.length - this.consoleOptions.reviewDetailVisibleLines);
    }

    jumpReviewHunk(direction: -1 | 1): void {
        if (!this.reviewOpen) return;
        const group = this.selectedReviewGroup;
        const section = this.selectedReviewFileSection;
        if (!group || !section) return;
        const hunks = this.parseReviewHunks(section);
        if (!hunks.length) return;
        const count = hunks.length;
        const current = Math.max(0, Math.min(count - 1, this.selectedReviewHunkIndex));
        this.selectedReviewHunkIndex = (current + direction + count) % count;
        const detailLines = this.reviewDetailLines;
        const patchStart = detailLines.findIndex(line => line.startsWith('diff --git '));
        const base = patchStart >= 0 ? patchStart : 0;
        const rendered = this.renderReviewPatchLines(section, group.key);
        let renderedOffset = -1;
        let seen = 0;
        for (let index = 0; index < rendered.length; index++) {
            if (rendered[index].startsWith('@@')) {
                if (seen === this.selectedReviewHunkIndex) {
                    renderedOffset = index;
                    break;
                }
                seen++;
            }
        }
        this.reviewDetailScroll = renderedOffset >= 0 ? Math.max(0, base + renderedOffset - 2) : 0;
    }

    scrollReviewDetailColumns(delta: number): void {
        if (!this.reviewOpen) {
            return;
        }
        const maxScroll = Math.max(0, this.reviewDetailMaxColumn - 1);
        this.reviewDetailColumnScroll = Math.max(0, Math.min(maxScroll, this.reviewDetailColumnScroll + delta));
    }

    scrollReviewDetailColumnsToEdge(position: 'start' | 'end'): void {
        if (!this.reviewOpen) {
            return;
        }
        this.reviewDetailColumnScroll = position === 'start'
            ? 0
            : Math.max(0, this.reviewDetailMaxColumn - 1);
    }

    setNotice(message: string): void {
        this.notice = message;
    }

    openTextOverlay(title: string, lines: string[]): void {
        const content = (Array.isArray(lines) ? lines : []).map(line => String(line ?? ''));
        if (!content.length) {
            return;
        }
        this.textOverlay = { title: String(title || ''), lines: content, scroll: 0 };
        this.syncDerivedInputFocus();
    }

    closeTextOverlay(): void {
        if (!this.textOverlay) {
            return;
        }
        this.textOverlay = null;
        this.syncDerivedInputFocus();
    }

    hasTextOverlayFocus(): boolean {
        return !!this.textOverlay;
    }

    pushCommandOutput(command: string, text: string, kind: AgentConsoleCommandOutputEntry['kind'] = 'result'): string {
        const body = String(text ?? '').trim();
        if (!body || !String(command ?? '').trim()) {
            return '';
        }
        const entry: AgentConsoleCommandOutputEntry = {
            id: `output-${++this.commandOutputSequence}`,
            command: String(command).trim(),
            text: body,
            ts: Date.now(),
            kind
        };
        this.commandOutputs = [entry, ...this.commandOutputs].slice(0, AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP);
        if (this.commandOutputsSelectedIndex >= this.visibleCommandOutputs.length) {
            this.commandOutputsSelectedIndex = Math.max(0, this.visibleCommandOutputs.length - 1);
        }
        this.persistCommandOutput(entry);
        return entry.id;
    }

    /**
     * Persists a command output to the durable store when one is configured.
     * Never throws: persistence is best-effort and must not break the live ring.
     */
    protected persistCommandOutput(entry: AgentConsoleCommandOutputEntry): Promise<void> {
        const store = this.commandOutputStore;
        if (!store) {
            return Promise.resolve();
        }
        const execution = this.latestCommandExecution;
        const historyEntry: AgentConsoleCommandOutputHistoryEntry = {
            ...entry,
            text: redactCommandOutputSecret(entry.text),
            argsSummary: execution && execution.command === entry.command ? execution.args : undefined,
            requestId: execution && execution.status === 'running' ? execution.requestId : undefined,
            status: entry.kind === 'error' ? 'failed' : undefined,
            sessionId: this.sessionId || undefined,
            source: 'local'
        };
        return store.append(historyEntry) as Promise<void>;
    }

    /**
     * Injects a durable command-output store. When provided, results are
     * persisted and can be rehydrated via `loadCommandOutputHistory`.
     */
    setCommandOutputStore(store: CommandOutputStore | undefined): void {
        this.commandOutputStore = store;
    }

    /**
     * Hydrates the in-memory command-output ring from the durable store
     * (newest-first, capped at the ring cap). Used on configure/session switch.
     */
    async loadCommandOutputHistory(): Promise<void> {
        const store = this.commandOutputStore;
        if (!store) {
            return;
        }
        const page = await store.list({ sessionId: this.sessionId, limit: AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP });
        if (page.items.length) {
            this.commandOutputs = page.items.slice(0, AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP) as unknown as AgentConsoleCommandOutputEntry[];
        }
    }

    beginCommandExecution(command: string, args: string): string {
        const control = this.requireCommandExecutionControl();
        const sequence = ++this.commandExecutionSequence;
        const requestId = `cmd-${sequence}`;
        control.begin(requestId, this.sessionId);
        this.commandExecutions = reduceAgentConsoleCommandExecution(
            this.commandExecutions,
            createBeginCommandExecutionAction(requestId, String(command || '').trim(), String(args || '').trim(), this.sessionId, Date.now(), sequence, this.commandExchangeSessionEpoch)
        );
        this.syncCommandExecutionTranscript(requestId);
        return requestId;
    }

    completeCommandExecution(requestId: string, status: 'succeeded' | 'cancelled'): void {
        if (!this.isCommandExecutionCurrent(requestId)) {
            return;
        }
        this.commandExecutions = reduceAgentConsoleCommandExecution(
            this.commandExecutions,
            createCompleteCommandExecutionAction(requestId, status)
        );
        this.syncCommandExecutionTranscript(requestId);
        this.requireCommandExecutionControl().finish(requestId);
    }

    failCommandExecution(requestId: string, error: string, retryable: boolean): void {
        if (!this.isCommandExecutionCurrent(requestId)) {
            return;
        }
        this.commandExecutions = reduceAgentConsoleCommandExecution(
            this.commandExecutions,
            createFailCommandExecutionAction(requestId, String(error || ''), !!retryable)
        );
        this.syncCommandExecutionTranscript(requestId);
        this.requireCommandExecutionControl().finish(requestId);
    }

    linkCommandOutputToExecution(requestId: string, outputId: string): void {
        this.commandExecutions = reduceAgentConsoleCommandExecution(
            this.commandExecutions,
            createLinkCommandOutputAction(requestId, outputId)
        );
        this.syncCommandExecutionTranscript(requestId);
    }

    get latestCommandExecution(): AgentConsoleCommandExecution | undefined {
        return this.commandExecutions[0];
    }

    /** True only while a request still belongs to this session generation. */
    isCommandExecutionCurrent(requestId: string): boolean {
        return this.requireCommandExecutionControl().isCurrent(requestId, this.sessionId)
            && this.commandExecutions.some(item => item.requestId === requestId);
    }

    getCommandExecutionSignal(requestId: string): AbortSignal | undefined {
        return this.requireCommandExecutionControl().signal(requestId, this.sessionId);
    }

    setCommandExecutionControl(control: CommandExecutionControlPort): void {
        this.commandExecutionControl = control;
    }

    protected requireCommandExecutionControl(): CommandExecutionControlPort {
        if (!this.commandExecutionControl) {
            throw new Error('AgentConsoleSessionState requires COMMAND_EXECUTION_CONTROL from its host injector.');
        }
        return this.commandExecutionControl;
    }

    /** Cancels all currently running command records; late completions are ignored. */
    cancelRunningCommandExecutions(): void {
        this.commandExecutions
            .filter(item => item.status === 'running')
            .forEach(item => {
                this.requireCommandExecutionControl().cancel(item.requestId);
                this.commandExecutions = reduceAgentConsoleCommandExecution(
                    this.commandExecutions,
                    createCompleteCommandExecutionAction(item.requestId, 'cancelled')
                );
                this.syncCommandExecutionTranscript(item.requestId);
            });
    }

    /** Projects one command lifecycle into the shared, stable-key transcript. */
    protected syncCommandExecutionTranscript(requestId: string): void {
        const execution = this.commandExecutions.find(item => item.requestId === requestId);
        if (!execution) {
            return;
        }
        const details = [execution.command, execution.args].filter(Boolean).join(' ');
        const status = execution.status === 'running' ? 'running'
            : execution.status === 'succeeded' ? 'completed'
                : execution.status === 'cancelled' ? 'cancelled' : 'failed';
        const suffix = execution.error ? `: ${execution.error}` : '';
        const content = `${details || 'Command'} ${status}${suffix}`;
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

    openCommandOutputs(): void {
        this.commandOutputsOpen = true;
        this.commandOutputsFilter = '';
        this.commandOutputsFilterMode = false;
        this.commandOutputsSelectedIndex = 0;
        this.syncDerivedInputFocus();
    }

    closeCommandOutputs(): void {
        if (!this.commandOutputsOpen) {
            return;
        }
        this.commandOutputsOpen = false;
        this.commandOutputsFilter = '';
        this.commandOutputsFilterMode = false;
        this.commandOutputsSelectedIndex = 0;
        this.syncDerivedInputFocus();
    }

    toggleCommandOutputs(): void {
        if (this.commandOutputsOpen) {
            this.closeCommandOutputs();
        } else {
            this.openCommandOutputs();
        }
    }

    hasCommandOutputsFocus(): boolean {
        return this.commandOutputsOpen;
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

    setCommandOutputsFilter(filter: string): void {
        this.commandOutputsFilter = String(filter ?? '').slice(0, 64);
        this.commandOutputsSelectedIndex = 0;
    }

    moveCommandOutputSelection(delta: number): void {
        const count = this.visibleCommandOutputs.length;
        if (!count) {
            this.commandOutputsSelectedIndex = 0;
            return;
        }
        this.commandOutputsSelectedIndex = Math.max(0, Math.min(count - 1, this.commandOutputsSelectedIndex + delta));
    }

    copySelectedCommandOutput(): Promise<boolean> {
        const selected = this.visibleCommandOutputs[this.commandOutputsSelectedIndex];
        if (!selected || !this.copyFocusedTextAction) {
            return Promise.resolve(false);
        }
        Promise.resolve(this.copyFocusedTextAction(
            selected.text,
            `command ${selected.command} output`
        )).catch(() => {
            return;
        });
        return Promise.resolve(true);
    }

    scrollCommandOutputsToEdge(position: 'start' | 'end'): void {
        const count = this.visibleCommandOutputs.length;
        if (!count) {
            this.commandOutputsSelectedIndex = 0;
            return;
        }
        this.commandOutputsSelectedIndex = position === 'start' ? 0 : count - 1;
    }

    scrollCommandOutputsPage(delta: number, pageSize?: number): void {
        const count = this.visibleCommandOutputs.length;
        if (!count) {
            this.commandOutputsSelectedIndex = 0;
            return;
        }
        const resolvedPageSize = Math.max(1, pageSize ?? this.consoleOptions.reviewDetailPageSize);
        this.moveCommandOutputSelection(delta * resolvedPageSize);
    }

    get textOverlayVisibleLines(): string[] {
        if (!this.textOverlay) {
            return [];
        }
        const visible = this.consoleOptions.reviewDetailVisibleLines;
        return this.textOverlay.lines.slice(this.textOverlay.scroll, this.textOverlay.scroll + visible);
    }

    scrollTextOverlay(delta: number): void {
        if (!this.textOverlay) {
            return;
        }
        const visible = this.consoleOptions.reviewDetailVisibleLines;
        const maxScroll = Math.max(0, this.textOverlay.lines.length - visible);
        this.textOverlay.scroll = Math.max(0, Math.min(maxScroll, this.textOverlay.scroll + delta));
    }

    scrollTextOverlayPage(delta: number, pageSize?: number): void {
        if (!this.textOverlay) {
            return;
        }
        const resolvedPageSize = pageSize ?? this.consoleOptions.reviewDetailPageSize;
        this.scrollTextOverlay(delta * Math.max(1, resolvedPageSize));
    }

    scrollTextOverlayToEdge(position: 'start' | 'end'): void {
        if (!this.textOverlay) {
            return;
        }
        const visible = this.consoleOptions.reviewDetailVisibleLines;
        this.textOverlay.scroll = position === 'start' ? 0 : Math.max(0, this.textOverlay.lines.length - visible);
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
        this.consoleOptions = {
            ...defaultAgentConsoleOptions,
            ...(options || {})
        };
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
        const next = this.pendingApprovals.filter(item => item.id !== request.id);
        next.push(request);
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

    selectAsync(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<string | undefined> {
        return new Promise(resolve => {
            this.openSelectMenu(title, options, selectedIndex, hint);
            this.selectMenuAction = async (value: string | undefined) => {
                this.closeSelectMenu();
                resolve(value);
            };
        });
    }

    openSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): void {
        const currentMenu = this.selectMenu;
        const currentAction = this.selectMenuAction;
        
        this.selectMenu = {
            title,
            hint: hint || this.consoleOptions.selectHint,
            options: options.slice(),
            selectedIndex: Math.max(0, Math.min(Math.max(options.length - 1, 0), selectedIndex)),
            parentMenu: currentMenu,
            parentMenuAction: currentAction
        };
        this.syncDerivedInputFocus();
    }

    handleSelectKey(key: string): boolean {
        const normalized = String(key || '').trim().toLowerCase();
        if (!this.selectMenu || !this.selectMenu.options.length) { return false; }
        const decision = this.overlayController.resolveKey(normalized, this.selectMenu.options.length);
        switch (decision.action) {
            case 'move':
                this.moveSelectMenu(decision.delta);
                return true;
            case 'home':
                this.moveSelectMenuToEdge('start');
                return true;
            case 'end':
                this.moveSelectMenuToEdge('end');
                return true;
            case 'page':
                this.moveSelectMenuPage(decision.direction);
                return true;
            case 'confirm':
                void this.confirmSelectMenu();
                return true;
            case 'escape':
                void this.handleEscapeKey();
                return true;
            case 'choose':
                void this.chooseSelectMenuIndex(decision.index);
                return true;
            default:
                return false;
        }
    }

    protected isDismissKey(key: string): boolean {
        return this.overlayController.isDismissKey(key);
    }

    protected resolveFocusShortcutKey(rawText: string, controlKey?: string): string {
        if (controlKey === 'return') {
            return 'enter';
        }
        if (controlKey) {
            return controlKey;
        }
        const normalized = String(rawText || '').trim().toLowerCase();
        switch (normalized) {
            case 'y':
                return 'copy';
            case 'a':
                return 'approve';
            case 'd':
                return 'deny';
            case 'q':
                return 'q';
            default:
                return normalized;
        }
    }

    closeSelectMenu(): void {
        this.selectMenu = undefined;
        this.syncDerivedInputFocus();
    }

    async dismissFocusLayer(): Promise<boolean> {
        if (this.commandOutputsOpen) {
            this.closeCommandOutputs();
            return true;
        }
        if (this.textOverlay) {
            this.closeTextOverlay();
            return true;
        }
        if (this.selectMenu) {
            await this.cancelSelectMenu();
            return true;
        }
        if (this.gitSnapshotOpen) {
            this.closeGitSnapshotDetail();
            return true;
        }
        if (this.reviewOpen) {
            this.closeReview();
            return true;
        }
        if (this.timelineEventInspectorOpen) {
            this.closeTimelineEventInspector();
            if (this.messagesFocused) {
                this.setMessagesFocused(false);
            }
            return true;
        }
        if (this.messageDetailOpen) {
            this.closeMessageDetail();
            if (this.messagesFocused) {
                this.setMessagesFocused(false);
            }
            return true;
        }
        if (this.messagesFocused) {
            this.setMessagesFocused(false);
            return true;
        }
        if (this.approvalsFocused) {
            this.setApprovalsFocused(false);
            return true;
        }
        if (this.tasksFocused) {
            this.setTasksFocused(false);
            return true;
        }
        if (this.jobsFocused) {
            this.setJobsFocused(false);
            return true;
        }
        if (this.toolsFocused) {
            this.setToolsFocused(false);
            return true;
        }
        if (this.sessionsFocused) {
            this.setSessionsFocused(false);
            return true;
        }
        if (this.toolRunsFocused) {
            this.setToolRunsFocused(false);
            return true;
        }
        if (this.projectsFocused) {
            this.setProjectsFocused(false);
            return true;
        }
        if (this.threadsFocused) {
            this.setThreadsFocused(false);
            return true;
        }
        if (!this.inputFocused) {
            this.setInputFocused(true);
            return true;
        }
        return false;
    }

    setSelectMenuIndex(index: number): void {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        this.selectMenu.selectedIndex = this.overlayController.clampIndex(index, this.selectMenu.options.length);
    }

    moveSelectMenu(delta: number): void {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        this.selectMenu.selectedIndex = this.overlayController.moveIndex(
            this.selectMenu.selectedIndex,
            delta,
            this.selectMenu.options.length
        );
    }

    moveSelectMenuToEdge(edge: 'start' | 'end'): void {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        this.selectMenu.selectedIndex = edge === 'start'
            ? this.overlayController.homeIndex(this.selectMenu.options.length)
            : this.overlayController.endIndex(this.selectMenu.options.length);
    }

    moveSelectMenuPage(direction: 1 | -1): void {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        this.selectMenu.selectedIndex = this.overlayController.pageIndex(
            this.selectMenu.selectedIndex,
            direction,
            this.selectMenu.options.length
        );
    }

    get selectedSelectMenuOption(): AgentConsoleSelectOption | undefined {
        if (!this.selectMenu) {
            return undefined;
        }
        return this.selectMenu.options[this.selectMenu.selectedIndex];
    }

    protected shouldSubmitConfirmedSelectMenuValue(menu: AgentConsoleSelectMenu | undefined, value?: string): boolean {
        if (!menu || !this.submitAction) {
            return false;
        }
        const resolved = String(value || '').trim();
        if (!resolved) {
            return false;
        }
        if (resolved.startsWith('/')) {
            const def = getAgentConsoleCommandDefinition(resolved);
            return !def || !def.needsArgs;
        }
        if (!isAgentConsoleSuggestionMenu(menu) || !resolved.startsWith('@')) {
            return false;
        }
        // Only submit for known mention candidates (@workspace, @model, @tools, @session, @toolName).
        // Workspace file/directory path suggestions should insert into input without submitting.
        const mentionCandidates = getAgentConsoleMentionCandidates(this.tools);
        return mentionCandidates.includes(resolved);
    }

    async confirmSelectMenu(value?: string): Promise<string | undefined> {
        const resolved = value ?? this.selectedSelectMenuOption?.value;
        const action = this.selectMenuAction;
        this.selectMenuAction = undefined;
        this.closeSelectMenu();
        await action?.(resolved);
        return resolved;
    }

    async confirmSelectMenuAndKeepOpen(value?: string): Promise<string | undefined> {
        const resolved = value ?? this.selectedSelectMenuOption?.value;
        const action = this.selectMenuAction;
        this.selectMenuAction = undefined;
        await action?.(resolved);
        return resolved;
    }

    async acceptSelectMenu(value?: string): Promise<{ value: string | undefined; submitted: boolean }> {
        const menu = this.selectMenu;
        const resolved = await this.confirmSelectMenu(value);
        const submitted = this.shouldSubmitConfirmedSelectMenuValue(menu, resolved);
        if (submitted && resolved) {
            if (isAgentConsoleSuggestionMenu(menu)) {
                const next = applyAgentConsoleSuggestion(this.input, this.inputCursor, resolved);
                this.setInput(next.value, next.cursor);
            } else {
                const valueWithSpace = resolved + ' ';
                this.setInput(valueWithSpace, valueWithSpace.length);
            }
            await this.submitAction?.();
        }
        return {
            value: resolved,
            submitted
        };
    }

    async acceptSelectMenuIndex(index: number): Promise<{ value: string | undefined; submitted: boolean }> {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return {
                value: undefined,
                submitted: false
            };
        }
        this.setSelectMenuIndex(index);
        return this.acceptSelectMenu(this.selectedSelectMenuOption?.value);
    }

    async chooseSelectMenuIndex(index: number): Promise<void> {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        this.setSelectMenuIndex(index);
        await this.confirmSelectMenu(this.selectedSelectMenuOption?.value);
    }

    async cancelSelectMenu(): Promise<void> {
        const action = this.selectMenuAction;
        this.selectMenuAction = undefined;
        this.closeSelectMenu();
        await action?.(undefined);
    }

    async openSubSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<void> {
        const currentMenu = this.selectMenu;
        const currentAction = this.selectMenuAction;
        
        this.selectMenu = {
            title,
            hint: hint || this.consoleOptions.selectHint,
            options: options.slice(),
            selectedIndex: Math.max(0, Math.min(Math.max(options.length - 1, 0), selectedIndex)),
            parentMenu: currentMenu,
            parentMenuAction: currentAction
        };
        this.syncDerivedInputFocus();
    }

    async resolveSelectMenu(value: string | undefined): Promise<void> {
        const action = this.selectMenuAction;
        this.selectMenuAction = undefined;
        this.closeSelectMenu();
        await action?.(value);
    }

    protected refreshInputSuggestions(): void {
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
            const options = resolveAgentConsoleInputSuggestions(
                this.input,
                this.inputCursor,
                this.commandHints,
                this.tools,
                workspaceSuggestions
            );
            if (!options.length) {
                if (isAgentConsoleSuggestionMenu(this.selectMenu)) {
                    this.selectMenu = undefined;
                    this.selectMenuAction = undefined;
                }
                this.syncDerivedInputFocus();
                return;
            }
            const selectedValue = this.selectedSelectMenuOption?.value;
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

    protected resolveTokenUsageFromMessages(messages: AgentMessage[]): AgentConsoleTokenUsage {
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            const usage = messages[index]?.metadata?.usage;
            if (!usage || typeof usage !== 'object') {
                continue;
            }
            const promptTokens = this.resolveUsageNumber(usage, ['promptTokens', 'prompt_tokens', 'input_tokens']);
            const completionTokens = this.resolveUsageNumber(usage, ['completionTokens', 'completion_tokens', 'output_tokens']);
            const totalTokens = this.resolveUsageNumber(usage, ['totalTokens', 'total_tokens'])
                ?? (promptTokens != null || completionTokens != null
                    ? (promptTokens || 0) + (completionTokens || 0)
                    : undefined);

            return {
                promptTokens: promptTokens || 0,
                completionTokens: completionTokens || 0,
                totalTokens: totalTokens || 0
            };
        }

        return {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        };
    }

    protected expandTabs(value: string): string {
        return String(value || '').replace(/\t/g, '    ');
    }

    protected stringifyReviewContent(value: any): string {
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

    protected parseUnifiedDiffSections(diffText: string): AgentConsoleReviewDiffSection[] {
        const text = String(diffText || '').trim();
        if (!text) {
            return [];
        }

        const sourceLines = text.split('\n');
        const sections: AgentConsoleReviewDiffSection[] = [];
        let current: AgentConsoleReviewDiffSection | undefined;

        const pushCurrent = () => {
            if (current?.lines.length) {
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

    protected buildSelectedApprovalCopyText(): string {
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

    protected buildSelectedReviewCopyText(): string {
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

    protected resetReviewDetailViewport(): void {
        this.reviewDetailScroll = 0;
        this.reviewDetailColumnScroll = 0;
    }

    protected buildReviewAssessmentLines(): string[] {
        const lines: string[] = [];
        const status = String(this.reviewTask?.status || '').trim().toLowerCase();
        const aggregate = this.reviewTask?.result?.aggregate;
        const checkpoints = Array.isArray(this.reviewTask?.metadata?.checkpoints)
            ? this.reviewTask?.metadata?.checkpoints
            : [];
        const availableCheckpoints = checkpoints.filter((entry: any) => entry?.status === 'available').length;
        const invalidatedCheckpoints = checkpoints.filter((entry: any) => entry?.status === 'invalidated').length;
        const workerFailures = this.reviewWorkers.filter(worker => worker.error || String(worker.status || '').trim().toLowerCase() === 'failed').length;
        const sections = this.aggregateReviewFileSections;
        const rollback = this.reviewTask?.result?.rollback;
        const lineageTasks = this.currentReviewLineageTasks;
        const selectedTaskId = String(this.reviewTask?.id || this.selectedReviewTaskId || '').trim();
        const lineageIndex = lineageTasks.length
            ? Math.max(0, lineageTasks.findIndex(item => item.id === selectedTaskId))
            : -1;

        const reviewState = rollback?.rolledBackAt
            ? 'rollback applied'
            : status === 'failed' || status === 'error' || workerFailures > 0
                ? 'needs attention'
                : status === 'running' || status === 'planned'
                    ? 'in progress'
                    : rollback?.available === true || availableCheckpoints > 0
                        ? 'ready · rollback available'
                        : status === 'completed'
                            ? 'ready'
                            : 'pending';
        const reviewSummary = lineageTasks.length > 1 && lineageIndex >= 0
            ? `${reviewState} · lineage ${lineageIndex + 1}/${lineageTasks.length}`
            : reviewState;
        lines.push(`Review: ${reviewSummary}`);

        const scopeParts = [
            sections.length ? `${sections.length} file${sections.length === 1 ? '' : 's'} changed` : '',
            this.reviewWorkers.length ? `${this.reviewWorkers.length} worker${this.reviewWorkers.length === 1 ? '' : 's'}` : '',
            lineageTasks.length > 1 ? `lineage ${lineageTasks.length} tasks` : ''
        ].filter(Boolean);
        if (scopeParts.length) {
            lines.push(`Scope: ${scopeParts.join(' · ')}`);
        }
        if (aggregate) {
            lines.push(`Workers: ${aggregate.status} · ${aggregate.completedWorkers}/${aggregate.totalWorkers} completed${aggregate.failedWorkers ? ` · ${aggregate.failedWorkers} failed` : ''}`);
        }

        const riskParts = [
            workerFailures > 0 ? `${workerFailures} worker failure${workerFailures === 1 ? '' : 's'}` : '',
            !rollback?.available && availableCheckpoints === 0 && (status === 'completed' || status === 'failed' || status === 'error')
                ? 'rollback unavailable'
                : '',
            invalidatedCheckpoints > 0 ? `${invalidatedCheckpoints} invalidated checkpoint${invalidatedCheckpoints === 1 ? '' : 's'}` : '',
            !sections.length && !String(this.reviewDiff?.summary || this.reviewTask?.result?.diff?.summary || '').trim()
                ? 'no diff captured'
                : ''
        ].filter(Boolean);
        if (riskParts.length) {
            lines.push(`Risks: ${riskParts.join(' · ')}`);
        }
        const isolatedFailures = Array.isArray(aggregate?.isolatedFailures) ? aggregate.isolatedFailures : [];
        if (isolatedFailures.length) {
            lines.push(`Worker Failures: ${isolatedFailures.slice(0, 2).map((failure: any) => `${failure.workerId}: ${failure.error}`).join(' · ')}`);
        }

        return lines;
    }

    protected buildSelectedReviewGroupMetaLines(group: AgentConsoleReviewGroup): string[] {
        const lines = [
            this.selectedReviewPatchFilter !== 'all' ? `Patch Filter: ${this.selectedReviewPatchFilter}` : '',
            group.kind === 'worker' && group.status ? `Worker Status: ${group.status}` : '',
            group.kind === 'worker' && group.branch ? `Worker Branch: ${group.branch}` : '',
            group.kind === 'worker' && group.worktreePath ? `Worker Worktree: ${group.worktreePath}` : '',
            group.kind === 'worker' && group.actionIds?.length ? `Worker Actions: ${group.actionIds.join(', ')}` : '',
            group.kind === 'worker' && group.error ? `Worker Error: ${group.error}` : ''
        ].filter(Boolean);
        return [
            ...lines
        ].filter(Boolean);
    }

    protected describeReviewGroup(group: AgentConsoleReviewGroup): string {
        return [
            group.label,
            group.kind === 'aggregate' ? 'aggregate' : 'worker',
            group.status ? `status ${group.status}` : '',
            group.sections.length ? `${group.sections.length} file${group.sections.length === 1 ? '' : 's'}` : '',
            group.error ? 'error' : ''
        ].filter(Boolean).join(' · ');
    }

    protected filterReviewPatchLines(lines: string[]): string[] {
        if (this.selectedReviewPatchFilter !== 'additions') {
            return lines.slice();
        }
        return lines.filter(line => line.startsWith('diff --git ')
            || line.startsWith('index ')
            || line.startsWith('--- ')
            || line.startsWith('+++ ')
            || line.startsWith('@@')
            || (line.startsWith('+') && !line.startsWith('+++')));
    }

    protected parseReviewHunks(section: AgentConsoleReviewDiffSection): AgentConsoleReviewHunk[] {
        const hunks: AgentConsoleReviewHunk[] = [];
        let current: AgentConsoleReviewHunk | undefined;
        for (let index = 0; index < section.lines.length; index++) {
            const line = section.lines[index];
            if (line.startsWith('@@')) {
                if (current) {
                    current.endIndex = index;
                    hunks.push(current);
                }
                current = {
                    header: line,
                    context: this.resolveReviewHunkContext(line),
                    startIndex: index,
                    endIndex: section.lines.length,
                    additions: 0,
                    deletions: 0
                };
                continue;
            }
            if (current) {
                if (line.startsWith('+') && !line.startsWith('+++')) {
                    current.additions += 1;
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                    current.deletions += 1;
                }
            }
        }
        if (current) {
            hunks.push(current);
        }
        return hunks;
    }

    protected resolveReviewHunkContext(header: string): string {
        const match = /^@@[^@]*@@\s*(.*)$/.exec(String(header || '').trim());
        return String(match?.[1] || '').trim();
    }

    isReviewHunkFolded(groupKey: string, path: string, hunkIndex: number): boolean {
        return this.foldedReviewHunks.has(`${groupKey}:${path}#${hunkIndex}`);
    }

    toggleReviewHunkFold(): void {
        if (!this.reviewOpen) {
            return;
        }
        const group = this.selectedReviewGroup;
        const section = this.selectedReviewFileSection;
        if (!group || !section) {
            return;
        }
        const hunks = this.parseReviewHunks(section);
        if (!hunks.length) {
            return;
        }
        const index = Math.max(0, Math.min(hunks.length - 1, this.selectedReviewHunkIndex));
        const key = `${group.key}:${section.path}#${index}`;
        if (this.foldedReviewHunks.has(key)) {
            this.foldedReviewHunks.delete(key);
        } else {
            this.foldedReviewHunks.add(key);
        }
        this.clampReviewDetailScroll();
    }

    protected clampReviewDetailScroll(): void {
        const lines = this.reviewDetailLines;
        this.reviewDetailScroll = Math.max(0, Math.min(this.reviewDetailScroll, Math.max(0, lines.length - this.consoleOptions.reviewDetailVisibleLines)));
    }

    protected renderReviewPatchLines(section: AgentConsoleReviewDiffSection, groupKey: string): string[] {
        if (this.reviewSideBySide) {
            return this.renderReviewPatchSideBySide(section, groupKey);
        }
        const hunks = this.parseReviewHunks(section);
        if (!hunks.length) {
            return this.filterReviewPatchLines(section.lines);
        }
        const lines: string[] = [];
        let cursor = 0;
        for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
            const hunk = hunks[hunkIndex];
            lines.push(...this.filterReviewPatchLines(section.lines.slice(cursor, hunk.startIndex)));
            const hunkAnnot = this.getReviewHunkAnnotation(section.path, hunkIndex);
            const hunkMark = hunkAnnot ? (hunkAnnot.status === 'approved' ? ' ✓' : ' ✗') : '';
            lines.push(`${hunk.header}${hunkMark}`);
            if (this.isReviewHunkFolded(groupKey, section.path, hunkIndex)) {
                lines.push(this.buildReviewFoldedHunkSummary(hunk));
            } else {
                lines.push(...this.filterReviewPatchLines(section.lines.slice(hunk.startIndex + 1, hunk.endIndex)));
            }
            cursor = hunk.endIndex;
        }
        lines.push(...this.filterReviewPatchLines(section.lines.slice(cursor)));
        return lines;
    }

    protected renderReviewPatchSideBySide(section: AgentConsoleReviewDiffSection, groupKey: string): string[] {
        const hunks = this.parseReviewHunks(section);
        if (!hunks.length) {
            return this.buildSideBySidePatchRows(this.filterReviewPatchLines(section.lines));
        }
        const lines: string[] = [];
        let cursor = 0;
        for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
            const hunk = hunks[hunkIndex];
            lines.push(...this.filterReviewPatchLines(section.lines.slice(cursor, hunk.startIndex)));
            const hunkAnnot = this.getReviewHunkAnnotation(section.path, hunkIndex);
            const hunkMark = hunkAnnot ? (hunkAnnot.status === 'approved' ? ' ✓' : ' ✗') : '';
            lines.push(`${hunk.header}${hunkMark}`);
            if (this.isReviewHunkFolded(groupKey, section.path, hunkIndex)) {
                lines.push(this.buildReviewFoldedHunkSummary(hunk));
            } else {
                lines.push(...this.buildSideBySidePatchRows(this.filterReviewPatchLines(section.lines.slice(hunk.startIndex + 1, hunk.endIndex))));
            }
            cursor = hunk.endIndex;
        }
        lines.push(...this.buildSideBySidePatchRows(this.filterReviewPatchLines(section.lines.slice(cursor))));
        return lines;
    }

    protected buildSideBySidePatchRows(lines: string[]): string[] {
        const rows: string[] = [];
        let oldLines: string[] = [];
        let newLines: string[] = [];
        const flush = () => {
            if (!oldLines.length && !newLines.length) {
                return;
            }
            const oldWidth = Math.max(0, ...oldLines.map(line => line.length));
            const newWidth = Math.max(0, ...newLines.map(line => line.length));
            const rowCount = Math.max(oldLines.length, newLines.length);
            for (let index = 0; index < rowCount; index++) {
                const oldCell = oldLines[index] ?? '';
                const newCell = newLines[index] ?? '';
                rows.push(`${oldCell.padEnd(oldWidth)} │ ${newCell.padEnd(newWidth)}`);
            }
            oldLines = [];
            newLines = [];
        };
        for (const line of lines) {
            if (line.startsWith('-') && !line.startsWith('---')) {
                oldLines.push(line.slice(1));
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                newLines.push(line.slice(1));
            } else if (line.startsWith(' ')) {
                oldLines.push(line.slice(1));
                newLines.push(line.slice(1));
            } else {
                flush();
                rows.push(line);
            }
        }
        flush();
        return rows;
    }

    toggleReviewSideBySide(): void {
        if (!this.reviewOpen) {
            return;
        }
        this.reviewSideBySide = !this.reviewSideBySide;
        this.clampReviewDetailScroll();
    }

    protected buildReviewFoldedHunkSummary(hunk: AgentConsoleReviewHunk): string {
        const context = hunk.context ? ` · ${hunk.context}` : '';
        return `  ⋯ folded hunk +${hunk.additions} -${hunk.deletions}${context} (f expand)`;
    }

    protected isFailedTaskChoice(task: AgentConsoleReviewTaskItem | undefined): boolean {
        const status = String(task?.status || '').trim().toLowerCase();
        return status === 'failed' || status === 'error';
    }

    protected syncFilteredTaskSelection(): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            this.selectedReviewTaskId = '';
            this.selectedReviewTaskCacheKey = '';
            return;
        }
        if (this.selectedReviewTaskId && tasks.some(item => item.id === this.selectedReviewTaskId)) {
            return;
        }
        this.selectedReviewTaskId = tasks[0].id;
        this.selectedReviewTaskCacheKey = this.resolveReviewAnnotationCacheKey(tasks[0]);
    }

    protected syncCurrentReviewAnnotationCache(): void {
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

    protected resolveReviewAnnotationCacheKey(task?: {
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

    protected syncReviewGroupSelection(preferredKey?: string): void {
        const groups = this.reviewGroups;
        if (!groups.length) {
            this.selectedReviewGroupIndex = 0;
            return;
        }
        const preferredIndex = preferredKey
            ? groups.findIndex(group => group.key === preferredKey)
            : -1;
        const currentIndex = Math.max(0, Math.min(groups.length - 1, this.selectedReviewGroupIndex));
        this.selectedReviewGroupIndex = preferredIndex >= 0 ? preferredIndex : currentIndex;
    }

    protected syncReviewFileSelection(preferredPath?: string): void {
        const sections = this.reviewFileSections;
        if (!sections.length) {
            this.selectedReviewFileIndex = 0;
            return;
        }
        const preferredIndex = preferredPath
            ? sections.findIndex(section => section.path === preferredPath)
            : -1;
        const currentIndex = Math.max(0, Math.min(sections.length - 1, this.selectedReviewFileIndex));
        this.selectedReviewFileIndex = preferredIndex >= 0 ? preferredIndex : currentIndex;
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
        return [
            `context ${report.strategy}`,
            `level ${report.level}`,
            report.summaryInserted ? 'summary' : 'no summary',
            `${report.beforeMessageCount}→${report.afterMessageCount} msgs`,
            `${report.beforeTokens}→${report.afterTokens} tok`,
            `${report.compressionRatio}% saved`,
            `${report.retentionRate}% retained`,
            report.preservedAnchorCount ? `${report.preservedAnchorCount} anchors` : '',
            report.toolMessagesCompacted ? `${report.toolMessagesCompacted} tools` : '',
            report.cumulativeTokenSavings ? `cum ${report.cumulativeTokenSavings} tok` : ''
        ].filter(Boolean).join(' · ');
    }

    async handleEscapeKey(): Promise<boolean> {
        if (this.pendingQuestion) {
            this.setPendingQuestion(null);
            this.setInputFocused(true);
            return true;
        }
        if (this.selectMenu) {
            const currentMenu = this.selectMenu;
            const parentMenu = currentMenu.parentMenu;
            if (parentMenu) {
                this.selectMenuAction = undefined;
                this.closeSelectMenu();
                this.selectMenu = parentMenu;
                this.selectMenuAction = currentMenu.parentMenuAction;
                this.syncDerivedInputFocus();
                return true;
            }
            await this.cancelSelectMenu();
            return true;
        }
        if (!!this.textOverlay || this.gitSnapshotOpen || this.reviewOpen || this.timelineEventInspectorOpen || this.messageDetailOpen || this.messagesFocused || this.approvalsFocused || this.tasksFocused || this.jobsFocused || this.toolsFocused || this.sessionsFocused || this.toolRunsFocused || this.projectsFocused || this.threadsFocused) {
            await this.dismissFocusLayer();
            return true;
        }
        if (this.status === 'running' || this.status === 'reasoning') {
            return true;
        }
        return false;
    }

    handleMenuInput(key: string, text: string): boolean {
        if (!this.selectMenu) {
            return false;
        }
        const decision = this.overlayController.resolveMenuKey(key, text, this.selectMenu.options.length);
        switch (decision.action) {
            case 'move':
                this.moveSelectMenu(decision.delta);
                return true;
            case 'home':
                this.moveSelectMenuToEdge('start');
                return true;
            case 'end':
                this.moveSelectMenuToEdge('end');
                return true;
            case 'page':
                this.moveSelectMenuPage(decision.direction);
                return true;
            case 'accept':
                void this.acceptSelectMenu();
                return true;
            case 'choose':
                this.setSelectMenuIndex(decision.index);
                void this.acceptSelectMenu();
                return true;
            case 'digit-consume':
                return true;
            case 'cancel':
                this.suppressSuggestionMenu = true;
                void this.cancelSelectMenu();
                return false;
            case 'escape':
                void this.handleEscapeKey();
                return true;
            default:
                return false;
        }
    }

    async handleFocusKey(key: string): Promise<boolean> {
        const normalized = String(key || '').trim().toLowerCase();
        if (!normalized) {
            return false;
        }
        if (this.pendingQuestion) {
            const decision = this.overlayController.resolveKey(normalized, this.pendingQuestion.options.length);
            switch (decision.action) {
                case 'move':
                    this.movePendingQuestionSelection(decision.delta);
                    return true;
                case 'home':
                    this.movePendingQuestionSelectionToEdge('start');
                    return true;
                case 'end':
                    this.movePendingQuestionSelectionToEdge('end');
                    return true;
                case 'page':
                    this.movePendingQuestionSelectionPage(decision.direction);
                    return true;
                case 'confirm':
                    return this.choosePendingQuestion();
                case 'choose':
                    return this.choosePendingQuestion(decision.index);
                case 'escape':
                    this.setPendingQuestion(null);
                    this.syncDerivedInputFocus();
                    return true;
                default:
                    if (this.overlayController.isDigitKey(normalized)) {
                        return false;
                    }
                    break;
            }
        }
        if (this.commandOutputsOpen) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'up':
                case 'k':
                    this.moveCommandOutputSelection(-1);
                    return true;
                case 'down':
                case 'j':
                    this.moveCommandOutputSelection(1);
                    return true;
                case 'pageup':
                    this.scrollCommandOutputsPage(-1);
                    return true;
                case 'pagedown':
                    this.scrollCommandOutputsPage(1);
                    return true;
                case 'home':
                    this.scrollCommandOutputsToEdge('start');
                    return true;
                case 'end':
                    this.scrollCommandOutputsToEdge('end');
                    return true;
                case '/':
                    this.commandOutputsFilterMode = true;
                    this.setCommandOutputsFilter('');
                    return true;
                case 'return':
                case 'enter':
                    return this.copySelectedCommandOutput();
                case 'backspace':
                    if (this.commandOutputsFilterMode) {
                        this.setCommandOutputsFilter(this.commandOutputsFilter.slice(0, -1));
                        return true;
                    }
                    return false;
                default:
                    if (this.commandOutputsFilterMode && normalized && normalized.length === 1) {
                        this.setCommandOutputsFilter(`${this.commandOutputsFilter}${normalized}`);
                        return true;
                    }
                    return false;
            }
        }
        if (this.textOverlay) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'down':
                    this.scrollTextOverlay(1);
                    return true;
                case 'up':
                    this.scrollTextOverlay(-1);
                    return true;
                case 'pageup':
                    this.scrollTextOverlayPage(-1);
                    return true;
                case 'pagedown':
                    this.scrollTextOverlayPage(1);
                    return true;
                case 'home':
                    this.scrollTextOverlayToEdge('start');
                    return true;
                case 'end':
                    this.scrollTextOverlayToEdge('end');
                    return true;
                default:
                    return false;
            }
        }
        if (this.gitSnapshotOpen) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.gitSnapshotDetailLines.slice(this.gitSnapshotDetailScroll).join('\n'), 'git snapshot diff');
                    return true;
                case 'down':
                    this.scrollGitSnapshotDetail(1);
                    return true;
                case 'up':
                    this.scrollGitSnapshotDetail(-1);
                    return true;
                case 'left':
                    this.scrollGitSnapshotDetailColumns(-4);
                    return true;
                case 'right':
                    this.scrollGitSnapshotDetailColumns(4);
                    return true;
                case 'pageup':
                    this.scrollGitSnapshotDetailPage(-1);
                    return true;
                case 'pagedown':
                    this.scrollGitSnapshotDetailPage(1);
                    return true;
                case 'home':
                    this.scrollGitSnapshotDetailToEdge('start');
                    return true;
                case 'end':
                    this.scrollGitSnapshotDetailToEdge('end');
                    return true;
                case 'revert':
                    this.revertGitSnapshotFromDetailAction?.();
                    return true;
                default:
                    return false;
            }
        }
        if (this.reviewOpen) {
            if ((normalized === 'esc' || normalized === 'escape') && this.canCancelFocusedCodingTask()) {
                await this.cancelFocusedCodingTask();
                return true;
            }
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedReviewCopyText(), 'review');
                    return true;
                case ',':
                    this.moveReviewGroupSelection(-1);
                    return true;
                case '.':
                    this.moveReviewGroupSelection(1);
                    return true;
                case 'a':
                    this.setReviewPatchFilter('additions');
                    return true;
                case 'u':
                    this.setReviewPatchFilter('all');
                    return true;
                case '[':
                    this.moveReviewFileSelection(-1);
                    return true;
                case ']':
                    this.moveReviewFileSelection(1);
                    return true;
                case 'p':
                    return this.navigateReviewLineage(-1);
                case 'n':
                    return this.navigateReviewLineage(1);
                case 'down':
                    this.scrollReviewDetail(1);
                    return true;
                case 'up':
                    this.scrollReviewDetail(-1);
                    return true;
                case 'left':
                    this.scrollReviewDetailColumns(-4);
                    return true;
                case 'right':
                    this.scrollReviewDetailColumns(4);
                    return true;
                case 'pageup':
                    this.scrollReviewDetailPage(-1);
                    return true;
                case 'pagedown':
                    this.scrollReviewDetailPage(1);
                    return true;
                case 'home':
                    this.scrollReviewDetailToEdge('start');
                    return true;
                case 'end':
                    this.scrollReviewDetailToEdge('end');
                    return true;
                case '{':
                    this.jumpReviewHunk(-1);
                    return true;
                case '}':
                    this.jumpReviewHunk(1);
                    return true;
                case 'f':
                    this.toggleReviewHunkFold();
                    return true;
                case 's':
                    this.toggleReviewSideBySide();
                    return true;
                case 'r':
                    if (this.canRetryFocusedCodingTask()) {
                        await this.retryFocusedCodingTask();
                        return true;
                    }
                    return false;
                default:
                    return false;
            }
        }
        if (this.timelineEventInspectorOpen) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'enter':
                case 'esc':
                    this.closeTimelineEventInspector();
                    return true;
                case 'copy':
                    await this.copyFocusedTextAction?.(this.timelineEventDetailLines.join('\n'), 'timeline event');
                    return true;
                case 'down':
                    this.scrollTimelineEventDetail(1);
                    return true;
                case 'up':
                    this.scrollTimelineEventDetail(-1);
                    return true;
                case 'left':
                    this.scrollTimelineEventDetailColumns(-4);
                    return true;
                case 'right':
                    this.scrollTimelineEventDetailColumns(4);
                    return true;
                case 'pageup':
                    this.scrollTimelineEventDetailPage(-1);
                    return true;
                case 'pagedown':
                    this.scrollTimelineEventDetailPage(1);
                    return true;
                case 'home':
                    this.scrollTimelineEventDetailToEdge('start');
                    return true;
                case 'end':
                    this.scrollTimelineEventDetailToEdge('end');
                    return true;
                case 'r':
                    if (this.canRetryTimelineEvent()) {
                        const payload = this.buildTimelineEventRetryPayload();
                        if (payload?.toolCallId) {
                            await this.retrySelectedTaskAction?.(payload.toolCallId);
                        }
                        this.closeTimelineEventInspector();
                        return true;
                    }
                    return false;
                default:
                    return false;
            }
        }
        if (this.messageDetailOpen) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'enter':
                    this.closeMessageDetail();
                    return true;
                case 'copy':
                    await this.copyFocusedTextAction?.(this.selectedMessage?.content || '', 'selected message');
                    return true;
                case 'down':
                    this.scrollMessageDetail(1);
                    return true;
                case 'up':
                    this.scrollMessageDetail(-1);
                    return true;
                case 'left':
                    this.scrollMessageDetailColumns(-4);
                    return true;
                case 'right':
                    this.scrollMessageDetailColumns(4);
                    return true;
                case 'pageup':
                    this.scrollMessageDetailPage(-1);
                    return true;
                case 'pagedown':
                    this.scrollMessageDetailPage(1);
                    return true;
                case 'home':
                    this.scrollMessageDetailToEdge('start');
                    return true;
                case 'end':
                    this.scrollMessageDetailToEdge('end');
                    return true;
                default:
                    return false;
            }
        }
        if (this.messagesFocused) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.selectedMessage?.content || '', 'selected message');
                    return true;
                case 'down':
                    if (this.selectedMessage?.metadata?.uiKind === 'file-change') {
                        this.moveReviewFileSelection(1);
                        return true;
                    }
                    this.moveMessageSelection(1);
                    return true;
                case 'up':
                    if (this.selectedMessage?.metadata?.uiKind === 'file-change') {
                        this.moveReviewFileSelection(-1);
                        return true;
                    }
                    this.moveMessageSelection(-1);
                    return true;
                case 'pageup':
                    this.moveMessageSelectionPage(-1);
                    return true;
                case 'pagedown':
                    this.moveMessageSelectionPage(1);
                    return true;
                case 'home':
                    this.selectFirstMessage();
                    return true;
                case 'end':
                    this.selectLastMessage();
                    return true;
                case 'enter':
                    if (this.selectedMessage?.metadata?.uiKind === 'plan-todo') {
                        return this.togglePlanTodoExpanded();
                    }
                    if (this.selectedMessage?.metadata?.uiKind === 'file-change') {
                        this.openReview();
                        return true;
                    }
                    if (this.isTimelineEventMessage(this.selectedMessage)) {
                        this.openTimelineEventInspector();
                        return true;
                    }
                    this.openMessageDetail();
                    return true;
                default:
                    return false;
            }
        }
        if (this.approvalsFocused) {
            const decision = this.overlayController.resolveListKey(normalized);
            switch (decision.action) {
                case 'move':
                    this.moveApprovalSelection(decision.delta);
                    return true;
                case 'home':
                    this.selectFirstApproval();
                    return true;
                case 'end':
                    this.selectLastApproval();
                    return true;
                case 'page':
                    this.moveApprovalSelectionPage(decision.direction);
                    return true;
                case 'escape':
                    await this.dismissFocusLayer();
                    return true;
                default:
                    break;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedApprovalCopyText(), 'selected approval');
                    return true;
                case 'approve':
                    if (this.selectedApproval?.id) {
                        await this.resolveApprovalAction?.('approve', this.selectedApproval.id);
                        return true;
                    }
                    return false;
                case 'deny':
                    if (this.selectedApproval?.id) {
                        await this.resolveApprovalAction?.('deny', this.selectedApproval.id);
                        return true;
                    }
                    return false;
                default:
                    return false;
            }
        }
        if (this.tasksFocused) {
            if ((normalized === 'esc' || normalized === 'escape') && this.canCancelFocusedCodingTask()) {
                await this.cancelFocusedCodingTask();
                return true;
            }
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
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
                    await this.copyFocusedTextAction?.(this.buildSelectedTaskCopyText(), 'selected task');
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
                    return this.focusSelectedTaskLineageFilter();
                case 'f':
                    this.setTaskFilter('failed');
                    return true;
                case 'v':
                    this.setTaskFilter('rollback');
                    return true;
                case 'u':
                    this.setTaskFilter('all');
                    return true;
                case 'down':
                    this.moveTaskSelection(1);
                    return true;
                case 'up':
                    this.moveTaskSelection(-1);
                    return true;
                case 'pageup':
                    this.moveTaskSelectionPage(-1);
                    return true;
                case 'pagedown':
                    this.moveTaskSelectionPage(1);
                    return true;
                case 'home':
                    this.selectFirstTask();
                    return true;
                case 'end':
                    this.selectLastTask();
                    return true;
                default:
                    return false;
            }
        }
        if (this.jobsFocused) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedScheduledTaskCopyText(), 'scheduled job');
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
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.selectedTool?.name || '', 'tool name');
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
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedToolRunCopyText(), 'tool run');
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
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedSessionCopyText(), 'session');
                    return true;
                case 'down':
                    this.moveSessionSelection(1);
                    return true;
                case 'up':
                    this.moveSessionSelection(-1);
                    return true;
                case 'pageup':
                    this.moveSessionSelectionPage(-1);
                    return true;
                case 'pagedown':
                    this.moveSessionSelectionPage(1);
                    return true;
                case 'home':
                    this.selectFirstSession();
                    return true;
                case 'end':
                    this.selectLastSession();
                    return true;
                case 'enter':
                    if (this.selectedSession?.id) {
                        await this.activateSelectedSessionAction?.(this.selectedSession.id);
                        return true;
                    }
                    return false;
                default:
                    return false;
            }
        }
        return false;
    }

    protected canCancelFocusedCodingTask(): boolean {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        const status = String(task?.status || '').trim();
        return !!task?.id && (status === 'planned' || status === 'running');
    }

    protected canRetryFocusedCodingTask(): boolean {
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

    protected async cancelFocusedCodingTask(): Promise<void> {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        if (task?.id) {
            await this.cancelSelectedTaskAction?.(task.id);
        }
    }

    protected async retryFocusedCodingTask(): Promise<void> {
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

    protected async navigateReviewLineage(delta: number): Promise<boolean> {
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
        if (!task) {
            return '';
        }
        if (typeof task.lineageRootTaskId === 'string' && task.lineageRootTaskId.trim()) {
            return task.lineageRootTaskId.trim();
        }
        if (typeof task?.metadata?.retryOfTaskId === 'string' && task.metadata.retryOfTaskId.trim()) {
            return task.metadata.retryOfTaskId.trim();
        }
        return typeof task.id === 'string' && task.id.trim() ? task.id.trim() : '';
    }

    async processRawChunk(
        chunk: string,
        options: { submitOnEnter?: boolean; ctrlKey?: boolean; altKey?: boolean; hasSelectMenu?: boolean } = {}
    ): Promise<{ submitted: boolean; confirmedSelection: boolean }> {
        const next = this.processInputChunk(this.input, this.inputCursor, chunk, options);
        this.input = this.expandTabs(next.value);
        this.inputCursor = this.clampCursor(this.input, next.cursor);
        this.resetInputHistoryNavigation();
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

        if (controlKey === 'tab'
            && (this.status === 'running' || this.status === 'reasoning')
            && this.input.trim()
            && isAgentConsoleSuggestionMenu(this.selectMenu)) {
            return { handled: true, action: 'queueDraft' };
        }

        if (this.handleMenuInput(controlKey || '', rawText)) {
            return { handled: true, action: 'menuInput' };
        }

        if (this.hasBlockingSelectMenu()) {
            return { handled: true, action: 'menuBlocked' };
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

        if (this.pendingQuestion || this.hasReviewFocus() || this.hasMessageDetailFocus() || this.hasMessageFocus() || this.hasApprovalFocus() || this.hasScheduledJobFocus() || this.hasToolFocus() || this.hasSessionFocus() || this.hasTextOverlayFocus() || this.hasCommandOutputsFocus()) {
            const focusKey = this.resolveFocusShortcutKey(rawText, controlKey);
            if (focusKey) {
                const consumed = await this.handleFocusKey(focusKey);
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

        if (rawText === '\u001b' && (!controlKey || controlKey === 'escape')) {
            if (this.vimMode && this.inputMode === 'insert') {
                this.setInputMode('normal');
                return { handled: true };
            }
            if (this.status === 'running' || this.status === 'reasoning') {
                return { handled: true, action: 'cancelTurn' };
            }
            await this.handleEscapeKey();
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
            if (this.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
                return { handled: true, action: 'draftNavigation', value: controlKey };
            }
            return { handled: true };
        }

        if (controlKey === 'up' || controlKey === 'down') {
            // Shell-like: up/down recalls history at the prompt unless a
            // blocking interaction (menu/lock/modal/text prompt) is active.
            if (!this.hasBlockingSelectMenu()
                && !this.inputLocked
                && !this.modalPromptActive
                && !options.hasActiveTextPrompt) {
                const navigated = this.navigateInputHistory(controlKey === 'up' ? -1 : 1);
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

        if (this.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
            return { handled: true, action: 'textInput', value: rawText };
        }

        return { handled: false };
    }

    clampCursor(value: string, cursor: number): number {
        return clampCommonTextCursor(value, cursor);
    }

    shouldSkipHistoryEntry(entry: string): boolean {
        return shouldSkipCommonHistoryEntry(entry);
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

function projectTimelineKey(entry: TimelineEntry): string {
    return entry.key || `${entry.kind}:${entry.label}`;
}

const REPLAY_THREAD_KINDS: Record<string, ThreadItemKind | undefined> = {
    command: 'command',
    tool: 'tool',
    plan: 'plan'
};

function toThreadItemKind(kind: string): ThreadItemKind | undefined {
    return REPLAY_THREAD_KINDS[String(kind || '').trim()];
}

const REPLAY_STATUSES: Record<string, ThreadItemStatus | undefined> = {
    running: 'running',
    success: 'success',
    error: 'error',
    cancelled: 'cancelled',
    pending: 'pending'
};

function normalizeReplayStatus(status?: string): ThreadItemStatus | undefined {
    const value = String(status || '').trim();
    return REPLAY_STATUSES[value];
}

function projectTimelineContent(entry: TimelineEntry): string {
    const label = entry.label || entry.kind;
    if (entry.kind === 'tool') {
        if (entry.status === 'running') {
            return `Running ${label.replace(/[._-]+/g, ' ')}`;
        }
        if (entry.status === 'failed') {
            return `${label.replace(/[._-]+/g, ' ')} failed: ${entry.error || entry.summary || 'unknown error'}`;
        }
        const duration = typeof entry.durationMs === 'number' ? ` · ${entry.durationMs}ms` : '';
        return `${label.replace(/[._-]+/g, ' ')} completed${duration}`;
    }
    if (entry.kind === 'step') {
        const verb = entry.status === 'running' ? 'started' : entry.status === 'blocked' ? 'blocked' : entry.status === 'failed' ? 'failed' : entry.status === 'cancelled' ? 'cancelled' : 'completed';
        const reason = entry.status === 'blocked' && entry.detail ? ` (${entry.detail})` : '';
        return `Step ${verb}: ${label}${reason}`;
    }
    if (entry.kind === 'plan') {
        if (entry.status === 'completed') {
            return `Plan completed: ${entry.label}`;
        }
        return `Plan ${entry.status === 'pending' ? 'created' : entry.status}: ${entry.label}`;
    }
    if (entry.kind === 'turn') {
        if (entry.status === 'completed') {
            return 'Turn completed';
        }
        if (entry.status === 'cancelled') {
            return 'Turn cancelled';
        }
        return 'Turn started';
    }
    return `${entry.kind}: ${label}`;
}
