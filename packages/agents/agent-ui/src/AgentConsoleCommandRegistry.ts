/**
 * Single source of truth for agent console slash commands.
 * This module is intentionally dependency-free (no runtime imports beyond the
 * pure keymap value constants), so it can be imported from SessionState,
 * Component, Suggestions and CommandHandlers without creating any module cycle.
 *
 * The registry drives:
 * - command hints (palette + completion candidates)
 * - palette descriptions (`[组] 描述`)
 * - input suggestions (fuzzy + descriptions)
 * - smart-run decision (needsArgs -> inject & wait, else submit & execute)
 * - grouped /help options
 */
import { AGENT_CONSOLE_GLOBAL_ACTIONS, AGENT_CONSOLE_KEYMAP_CONTEXTS } from './AgentConsoleKeymapValues';

export type AgentConsoleCommandGroupKey =
    | 'core'
    | 'session'
    | 'display'
    | 'input'
    | 'review'
    | 'hooks'
    | 'delegation'
    | 'system';

export const AGENT_CONSOLE_COMMAND_GROUP_LABELS: Record<AgentConsoleCommandGroupKey, string> = {
    core: '核心',
    session: '会话',
    display: '显示',
    input: '输入',
    review: '审查',
    hooks: '钩子',
    delegation: '委托',
    system: '系统'
};

export const AGENT_CONSOLE_COMMAND_GROUP_ORDER: AgentConsoleCommandGroupKey[] = [
    'core',
    'session',
    'display',
    'input',
    'review',
    'hooks',
    'delegation',
    'system'
];

export interface AgentConsoleCommandSubcommand {
    sub: string;
    description: string;
    /** Positional arguments after the subcommand (multi-word completion). */
    args?: AgentConsoleCommandArgument[];
}

export type AgentConsoleCommandArgumentType = 'string' | 'enum';

/** Positional argument contract shared by completion and command dispatch. */
export interface AgentConsoleCommandArgument {
    name: string;
    type?: AgentConsoleCommandArgumentType;
    required?: boolean;
    default?: string;
    variadic?: boolean;
    values?: string[];
}

export interface AgentConsoleCommandArgumentDiagnostic {
    code: 'missing' | 'invalid' | 'extra';
    message: string;
    argument?: string;
    /** 0-based index of the offending token in the raw `values` array (missing => next expected slot). */
    tokenIndex?: number;
    /** Canonical value(s) that would have been accepted here (enums, defaults, sub-templates). */
    expected?: string;
    /** Actionable correction hint, e.g. the closest enum/match or a usage template. */
    suggestion?: string;
}

export interface AgentConsoleParsedCommandArguments {
    values: string[];
    /** Values after optional defaults have been supplied. */
    resolved: string[];
    diagnostics: AgentConsoleCommandArgumentDiagnostic[];
}

export interface AgentConsoleCommandDefinition {
    /** Canonical command name, e.g. '/help'. */
    name: string;
    /** English single-source description (same wording as legacy /help rows). */
    description: string;
    group: AgentConsoleCommandGroupKey;
    /** needsArgs: smart-run should inject '/name ' and wait for arguments instead of submitting. */
    needsArgs?: boolean;
    /** Structured positional argument contract. `needsArgs` remains for compatibility. */
    args?: AgentConsoleCommandArgument[];
    /** Functional aliases (registered in hints and executable via handleCommand). */
    aliases?: string[];
    /** Companion subcommand rows rendered in /help as '/name sub'. */
    subcommands?: AgentConsoleCommandSubcommand[];
    /** Hidden from the `/` menu and `/help`; still executable when typed (key duplicates, diagnostics). */
    hidden?: boolean;
}

/**
 * Curated top-level `/` menu (opencode/codex-like): the full registry remains
 * executable and visible in `/help`, but the composer only advertises the
 * commands users reach for. Aliases stay out of the menu to avoid duplicates.
 */
export const AGENT_CONSOLE_FEATURED_COMMANDS: readonly string[] = [
    '/help', '/status', '/model', '/provider', '/permissions', '/settings', '/plan', '/mcp',
    '/undo', '/redo',
    '/sessions', '/new', '/resume', '/rename', '/archive', '/fork', '/init', '/share', '/unshare',
    '/theme', '/tui', '/thinking', '/timeline', '/outputs', '/pager',
    '/editor', '/attach',
    '/review', '/diff', '/approvals',
    '/compact',
    '/pair', '/web', '/reload', '/restart', '/exit'
];
const FEATURED_COMMAND_SET = new Set(AGENT_CONSOLE_FEATURED_COMMANDS);

/** MUST keep '/help' first: fuzzy '/he' suggestions and smart-run tests rely on it being options[0]. */
export { AGENT_CONSOLE_COMMAND_DEFINITIONS } from './AgentConsoleCommandDefinitions';
import { AGENT_CONSOLE_COMMAND_DEFINITIONS } from './AgentConsoleCommandDefinitions';

const nameIndex = new Map<string, AgentConsoleCommandDefinition>();
const aliasIndex = new Map<string, AgentConsoleCommandDefinition>();

AGENT_CONSOLE_COMMAND_DEFINITIONS.forEach(def => {
    nameIndex.set(def.name, def);
    (def.aliases || []).forEach(alias => aliasIndex.set(alias, def));
});

/** Resolve a definition by canonical name or functional alias. */
export function getAgentConsoleCommandDefinition(nameOrAlias: string): AgentConsoleCommandDefinition | undefined {
    return nameIndex.get(nameOrAlias) || aliasIndex.get(nameOrAlias);
}

/** Resolve a command name to its canonical form (alias -> canonical name). */
export function getAgentConsoleCommandName(nameOrAlias: string): string {
    return getAgentConsoleCommandDefinition(nameOrAlias)?.name || nameOrAlias;
}

/**
 * Splits a command argument line without losing quoted values. This intentionally
 * stays small and dependency-free so queued slash commands use the same parser
 * as palette execution in both renderers.
 */
export function tokenizeAgentConsoleCommandArguments(input: string): string[] {
    const tokens: string[] = [];
    const source = String(input || '').trim();
    let token = '';
    let quote = '';
    let escaped = false;
    for (const char of source) {
        if (escaped) {
            token += char;
            escaped = false;
        } else if (char === '\\') {
            escaped = true;
        } else if (quote) {
            if (char === quote) quote = '';
            else token += char;
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (/\s/.test(char)) {
            if (token) {
                tokens.push(token);
                token = '';
            }
        } else {
            token += char;
        }
    }
    if (escaped) token += '\\';
    if (token) tokens.push(token);
    return tokens;
}

export function formatAgentConsoleCommandArgumentTemplate(definition: AgentConsoleCommandDefinition | undefined): string {
    return (definition?.args || []).map(arg => {
        const value = arg.variadic ? `${arg.name}...` : arg.name;
        return arg.required ? `<${value}>` : `[${value}]`;
    }).join(' ');
}

/** Renders a command's positional schema as readable catalog rows, e.g. 'query...: string (required)'. */
export function formatAgentConsoleCommandArgumentForm(
    definition: AgentConsoleCommandDefinition | undefined,
    translate?: AgentConsoleCommandTranslate
): string[] {
    return (definition?.args || []).map(arg => {
        const typeLabel = arg.type === 'enum' && arg.values?.length
            ? commandArgText(translate, 'argTypeEnum', 'enum({values})', { values: arg.values.join('|') })
            : commandArgText(translate, 'argTypeString', 'string');
        const flags: string[] = [];
        if (arg.required) flags.push(commandArgText(translate, 'argFlagRequired', 'required'));
        if (arg.default !== undefined) flags.push(commandArgText(translate, 'argFlagDefault', 'default={value}', { value: arg.default }));
        return `${arg.name}${arg.variadic ? '...' : ''}: ${typeLabel}${flags.length ? ` (${flags.join(', ')})` : ''}`;
    });
}

/** Optional host translator for command-argument diagnostics (`agent.menu.arg.*`). */
export type AgentConsoleCommandTranslate = (key: string, params?: Record<string, any>, fallback?: string) => string;

function commandArgText(
    translate: AgentConsoleCommandTranslate | undefined,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    // The registry stays dependency-free (no i18n import), so the English
    // fallback is interpolated here when no translator supplies copy.
    const fullKey = `agent.menu.arg.${key}`;
    const value = translate?.(fullKey, params, fallback);
    const template = value && value !== fullKey ? value : fallback;
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params?.[name] ?? ''));
}

/** Validates a positional schema and returns parsed values plus actionable diagnostics. */
export function parseAgentConsoleCommandArguments(
    definition: AgentConsoleCommandDefinition | undefined,
    input: string,
    translate?: AgentConsoleCommandTranslate
): AgentConsoleParsedCommandArguments {
    const values = tokenizeAgentConsoleCommandArguments(input);
    const schema = definition?.args || [];
    const diagnostics: AgentConsoleCommandArgumentDiagnostic[] = [];
    const resolved: string[] = [];
    let valueIndex = 0;
    for (const argument of schema) {
        const remaining = argument.variadic ? values.slice(valueIndex) : values.slice(valueIndex, valueIndex + 1);
        const raw = argument.variadic ? remaining.join(' ') : remaining[0];
        if (!raw) {
            if (argument.default !== undefined) {
                resolved.push(argument.default);
            } else if (argument.required) {
                diagnostics.push({
                    code: 'missing',
                    argument: argument.name,
                    tokenIndex: valueIndex,
                    expected: argument.type === 'enum' && argument.values ? argument.values.join('|') : `<${argument.name}>`,
                    suggestion: argument.type === 'enum' && argument.values
                        ? commandArgText(translate, 'provideOne', 'Provide one of: {values}.', { values: argument.values.join(', ') })
                        : commandArgText(translate, 'usage', 'Usage: /{command} {name}.', { command: definition?.name?.replace(/^\//, '') || 'command', name: argument.name }),
                    message: commandArgText(translate, 'missing', 'Missing required argument <{name}>.', { name: argument.name })
                });
            }
        } else {
            if (argument.type === 'enum' && argument.values && !argument.values.includes(raw)) {
                const expectedList = argument.values.join('|');
                diagnostics.push({
                    code: 'invalid',
                    argument: argument.name,
                    tokenIndex: valueIndex,
                    expected: expectedList,
                    // The connector is copy too: joining with a hardcoded
                    // ' or ' leaked English into zh ("是要用 stream or viewport 吗？").
                    suggestion: commandArgText(translate, 'didYouMean', 'Did you mean {values}?', {
                        values: argument.values.join(commandArgText(translate, 'optionSeparator', ' or '))
                    }),
                    message: commandArgText(translate, 'invalid', 'Invalid {name} "{value}". Expected: {expected}.', { name: argument.name, value: raw, expected: argument.values.join(', ') })
                });
            }
            resolved.push(raw);
        }
        valueIndex += remaining.length;
    }
    if (schema.length && valueIndex < values.length && !schema.some(arg => arg.variadic)) {
        const extraTokens = values.slice(valueIndex);
        diagnostics.push({
            code: 'extra',
            tokenIndex: valueIndex,
            expected: '<none>',
            suggestion: commandArgText(translate, extraTokens.length === 1 ? 'removeExtraOne' : 'removeExtraMany', extraTokens.length === 1 ? 'Remove it — the command accepts no more arguments.' : 'Remove them — the command accepts no more arguments.'),
            message: extraTokens.length === 1
                ? commandArgText(translate, 'extraOne', 'Unexpected argument: {value}.', { value: extraTokens.join(' ') })
                : commandArgText(translate, 'extraMany', 'Unexpected arguments: {value}.', { value: extraTokens.join(' ') })
        });
    }
    return { values, resolved, diagnostics };
}

/** Renders diagnostics as a single human-readable correction line for notices. */
export function formatAgentConsoleCommandDiagnostics(
    diagnostics: AgentConsoleCommandArgumentDiagnostic[],
    translate?: AgentConsoleCommandTranslate
): string {
    return diagnostics.map(item => {
        const parts = [item.message];
        if (item.suggestion) parts.push(item.suggestion);
        return parts.join(' ');
    }).join(' ');
}

/** Renders diagnostics as multi-line echo rows (message, expected, maybe) for notices and overlays. */
export function formatAgentConsoleCommandDiagnosticEcho(
    diagnostics: AgentConsoleCommandArgumentDiagnostic[],
    translate?: AgentConsoleCommandTranslate
): string[] {
    return diagnostics.flatMap(item => {
        const rows = [item.message];
        if (item.expected) rows.push(commandArgText(translate, 'expected', 'expected: {value}', { value: item.expected }));
        if (item.suggestion) rows.push(commandArgText(translate, 'maybe', 'maybe: {value}', { value: item.suggestion }));
        return rows;
    });
}

/**
 * Full command hint list: canonical names + functional aliases + externally
 * injected hints (e.g. host-provided commands), deduped, '/help' first.
 */
export function agentConsoleCommandHints(extra: string[] = []): string[] {
    const hints: string[] = [];
    const seen = new Set<string>();
    AGENT_CONSOLE_COMMAND_DEFINITIONS.forEach(def => {
        if (def.hidden) {
            return;
        }
        [def.name, ...(def.aliases || [])].forEach(name => {
            if (!FEATURED_COMMAND_SET.has(name) || seen.has(name)) {
                return;
            }
            seen.add(name);
            hints.push(name);
        });
    });
    (extra || []).forEach(hint => {
        if (hint && !seen.has(hint)) {
            seen.add(hint);
            hints.push(hint);
        }
    });
    return hints;
}

/** Full non-hidden catalogue (with aliases) used once the user typed past `/`. */
export function agentConsoleAllCommandHints(extra: string[] = []): string[] {
    const hints: string[] = [];
    const seen = new Set<string>();
    AGENT_CONSOLE_COMMAND_DEFINITIONS.forEach(def => {
        if (def.hidden) {
            return;
        }
        if (!seen.has(def.name)) {
            seen.add(def.name);
            hints.push(def.name);
        }
        (def.aliases || []).forEach(alias => {
            if (!seen.has(alias)) {
                seen.add(alias);
                hints.push(alias);
            }
        });
    });
    (extra || []).forEach(hint => {
        if (hint && !seen.has(hint)) {
            seen.add(hint);
            hints.push(hint);
        }
    });
    return hints;
}

/** Format `[组] 描述` for palette/suggestions surfaces; undefined for unknown/external hints. */
export function resolveAgentConsoleCommandDescription(
    nameOrAlias: string,
    groupLabels?: Partial<Record<AgentConsoleCommandGroupKey, string>>,
    describe?: (key: string, fallback: string) => string
): string | undefined {
    const def = getAgentConsoleCommandDefinition(nameOrAlias);
    if (!def) {
        return undefined;
    }
    const description = describe ? describe(`agent.command.desc.${def.name.replace(/^\//, '')}`, def.description) : def.description;
    return `[${groupLabels?.[def.group] ?? AGENT_CONSOLE_COMMAND_GROUP_LABELS[def.group]}] ${description}`;
}

/** Help option row — structurally compatible with AgentConsoleSelectOption. */
export interface AgentConsoleCommandHelpOption {
    label: string;
    value: string;
    description?: string;
}

/** Grouped /help select options: base command rows + subcommand rows per group, '@workspace' last. */
export function buildAgentConsoleHelpOptions(
    describe?: (key: string, fallback: string) => string
): AgentConsoleCommandHelpOption[] {
    const options: AgentConsoleCommandHelpOption[] = [];
    const localize = (name: string, fallback: string, kind: 'desc' | 'sub' = 'desc') => describe ? describe(`agent.command.${kind}.${name.replace(/^\//, '')}`, fallback) : fallback;
    AGENT_CONSOLE_COMMAND_GROUP_ORDER.forEach(group => {
        AGENT_CONSOLE_COMMAND_DEFINITIONS
            .filter(def => def.group === group && !def.hidden)
            .forEach(def => {
                options.push({
                    label: def.name,
                    value: def.name,
                    description: localize(def.name, def.description)
                });
                (def.subcommands || []).forEach(sub => {
                    const value = `${def.name} ${sub.sub}`;
                    options.push({
                        label: value,
                        value,
                        description: localize(`${def.name.slice(1)}.${sub.sub}`, sub.description, 'sub')
                    });
                });
            });
    });
    options.push({ label: '@workspace', value: '@workspace', description: describe ? describe('agent.command.workspace', 'context') : 'context' });
    return options;
}
