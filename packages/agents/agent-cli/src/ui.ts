import { applyConsoleTextInputChunk, formatConsoleIndexedOptionLabel } from '@tsdi/components/console';

const CHAT_COMMANDS = ['/help', '/tools', '/model', '/clear', '/multiline', '/send', '/cancel', '/sessions', '/messages', '/session', '/new', '/approvals', '/approve', '/deny', '/copy', '/quit', '/exit'];

export interface SelectMenuOption {
    label: string;
    value: string;
    description?: string;
    detail?: string;
}

export interface SelectMenuMouseEvent {
    button: number;
    x: number;
    y: number;
    release: boolean;
}

export interface TerminalToolRunItem {
    name: string;
    status: 'running' | 'success' | 'error';
    durationMs?: number;
    message: string;
    updatedAt?: number;
}

export interface TerminalActivityItem {
    kind: 'turn' | 'tool' | 'model' | 'error';
    message: string;
    createdAt?: number;
}

export interface MentionContextOptions {
    workspace: string;
    sessionId: string;
    provider: string;
    model: string;
    tools?: Array<{ name: string; toolset?: string; active?: boolean }>;
}

export interface SuggestionItem {
    group: 'Commands' | 'Mentions' | 'Hints';
    label: string;
    value: string;
}

export interface SuggestionState {
    items: SuggestionItem[];
    selectedIndex: number;
}

export interface TerminalDraftState {
    value: string;
    cursor: number;
}

export interface TerminalChatScreenOptions {
    appTitle?: string;
    headerLine: string;
    subHeaderLine: string;
    conversationLines: string[];
    promptQuestion?: string;
    notice?: string;
    latestActivity?: string;
    latestToolRun?: string;
    focusedTool?: string;
    toolsSummary?: string;
    workingTitle?: string;
    workingLines: string[];
    inputLines: string[];
    selectLines: string[];
    statusTitle?: string;
    statusLines: string[];
}

export interface TerminalChatScreenLayout {
    lines: string[];
    contextLines: string[];
    selectMenuScreenRow: number;
}

export interface TerminalMenuStateLike {
    title?: string | null;
}

export interface TerminalHeaderOptions {
    provider: string;
    model: string;
    status: string;
    tasksCount: number;
    runningToolsLabel: string;
    width: number;
}

export interface TerminalSubHeaderOptions {
    sessionId: string;
    workspace: string;
    width: number;
}

export interface TerminalConversationOptions {
    renderedLines?: string[];
    messages?: Array<{ role?: string; content: string }>;
    width: number;
    maxLines: number;
}

export interface TerminalKeyPress {
    name?: string;
    ctrl?: boolean;
    meta?: boolean;
}

export interface TerminalMenuController {
    getMenu(): { title?: string; options: SelectMenuOption[]; selectedIndex: number } | undefined;
    move(delta: number): void;
    confirm(): void;
    confirmIndex(index: number): void;
    cancel(): void;
}

export interface TerminalUiControllerOptions {
    getCommands: () => string[];
    getMentionCandidates: () => string[];
    render: () => void;
    setDraftDisplay: (displayDraft: string) => void;
    submit: (value: string) => Promise<void> | void;
    isClosed: () => boolean;
    isInputLocked: () => boolean;
    isModalPromptActive: () => boolean;
    isSelecting: () => boolean;
    menu?: TerminalMenuController;
}

export function getChatCommands(): string[] {
    return CHAT_COMMANDS.slice();
}

export class TerminalUiController {
    protected currentDraft = '';
    protected draftCursor = 0;
    protected suggestionState: SuggestionState = { items: [], selectedIndex: -1 };
    protected historyEntries: string[] = [];
    protected historyIndex = -1;
    protected historyDraft = '';
    protected activeTextPrompt: { question: string; resolve: (value: string) => void } | null = null;

    constructor(protected options: TerminalUiControllerOptions) {
    }

    get draft(): string {
        return this.currentDraft;
    }

    get cursor(): number {
        return this.draftCursor;
    }

    get suggestions(): SuggestionState {
        return this.suggestionState;
    }

    get promptQuestion(): string {
        return this.activeTextPrompt?.question || '';
    }

    setHistoryEntries(entries: string[]): void {
        this.historyEntries = entries.slice();
        this.historyIndex = -1;
        this.historyDraft = '';
    }

    getHistoryEntries(): string[] {
        return this.historyEntries.slice();
    }

    beginTextPrompt(question: string, resolve: (value: string) => void): void {
        this.activeTextPrompt = { question, resolve };
        this.historyIndex = -1;
        this.historyDraft = '';
        this.suggestionState = { items: [], selectedIndex: -1 };
        this.updateDraft('', 0);
    }

    clearTextPrompt(): void {
        this.activeTextPrompt = null;
        this.updateDraft('', 0);
    }

    updateDraft(nextDraft: string, cursor = nextDraft.length): void {
        this.currentDraft = nextDraft;
        this.draftCursor = Math.max(0, Math.min(cursor, this.currentDraft.length));
        this.options.setDraftDisplay(formatDisplayDraft(this.currentDraft, this.draftCursor));
        const nextItems = resolveInputSuggestions(
            this.currentDraft,
            this.options.getCommands(),
            this.options.getMentionCandidates()
        );
        this.suggestionState = normalizeSuggestionState(nextItems, this.suggestionState.selectedIndex >= 0 ? this.suggestionState.selectedIndex : 0);
    }

    applyChunk(chunk: Buffer | string): void {
        const next = applyTerminalInputChunk(this.currentDraft, this.draftCursor, chunk);
        this.updateDraft(next.value, next.cursor);
    }

    hasInteractiveSuggestions(): boolean {
        const token = getActiveInputToken(this.currentDraft);
        return !!token && (token.startsWith('/') || token.startsWith('@')) && this.suggestionState.items.length > 0;
    }

    applySuggestionValue(value?: string): void {
        if (!value) {
            return;
        }
        const nextInput = applySuggestionToInput(this.currentDraft, value);
        this.suggestionState = { items: [], selectedIndex: -1 };
        this.updateDraft(nextInput, nextInput.length);
        this.options.render();
    }

    pushHistoryEntry(value: string): void {
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        this.historyEntries = [trimmed, ...this.historyEntries.filter(item => item !== trimmed)].slice(0, 200);
        this.historyIndex = -1;
        this.historyDraft = '';
    }

    navigateHistory(delta: number): void {
        if (!this.historyEntries.length) {
            return;
        }
        if (delta < 0) {
            if (this.historyIndex === -1) {
                this.historyDraft = this.currentDraft;
                this.historyIndex = 0;
            } else if (this.historyIndex < this.historyEntries.length - 1) {
                this.historyIndex += 1;
            }
        } else {
            if (this.historyIndex === -1) {
                return;
            }
            if (this.historyIndex === 0) {
                this.historyIndex = -1;
                this.updateDraft(this.historyDraft, this.historyDraft.length);
                this.options.render();
                return;
            }
            this.historyIndex -= 1;
        }
        const next = this.historyEntries[this.historyIndex] || '';
        this.updateDraft(next, next.length);
        this.options.render();
    }

    resolveTextPrompt(): boolean {
        const prompt = this.activeTextPrompt;
        if (!prompt) {
            return false;
        }
        this.activeTextPrompt = null;
        prompt.resolve(this.currentDraft);
        this.options.render();
        return true;
    }

    async submitCurrentDraft(): Promise<void> {
        const line = this.currentDraft;
        this.historyIndex = -1;
        this.historyDraft = '';
        this.suggestionState = { items: [], selectedIndex: -1 };
        this.updateDraft('', 0);
        await this.options.submit(line);
    }

    scheduleRender(): void {
        if (this.options.isClosed() || this.options.isSelecting() || this.options.isInputLocked()) {
            return;
        }
        Promise.resolve().then(() => {
            if (this.options.isClosed() || this.options.isSelecting() || this.options.isInputLocked()) {
                return;
            }
            this.options.render();
        });
    }

    async handleKeypress(str: string, key: TerminalKeyPress): Promise<boolean> {
        if (this.options.isClosed()) {
            return true;
        }
        const menu = this.options.menu?.getMenu();
        if (menu && !isSuggestionMenu(menu)) {
            if (key?.name === 'down') {
                this.options.menu?.move(1);
                this.options.render();
                return true;
            }
            if (key?.name === 'up') {
                this.options.menu?.move(-1);
                this.options.render();
                return true;
            }
            if (key?.name === 'return') {
                this.options.menu?.confirm();
                return true;
            }
            if (key?.name === 'escape' || key?.name === 'q') {
                this.options.menu?.cancel();
                return true;
            }
            if (str && /^[1-9]$/.test(str)) {
                const index = parseInt(str, 10) - 1;
                if (index >= 0 && index < menu.options.length) {
                    this.options.menu?.confirmIndex(index);
                }
                return true;
            }
            return true;
        }
        if (this.activeTextPrompt && key?.name === 'return') {
            this.resolveTextPrompt();
            return true;
        }
        if (!this.options.isModalPromptActive() && !this.options.isInputLocked() && !this.hasInteractiveSuggestions() && key?.name === 'up') {
            this.navigateHistory(-1);
            return true;
        }
        if (!this.options.isModalPromptActive() && !this.options.isInputLocked() && !this.hasInteractiveSuggestions() && key?.name === 'down') {
            this.navigateHistory(1);
            return true;
        }
        if (this.options.isModalPromptActive() || this.options.isInputLocked() || !this.hasInteractiveSuggestions()) {
            if (!this.options.isModalPromptActive() && !this.options.isInputLocked() && key?.name === 'return') {
                await this.submitCurrentDraft();
                return true;
            }
            const isEditableKey = key?.name === 'backspace'
                || key?.name === 'delete'
                || key?.name === 'left'
                || key?.name === 'right'
                || key?.name === 'home'
                || key?.name === 'end'
                || (!!str && !key?.ctrl && !key?.meta && key?.name !== 'return' && key?.name !== 'tab');
            if (isEditableKey) {
                this.scheduleRender();
                return true;
            }
            return false;
        }
        if (key?.name === 'down') {
            this.suggestionState = moveSuggestionSelection(this.suggestionState, 1);
            this.options.render();
            return true;
        }
        if (key?.name === 'up') {
            this.suggestionState = moveSuggestionSelection(this.suggestionState, -1);
            this.options.render();
            return true;
        }
        if (key?.name === 'return' && shouldAcceptSuggestionOnEnter(this.currentDraft, this.suggestionState)) {
            const selected = this.suggestionState.items[this.suggestionState.selectedIndex];
            this.applySuggestionValue(selected?.value);
            return true;
        }
        if (key?.name === 'return') {
            await this.submitCurrentDraft();
            return true;
        }
        if (key?.name === 'tab' && this.suggestionState.selectedIndex >= 0) {
            const selected = this.suggestionState.items[this.suggestionState.selectedIndex];
            this.applySuggestionValue(selected?.value);
            return true;
        }
        const isEditableKey = key?.name === 'backspace'
            || key?.name === 'delete'
            || key?.name === 'left'
            || key?.name === 'right'
            || key?.name === 'home'
            || key?.name === 'end'
            || (!!str && !key?.ctrl && !key?.meta && key?.name !== 'return' && key?.name !== 'tab');
        if (isEditableKey) {
            this.scheduleRender();
            return true;
        }
        return false;
    }
}

export function formatDisplayDraft(value: string, cursor: number): string {
    void cursor;
    return value;
}

export function isSuggestionMenu(menu?: TerminalMenuStateLike | null): boolean {
    return menu?.title === 'Suggestions';
}

export function buildSuggestionMenuOptions(state: SuggestionState): SelectMenuOption[] {
    return state.items.map(item => ({
        label: item.label,
        value: item.value
    }));
}

export function renderSelectMenu(title: string, options: SelectMenuOption[], selectedIndex: number, hint = '1-9 select   up/down move   enter confirm   q cancel'): string[] {
    return [
        ...String(title || '').split('\n'),
        '',
        ...options.map((option, index) => {
            const suffix = option.description ? `  ${option.description}` : '';
            return `${formatConsoleIndexedOptionLabel(index, option.label, index === selectedIndex)}${suffix}`;
        }),
        '',
        hint
    ];
}

export function resolveSelectMenuOptionIndexFromRow(row: number, title: string, optionCount: number, startRow = 1): number {
    const titleLines = Math.max(1, String(title || '').split('\n').length);
    const firstOptionRow = startRow + titleLines + 2;
    const index = row - firstOptionRow;
    if (index < 0 || index >= optionCount) {
        return -1;
    }
    return index;
}

export function findSelectMenuOptionIndexFromRenderedLines(
    renderedLines: string[],
    title: string,
    optionCount: number,
    row: number
): number {
    if (!renderedLines.length || optionCount <= 0 || row < 1 || row > renderedLines.length) {
        return -1;
    }
    const normalized = renderedLines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
    const titleLines = String(title || '').split('\n').filter(line => line.length > 0);
    const firstTitle = titleLines[0] || '';
    const titleStart = firstTitle ? normalized.findIndex(line => line.includes(firstTitle)) : -1;
    if (titleStart < 0) {
        return -1;
    }
    const optionPattern = /(?:^|\s|\u2502)[›>]?\s*\d+\.\s/;
    const optionRows: number[] = [];
    for (let index = titleStart + Math.max(1, titleLines.length); index < normalized.length; index++) {
        if (optionPattern.test(normalized[index])) {
            optionRows.push(index + 1);
        }
    }
    if (!optionRows.length) {
        return -1;
    }
    const index = optionRows.indexOf(row);
    if (index < 0 || index >= optionCount) {
        return -1;
    }
    return index;
}

export function parseTerminalMouseEvent(input: Buffer | string): SelectMenuMouseEvent | undefined {
    const text = Buffer.isBuffer(input) ? input.toString('utf8') : input;
    const match = text.match(/\x1b\[<(\d+);(\d+);(\d+)([mM])/);
    if (!match) {
        return undefined;
    }
    return {
        button: parseInt(match[1], 10),
        x: parseInt(match[2], 10),
        y: parseInt(match[3], 10),
        release: match[4] === 'm'
    };
}

export function formatClockTime(value?: number): string {
    if (!value || !Number.isFinite(value)) {
        return '--:--:--';
    }
    const date = new Date(value);
    const parts = [date.getHours(), date.getMinutes(), date.getSeconds()]
        .map(part => String(part).padStart(2, '0'));
    return parts.join(':');
}

export function renderToolRunLine(run: TerminalToolRunItem): string {
    const icon = run.status === 'running'
        ? '[run]'
        : run.status === 'success'
            ? '[ok ]'
            : '[err]';
    const duration = run.durationMs != null ? ` ${run.durationMs}ms` : '';
    return `${formatClockTime(run.updatedAt)} ${icon} ${run.name}${duration} ${run.message}`.trim();
}

export function renderActivityLine(activity: TerminalActivityItem): string {
    return `${formatClockTime(activity.createdAt)} [${activity.kind}] ${activity.message}`;
}

export function sortToolRuns(runs: TerminalToolRunItem[]): TerminalToolRunItem[] {
    const rank = (status: TerminalToolRunItem['status']) => {
        switch (status) {
            case 'running':
                return 0;
            case 'error':
                return 1;
            case 'success':
            default:
                return 2;
        }
    };
    return runs.slice().sort((left, right) => {
        const statusDiff = rank(left.status) - rank(right.status);
        if (statusDiff !== 0) {
            return statusDiff;
        }
        return (right.updatedAt || 0) - (left.updatedAt || 0);
    });
}

export function getActiveInputToken(input: string): string {
    const match = input.match(/(^|\s)([\/@][^\s]*)$/);
    return match?.[2] || '';
}

export function buildMentionCandidates(toolNames: string[] = []): string[] {
    const mentions = ['@workspace', '@model', '@tools', '@session'];
    toolNames.forEach(name => mentions.push(`@${name}`));
    return Array.from(new Set(mentions));
}

export function resolveInputSuggestions(input: string, commands: string[] = CHAT_COMMANDS, mentions: string[] = []): SuggestionItem[] {
    const token = getActiveInputToken(input);
    if (!token) {
        return [
            { group: 'Hints', label: 'Type / for commands', value: 'Type / for commands' },
            { group: 'Hints', label: 'Type @ for mentions', value: 'Type @ for mentions' }
        ];
    }
    if (token.startsWith('/')) {
        const matches = commands.filter(item => item.startsWith(token));
        return (matches.length ? matches : commands).map(item => ({
            group: 'Commands' as const,
            label: item,
            value: item
        }));
    }
    if (token.startsWith('@')) {
        const matches = mentions.filter(item => item.startsWith(token));
        return (matches.length ? matches : mentions).map(item => ({
            group: 'Mentions' as const,
            label: item,
            value: item
        }));
    }
    return [];
}

export function extractMentions(input: string): string[] {
    const matches = input.match(/(^|\s)@([a-zA-Z0-9_.-]+)/g) || [];
    return Array.from(new Set(matches.map(item => item.trim())));
}

export function buildMentionContextLines(mentions: string[], options: MentionContextOptions): string[] {
    const lines: string[] = [];
    const toolMap = new Map((options.tools || []).map(tool => [tool.name, tool]));
    mentions.forEach(mention => {
        const name = mention.slice(1);
        switch (name) {
            case 'workspace':
                lines.push(`Workspace: ${options.workspace}`);
                break;
            case 'session':
                lines.push(`Session: ${options.sessionId}`);
                break;
            case 'model':
                lines.push(`Model: ${options.provider} / ${options.model}`);
                break;
            case 'tools':
                lines.push(`Tools: ${(options.tools || []).map(tool => tool.name).join(', ') || '(none)'}`);
                break;
            default: {
                const tool = toolMap.get(name);
                if (tool) {
                    lines.push(`Tool ${tool.name}: toolset=${tool.toolset || 'default'}, active=${tool.active === false ? 'no' : 'yes'}`);
                }
                break;
            }
        }
    });
    return lines;
}

export function enrichPromptWithMentions(input: string, options: MentionContextOptions): string {
    const mentions = extractMentions(input);
    if (!mentions.length) {
        return input;
    }
    const contextLines = buildMentionContextLines(mentions, options);
    if (!contextLines.length) {
        return input;
    }
    return [
        '[Mention Context]',
        ...contextLines,
        '',
        input
    ].join('\n');
}

export function normalizeSuggestionState(items: SuggestionItem[], selectedIndex = 0): SuggestionState {
    if (!items.length) {
        return { items: [], selectedIndex: -1 };
    }
    const nextIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
    return { items, selectedIndex: nextIndex };
}

export function moveSuggestionSelection(state: SuggestionState, delta: number): SuggestionState {
    if (!state.items.length) {
        return { items: [], selectedIndex: -1 };
    }
    const next = (state.selectedIndex + delta + state.items.length) % state.items.length;
    return { items: state.items, selectedIndex: next };
}

export function applySuggestionToInput(input: string, suggestion: string): string {
    const token = getActiveInputToken(input);
    if (!token) {
        return input;
    }
    return `${input.slice(0, input.length - token.length)}${suggestion} `;
}

export function shouldAcceptSuggestionOnEnter(input: string, state: SuggestionState): boolean {
    if (state.selectedIndex < 0 || state.selectedIndex >= state.items.length) {
        return false;
    }
    const token = getActiveInputToken(input);
    if (!token) {
        return false;
    }
    if (token.startsWith('/')) {
        return false;
    }
    const suggestion = state.items[state.selectedIndex]?.value;
    return !!suggestion && suggestion !== token && suggestion.startsWith(token);
}

export function resolveUniqueCommandPrefix(input: string, commands: string[] = CHAT_COMMANDS): string {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
        return trimmed;
    }
    const matches = commands.filter(item => item.startsWith(trimmed));
    return matches.length === 1 ? matches[0] : trimmed;
}

export function renderDraftLine(line: string): string {
    return line.replace(/(^|\s)(@[\w.-]+)/g, (_match, prefix, mention) => `${prefix}[${mention}]`);
}

export function applyTerminalInputChunk(value: string, cursor: number, chunk: Buffer | string): TerminalDraftState {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
    if (!text || parseTerminalMouseEvent(text)) {
        return { value, cursor };
    }
    return applyConsoleTextInputChunk(value, cursor, text);
}

export function buildTerminalHeaderLine(options: TerminalHeaderOptions): string {
    return fitLine(
        `${options.provider} / ${options.model}  |  ${options.status}  |  ${options.tasksCount} tasks  |  ${options.runningToolsLabel}`,
        options.width
    );
}

export function buildTerminalSubHeaderLine(options: TerminalSubHeaderOptions): string {
    return fitLine(
        `session ${options.sessionId}  |  ${options.workspace}`,
        options.width
    );
}

export function buildConversationLines(options: TerminalConversationOptions): string[] {
    const renderedLines = options.renderedLines || [];
    if (renderedLines.length) {
        return renderedLines
            .flatMap((line: string) => [line, ''])
            .slice(-options.maxLines);
    }
    const messages = options.messages || [];
    return messages
        .slice(-8)
        .flatMap((message: any) => renderConversationMessage(message.role, message.content, options.width))
        .slice(-options.maxLines);
}

export function renderMessagePreview(role: string, content: string, width = 160): string[] {
    const normalized = String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trimEnd());
    if (!normalized.length) {
        return [`${role}> `];
    }
    const lines: string[] = [];
    normalized.forEach((line, index) => {
        const prefix = index === 0 ? `${role}> ` : '... ';
        const value = line || '';
        if (!value) {
            lines.push(prefix);
            return;
        }
        let rest = value;
        const chunkWidth = Math.max(24, width - prefix.length);
        while (rest.length > chunkWidth) {
            lines.push(`${prefix}${rest.slice(0, chunkWidth)}`);
            rest = rest.slice(chunkWidth);
        }
        lines.push(`${prefix}${rest}`);
    });
    return lines;
}

export function renderConversationMessage(role: string, content: string, width = 160): string[] {
    const normalized = String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trimEnd());
    const label = role === 'user'
        ? 'you'
        : role === 'assistant'
            ? 'agent'
            : (role || 'system').toLowerCase();
    const firstPrefix = `${label}> `;
    const nextPrefix = '... ';
    if (!normalized.length) {
        return [firstPrefix];
    }
    const lines: string[] = [];
    normalized.forEach((line, index) => {
        const prefix = index === 0 ? firstPrefix : nextPrefix;
        const value = line || '';
        if (!value) {
            lines.push(prefix);
            return;
        }
        let rest = value;
        const chunkWidth = Math.max(24, width - prefix.length);
        while (rest.length > chunkWidth) {
            lines.push(`${prefix}${rest.slice(0, chunkWidth)}`);
            rest = rest.slice(chunkWidth);
        }
        lines.push(`${prefix}${rest}`);
    });
    return [...lines, ''];
}

export function renderToolDetail(run?: TerminalToolRunItem & Record<string, any>): string[] {
    if (!run) {
        return ['(none)'];
    }
    const lines = [
        `Name: ${run.name}`,
        `Status: ${run.status}`,
        `Updated: ${formatClockTime(run.updatedAt)}`
    ];
    if (run.executionMode) {
        lines.push(`Mode: ${run.executionMode}`);
    }
    if (run.attemptCount != null) {
        lines.push(`Attempts: ${run.attemptCount}`);
    }
    if (run.durationMs != null) {
        lines.push(`Duration: ${run.durationMs}ms`);
    }
    if (run.toolCallId) {
        lines.push(`Tool Call: ${run.toolCallId}`);
    }
    if (run.inputSummary) {
        lines.push(`Input: ${run.inputSummary}`);
    }
    if (run.outputSummary) {
        lines.push(`Output: ${run.outputSummary}`);
    }
    if (run.error) {
        lines.push(`Error: ${run.error}`);
    }
    if (run.message && run.message !== 'Running') {
        lines.push(`Note: ${run.message}`);
    }
    return lines;
}

export function fitLine(line: string, width: number): string {
    if (line.length <= width) {
        return line;
    }
    if (width <= 3) {
        return line.slice(0, width);
    }
    return `${line.slice(0, width - 3)}...`;
}

export function formatSection(title: string, lines: string[], width: number, maxLines: number): string[] {
    const innerWidth = Math.max(24, width);
    const visible = (lines.length ? lines : ['(empty)']).slice(-maxLines);
    const header = `[ ${title} ]`;
    return [
        fitLine(header, innerWidth),
        ...visible.map(line => `  ${fitLine(line, Math.max(16, innerWidth - 2))}`)
    ];
}

export function renderPanel(title: string, lines: string[], width: number, height: number): string[] {
    const panelWidth = Math.max(24, width);
    const bodyHeight = Math.max(1, height - 1);
    const visible = (lines.length ? lines : ['']).slice(-bodyHeight);
    const header = fitLine(`${title}`, panelWidth);
    const body = visible.map(line => `  ${fitLine(line, Math.max(16, panelWidth - 2))}`);
    while (body.length < bodyHeight) {
        body.push('');
    }
    return [header, ...body];
}

function trimEdgeBlanks(lines: string[]): string[] {
    const next = lines.slice();
    while (next.length && !String(next[0] || '').trim()) {
        next.shift();
    }
    while (next.length && !String(next[next.length - 1] || '').trim()) {
        next.pop();
    }
    return next;
}

export function composeTerminalChatScreen(options: TerminalChatScreenOptions): TerminalChatScreenLayout {
    const lines: string[] = [
        options.appTitle || 'tsdi-agent',
        options.headerLine,
        options.subHeaderLine
    ];
    const conversationLines = trimEdgeBlanks(options.conversationLines || []);
    const contextLines = trimEdgeBlanks([
        ...(options.promptQuestion ? [
            `prompt  ${options.promptQuestion}`,
            'prompt  Enter confirm   /quit exit'
        ] : []),
        ...(options.notice ? [`notice  ${options.notice}`] : []),
        ...(options.latestActivity ? [`activity  ${options.latestActivity}`] : []),
        ...(options.latestToolRun ? [`tool  ${options.latestToolRun}`] : []),
        ...(options.focusedTool ? [`focus  ${options.focusedTool}`] : []),
        ...(options.toolsSummary ? [`tools  ${options.toolsSummary}`] : [])
    ]);

    if (conversationLines.length) {
        lines.push('', ...conversationLines);
    }
    if (contextLines.length) {
        lines.push('', ...contextLines);
    }
    if ((options.workingLines || []).length) {
        lines.push('', ...trimEdgeBlanks(options.workingLines || []));
    }
    if ((options.inputLines || []).length) {
        lines.push('', ...trimEdgeBlanks(options.inputLines || []));
    }

    let selectMenuScreenRow = -1;
    if ((options.selectLines || []).length) {
        selectMenuScreenRow = lines.length + 2;
        lines.push('', ...trimEdgeBlanks(options.selectLines || []));
    }

    if ((options.statusLines || []).length) {
        lines.push('', ...trimEdgeBlanks(options.statusLines || []));
    }

    return {
        lines,
        contextLines,
        selectMenuScreenRow
    };
}
