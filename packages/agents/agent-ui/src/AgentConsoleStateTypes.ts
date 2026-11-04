import type { AgentMessage, AgentSessionSectionInfo, ContextPreparationReport, ScheduledAgentTask } from '@tsdi/agent';
import { DEFAULT_RENDER_POLICY } from '@tsdi/agent';
import { DEFAULT_TERMINAL_COLUMNS } from './console-ports';
import type { AgentConsoleMessageStatusLabels } from './AgentConsoleMessageRenderers';
import type { AgentConsoleTimelineLabels } from './AgentConsoleTimelineWindow';
import type { AgentConsoleTheme } from './AgentConsoleTheme';
import type { AgentConsoleStatuslineField } from './AgentConsoleStatusline';
import type { AgentConsoleTitleField } from './AgentConsoleTitle';
import { DEFAULT_TIMELINE_LABELS } from './AgentConsoleTimelineWindow';
import { AGENT_CONSOLE_SUGGESTIONS_HINT } from './AgentConsoleSuggestions';
import { AGENT_CONSOLE_OVERLAY_HINTS } from './AgentConsoleOverlayPresenter';

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
    id?: string;
    createdAt?: number;
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
    reasonDetail?: { code: string; params?: Record<string, any> };
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
    status?: 'add' | 'update' | 'delete' | 'rename';
    previousPath?: string;
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
    kind?: string;
    hint?: string;
    options: AgentConsoleSelectOption[];
    selectedIndex: number;
    parentMenu?: AgentConsoleSelectMenu;
    parentMenuAction?: (value: string | undefined) => void | Promise<void>;
}

/**
 * Reactive banner state for the add-provider wizard, rendered by the input panel.
 * The component owns the step machine; this object drives the display layer only.
 */
export interface AgentConsoleProviderWizardState {
    open: boolean;
    phase: 'choose' | 'enter' | 'confirm';
    stepIndex: number;
    stepCount: number;
    stepLabel: string;
    progress: string;
    prompt: string;
    help: string;
    hint: string;
    secret: boolean;
    summary: string[];
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
    /** Transcript layout: scrollback keeps conversation rows flowing; viewport windows them (legacy 'stream' -> 'scrollback', 'dynamic' -> 'viewport'). */
    messageLayout?: 'scrollback' | 'viewport' | 'dynamic' | 'stream';
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

export const ZH_MESSAGE_STATUS_LABELS = { running: '正在执行', success: '成功', failed: '失败', error: '错误' };
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
    messageLayout: 'viewport',
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
    sessionHint: 'type to search   up/down move   pg jump   enter switch   y copy   esc',
    messagesHint: 'up/down move   pg jump   enter open   y copy   esc',
    toolsHint: 'up/down move   pg jump   enter activate   y copy   esc',
    toolRunsHint: 'up/down move   pg jump   y copy   esc',
    approvalsHint: AGENT_CONSOLE_OVERLAY_HINTS.approvals,
    reviewDetailHint: ', . group   [ ] file   { } hunk jump   f fold hunk   s side-by-side   a additions   u all   p prev lineage   n next lineage   r retry   up/down scroll   left/right pan   pg jump   y copy   / command mode (approve|reject|summary|approve-all|clear-all)   esc',
    messageDetailHint: 'up/down scroll   left/right pan   pg jump   y copy   esc',
    messageDetailClosedHint: 'enter to open',
    selectHint: AGENT_CONSOLE_OVERLAY_HINTS.select,
    selectCloseHint: 'up/down move   enter close   q close',
    suggestionsHint: AGENT_CONSOLE_SUGGESTIONS_HINT,
    brandWidth: DEFAULT_TERMINAL_COLUMNS,
    messageStatusLabels: ZH_MESSAGE_STATUS_LABELS,
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
    /** Optional page height; defaults to reviewDetailVisibleLines (notice slot). */
    visibleLines?: number;
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

export const EN_MESSAGE_STATUS_LABELS = { running: 'Running', success: 'Success', failed: 'Failed', error: 'Error' };

/** zh keyboard hints; the built-in option defaults are English. */
export const ZH_CONSOLE_HINTS = {
    inputPlaceholder: '问我代码或文件',
    selectHint: '1-9 选择   上/下 移动   回车 确认   q 取消',
    suggestionsHint: '回车 执行   tab 补全   上/下 选择',
    approvalsHint: 'a 允许   d 拒绝   A 本会话始终允许   y 复制   上/下 移动   esc 关闭',
    sessionHint: '输入以搜索   上/下 移动   pg 跳转   回车 切换   y 复制   esc',
    messagesHint: '上/下 移动   pg 跳转   回车 打开   y 复制   esc',
    toolsHint: '上/下 移动   pg 跳转   回车 激活   y 复制   esc',
    toolRunsHint: '上/下 移动   pg 跳转   y 复制   esc',
    messageDetailHint: '上/下 滚动   左/右 平移   pg 跳转   y 复制   esc',
    messageDetailClosedHint: '回车 打开',
    selectCloseHint: '上/下 移动   回车 关闭   q 关闭',
    reviewDetailHint: ', . 分组   [ ] 文件   { } hunk 跳转   f 折叠   s 并排   a 新增   u 全部   p 上一条   n 下一条   r 重试   上/下 滚动   左/右 平移   pg 跳转   y 复制   / 命令模式（approve|reject|summary|approve-all|clear-all）   esc'
};

