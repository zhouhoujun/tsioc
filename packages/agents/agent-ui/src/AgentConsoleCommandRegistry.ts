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
}

/** MUST keep '/help' first: fuzzy '/he' suggestions and smart-run tests rely on it being options[0]. */
export const AGENT_CONSOLE_COMMAND_DEFINITIONS: AgentConsoleCommandDefinition[] = [
    { name: '/help', description: 'show command help, grouped by category', group: 'core' },

    { name: '/status', description: 'show session status', group: 'core' },
    { name: '/model', description: 'switch model or queue next-turn profile', group: 'core', args: [{ name: 'profile', variadic: true }] },
    { name: '/provider', description: 'add a new AI provider with the guided wizard', group: 'core', aliases: ['/connect'] },
    { name: '/fast', description: 'switch to fast/strong model profile: /fast [profile]', group: 'core', args: [{ name: 'profile' }] },
    { name: '/tools', description: 'inspect the currently enabled tools: /tools [<name>]', group: 'core', args: [{ name: 'name' }] },
    { name: '/skills', description: 'browse skills: /skills [query | <id>]', group: 'core', args: [{ name: 'query', variadic: true }] },
    { name: '/mcp', description: 'list MCP servers and tools: /mcp [verbose]', group: 'core', args: [{ name: 'mode', type: 'enum', values: ['verbose', '-v'] }] },
    { name: '/plugins', description: 'browse installed plugins: /plugins [<id>]', group: 'core', args: [{ name: 'id' }] },
    { name: '/apps', description: 'browse connectors or insert one into the prompt: /apps [<id>]', group: 'core', args: [{ name: 'id' }] },
    {
        name: '/keymap',
        description: 'list/set/unset/reset key bindings per context (global/composer/list/approval/pager/vim); record <action> captures the next key',
        group: 'core',
        args: [{ name: 'arg', variadic: true }],
        subcommands: [
            { sub: 'list', description: 'list bindings for a context', args: [{ name: 'context', type: 'enum', values: [...AGENT_CONSOLE_KEYMAP_CONTEXTS] }] },
            {
                sub: 'set', description: 'set <key> <action> [context]', args: [
                    { name: 'key' },
                    { name: 'action', type: 'enum', values: [...AGENT_CONSOLE_GLOBAL_ACTIONS] },
                    { name: 'context', type: 'enum', values: [...AGENT_CONSOLE_KEYMAP_CONTEXTS] }
                ]
            },
            { sub: 'unset', description: 'unset <key> [context]', args: [{ name: 'key' }, { name: 'context', type: 'enum', values: [...AGENT_CONSOLE_KEYMAP_CONTEXTS] }] },
            { sub: 'reset', description: 'reset bindings' },
            { sub: 'record', description: 'record <action> to capture the next key', args: [{ name: 'action', type: 'enum', values: [...AGENT_CONSOLE_GLOBAL_ACTIONS] }] }
        ]
    },
    { name: '/vim', description: 'toggle vim-style normal/insert input mode', group: 'core', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', '1', '0', 'true', 'false'] }] },
    { name: '/permissions', description: 'show or change readonly/sandbox session permissions', group: 'core', args: [{ name: 'area', type: 'enum', values: ['status', 'readonly', 'plan', 'sandbox'] }, { name: 'arg', variadic: true }] },
    { name: '/settings', description: 'unified settings dialog: general, keybinds, providers', group: 'core' },
    { name: '/yolo', description: 'toggle auto-approve mode: /yolo [on|off]', group: 'core', args: [{ name: 'mode', type: 'enum', values: ['on', 'off'] }] },
    { name: '/experimental', description: 'experimental features: list / <name> on|off', group: 'core', args: [{ name: 'name' }, { name: 'state', type: 'enum', values: ['on', 'off'] }] },
    { name: '/feedback', description: 'packaging diagnostics for feedback reports', group: 'core' },
    { name: '/undo', description: 'revert the last file change', group: 'core' },
    { name: '/redo', description: 're-apply the last undone file change', group: 'core' },
    { name: '/copy', description: 'copy reply', group: 'core', args: [{ name: 'target', type: 'enum', values: ['input', 'workspace', 'session', 'model'] }] },
    { name: '/archetype', description: 'switch session archetype: /archetype [build|plan|review|name]', group: 'core', args: [{ name: 'name' }] },
    { name: '/plan', description: 'toggle read-only plan mode (write tools denied)', group: 'core', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', '1', '0', 'true', 'false'] }] },

    { name: '/sessions', description: 'sessions', group: 'session' },
    { name: '/session', description: 'focus or switch session: /session [<id>]', group: 'session', args: [{ name: 'id' }] },
    { name: '/new', description: 'start a new session: /new [<id>]', group: 'session', args: [{ name: 'id' }] },
    { name: '/resume', description: 'resume an existing or archived session', group: 'session' },
    { name: '/archive', description: 'archive the current session without deleting its transcript', group: 'session' },
    { name: '/fork', description: 'fork the current session [messageId]', group: 'session', args: [{ name: 'messageId' }] },
    { name: '/side', description: 'open a temporary side session fork', group: 'session', args: [{ name: 'messageId' }] },
    { name: '/share', description: 'create a shareable link for this session (gateway)', group: 'session' },
    { name: '/unshare', description: 'revoke a session share: /unshare [token]', group: 'session', needsArgs: true, args: [{ name: 'token' }] },
    { name: '/title', description: 'set current session title: /title <name> (blank clears)', group: 'session', needsArgs: true, args: [{ name: 'name', variadic: true }] },
    { name: '/pin', description: 'pin the current session to the top of the list', group: 'session' },
    { name: '/unpin', description: 'unpin the current session', group: 'session' },
    { name: '/sections', description: 'session sections: /sections [<label> to create]', group: 'session', args: [{ name: 'label', variadic: true }] },
    { name: '/threads', description: 'browse session threads: /threads [<id>]', group: 'session' },
    { name: '/threadplan', description: 'thread plan todos', group: 'session' },
    { name: '/threadreview', description: 'thread coding task review', group: 'session' },
    { name: '/projects', description: 'browse sessions by project: /projects [<id>]', group: 'session' },
    { name: '/search', description: 'search sessions: /search <query>', group: 'session', needsArgs: true, args: [{ name: 'query', required: true, variadic: true }] },
    { name: '/snapshot', description: 'snapshot current session: /snapshot [label]', group: 'session', args: [{ name: 'label' }] },
    { name: '/snapshots', description: 'list / restore / delete session snapshots', group: 'session', args: [{ name: 'verb', type: 'enum', values: ['list', 'restore', 'delete'] }, { name: 'id' }] },
    { name: '/git-snapshots', description: 'git step snapshots: list / diff <ref> / revert <messageId> / unrevert', group: 'session', args: [{ name: 'operation', type: 'enum', values: ['list', 'diff', 'revert', 'restore', 'unrevert'] }, { name: 'arg', variadic: true }] },
    { name: '/messages', description: 'messages', group: 'session' },
    { name: '/export', description: 'export session transcript [json|jsonl] [sessionId] [path]', group: 'session', args: [{ name: 'arg', variadic: true }] },
    { name: '/cd', description: 'change working directory: /cd <path>', group: 'session', needsArgs: true, args: [{ name: 'path', variadic: true }] },
    { name: '/pwd', description: 'print current working directory', group: 'session' },
    { name: '/init', description: 'generate AGENTS.md project context', group: 'session', args: [{ name: 'arg', type: 'enum', values: ['--force'] }] },
    { name: '/ssh', description: 'SSH hosts: list / connect / disconnect / forward', group: 'session', args: [{ name: 'action', type: 'enum', values: ['list', 'ls', 'connect', 'disconnect', 'shell', 'forward', 'help', '?'] }, { name: 'arg', variadic: true }] },

    { name: '/theme', description: 'preview or apply a saved UI theme', group: 'display', args: [{ name: 'name' }] },
    { name: '/thinking', description: 'toggle reasoning/thinking message visibility (Ctrl+X T)', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', 'show', 'hide'] }] },
    { name: '/timeline', description: 'toggle compact chronological timeline view (Ctrl+X G)', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['off', 'compact', 'steps', 'verbose'] }] },
    { name: '/display', description: 'toggle message timestamp visibility: /display [on|off|critical]', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', 'show', 'hide', 'critical'] }] },
    { name: '/layout', description: 'switch transcript layout: /layout [stream|viewport]', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['stream', 'viewport'] }] },
    { name: '/outputs', description: 'command results history: browse /outputs; up/down/j/k move, / filter, enter copy', group: 'display' },
    { name: '/pager', description: 'full-history transcript pager: /pager [query] to search; Esc close, ↑↓/PgUp/PgDn scroll', group: 'display' },
    { name: '/raw', description: 'toggle raw plain-text scrollback (no markdown reflow): /raw [on|off]', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', 'show', 'hide'] }] },
    { name: '/statusline', description: 'status bar fields: list / set field1,field2 / unset field', group: 'display', args: [{ name: 'verb', type: 'enum', values: ['list', 'set', 'unset'] }, { name: 'fields', variadic: true }] },

    { name: '/editor', description: 'edit the draft in an external editor (Ctrl+G)', group: 'input', args: [{ name: 'initial', variadic: true }] },
    { name: '/queue', description: 'queued follow-up prompts: /queue [list|clear] (Tab while a turn is running)', group: 'input', args: [{ name: 'verb', type: 'enum', values: ['list', 'clear'] }] },
    { name: '/stash', description: 'named draft stash: ctrl+x shift+s push, /stash [list|pop <name>|rm <name>]', group: 'input', args: [{ name: 'verb', type: 'enum', values: ['list', 'push', 'save', 'pop', 'restore', 'rm', 'drop', 'delete'] }, { name: 'name', variadic: true }] },
    { name: '/voice', description: 'voice session status/start/stop/cancel', group: 'input', args: [{ name: 'verb', type: 'enum', values: ['start', 'stop', 'cancel', 'status'] }] },
    { name: '/ide', description: 'IDE bridge: show attached editor context', group: 'input', args: [{ name: 'arg', variadic: true }] },
    { name: '/multiline', description: 'multiline', group: 'input' },
    { name: '/send', description: 'send the multiline draft', group: 'input' },
    { name: '/cancel', description: 'cancel running turn', group: 'input' },
    { name: '/clear', description: 'start a new session (clear the current conversation)', group: 'input' },
    { name: '/attach', description: 'attach an image for the next prompt', group: 'input', args: [{ name: 'arg', variadic: true }] },

    // Review owns an extensible subcommand grammar, so keep its tail variadic.
    { name: '/review', description: 'coding task review', group: 'review', args: [{ name: 'command', variadic: true }] },
    { name: '/diff', description: 'worktree diff: /diff [--staged|--unstaged|--untracked|paths]', group: 'review', args: [{ name: 'pathOrFlag', variadic: true }] },
    { name: '/approvals', description: 'approvals', group: 'review' },
    {
        name: '/approve',
        description: 'approve pending approval request: /approve [<id>]',
        group: 'review',
        args: [{ name: 'id' }],
        subcommands: [
            { sub: 'retry', description: 'retry the most recent auto-review-rejected action once' }
        ]
    },
    { name: '/deny', description: 'deny pending approval request: /deny [<id>]', group: 'review', args: [{ name: 'id' }] },
    { name: '/jobs', description: 'scheduled jobs: /jobs [<taskId>]', group: 'review', args: [{ name: 'taskId' }] },
    { name: '/tasks', description: 'task inspector: /tasks [<taskId>]', group: 'review', args: [{ name: 'taskId' }] },
    { name: '/toolruns', description: 'inspect tool runs for this session', group: 'review' },

    { name: '/hooks', description: 'show registered lifecycle hooks (stages + shell commands + functions)', group: 'hooks' },
    { name: '/memories', description: 'memory injection: status / on / off', group: 'hooks', args: [{ name: 'verb', type: 'enum', values: ['list', 'injected', 'add', 'remove', 'rm', 'on', 'off'] }, { name: 'arg', variadic: true }] },
    { name: '/personality', description: 'personality presets: list / set <name> / unset', group: 'hooks', args: [{ name: 'verb', type: 'enum', values: ['list', 'set', 'unset'] }, { name: 'name' }] },
    { name: '/debug-config', description: 'show resolved config (model, profile, ui options, session)', group: 'hooks' },

    { name: '/delegation', description: 'delegation edges [sessionId]', group: 'delegation', args: [{ name: 'arg', variadic: true }], subcommands: [
        { sub: 'tree', description: 'delegation tree [sessionId] [status] [depth]' },
        { sub: 'lineage', description: 'delegation lineage [sessionId]' },
        { sub: 'mode', description: 'delegation mode [disabled|explicit|proactive|default]' }
    ] },
    { name: '/goal', description: 'create, show, link, complete, or reopen a persistent goal', group: 'delegation', args: [{ name: 'arg', variadic: true }] },
    { name: '/usage', description: 'usage [daily|weekly|cumulative] [sessionId] [since]', group: 'delegation', args: [{ name: 'arg', variadic: true }] },
    {
        name: '/quality',
        description: 'quality stats / list / trend by provider',
        group: 'delegation',
        args: [{ name: 'arg', variadic: true }],
        subcommands: [
            { sub: 'trend', description: 'quality trend [provider] [bucketSize] [maxBuckets]' }
        ]
    },
    {
        name: '/compactions',
        description: 'compaction history [sessionId]',
        group: 'delegation',
        args: [{ name: 'arg', variadic: true }],
        subcommands: [
            { sub: 'trend', description: 'compaction trend [sessionId] [bucketSize] [maxBuckets]' }
        ]
    },
    { name: '/compact', description: 'force compaction now [reason]', group: 'delegation', args: [{ name: 'reason', variadic: true }] },
    {
        name: '/diagnostics',
        description: 'turn diagnostics [sessionId]',
        group: 'delegation',
        args: [{ name: 'arg', variadic: true }],
        subcommands: [
            { sub: 'list', description: 'turn diagnostics records [sessionId]' },
            { sub: 'trend', description: 'turn diagnostics trend [sessionId] [bucketSize] [maxBuckets]' }
        ]
    },
    { name: '/harness', description: 'harness audit / profile', group: 'delegation', args: [{ name: 'arg', variadic: true }], subcommands: [
        { sub: 'audit', description: 'failure-pattern audit [sessionId]' },
        { sub: 'profile', description: 'governance profile list/current/diff' }
    ] },
    { name: '/retry', description: 'retry failed workers: /retry [<taskId>]', group: 'delegation', args: [{ name: 'taskId' }] },
    { name: '/rollback', description: 'rollback coding task: /rollback [<taskId>]', group: 'delegation', args: [{ name: 'taskId' }] },

    { name: '/ps', description: 'background tasks: list / stop <id>', group: 'system', args: [
        { name: 'verb', type: 'enum', values: ['show', 'stop', 'undo', 'current', 'all', 'running', 'completed', 'failed', 'cancelled'] },
        { name: 'arg', variadic: true }
    ] },
    {
        name: '/exit',
        description: 'exit',
        group: 'system'
    }
];

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
            .filter(def => def.group === group)
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
