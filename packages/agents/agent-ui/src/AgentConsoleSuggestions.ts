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
    /** Translator hook for command descriptions (`agent.command.desc.*`). */
    describe?: (key: string, fallback: string) => string;
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
    // Quoted mentions keep spaces inside the token: `@"my file.txt"`.
    const quoted = prefix.match(/(?:^|\s)(@"[^"]*"?)$/);
    if (quoted) {
        const token = quoted[1];
        return { start: safeCursor - token.length, end: safeCursor, token };
    }
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
                resolveAgentConsoleCommandDescription(item, labels.groupLabels, labels.describe),
                formatAgentConsoleCommandArgumentTemplate(getAgentConsoleCommandDefinition(item))
            ].filter(Boolean).join(' ')
        }));
    }
    if (active.token.startsWith('@')) {
        const quoted = active.token.startsWith('@"');
        const query = quoted ? active.token.slice(2).replace(/"$/, '') : active.token.slice(1);
        const matchesQuery = (value: string) => !query
            || String(value || '').slice(1).toLowerCase().startsWith(query.toLowerCase());
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
        const pseudo = mentions.filter(item => AGENT_CONSOLE_PSEUDO_MENTIONS.includes(item.value) && matchesQuery(item.value));
        const allToolMentions = mentions.filter(item => !AGENT_CONSOLE_PSEUDO_MENTIONS.includes(item.value));
        // Bare `@` lists contexts (pseudo + workspace); the ~64 tool mentions
        // only appear once the query is specific enough to be intentional.
        const toolMentions = query.length >= 2 ? allToolMentions.filter(item => matchesQuery(item.value)) : [];
        // Files/directories first: `@tim` + Enter must insert the file, not
        // submit the `@time` tool mention.
        const options = [...pseudo, ...workspace, ...toolMentions];
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

/**
 * Mention values with spaces must be quoted, otherwise the prompt parser reads
 * only the first word (`@with space.txt` resolved to `@with`).
 */
export function formatAgentConsoleSuggestionValue(suggestion: string): string {
    const raw = String(suggestion || '');
    if (!raw.startsWith('@') || raw.startsWith('@"')) {
        return raw;
    }
    if (!/\s/.test(raw.slice(1))) {
        return raw;
    }
    // A spaced directory keeps the quote open so the next segment continues the
    // same token (`@"my dir/src`); a file closes it.
    return raw.endsWith('/') ? `@"${raw.slice(1)}` : `@"${raw.slice(1)}"`;
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
    const formatted = formatAgentConsoleSuggestionValue(suggestion);
    // Directories keep the menu open so the next path segment can be typed:
    // appending a space used to break `@dir/` into `@dir/ src`.
    const suffix = String(suggestion || '').endsWith('/') ? '' : ' ';
    const nextValue = `${text.slice(0, active.start)}${formatted}${suffix}${text.slice(active.end)}`;
    return {
        value: nextValue,
        cursor: active.start + formatted.length + suffix.length
    };
}

/** Mention names (without `@`) from a prompt; supports quoted paths. */
export function parseAgentConsoleMentionNames(text: string): string[] {
    const names: string[] = [];
    const pattern = /(^|\s)@(?:"([^"]*)"|([^\s@"]+))/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(String(text || '')))) {
        const name = String(match[2] ?? match[3] ?? '').trim();
        if (name) {
            names.push(name);
        }
    }
    return Array.from(new Set(names));
}
