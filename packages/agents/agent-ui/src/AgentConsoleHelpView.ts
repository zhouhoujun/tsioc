import {
    AGENT_CONSOLE_COMMAND_DEFINITIONS,
    AGENT_CONSOLE_COMMAND_GROUP_ORDER,
    AgentConsoleCommandDefinition,
    formatAgentConsoleCommandArgumentTemplate
} from './AgentConsoleCommandRegistry';

export interface AgentConsoleHelpLineOptions {
    /** Optional filter; matches command names, descriptions and subcommands. */
    query?: string;
    /** Restrict to one command group. */
    group?: string;
    /** Resolve `agent.command.desc.<name>` and `agent.command.group.<group>`. */
    describe?: (key: string, fallback: string) => string;
}

export interface AgentConsoleHelpGroupOption {
    label: string;
    value: string;
    description: string;
}

function groupLabel(group: string, describe?: (key: string, fallback: string) => string): string {
    const fallback = group ? `${group[0].toUpperCase()}${group.slice(1)}` : '';
    const translated = describe ? describe(`agent.command.group.${group}`, fallback) : fallback;
    const text = translated || fallback;
    // Some locales return the raw group key ('core'); make the heading read
    // like a heading while leaving CJK translations untouched.
    return /^[a-z][a-z-]*$/.test(text) ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

function descriptionOf(def: AgentConsoleCommandDefinition, describe?: (key: string, fallback: string) => string): string {
    const key = `agent.command.desc.${def.name.replace(/^\//, '')}`;
    const translated = describe ? describe(key, def.description) : def.description;
    return translated || def.description;
}

function usageOf(def: AgentConsoleCommandDefinition, sub?: string): string {
    const template = formatAgentConsoleCommandArgumentTemplate(def);
    return `${def.name}${sub ? ` ${sub}` : ''}${template ? ` ${template}` : ''}`;
}

function matches(text: string, query: string): boolean {
    return !query || String(text || '').toLowerCase().includes(query);
}

/** Top-level `/help` menu: one row per command group. */
export function buildAgentConsoleHelpGroups(
    describe?: (key: string, fallback: string) => string,
    countLabel: (count: number) => string = count => `${count} commands`
): AgentConsoleHelpGroupOption[] {
    return AGENT_CONSOLE_COMMAND_GROUP_ORDER.flatMap(group => {
        const defs = AGENT_CONSOLE_COMMAND_DEFINITIONS.filter(def => def.group === group && !def.hidden);
        return defs.length
            ? [{
                label: groupLabel(group, describe),
                value: `group:${group}`,
                description: countLabel(defs.length)
            }]
            : [];
    });
}

/**
 * Grouped, scrollable help body for `/help`.
 *
 * The previous `/help` was a flat select menu of every command and
 * subcommand: it was noisy, and pressing Enter executed the highlighted
 * command (`/exit`, `/restart`, ...). A read-only grouped panel keeps the
 * command catalogue organized and makes accidental execution impossible.
 */
export function buildAgentConsoleHelpLines(options: AgentConsoleHelpLineOptions = {}): string[] {
    const query = String(options.query || '').trim().toLowerCase();
    const groupFilter = String(options.group || '').trim().toLowerCase();
    const definitions = AGENT_CONSOLE_COMMAND_DEFINITIONS.filter(def =>
        !def.hidden && (!groupFilter || def.group === groupFilter));
    // Name/subcommand matches win over description matches, so `/help keymap`
    // does not pull in `/reload` merely because its description mentions the
    // keymap. Description search is the fallback when no name matches.
    const strong = query
        ? definitions.filter(def =>
            matches(def.name, query)
            || (def.subcommands || []).some(sub => matches(`${def.name} ${sub.sub}`, query)))
        : definitions;
    const weak = !!query && !strong.length;
    const selected = strong.length
        ? strong
        : definitions.filter(def => matches(descriptionOf(def, options.describe), query));
    const rows: Array<{ group: string; usage: string; description: string }> = [];
    AGENT_CONSOLE_COMMAND_GROUP_ORDER.forEach(group => {
        selected
            .filter(def => def.group === group)
            .forEach(def => {
                const description = descriptionOf(def, options.describe);
                const subMatches = query
                    ? (def.subcommands || []).filter(sub => matches(`${def.name} ${sub.sub}`, query))
                    : [];
                if (!query || weak || matches(def.name, query)) {
                    rows.push({ group, usage: usageOf(def), description });
                    // A filtered command advertises its subcommands; the full
                    // catalogue stays compact (base commands only).
                    if (query && !weak) {
                        (def.subcommands || []).forEach(sub => rows.push({
                            group,
                            usage: usageOf(def, sub.sub),
                            description: sub.description
                        }));
                    }
                    return;
                }
                subMatches.forEach(sub => rows.push({
                    group,
                    usage: usageOf(def, sub.sub),
                    description: sub.description
                }));
            });
    });
    if (!rows.length) {
        return [];
    }
    const usageWidth = Math.min(32, rows.reduce((width, row) => Math.max(width, row.usage.length), 0));
    const lines: string[] = [];
    let currentGroup = '';
    rows.forEach(row => {
        if (row.group !== currentGroup) {
            if (lines.length) {
                lines.push('');
            }
            lines.push(groupLabel(row.group, options.describe));
            currentGroup = row.group;
        }
        const usage = row.usage.length > usageWidth
            ? `${row.usage.slice(0, Math.max(1, usageWidth - 3))}...`
            : row.usage;
        lines.push(`  ${usage.padEnd(usageWidth)}  ${row.description}`);
    });
    return lines;
}
