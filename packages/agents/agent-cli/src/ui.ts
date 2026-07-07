const CHAT_COMMANDS = ['/help', '/tools', '/model', '/clear', '/multiline', '/send', '/cancel', '/quit', '/exit'];

export interface SelectMenuOption {
    label: string;
    value: string;
    description?: string;
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

export function getChatCommands(): string[] {
    return CHAT_COMMANDS.slice();
}

export function renderSelectMenu(title: string, options: SelectMenuOption[], selectedIndex: number, hint = '1-9 select   up/down move   enter confirm   q cancel'): string[] {
    return [
        ...String(title || '').split('\n'),
        '',
        ...options.map((option, index) => {
            const marker = index === selectedIndex ? '›' : ' ';
            const number = `${index + 1}.`;
            const suffix = option.description ? `  ${option.description}` : '';
            return `${marker} ${number} ${option.label}${suffix}`;
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
