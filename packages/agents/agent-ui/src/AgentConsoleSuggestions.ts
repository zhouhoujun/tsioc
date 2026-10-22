import { AgentConsoleSelectOption, AgentConsoleToolItem } from './AgentConsoleSessionState';
import { fuzzyMatchAgentConsoleCommand } from './AgentConsoleKeymap';
import {
    formatAgentConsoleCommandArgumentTemplate,
    getAgentConsoleCommandDefinition,
    resolveAgentConsoleCommandDescription
} from './AgentConsoleCommandRegistry';
import { AGENT_CONSOLE_OVERLAY_HINTS, AGENT_CONSOLE_OVERLAY_TITLES } from './AgentConsoleOverlayPresenter';

export const AGENT_CONSOLE_SUGGESTIONS_TITLE = AGENT_CONSOLE_OVERLAY_TITLES.suggestions;
export const AGENT_CONSOLE_SUGGESTIONS_HINT = AGENT_CONSOLE_OVERLAY_HINTS.suggestions;

export interface AgentConsoleSuggestionLabels {
    /** Localized command-group names (`core` → `核心` / `core`). */
    groupLabels?: Partial<Record<string, string>>;
    /** Localized workspace mention kinds (`folder` → `文件夹`). */
    mentionKinds?: Record<string, string>;
}

/** Inline command matches: exact > prefix > substring, fuzzy only as a fallback. */
export function rankAgentConsoleCommandMatches(commands: string[], token: string): string[] {
    const needle = String(token || '').toLowerCase();
    if (!needle) {
        return [...commands];
    }
    const bare = needle.replace(/^\//, '');
    const exact = commands.filter(item => item.toLowerCase() === needle);
    const prefix = commands.filter(item => item.toLowerCase() !== needle && item.toLowerCase().startsWith(needle));
    const substring = commands.filter(item => {
        const lower = item.toLowerCase();
        return lower !== needle && !lower.startsWith(needle) && lower.replace(/^\//, '').includes(bare);
    });
    const strong = [...exact, ...prefix, ...substring];
    // Subsequence matching only when nothing real matches, so `/se` no longer
    // surfaces `/resume` or `/side`.
    return strong.length ? strong : commands.filter(item => fuzzyMatchAgentConsoleCommand(item, needle));
}

export interface AgentConsoleInputTokenRange {
    start: number;
    end: number;
    token: string;
}

export function isAgentConsoleSuggestionMenu(menu?: { title?: string | null } | null): boolean {
    return menu?.title === AGENT_CONSOLE_SUGGESTIONS_TITLE;
}

export const AGENT_CONSOLE_PSEUDO_MENTIONS = ['@workspace', '@model', '@tools', '@session'];

export function getAgentConsoleMentionCandidates(tools: AgentConsoleToolItem[] = []): string[] {
    const mentions = [...AGENT_CONSOLE_PSEUDO_MENTIONS];
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
    // Slash commands are line-start commands. A `/`-word elsewhere (e.g. a path
    // in `check /tmp/foo`) must not open the command palette — otherwise the
    // menu hijacks Enter (it confirms a command instead of sending the message).
    if (token.startsWith('/') && start !== 0) {
        return undefined;
    }
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
    workspaceSuggestions: AgentConsoleSelectOption[] = [],
    labels: AgentConsoleSuggestionLabels = {}
): AgentConsoleSelectOption[] {
    const active = getAgentConsoleInputTokenRange(input, cursor);
    if (!active?.token) {
        return [];
    }
    if (active.token.startsWith('/')) {
        const matches = rankAgentConsoleCommandMatches(commands, active.token);
        // An exact command name must win over a longer name that it is a prefix
        // of (e.g. typing `/compact` must not surface `/compactions` first):
        // Enter confirms the highlighted option, so the exact match goes first.
        const ordered = matches.includes(active.token)
            ? [active.token, ...matches.filter(item => item !== active.token)]
            : matches;
        // No matches must not fall back to the full command list: Enter would
        // execute the first unrelated command instead of reporting a typo.
        const options = ordered.filter(Boolean);
        return options.map(item => ({
            label: item,
            value: item,
            description: [
                resolveAgentConsoleCommandDescription(item, labels.groupLabels),
                formatAgentConsoleCommandArgumentTemplate(getAgentConsoleCommandDefinition(item))
            ].filter(Boolean).join(' ')
        }));
    }
    if (active.token.startsWith('@')) {
        const mentions = getAgentConsoleMentionCandidates(tools).map(item => ({
            label: item,
            value: item
        }));
        const localizeKind = (option: AgentConsoleSelectOption): AgentConsoleSelectOption => {
            const kind = String(option.description || '').trim();
            const localized = kind ? labels.mentionKinds?.[kind] : undefined;
            return localized ? { ...option, description: localized } : option;
        };
        const workspace = workspaceSuggestions.map(localizeKind);
        const pseudo = mentions.filter(item => AGENT_CONSOLE_PSEUDO_MENTIONS.includes(item.value));
        const allToolMentions = mentions.filter(item => !AGENT_CONSOLE_PSEUDO_MENTIONS.includes(item.value));
        // Bare `@` lists contexts (pseudo + workspace); the ~64 tool mentions
        // only appear once the query is specific enough to be intentional.
        const toolMentions = active.token.length >= 3 ? allToolMentions : [];
        // Files/directories first: `@tim` + Enter must insert the file, not
        // submit the `@time` tool mention.
        const options = active.token === '@'
            ? [...pseudo, ...workspace, ...toolMentions]
            : [
                ...pseudo.filter(item => item.value.startsWith(active.token)),
                ...workspace,
                ...toolMentions.filter(item => item.value.startsWith(active.token))
            ];
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
