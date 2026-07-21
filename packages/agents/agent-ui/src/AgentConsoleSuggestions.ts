import { AgentConsoleSelectOption, AgentConsoleToolItem } from './AgentConsoleSessionState';

export const AGENT_CONSOLE_SUGGESTIONS_TITLE = 'Suggestions';
export const AGENT_CONSOLE_SUGGESTIONS_HINT = 'tab/enter accept   up/down move';

export interface AgentConsoleInputTokenRange {
    start: number;
    end: number;
    token: string;
}

export function isAgentConsoleSuggestionMenu(menu?: { title?: string | null } | null): boolean {
    return menu?.title === AGENT_CONSOLE_SUGGESTIONS_TITLE;
}

export function getAgentConsoleMentionCandidates(tools: AgentConsoleToolItem[] = []): string[] {
    const mentions = ['@workspace', '@model', '@tools', '@session'];
    tools.forEach(tool => mentions.push(`@${tool.name}`));
    return Array.from(new Set(mentions));
}

export function getAgentConsoleInputTokenRange(input: string, cursor = input.length): AgentConsoleInputTokenRange | undefined {
    const text = String(input || '');
    const safeCursor = Math.max(0, Math.min(text.length, cursor));
    const prefix = text.slice(0, safeCursor);
    const match = prefix.match(/(?:^|\s)([@/][^\s]*)$/);
    if (!match) {
        return undefined;
    }
    const token = match[1] || '';
    const start = safeCursor - token.length;
    return {
        start,
        end: safeCursor,
        token
    };
}

export function resolveAgentConsoleInputSuggestions(
    input: string,
    cursor: number,
    commands: string[] = [],
    tools: AgentConsoleToolItem[] = [],
    workspaceSuggestions: AgentConsoleSelectOption[] = []
): AgentConsoleSelectOption[] {
    const active = getAgentConsoleInputTokenRange(input, cursor);
    if (!active?.token) {
        return [];
    }
    if (active.token.startsWith('/')) {
        const matches = commands.filter(item => item.startsWith(active.token));
        const options = (matches.length ? matches : commands).filter(Boolean);
        return options.map(item => ({
            label: item,
            value: item
        }));
    }
    if (active.token.startsWith('@')) {
        const mentions = getAgentConsoleMentionCandidates(tools).map(item => ({
            label: item,
            value: item
        }));
        const mentionMatches = mentions.filter(item => item.value.startsWith(active.token));
        const options = active.token === '@'
            ? [...mentions, ...workspaceSuggestions]
            : [...mentionMatches, ...workspaceSuggestions];
        const deduped: AgentConsoleSelectOption[] = [];
        const seen = new Set<string>();
        options.forEach(option => {
            if (!option?.value || seen.has(option.value)) {
                return;
            }
            seen.add(option.value);
            deduped.push(option);
        });
        return deduped;
    }
    return [];
}

export function applyAgentConsoleSuggestion(
    input: string,
    cursor: number,
    suggestion: string
): { value: string; cursor: number } {
    const text = String(input || '');
    const active = getAgentConsoleInputTokenRange(text, cursor);
    if (!active) {
        return {
            value: text,
            cursor
        };
    }
    const nextValue = `${text.slice(0, active.start)}${suggestion} ${text.slice(active.end)}`;
    const nextCursor = active.start + suggestion.length + 1;
    return {
        value: nextValue,
        cursor: nextCursor
    };
}
