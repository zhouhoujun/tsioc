import type { ToastEntry } from '@tsdi/components/common/toast';
import type { AgentMessage, AgentSessionSection, ScheduledAgentTask, NavTree, NavFilter, NavSelection, HarnessProjection, AgentConsoleCommandExecution } from '@tsdi/agent';
import type { BackgroundTaskRecord } from '@tsdi/agent-tools';
import type { ConsoleInputMode } from './AgentConsoleVim';
import type { CommandOutputStore } from './AgentConsoleCommandOutputHistory';
import type { AgentConsoleStatuslineField } from './AgentConsoleStatusline';
import type { AgentConsoleTitleField } from './AgentConsoleTitle';
import type { AgentConsoleWorkspaceMentionResolver, AgentConsoleMentionCatalogItem } from './AgentConsoleWorkspaceMentions';
import type { AgentConsoleSettingsRow } from './AgentConsoleSettingsCenter';
import type { AgentConsoleSettingsSectionId } from './AgentConsoleSettingsSchema';
import type { AgentConsoleRemoteCenter } from './AgentConsoleRemoteCenterConfig';
import {
    AgentConsoleActivity,
    AgentConsoleApprovalRequest,
    AgentConsoleCommandOutputEntry,
    AgentConsoleContextPreparationSnapshot,
    AgentConsoleFocusLayer,
    AgentConsoleGoalSummary,
    AgentConsoleHealthItem,
    AgentConsoleOptions,
    AgentConsolePendingQuestion,
    AgentConsolePlanActionKind,
    AgentConsolePlanActionPrompt,
    AgentConsolePlanTodoItem,
    AgentConsoleProjectItem,
    AgentConsoleProviderWizardState,
    AgentConsoleReviewAnnotation,
    AgentConsoleReviewPatchFilter,
    AgentConsoleReviewTaskItem,
    AgentConsoleReviewWorker,
    AgentConsoleSelectMenu,
    AgentConsolePendingAttachment,
    AgentConsoleSessionItem,
    AgentConsoleTaskFilter,
    AgentConsoleTextOverlayState,
    AgentConsoleThreadItem,
    AgentConsoleTokenUsage,
    AgentConsoleToolItem,
    AgentConsoleToolRun,
    defaultAgentConsoleOptions
} from './AgentConsoleStateTypes';
import { AgentConsoleTheme, AgentConsoleThemeStyles, defaultAgentConsoleTheme, resolveAgentConsoleThemeStyles } from './AgentConsoleTheme';
import { defaultAgentConsoleStatusline } from './AgentConsoleStatusline';
import { defaultAgentConsoleTitle } from './AgentConsoleTitle';

/** Reactive data fields shared by the console session facade. */
export class AgentConsoleSessionData {
    /** Record a successfully executed command at the front of the palette list. */
    recordRecentCommand(command: string): boolean {
        const name = String(command || '').trim();
        if (!name.startsWith('/')) {
            return false;
        }
        const next = [name, ...this.recentCommands.filter(item => item !== name)].slice(0, 10);
        if (next.length === this.recentCommands.length && next.every((item, index) => item === this.recentCommands[index])) {
            return false;
        }
        this.recentCommands = next;
        return true;
    }

    consoleOptions: Required<AgentConsoleOptions> = defaultAgentConsoleOptions;
    messageDetailVisibleLines = defaultAgentConsoleOptions.messageDetailVisibleLines;
    markdownContentWidth = 0;
    /** Cap for scrollable overlay content so dialogs fit above the composer. */
    maxOverlayVisibleLines = 0;
    /** Terminal columns for the session tab strip; 0 on hosts that scroll it (web). */
    tabStripColumns = 0;
    /** All tabs reserve a close affordance and reveal it while the tab is
     *  hovered (DOM through CSS, the TUI surface at paint time). */
    tabCloseOnHover = true;
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
    /** Oldest loaded message id; next prepend request uses it as cursor. */
    messagesPageCursor = '';
    /** Whether older transcript pages remain on the server. */
    messagesHasMore = false;
    /** Guards concurrent older-page requests while the user keeps scrolling. */
    messagesPageLoading = false;
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
    /** Session whose turn is currently streaming; tabs switch without waiting. */
    activeTurnSessionId = '';
    provider = '';
    model = '';
    modelProfile = '';
    oneShotModelProfile = '';
    planMode = false;
    activeArchetype = 'build';
    yoloMode = false; securityLevel: import('./AgentConsolePolicyCommands').AgentConsoleSecurityLevel | '' = ''; worktreeCommand?: (request: import('./AgentConsoleWorktreeCommands').AgentConsoleWorktreeRequest) => Promise<import('./AgentConsoleWorktreeCommands').AgentConsoleWorktreeResult>; textOverlayBack?: () => void; restartAction?: (sessionId: string) => void; pairAction?: () => Promise<{ url?: string; urls?: string[]; qr?: string; code?: string; expiresAt?: number } | null>;
    /** Workspace default restored from settings.json (the `/permissions level` value). */
    workspaceSecurityLevel: import('./AgentConsolePolicyCommands').AgentConsoleSecurityLevel | '' = '';
    /**
     * Session-scoped `/permissions session` overrides. Switching tabs re-applies
     * the target session's entry; `/permissions level` clears the current one.
     */
    sessionSecurityLevels: Record<string, import('./AgentConsolePolicyCommands').AgentConsoleSecurityLevel> = {};
    /** Read-only remote agent centers configured in workspace settings. */
    remoteCenters: AgentConsoleRemoteCenter[] = [];
    /** Opt-in: allow /msg delivery between sessions (agent teams, default off). */
    crossSessionMessages = false;
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
    planEventSequence = 0;
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
    turnTokenUsageBase: AgentConsoleTokenUsage = {
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
    /** Recently executed slash commands, newest first (session-local). */
    recentCommands: string[] = [];
    /** Transient toast queue painted by the shared toast strip. */
    toasts: ToastEntry[] = [];
    pendingAttachments: AgentConsolePendingAttachment[] = [];
    queuedPromptCount = 0;
    showThinking = true;
    steerMode?: boolean;
    showTimestamps = true;
    showCriticalMarks = false;
    showToolOutput = true;
    showUsername = false;
    timelineViewMode: 'off' | 'compact' | 'steps' | 'verbose' = 'off';


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
    /** Settings center (schema-driven page opened by `/settings`). */
    settingsCenterOpen = false;
    settingsCenterSection: AgentConsoleSettingsSectionId = 'general';
    settingsCenterQuery = '';
    settingsCenterIndex = 0;
    settingsCenterRows: AgentConsoleSettingsRow[] = [];
    settingsCenterTitle = '';
    settingsCenterMeta = '';
    settingsCenterHint = '';
    settingsCenterPickAction?: (id: string) => void | Promise<void>;
    settingsCenterSectionPickAction?: (id: AgentConsoleSettingsSectionId) => void | Promise<void>;
    /** Web settings page: same schema as the overlay, rendered as a popup card. */
    settingsPageOpen = false;
    /** Host hook: lazily mount the browser settings popup before it opens. */
    settingsPageMountAction?: () => void | Promise<void>;
    settingsPagePickAction?: (id: string) => void | Promise<void>;
    settingsPageResetAction?: (id: string) => void | Promise<void>;
    settingsPageSectionAction?: (id: AgentConsoleSettingsSectionId) => void | Promise<void>;
    settingsPageQueryAction?: (query: string) => void | Promise<void>;
    settingsPageCloseAction?: () => void | Promise<void>;
    selectMenu?: AgentConsoleSelectMenu;
    pendingApprovals: AgentConsoleApprovalRequest[] = []; modelUnavailableAction?: (failure: any) => void | Promise<void>; scrollTranscriptAction?: (rows: number) => boolean; revealMessageAction?: (messageId: string) => boolean;
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
    approvalAllowProjectAction?: (requestId: string) => void | Promise<void>;
    sessionTabsAction?: { select?: (id: string) => void; create?: () => void; close?: (id: string) => void };
    /** Most-recently closed session tabs, for Ctrl+Shift+T. */
    closedSessionTabIds: string[] = [];
    globalKeyInputAction?: (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }) => boolean | Promise<boolean>;
    injectedCommandHints: string[] = [];



    activeToolSet = new Set<string>();
    workspaceMentionResolver?: AgentConsoleWorkspaceMentionResolver;
    mentionCatalog: AgentConsoleMentionCatalogItem[] = [];
    workspaceSuggestionRequestId = 0;
    suppressSuggestionMenu = false;
    /** True once the user moved inside an open suggestion menu. */
    selectMenuTouched = false;

}
