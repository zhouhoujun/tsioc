import { Injectable } from '@tsdi/ioc';
import {
    clampConsoleTextCursor,
    processConsoleTextInputChunk,
    shouldSkipConsoleHistoryEntry
} from '@tsdi/components/console';
import { AgentMessage, AgentToolDefinition, ScheduledAgentTask } from '@tsdi/agent';
import {
    AgentConsoleTheme,
    AgentConsoleThemeInput,
    AgentConsoleThemeStyles,
    defaultAgentConsoleTheme,
    mergeAgentConsoleTheme,
    resolveAgentConsoleThemeStyles
} from './AgentConsoleTheme';
import { DEFAULT_TERMINAL_COLUMNS, formatTerminalStatusFooter } from '@tsdi/components/console';
import {
    AGENT_CONSOLE_SUGGESTIONS_HINT,
    AGENT_CONSOLE_SUGGESTIONS_TITLE,
    applyAgentConsoleSuggestion,
    getAgentConsoleInputTokenRange,
    getAgentConsoleMentionCandidates,
    isAgentConsoleSuggestionMenu,
    resolveAgentConsoleInputSuggestions
} from './AgentConsoleSuggestions';
import { AgentConsoleWorkspaceMentionResolver } from './AgentConsoleWorkspaceMentions';
import { AgentConsoleMessageStatusLabels } from './AgentConsoleMessageRenderers';

export interface AgentConsoleToolItem {
    name: string;
    toolset?: string;
    active: boolean;
    activationKind?: string;
}

export interface AgentConsoleSessionItem {
    id: string;
    current: boolean;
    workspace?: string;
    updatedAt?: number;
    messageCount?: number;
    projectKey?: string;
    projectId?: string;
    projectLabel?: string;
    projectSessionCount?: number;
}

export interface AgentConsoleActivity {
    id: string;
    kind: 'turn' | 'tool' | 'model' | 'error';
    message: string;
    createdAt: number;
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
    status?: string;
    executionMode?: 'sequential' | 'parallel' | null;
    workerCount?: number;
    rollbackAvailable?: boolean;
    rollbackMode?: string;
    checkpointSummary?: string;
    updatedAt?: number;
    detail?: string;
}

export type AgentConsoleTaskFilter = 'all' | 'failed' | 'rollback';
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
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface AgentConsoleSessionMeta {
    sessionId?: string;
    provider?: string;
    model?: string;
    modelProfile?: string;
    workspace?: string;
}

export interface AgentConsoleSelectOption {
    label: string;
    value: string;
    description?: string;
    detail?: string | Record<string, any> | any[];
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
    emptyValueLabel?: string;
    noneValueLabel?: string;
    statusVisibleLines?: number;
    sessionsVisibleItems?: number;
    messagesVisibleItems?: number;
    messageDetailVisibleLines?: number;
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
    summaryMaxLength?: number;
    toolRunSummaryMaxLength?: number;
    sessionHint?: string;
    messagesHint?: string;
    toolsHint?: string;
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
}

export const defaultAgentConsoleOptions: Required<AgentConsoleOptions> = {
    inputPrompt: '> ',
    inputPlaceholder: 'Ask code or files',
    inputContinuationPrompt: '  ',
    emptyValueLabel: '-',
    noneValueLabel: 'none',
    statusVisibleLines: 6,
    sessionsVisibleItems: 6,
    messagesVisibleItems: 7,
    messageDetailVisibleLines: 6,
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
    summaryMaxLength: 80,
    toolRunSummaryMaxLength: 96,
    sessionHint: 'up/down move   pg jump   enter switch   y copy   esc',
    messagesHint: 'up/down move   pg jump   enter open   y copy   esc',
    toolsHint: 'up/down move   pg jump   enter activate   y copy   esc',
    approvalsHint: 'up/down move   pg jump   a approve   d deny   y copy   esc',
    reviewDetailHint: ', . group   [ ] file   a additions   u all   up/down scroll   left/right pan   pg jump   y copy   esc',
    messageDetailHint: 'up/down scroll   left/right pan   pg jump   y copy   esc',
    messageDetailClosedHint: 'enter to open',
    selectHint: '1-9 select   up/down move   enter confirm   q cancel',
    selectCloseHint: 'up/down move   enter close   q close',
    suggestionsHint: AGENT_CONSOLE_SUGGESTIONS_HINT,
    brandWidth: DEFAULT_TERMINAL_COLUMNS,
    messageStatusLabels: {
        running: '正在执行',
        success: '成功',
        failed: '失败',
        error: '错误'
    },
    messageStatusSymbol: ''
};

@Injectable()
export class AgentConsoleSessionState {
    consoleOptions: Required<AgentConsoleOptions> = defaultAgentConsoleOptions;
    sessionId = 'console';
    input = '';
    inputCursor = 0;
    inputFocused = true;
    title = '';
    messages: AgentMessage[] = [];
    messagesFocused = false;
    selectedMessageId = '';
    messageDetailOpen = false;
    messageDetailScroll = 0;
    messageDetailColumnScroll = 0;
    turnStartedAt = 0;
    status = 'idle';
    provider = '';
    model = '';
    modelProfile = '';
    workspace = '';
    tasksCount = 0;
    sessions: AgentConsoleSessionItem[] = [];
    sessionsFocused = false;
    selectedSessionId = '';
    tasksFocused = false;
    jobsFocused = false;
    tools: AgentConsoleToolItem[] = [];
    toolsFocused = false;
    selectedToolName = '';
    approvalsFocused = false;
    selectedApprovalId = '';
    reviewOpen = false;
    reviewTask?: Record<string, any> | null;
    reviewDiff?: any | null;
    reviewWorkers: AgentConsoleReviewWorker[] = [];
    reviewTaskChoices: AgentConsoleReviewTaskItem[] = [];
    taskRecords: Record<string, any>[] = [];
    planTodos: AgentConsolePlanTodoItem[] = [];
    selectedReviewTaskId = '';
    selectedTaskFilter: AgentConsoleTaskFilter = 'all';
    selectedReviewGroupIndex = 0;
    selectedReviewFileIndex = 0;
    selectedReviewPatchFilter: AgentConsoleReviewPatchFilter = 'all';
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
    inputHistoryEntries: string[] = [];
    inputHistoryIndex = -1;
    inputHistoryDraft = '';
    inputLocked = false;
    modalPromptActive = false;
    activeTurnEventScope = '';
    lastError = '';
    notice = '';
    theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    themeStyles: AgentConsoleThemeStyles = resolveAgentConsoleThemeStyles(defaultAgentConsoleTheme);
    selectMenu?: AgentConsoleSelectMenu;
    pendingApprovals: AgentConsoleApprovalRequest[] = [];
    submitAction?: () => Promise<void>;
    selectMenuAction?: (value: string | undefined) => void | Promise<void>;
    copyFocusedTextAction?: (text: string, label: string) => void | Promise<void>;
    activateSelectedSessionAction?: (sessionId: string) => void | Promise<void>;
    openSelectedTaskAction?: (taskId: string) => void | Promise<void>;
    cancelSelectedTaskAction?: (taskId: string) => void | Promise<void>;
    rollbackSelectedTaskAction?: (taskId: string) => void | Promise<void>;
    toggleSelectedScheduledTaskAction?: (taskId: string) => void | Promise<void>;
    cancelSelectedScheduledTaskAction?: (taskId: string) => void | Promise<void>;
    recoverSelectedScheduledTaskAction?: (taskId: string) => void | Promise<void>;
    activateSelectedToolAction?: (toolName: string) => void | Promise<void>;
    resolveApprovalAction?: (decision: 'approve' | 'deny', requestId: string) => void | Promise<void>;
    commandHints = ['/help', '/tools', '/jobs', '/tasks', '/review', '/rollback', '/model', '/clear', '/multiline', '/send', '/cancel', '/sessions', '/messages', '/session', '/new', '/approvals', '/approve', '/deny', '/copy', '/quit', '/exit'];

    protected activeToolSet = new Set<string>();
    protected listeners = new Set<() => void>();
    protected notificationBatchDepth = 0;
    protected notificationPending = false;
    protected workspaceMentionResolver?: AgentConsoleWorkspaceMentionResolver;
    protected workspaceSuggestionRequestId = 0;
    protected suppressSuggestionMenu = false;

    configure(meta: AgentConsoleSessionMeta): this {
        if (meta.sessionId) {
            this.sessionId = meta.sessionId;
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
        this.notify();
        return this;
    }

    setTitle(title: string): void {
        this.title = title;
        this.notify();
    }

    setProvider(provider: string): void {
        this.provider = provider;
        this.notify();
    }

    setModel(model: string): void {
        this.model = model;
        this.notify();
    }

    setWorkspace(workspace: string): void {
        this.workspace = workspace;
        this.refreshInputSuggestions();
        this.notify();
    }

    setModelProfile(modelProfile: string): void {
        this.modelProfile = modelProfile;
        this.notify();
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    batch<T>(work: () => T): T {
        this.notificationBatchDepth += 1;
        try {
            return work();
        } finally {
            this.notificationBatchDepth = Math.max(0, this.notificationBatchDepth - 1);
            if (!this.notificationBatchDepth && this.notificationPending) {
                this.notificationPending = false;
                Array.from(this.listeners.values()).forEach(listener => listener());
            }
        }
    }

    notify(): void {
        if (this.notificationBatchDepth > 0) {
            this.notificationPending = true;
            return;
        }
        Array.from(this.listeners.values()).forEach(listener => listener());
    }

    protected syncDerivedInputFocus(): void {
        this.inputFocused = !this.sessionsFocused
            && !this.tasksFocused
            && !this.jobsFocused
            && !this.toolsFocused
            && !this.approvalsFocused
            && !this.reviewOpen
            && !this.messagesFocused
            && !this.messageDetailOpen
            && !(this.selectMenu && !isAgentConsoleSuggestionMenu(this.selectMenu));
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
        return !!this.messageDetailOpen;
    }

    isAnyFocusActive(): boolean {
        return this.hasBlockingSelectMenu()
            || this.hasSessionFocus()
            || this.hasTaskFocus()
            || this.hasScheduledJobFocus()
            || this.hasToolFocus()
            || this.hasApprovalFocus()
            || this.hasReviewFocus()
            || this.hasMessageFocus()
            || this.hasMessageDetailFocus();
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
        this.notify();
    }

    get displayMessages(): AgentMessage[] {
        return this.messages.filter(message => this.isDisplayMessage(message));
    }

    setMessages(messages: AgentMessage[]): void {
        this.messages = messages;
        this.tokenUsage = this.resolveTokenUsageFromMessages(messages);
        const displayMessages = this.displayMessages;
        if (!displayMessages.length) {
            this.selectedMessageId = '';
            this.messageDetailOpen = false;
            this.messageDetailScroll = 0;
            this.messageDetailColumnScroll = 0;
        } else {
            const shouldFollowLatest = !this.messagesFocused && !this.messageDetailOpen;
            if (shouldFollowLatest || !this.selectedMessageId || !displayMessages.some(item => item.id === this.selectedMessageId)) {
                this.selectedMessageId = displayMessages[displayMessages.length - 1].id;
                this.messageDetailScroll = 0;
                this.messageDetailColumnScroll = 0;
            }
        }
        this.notify();
    }

    appendMessage(message: AgentMessage): void {
        this.setMessages([...this.messages, message]);
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
        this.setMessages(filtered);
    }

    appendUiEventMessage(
        content: string,
        options: {
            eventType?: string;
            label?: string;
            status?: 'running' | 'success' | 'failed' | 'error';
            eventKey?: string;
        } = {}
    ): void {
        const text = String(content || '').trim();
        if (!text) {
            return;
        }
        const next = this.messages.slice();
        next.push(this.createUiEventMessage(text, options));
        this.setMessages(next);
    }

    upsertUiEventMessage(
        eventKey: string,
        content: string,
        options: {
            eventType?: string;
            label?: string;
            status?: 'running' | 'success' | 'failed' | 'error';
        } = {}
    ): void {
        const text = String(content || '').trim();
        if (!text) {
            return;
        }
        const next = this.messages.slice();
        const existingIndex = next.findIndex(message => message?.metadata?.uiKind === 'event' && message?.metadata?.uiEventKey === eventKey);
        if (existingIndex >= 0) {
            const existing = next[existingIndex];
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
        this.setMessages(next);
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
        this.setMessages(currentMessages);
    }

    protected createUiEventMessage(
        content: string,
        options: {
            id?: string;
            createdAt?: number;
            eventType?: string;
            label?: string;
            status?: 'running' | 'success' | 'failed' | 'error';
            eventKey?: string;
        } = {}
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
                status: options.status || 'running'
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
            && leftMetadata.status === rightMetadata.status;
    }

    setMessagesFocused(focused: boolean): void {
        this.messagesFocused = focused;
        const displayMessages = this.displayMessages;
        if (focused && !this.selectedMessageId && displayMessages.length) {
            this.selectedMessageId = displayMessages[displayMessages.length - 1].id;
        }
        if (!focused) {
            this.messageDetailOpen = false;
            this.messageDetailScroll = 0;
            this.messageDetailColumnScroll = 0;
        }
        this.syncDerivedInputFocus();
        this.notify();
    }

    setSelectedMessageId(messageId: string): void {
        if (!messageId || !this.displayMessages.some(item => item.id === messageId)) {
            return;
        }
        this.selectedMessageId = messageId;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
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
        this.notify();
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
        this.notify();
    }

    selectFirstMessage(): void {
        const displayMessages = this.displayMessages;
        if (!displayMessages.length) {
            return;
        }
        this.selectedMessageId = displayMessages[0].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    selectLastMessage(): void {
        const displayMessages = this.displayMessages;
        if (!displayMessages.length) {
            return;
        }
        this.selectedMessageId = displayMessages[displayMessages.length - 1].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    get selectedMessage(): AgentMessage | undefined {
        return this.displayMessages.find(item => item.id === this.selectedMessageId);
    }

    openMessageDetail(): void {
        if (!this.selectedMessage) {
            return;
        }
        this.messageDetailOpen = true;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
        this.notify();
    }

    closeMessageDetail(): void {
        if (!this.messageDetailOpen && this.messageDetailScroll === 0) {
            return;
        }
        this.messageDetailOpen = false;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
        this.notify();
    }

    scrollMessageDetail(delta: number): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const lines = this.messageDetailLines;
        const maxScroll = Math.max(0, lines.length - this.consoleOptions.messageDetailVisibleLines);
        this.messageDetailScroll = Math.max(0, Math.min(maxScroll, this.messageDetailScroll + delta));
        this.notify();
    }

    scrollMessageDetailPage(delta: number, pageSize?: number): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const resolvedPageSize = pageSize ?? this.consoleOptions.messageDetailPageSize;
        this.scrollMessageDetail(delta * Math.max(1, resolvedPageSize));
    }

    scrollMessageDetailToEdge(position: 'start' | 'end'): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const lines = this.messageDetailLines;
        this.messageDetailScroll = position === 'start'
            ? 0
            : Math.max(0, lines.length - this.consoleOptions.messageDetailVisibleLines);
        this.notify();
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
        if (String(message.role || '').toLowerCase() === 'assistant'
            && Array.isArray(message.metadata?.toolCalls)
            && message.metadata.toolCalls.length
            && !String(message.content || '').trim()) {
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
        this.notify();
    }

    scrollMessageDetailColumnsToEdge(position: 'start' | 'end'): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        this.messageDetailColumnScroll = position === 'start'
            ? 0
            : Math.max(0, this.messageDetailMaxColumn - 1);
        this.notify();
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
        this.notify();
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
        this.notify();
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
        this.notify();
    }

    setInput(value: string, cursor = value.length): void {
        this.input = value;
        this.inputCursor = clampConsoleTextCursor(this.input, cursor);
        this.refreshInputSuggestions();
        this.syncDerivedInputFocus();
        this.notify();
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
            if (!shouldSkipConsoleHistoryEntry(this.inputHistoryEntries[index])) {
                return index;
            }
        }
        return -1;
    }

    setInputCursor(cursor: number): void {
        this.inputCursor = clampConsoleTextCursor(this.input, cursor);
        this.refreshInputSuggestions();
        this.syncDerivedInputFocus();
        this.notify();
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
        this.notify();
    }

    setInputPlaceholder(value: string): void {
        this.inputPlaceholder = String(value || '').trim();
        this.notify();
    }

    get inputPlaceholderLabel(): string {
        return this.input ? '' : this.inputPlaceholder;
    }

    get inputHintLabel(): string {
        return formatTerminalStatusFooter(this.model, this.modelProfile, this.workspace);
    }

    setLastError(message: string): void {
        this.lastError = message;
        this.notify();
    }

    setTasksCount(value: number): void {
        this.tasksCount = value;
        this.notify();
    }

    setSessions(sessions: AgentConsoleSessionItem[]): void {
        this.sessions = sessions.slice();
        if (!this.sessions.length) {
            this.selectedSessionId = '';
        } else if (this.selectedSessionId && this.sessions.some(item => item.id === this.selectedSessionId)) {
            // Preserve explicit selection when the session list refreshes.
        } else {
            this.selectedSessionId = this.sessions.find(item => item.current)?.id || this.sessions[0].id;
        }
        this.notify();
    }

    setSessionsFocused(focused: boolean): void {
        this.sessionsFocused = focused;
        if (focused && !this.selectedSessionId && this.sessions.length) {
            this.selectedSessionId = this.sessions.find(item => item.current)?.id || this.sessions[0].id;
        }
        this.syncDerivedInputFocus();
        this.notify();
    }

    setSelectedSessionId(sessionId: string): void {
        if (!sessionId || !this.sessions.some(item => item.id === sessionId)) {
            return;
        }
        this.selectedSessionId = sessionId;
        this.notify();
    }

    moveSessionSelection(delta: number): void {
        if (!this.sessions.length) {
            return;
        }
        const currentIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.selectedSessionId));
        const nextIndex = (currentIndex + delta + this.sessions.length) % this.sessions.length;
        this.selectedSessionId = this.sessions[nextIndex].id;
        this.notify();
    }

    moveSessionSelectionPage(delta: number, pageSize?: number): void {
        if (!this.sessions.length) {
            return;
        }
        const currentIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.selectedSessionId));
        const resolvedPageSize = pageSize ?? this.consoleOptions.sessionSelectionPageSize;
        const nextIndex = Math.max(0, Math.min(this.sessions.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedSessionId = this.sessions[nextIndex].id;
        this.notify();
    }

    selectFirstSession(): void {
        if (!this.sessions.length) {
            return;
        }
        this.selectedSessionId = this.sessions[0].id;
        this.notify();
    }

    selectLastSession(): void {
        if (!this.sessions.length) {
            return;
        }
        this.selectedSessionId = this.sessions[this.sessions.length - 1].id;
        this.notify();
    }

    get selectedSession(): AgentConsoleSessionItem | undefined {
        return this.sessions.find(item => item.id === this.selectedSessionId);
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

    setScheduledTasks(tasks: ScheduledAgentTask[]): void {
        this.scheduledTasks = tasks.slice();
        if (!this.scheduledTasks.length) {
            this.selectedScheduledTaskId = '';
        } else if (this.selectedScheduledTaskId && this.scheduledTasks.some(item => item.id === this.selectedScheduledTaskId)) {
            // Preserve explicit selection when possible.
        } else {
            this.selectedScheduledTaskId = this.scheduledTasks[0].id;
        }
        this.notify();
    }

    setJobsFocused(focused: boolean): void {
        this.jobsFocused = focused;
        if (focused && !this.selectedScheduledTaskId && this.scheduledTasks.length) {
            this.selectedScheduledTaskId = this.scheduledTasks[0].id;
        }
        this.syncDerivedInputFocus();
        this.notify();
    }

    setSelectedScheduledTaskId(taskId: string): void {
        if (!taskId || !this.scheduledTasks.some(item => item.id === taskId)) {
            return;
        }
        this.selectedScheduledTaskId = taskId;
        this.notify();
    }

    moveScheduledTaskSelection(delta: number): void {
        if (!this.scheduledTasks.length) {
            return;
        }
        const currentIndex = Math.max(0, this.scheduledTasks.findIndex(item => item.id === this.selectedScheduledTaskId));
        const nextIndex = (currentIndex + delta + this.scheduledTasks.length) % this.scheduledTasks.length;
        this.selectedScheduledTaskId = this.scheduledTasks[nextIndex].id;
        this.notify();
    }

    moveScheduledTaskSelectionPage(delta: number, pageSize?: number): void {
        if (!this.scheduledTasks.length) {
            return;
        }
        const currentIndex = Math.max(0, this.scheduledTasks.findIndex(item => item.id === this.selectedScheduledTaskId));
        const resolvedPageSize = pageSize ?? this.consoleOptions.sessionsVisibleItems;
        const nextIndex = Math.max(0, Math.min(this.scheduledTasks.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedScheduledTaskId = this.scheduledTasks[nextIndex].id;
        this.notify();
    }

    selectFirstScheduledTask(): void {
        if (!this.scheduledTasks.length) {
            return;
        }
        this.selectedScheduledTaskId = this.scheduledTasks[0].id;
        this.notify();
    }

    selectLastScheduledTask(): void {
        if (!this.scheduledTasks.length) {
            return;
        }
        this.selectedScheduledTaskId = this.scheduledTasks[this.scheduledTasks.length - 1].id;
        this.notify();
    }

    get selectedScheduledTask(): ScheduledAgentTask | undefined {
        return this.scheduledTasks.find(item => item.id === this.selectedScheduledTaskId);
    }

    setTaskRecords(tasks: Record<string, any>[]): void {
        this.taskRecords = tasks.slice();
        this.notify();
    }

    setPlanTodos(todos: AgentConsolePlanTodoItem[]): void {
        this.planTodos = todos.slice();
        this.notify();
    }

    hasActivePlanTodos(): boolean {
        return this.planTodos.some(item => item.status === 'pending' || item.status === 'in_progress');
    }

    clearPlanTodos(): void {
        if (!this.planTodos.length) {
            return;
        }
        this.planTodos = [];
        this.notify();
    }

    setTasksFocused(focused: boolean): void {
        this.tasksFocused = focused;
        if (focused && !this.selectedReviewTaskId && this.filteredReviewTaskChoices.length) {
            this.selectedReviewTaskId = this.filteredReviewTaskChoices[0].id;
        }
        this.syncDerivedInputFocus();
        this.notify();
    }

    setSelectedReviewTaskId(taskId: string): void {
        if (!taskId || !this.reviewTaskChoices.some(item => item.id === taskId)) {
            return;
        }
        this.selectedReviewTaskId = taskId;
        this.notify();
    }

    moveTaskSelection(delta: number): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            return;
        }
        const currentIndex = Math.max(0, tasks.findIndex(item => item.id === this.selectedReviewTaskId));
        const nextIndex = (currentIndex + delta + tasks.length) % tasks.length;
        this.selectedReviewTaskId = tasks[nextIndex].id;
        this.notify();
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
        this.notify();
    }

    selectFirstTask(): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            return;
        }
        this.selectedReviewTaskId = tasks[0].id;
        this.notify();
    }

    selectLastTask(): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            return;
        }
        this.selectedReviewTaskId = tasks[tasks.length - 1].id;
        this.notify();
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
            default:
                return this.reviewTaskChoices;
        }
    }

    setTaskFilter(filter: AgentConsoleTaskFilter): void {
        if (this.selectedTaskFilter === filter) {
            return;
        }
        this.selectedTaskFilter = filter;
        this.syncFilteredTaskSelection();
        this.notify();
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
        this.notify();
    }

    setSelectedToolName(toolName: string): void {
        if (!toolName || !this.tools.some(item => item.name === toolName)) {
            return;
        }
        this.selectedToolName = toolName;
        this.notify();
    }

    moveToolSelection(delta: number): void {
        if (!this.tools.length) {
            return;
        }
        const currentIndex = Math.max(0, this.tools.findIndex(item => item.name === this.selectedToolName));
        const nextIndex = (currentIndex + delta + this.tools.length) % this.tools.length;
        this.selectedToolName = this.tools[nextIndex].name;
        this.notify();
    }

    moveToolSelectionPage(delta: number, pageSize?: number): void {
        if (!this.tools.length) {
            return;
        }
        const currentIndex = Math.max(0, this.tools.findIndex(item => item.name === this.selectedToolName));
        const resolvedPageSize = pageSize ?? this.consoleOptions.toolSelectionPageSize;
        const nextIndex = Math.max(0, Math.min(this.tools.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedToolName = this.tools[nextIndex].name;
        this.notify();
    }

    selectFirstTool(): void {
        if (!this.tools.length) {
            return;
        }
        this.selectedToolName = this.tools[0].name;
        this.notify();
    }

    selectLastTool(): void {
        if (!this.tools.length) {
            return;
        }
        this.selectedToolName = this.tools[this.tools.length - 1].name;
        this.notify();
    }

    get selectedTool(): AgentConsoleToolItem | undefined {
        return this.tools.find(item => item.name === this.selectedToolName);
    }

    setApprovalsFocused(focused: boolean): void {
        this.approvalsFocused = focused;
        if (focused && !this.selectedApprovalId && this.pendingApprovals.length) {
            this.selectedApprovalId = this.pendingApprovals[0].id;
        }
        this.syncDerivedInputFocus();
        this.notify();
    }

    setSelectedApprovalId(approvalId: string): void {
        if (!approvalId || !this.pendingApprovals.some(item => item.id === approvalId)) {
            return;
        }
        this.selectedApprovalId = approvalId;
        this.notify();
    }

    moveApprovalSelection(delta: number): void {
        if (!this.pendingApprovals.length) {
            return;
        }
        const currentIndex = Math.max(0, this.pendingApprovals.findIndex(item => item.id === this.selectedApprovalId));
        const nextIndex = (currentIndex + delta + this.pendingApprovals.length) % this.pendingApprovals.length;
        this.selectedApprovalId = this.pendingApprovals[nextIndex].id;
        this.notify();
    }

    moveApprovalSelectionPage(delta: number, pageSize?: number): void {
        if (!this.pendingApprovals.length) {
            return;
        }
        const currentIndex = Math.max(0, this.pendingApprovals.findIndex(item => item.id === this.selectedApprovalId));
        const resolvedPageSize = pageSize ?? this.consoleOptions.approvalSelectionPageSize;
        const nextIndex = Math.max(0, Math.min(this.pendingApprovals.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
        this.selectedApprovalId = this.pendingApprovals[nextIndex].id;
        this.notify();
    }

    selectFirstApproval(): void {
        if (!this.pendingApprovals.length) {
            return;
        }
        this.selectedApprovalId = this.pendingApprovals[0].id;
        this.notify();
    }

    selectLastApproval(): void {
        if (!this.pendingApprovals.length) {
            return;
        }
        this.selectedApprovalId = this.pendingApprovals[this.pendingApprovals.length - 1].id;
        this.notify();
    }

    get selectedApproval(): AgentConsoleApprovalRequest | undefined {
        return this.pendingApprovals.find(item => item.id === this.selectedApprovalId);
    }

    setReviewTasks(tasks: AgentConsoleReviewTaskItem[]): void {
        this.reviewTaskChoices = tasks.slice();
        this.syncFilteredTaskSelection();
        this.notify();
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
        if (task !== undefined) {
            this.reviewTask = task || null;
        }
        if (payload) {
            this.reviewDiff = payload.diff ?? null;
            this.reviewWorkers = Array.isArray(payload.workers) ? payload.workers.slice() : [];
        }
        const selectedTaskId = String(this.reviewTask?.id || this.selectedReviewTaskId || '').trim();
        if (selectedTaskId) {
            this.selectedReviewTaskId = selectedTaskId;
            const executionMode = payload?.executionMode ?? this.reviewExecutionMode;
            const existingIndex = this.reviewTaskChoices.findIndex(item => item.id === selectedTaskId);
            const nextItem: AgentConsoleReviewTaskItem = {
                id: selectedTaskId,
                title: String(this.reviewTask?.title || selectedTaskId),
                status: this.reviewTask?.status,
                executionMode,
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
        }
        if (!this.reviewTask && !this.reviewDiff && !this.reviewWorkers.length) {
            return;
        }
        this.syncReviewGroupSelection(preferredGroupKey);
        this.syncReviewFileSelection(preferredFilePath);
        this.reviewOpen = true;
        this.resetReviewDetailViewport();
        this.syncDerivedInputFocus();
        this.notify();
    }

    closeReview(): void {
        if (!this.reviewOpen && this.reviewDetailScroll === 0 && this.reviewDetailColumnScroll === 0) {
            return;
        }
        this.reviewOpen = false;
        this.resetReviewDetailViewport();
        this.syncDerivedInputFocus();
        this.notify();
    }

    clearReview(): void {
        this.reviewTask = null;
        this.reviewDiff = null;
        this.reviewWorkers = [];
        this.reviewTaskChoices = [];
        this.taskRecords = [];
        this.selectedReviewTaskId = '';
        this.selectedTaskFilter = 'all';
        this.selectedReviewGroupIndex = 0;
        this.selectedReviewFileIndex = 0;
        this.selectedReviewPatchFilter = 'all';
        this.reviewOpen = false;
        this.resetReviewDetailViewport();
        this.syncDerivedInputFocus();
        this.notify();
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
        this.resetReviewDetailViewport();
        this.notify();
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
        this.resetReviewDetailViewport();
        this.notify();
    }

    setReviewPatchFilter(filter: AgentConsoleReviewPatchFilter): void {
        if (this.selectedReviewPatchFilter === filter) {
            return;
        }
        this.selectedReviewPatchFilter = filter;
        this.resetReviewDetailViewport();
        this.notify();
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
        this.resetReviewDetailViewport();
        this.notify();
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
        this.resetReviewDetailViewport();
        this.notify();
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
                        lines.push(`${marker} [${index + 1}/${sections.length}] ${section.path} (+${section.additions} -${section.deletions})`);
                    }
                    if (selectedSection) {
                        lines.push(`Current File: ${selectedSection.path} (+${selectedSection.additions} -${selectedSection.deletions})`);
                        lines.push(...this.filterReviewPatchLines(selectedSection.lines));
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
        this.notify();
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
        this.notify();
    }

    scrollReviewDetailColumns(delta: number): void {
        if (!this.reviewOpen) {
            return;
        }
        const maxScroll = Math.max(0, this.reviewDetailMaxColumn - 1);
        this.reviewDetailColumnScroll = Math.max(0, Math.min(maxScroll, this.reviewDetailColumnScroll + delta));
        this.notify();
    }

    scrollReviewDetailColumnsToEdge(position: 'start' | 'end'): void {
        if (!this.reviewOpen) {
            return;
        }
        this.reviewDetailColumnScroll = position === 'start'
            ? 0
            : Math.max(0, this.reviewDetailMaxColumn - 1);
        this.notify();
    }

    setNotice(message: string): void {
        this.notice = message;
        this.notify();
    }

    setCommandHints(commands: string[]): void {
        this.commandHints = Array.from(new Set(commands.filter(Boolean)));
        this.refreshInputSuggestions();
        this.notify();
    }

    setWorkspaceMentionResolver(resolver?: AgentConsoleWorkspaceMentionResolver): void {
        this.workspaceMentionResolver = resolver;
        this.refreshInputSuggestions();
        this.notify();
    }

    setTheme(theme?: AgentConsoleThemeInput | null): void {
        this.theme = mergeAgentConsoleTheme(theme);
        this.themeStyles = resolveAgentConsoleThemeStyles(this.theme);
        this.notify();
    }

    setConsoleOptions(options?: AgentConsoleOptions | null): void {
        this.consoleOptions = {
            ...defaultAgentConsoleOptions,
            ...(options || {})
        };
        this.inputPrompt = this.consoleOptions.inputPrompt;
        this.inputContinuationPrompt = this.consoleOptions.inputContinuationPrompt;
        this.inputPlaceholder = this.consoleOptions.inputPlaceholder;
        this.notify();
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
        this.notify();
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
        this.notify();
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
        this.notify();
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
        this.notify();
    }

    handleSelectKey(key: string): boolean {
        const normalized = String(key || '').trim().toLowerCase();
        if (!this.selectMenu || !this.selectMenu.options.length) { return false; }
        switch (normalized) {
            case 'arrowup':
            case 'up':
                this.moveSelectMenu(-1);
                return true;
            case 'arrowdown':
            case 'down':
                this.moveSelectMenu(1);
                return true;
            case 'enter':
            case 'tab':
            case 'return':
                void this.confirmSelectMenu();
                return true;
            default:
                if (this.isDismissKey(normalized)) {
                    void this.handleEscapeKey();
                    return true;
                }
                if (/^[1-9]$/.test(normalized)) {
                    const idx = parseInt(normalized, 10) - 1;
                    if (idx < this.selectMenu.options.length) {
                        void this.chooseSelectMenuIndex(idx);
                        return true;
                    }
                }
                return false;
        }
    }

    protected isDismissKey(key: string): boolean {
        switch (String(key || '').trim().toLowerCase()) {
            case 'esc':
            case 'escape':
            case 'q':
                return true;
            default:
                return false;
        }
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
        this.notify();
    }

    async dismissFocusLayer(): Promise<boolean> {
        if (this.selectMenu) {
            await this.cancelSelectMenu();
            return true;
        }
        if (this.reviewOpen) {
            this.closeReview();
            return true;
        }
        if (this.messageDetailOpen) {
            this.batch(() => {
                this.closeMessageDetail();
                if (this.messagesFocused) {
                    this.setMessagesFocused(false);
                }
            });
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
        this.selectMenu.selectedIndex = Math.max(0, Math.min(this.selectMenu.options.length - 1, index));
        this.notify();
    }

    moveSelectMenu(delta: number): void {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        const next = (this.selectMenu.selectedIndex + delta + this.selectMenu.options.length) % this.selectMenu.options.length;
        this.selectMenu.selectedIndex = next;
        this.notify();
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
            return true;
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
        this.notify();
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
                this.inputCursor = clampConsoleTextCursor(this.input, next.cursor);
                this.refreshInputSuggestions();
                this.syncDerivedInputFocus();
                this.notify();
            };
        };

        applySuggestions();
        if (!active?.token?.startsWith('@') || !this.workspace || !this.workspaceMentionResolver) {
            return;
        }
        const requestId = ++this.workspaceSuggestionRequestId;
        void this.workspaceMentionResolver.resolveSuggestions(this.workspace, active.token).then(options => {
            if (requestId !== this.workspaceSuggestionRequestId) {
                return;
            }
            if (this.input !== currentInput || this.inputCursor !== currentCursor) {
                return;
            }
            applySuggestions(options);
            this.notify();
        }).catch(() => undefined);
    }

    setRunningTool(toolName: string): void {
        this.activeToolSet.add(toolName);
        this.runningTools = Array.from(this.activeToolSet.values()).sort();
        this.notify();
    }

    clearRunningTool(toolName: string): void {
        this.activeToolSet.delete(toolName);
        this.runningTools = Array.from(this.activeToolSet.values()).sort();
        this.notify();
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
        this.notify();
    }

    upsertToolRun(run: AgentConsoleToolRun): void {
        const next = this.toolRuns.filter(item => item.name !== run.name);
        next.unshift(run);
        this.toolRuns = next.slice(0, this.consoleOptions.storedToolRunsLimit);
        this.notify();
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
        const checkpoints = Array.isArray(this.reviewTask?.metadata?.checkpoints)
            ? this.reviewTask?.metadata?.checkpoints
            : [];
        const availableCheckpoints = checkpoints.filter((entry: any) => entry?.status === 'available').length;
        const invalidatedCheckpoints = checkpoints.filter((entry: any) => entry?.status === 'invalidated').length;
        const workerFailures = this.reviewWorkers.filter(worker => worker.error || String(worker.status || '').trim().toLowerCase() === 'failed').length;
        const sections = this.aggregateReviewFileSections;
        const rollback = this.reviewTask?.result?.rollback;

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
        lines.push(`Review: ${reviewState}`);

        const scopeParts = [
            sections.length ? `${sections.length} file${sections.length === 1 ? '' : 's'} changed` : '',
            this.reviewWorkers.length ? `${this.reviewWorkers.length} worker${this.reviewWorkers.length === 1 ? '' : 's'}` : ''
        ].filter(Boolean);
        if (scopeParts.length) {
            lines.push(`Scope: ${scopeParts.join(' · ')}`);
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

    protected isFailedTaskChoice(task: AgentConsoleReviewTaskItem | undefined): boolean {
        const status = String(task?.status || '').trim().toLowerCase();
        return status === 'failed' || status === 'error';
    }

    protected syncFilteredTaskSelection(): void {
        const tasks = this.filteredReviewTaskChoices;
        if (!tasks.length) {
            this.selectedReviewTaskId = '';
            return;
        }
        if (this.selectedReviewTaskId && tasks.some(item => item.id === this.selectedReviewTaskId)) {
            return;
        }
        this.selectedReviewTaskId = tasks[0].id;
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

    async handleEscapeKey(): Promise<boolean> {
        if (this.selectMenu) {
            const currentMenu = this.selectMenu;
            const parentMenu = currentMenu.parentMenu;
            if (parentMenu) {
                this.selectMenuAction = undefined;
                this.closeSelectMenu();
                this.selectMenu = parentMenu;
                this.selectMenuAction = currentMenu.parentMenuAction;
                this.syncDerivedInputFocus();
                this.notify();
                return true;
            }
            await this.cancelSelectMenu();
            return true;
        }
        if (this.reviewOpen || this.messageDetailOpen || this.messagesFocused || this.approvalsFocused || this.tasksFocused || this.jobsFocused || this.toolsFocused || this.sessionsFocused) {
            await this.dismissFocusLayer();
            return true;
        }
        return false;
    }

    handleMenuInput(key: string, text: string): boolean {
        if (!this.selectMenu) {
            return false;
        }
        const keyName = key || text;
        if (keyName === 'down') {
            this.moveSelectMenu(1);
            return true;
        }
        if (keyName === 'up') {
            this.moveSelectMenu(-1);
            return true;
        }
        if (keyName === 'return' || keyName === 'tab') {
            void this.acceptSelectMenu();
            return true;
        }
        if (keyName === 'left' || keyName === 'right') {
            this.suppressSuggestionMenu = true;
            void this.cancelSelectMenu();
            return false;
        }
        if (keyName === 'escape' || keyName === 'esc' || keyName === 'q') {
            void this.handleEscapeKey();
            return true;
        }
        if (/^[1-9]$/.test(keyName)) {
            const index = parseInt(keyName, 10) - 1;
            if (index >= 0 && index < this.selectMenu.options.length) {
                this.setSelectMenuIndex(index);
                void this.acceptSelectMenu();
            }
            return true;
        }
        return false;
    }

    async handleFocusKey(key: string): Promise<boolean> {
        const normalized = String(key || '').trim().toLowerCase();
        if (!normalized) {
            return false;
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
                    this.moveMessageSelection(1);
                    return true;
                case 'up':
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
                    this.openMessageDetail();
                    return true;
                default:
                    return false;
            }
        }
        if (this.approvalsFocused) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
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
                case 'down':
                    this.moveApprovalSelection(1);
                    return true;
                case 'up':
                    this.moveApprovalSelection(-1);
                    return true;
                case 'pageup':
                    this.moveApprovalSelectionPage(-1);
                    return true;
                case 'pagedown':
                    this.moveApprovalSelectionPage(1);
                    return true;
                case 'home':
                    this.selectFirstApproval();
                    return true;
                case 'end':
                    this.selectLastApproval();
                    return true;
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
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.buildSelectedTaskCopyText(), 'selected task');
                    return true;
                case 'enter':
                case 'r':
                    if (this.selectedTask?.id) {
                        await this.openSelectedTaskAction?.(this.selectedTask.id);
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

    protected async cancelFocusedCodingTask(): Promise<void> {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        if (task?.id) {
            await this.cancelSelectedTaskAction?.(task.id);
        }
    }

    async processRawChunk(
        chunk: string,
        options: { submitOnEnter?: boolean; ctrlKey?: boolean; altKey?: boolean; hasSelectMenu?: boolean } = {}
    ): Promise<{ submitted: boolean; confirmedSelection: boolean }> {
        const next = processConsoleTextInputChunk(this.input, this.inputCursor, chunk, options);
        this.input = this.expandTabs(next.value);
        this.inputCursor = clampConsoleTextCursor(this.input, next.cursor);
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

        this.notify();
        return {
            submitted,
            confirmedSelection: next.shouldConfirmSelection
        };
    }

    async processDecodedInput(
        decoded: { text: string; controlKey?: string; partial?: boolean },
        chunk: Buffer | string,
        options: {
            isClosed: boolean;
            onExit: (message: string, force?: boolean) => void;
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
            options.onExit('Closing session...', true);
            return { handled: true, action: 'exit' };
        }

        if (this.handleMenuInput(controlKey || '', rawText)) {
            return { handled: true, action: 'menuInput' };
        }

        if (this.hasBlockingSelectMenu()) {
            return { handled: true, action: 'menuBlocked' };
        }

        if (this.hasReviewFocus() || this.hasMessageDetailFocus() || this.hasMessageFocus() || this.hasApprovalFocus() || this.hasScheduledJobFocus() || this.hasToolFocus() || this.hasSessionFocus()) {
            const focusKey = this.resolveFocusShortcutKey(rawText, controlKey);
            if (focusKey) {
                await this.handleFocusKey(focusKey);
            }
            return { handled: true, action: 'focusKey' };
        }

        if (rawText === '\u001b' && !controlKey) {
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

        if ((controlKey === 'up' || controlKey === 'down') && this.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
            const navigated = this.navigateInputHistory(controlKey === 'up' ? -1 : 1);
            return { handled: true, action: 'historyNavigation', value: navigated ? 'navigated' : 'failed' };
        }

        if (controlKey === 'up' || controlKey === 'down' || controlKey === 'tab' || controlKey === 'escape') {
            return { handled: true };
        }

        if (this.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
            return { handled: true, action: 'textInput', value: rawText };
        }

        return { handled: false };
    }

    updateDraft(draft: string, cursor?: number): void {
        this.input = draft;
        this.inputCursor = clampConsoleTextCursor(draft, cursor ?? draft.length);
    }

    applyChunkToDraft(chunk: string, cursor: number): { value: string; cursor: number } {
        const next = processConsoleTextInputChunk(this.input, cursor, chunk);
        this.input = next.value;
        this.inputCursor = clampConsoleTextCursor(this.input, next.cursor);
        return next;
    }
}
