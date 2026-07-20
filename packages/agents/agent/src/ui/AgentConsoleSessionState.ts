import { Injectable } from '@tsdi/ioc';
import {
    clampConsoleTextCursor,
    processConsoleTextInputChunk,
    shouldSkipConsoleHistoryEntry
} from '@tsdi/components/console';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentToolDefinition } from '../tools/AgentTool';
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
    updatedAt?: number;
    messageCount?: number;
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
    toolRunsVisibleItems: 3,
    selectVisibleOptions: 12,
    storedToolRunsLimit: 8,
    activityVisibleItems: 3,
    activityHistoryLimit: 30,
    summaryMaxLength: 80,
    toolRunSummaryMaxLength: 96,
    sessionHint: 'up/down move   pg jump   enter switch   y copy   esc',
    messagesHint: 'up/down move   pg jump   enter open   y copy   esc',
    toolsHint: 'up/down move   pg jump   y copy   esc',
    approvalsHint: 'up/down move   pg jump   a approve   d deny   y copy   esc',
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
    messageStatusSymbol: '●'
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
    tools: AgentConsoleToolItem[] = [];
    toolsFocused = false;
    selectedToolName = '';
    approvalsFocused = false;
    selectedApprovalId = '';
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
    resolveApprovalAction?: (decision: 'approve' | 'deny', requestId: string) => void | Promise<void>;
    commandHints = ['/help', '/tools', '/model', '/clear', '/multiline', '/send', '/cancel', '/sessions', '/messages', '/session', '/new', '/approvals', '/approve', '/deny', '/copy', '/quit', '/exit'];

    protected activeToolSet = new Set<string>();
    protected listeners = new Set<() => void>();
    protected notificationBatchDepth = 0;
    protected notificationPending = false;
    protected workspaceMentionResolver?: AgentConsoleWorkspaceMentionResolver;
    protected workspaceSuggestionRequestId = 0;

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
            && !this.toolsFocused
            && !this.approvalsFocused
            && !this.messagesFocused
            && !this.messageDetailOpen
            && !(this.selectMenu && !isAgentConsoleSuggestionMenu(this.selectMenu));
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

    appendAssistantErrorMessage(message: string): void {
        const text = String(message || '').trim();
        const currentMessages = this.messages.slice();
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (lastMessage?.role === 'assistant' && !String(lastMessage.content || '').trim()) {
            currentMessages.pop();
        }
        currentMessages.push({
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            content: text ? `Error: ${text}` : 'Error',
            createdAt: Date.now(),
            metadata: {
                error: true
            }
        });
        this.setMessages(currentMessages);
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

    openSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): void {
        this.selectMenu = {
            title,
            hint: hint || this.consoleOptions.selectHint,
            options: options.slice(),
            selectedIndex: Math.max(0, Math.min(Math.max(options.length - 1, 0), selectedIndex))
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
                    void this.cancelSelectMenu();
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
        if (this.messageDetailOpen) {
            this.closeMessageDetail();
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
        return !!menu
            && isAgentConsoleSuggestionMenu(menu)
            && String(value || '').startsWith('/')
            && !!this.submitAction;
    }

    async confirmSelectMenu(value?: string): Promise<string | undefined> {
        const resolved = value ?? this.selectedSelectMenuOption?.value;
        const action = this.selectMenuAction;
        this.selectMenuAction = undefined;
        this.closeSelectMenu();
        await action?.(resolved);
        return resolved;
    }

    async acceptSelectMenu(value?: string): Promise<{ value: string | undefined; submitted: boolean }> {
        const menu = this.selectMenu;
        const resolved = await this.confirmSelectMenu(value);
        const submitted = this.shouldSubmitConfirmedSelectMenuValue(menu, resolved);
        if (submitted) {
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

    protected refreshInputSuggestions(): void {
        if (this.selectMenu && !isAgentConsoleSuggestionMenu(this.selectMenu)) {
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
        this.activities = [
            ...this.activities.slice(-(this.consoleOptions.activityHistoryLimit - 1)),
            {
                id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                kind,
                message,
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

    protected expandTabs(value: string): string {
        return String(value || '').replace(/\t/g, '    ');
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

    async handleFocusKey(key: string): Promise<boolean> {
        const normalized = String(key || '').trim().toLowerCase();
        if (!normalized) {
            return false;
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
        if (this.toolsFocused) {
            if (this.isDismissKey(normalized)) {
                await this.dismissFocusLayer();
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await this.copyFocusedTextAction?.(this.selectedTool?.name || '', 'tool name');
                    return true;
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
                    await this.copyFocusedTextAction?.(this.selectedSession?.id || '', 'session id');
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
        }

        if (next.shouldSubmit && this.submitAction) {
            void this.submitAction();
        }

        this.notify();
        return {
            submitted,
            confirmedSelection: next.shouldConfirmSelection
        };
    }
}
