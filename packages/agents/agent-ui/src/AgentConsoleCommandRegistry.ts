/**
 * Single source of truth for agent console slash commands.
 * This module is intentionally dependency-free (no runtime imports), so it can
 * be imported from SessionState, Component, Suggestions and CommandHandlers
 * without creating any module cycle.
 *
 * The registry drives:
 * - command hints (palette + completion candidates)
 * - palette descriptions (`[组] 描述`)
 * - input suggestions (fuzzy + descriptions)
 * - smart-run decision (needsArgs -> inject & wait, else submit & execute)
 * - grouped /help options
 */

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
}

export interface AgentConsoleCommandDefinition {
    /** Canonical command name, e.g. '/help'. */
    name: string;
    /** English single-source description (same wording as legacy /help rows). */
    description: string;
    group: AgentConsoleCommandGroupKey;
    /** needsArgs: smart-run should inject '/name ' and wait for arguments instead of submitting. */
    needsArgs?: boolean;
    /** Functional aliases (registered in hints and executable via handleCommand). */
    aliases?: string[];
    /** Companion subcommand rows rendered in /help as '/name sub'. */
    subcommands?: AgentConsoleCommandSubcommand[];
}

/** MUST keep '/help' first: fuzzy '/he' suggestions and smart-run tests rely on it being options[0]. */
export const AGENT_CONSOLE_COMMAND_DEFINITIONS: AgentConsoleCommandDefinition[] = [
    { name: '/help', description: 'show command help, grouped by category', group: 'core' },

    { name: '/status', description: 'show session status', group: 'core' },
    { name: '/model', description: 'switch model or queue next-turn profile', group: 'core', needsArgs: true },
    { name: '/fast', description: 'switch to fast/strong model profile: /fast [profile]', group: 'core', needsArgs: true },
    { name: '/tools', description: 'inspect the currently enabled tools: /tools [<name>]', group: 'core' },
    { name: '/skills', description: 'browse skills: /skills [query | <id>]', group: 'core' },
    { name: '/mcp', description: 'list MCP servers and tools: /mcp [verbose]', group: 'core' },
    { name: '/plugins', description: 'browse installed plugins: /plugins [<id>]', group: 'core' },
    { name: '/apps', description: 'browse connectors or insert one into the prompt: /apps [<id>]', group: 'core' },
    { name: '/keymap', description: 'list/set/unset/reset key bindings per context (global/composer/list/approval/pager/vim); record <action> captures the next key', group: 'core' },
    { name: '/vim', description: 'toggle vim-style normal/insert input mode', group: 'core' },
    { name: '/permissions', description: 'show or change readonly/sandbox session permissions', group: 'core' },
    { name: '/settings', description: 'unified settings dialog: general, keybinds, providers', group: 'core' },
    { name: '/yolo', description: 'toggle auto-approve mode: /yolo [on|off]', group: 'core' },
    { name: '/experimental', description: 'experimental features: list / <name> on|off', group: 'core' },
    { name: '/feedback', description: 'packaging diagnostics for feedback reports', group: 'core' },
    { name: '/undo', description: 'revert the last file change', group: 'core' },
    { name: '/redo', description: 're-apply the last undone file change', group: 'core' },
    { name: '/copy', description: 'copy reply', group: 'core' },
    { name: '/archetype', description: 'switch session archetype: /archetype [build|plan|review|name]', group: 'core', needsArgs: true },
    { name: '/plan', description: 'toggle read-only plan mode (write tools denied)', group: 'core' },

    { name: '/sessions', description: 'sessions', group: 'session' },
    { name: '/session', description: 'focus or switch session: /session [<id>]', group: 'session' },
    { name: '/new', description: 'start a new session: /new [<id>]', group: 'session' },
    { name: '/resume', description: 'resume an existing or archived session', group: 'session' },
    { name: '/archive', description: 'archive the current session without deleting its transcript', group: 'session' },
    { name: '/fork', description: 'fork the current session [messageId]', group: 'session' },
    { name: '/side', description: 'open a temporary side session fork', group: 'session' },
    { name: '/share', description: 'create a shareable link for this session (gateway)', group: 'session' },
    { name: '/unshare', description: 'revoke a session share: /unshare [token]', group: 'session', needsArgs: true },
    { name: '/title', description: 'set current session title: /title <name> (blank clears)', group: 'session', needsArgs: true },
    { name: '/pin', description: 'pin the current session to the top of the list', group: 'session' },
    { name: '/unpin', description: 'unpin the current session', group: 'session' },
    { name: '/sections', description: 'session sections: /sections [<label> to create]', group: 'session' },
    { name: '/threads', description: 'browse session threads: /threads [<id>]', group: 'session' },
    { name: '/threadplan', description: 'thread plan todos', group: 'session' },
    { name: '/threadreview', description: 'thread coding task review', group: 'session' },
    { name: '/projects', description: 'browse sessions by project: /projects [<id>]', group: 'session' },
    { name: '/search', description: 'search sessions: /search <query>', group: 'session', needsArgs: true },
    { name: '/snapshot', description: 'snapshot current session: /snapshot [label]', group: 'session', needsArgs: true },
    { name: '/snapshots', description: 'list / restore / delete session snapshots', group: 'session' },
    { name: '/git-snapshots', description: 'git step snapshots: list / diff <ref> / revert <messageId> / unrevert', group: 'session' },
    { name: '/messages', description: 'messages', group: 'session' },
    { name: '/export', description: 'export session transcript [json|jsonl] [sessionId] [path]', group: 'session' },
    { name: '/cd', description: 'change working directory: /cd <path>', group: 'session', needsArgs: true },
    { name: '/pwd', description: 'print current working directory', group: 'session' },
    { name: '/init', description: 'generate AGENTS.md project context', group: 'session' },
    { name: '/ssh', description: 'SSH hosts: list / connect / disconnect / forward', group: 'session' },

    { name: '/theme', description: 'preview or apply a saved UI theme', group: 'display' },
    { name: '/thinking', description: 'toggle reasoning/thinking message visibility (Ctrl+X T)', group: 'display' },
    { name: '/timeline', description: 'toggle compact chronological timeline view (Ctrl+X G)', group: 'display' },
    { name: '/display', description: 'toggle message timestamp visibility: /display [on|off|critical]', group: 'display' },
    { name: '/outputs', description: 'command results history: browse /outputs; up/down/j/k move, / filter, enter copy', group: 'display' },
    { name: '/raw', description: 'toggle raw plain-text scrollback (no markdown reflow): /raw [on|off]', group: 'display' },
    { name: '/statusline', description: 'status bar fields: list / set field1,field2 / unset field', group: 'display' },

    { name: '/editor', description: 'edit the draft in an external editor (Ctrl+G)', group: 'input' },
    { name: '/stash', description: 'named draft stash: /stash [list|push <name>|pop <name>|rm <name>]', group: 'input' },
    { name: '/voice', description: 'voice session status/start/stop/cancel', group: 'input' },
    { name: '/ide', description: 'IDE bridge: show attached editor context', group: 'input' },
    { name: '/multiline', description: 'multiline', group: 'input' },
    { name: '/send', description: 'send the multiline draft', group: 'input' },
    { name: '/cancel', description: 'cancel running turn', group: 'input' },
    { name: '/clear', description: 'start a new session (clear the current conversation)', group: 'input' },
    { name: '/attach', description: 'attach an image for the next prompt', group: 'input' },

    { name: '/review', description: 'coding task review', group: 'review' },
    { name: '/diff', description: 'worktree diff: /diff [--staged|--unstaged|--untracked|paths]', group: 'review', needsArgs: true },
    { name: '/approvals', description: 'approvals', group: 'review' },
    {
        name: '/approve',
        description: 'approve pending approval request: /approve [<id>]',
        group: 'review',
        subcommands: [
            { sub: 'retry', description: 'retry the most recent auto-review-rejected action once' }
        ]
    },
    { name: '/deny', description: 'deny pending approval request: /deny [<id>]', group: 'review' },
    { name: '/jobs', description: 'scheduled jobs', group: 'review' },
    { name: '/tasks', description: 'task inspector', group: 'review' },
    { name: '/toolruns', description: 'inspect tool runs for this session', group: 'review' },

    { name: '/hooks', description: 'show registered lifecycle hooks (stages + shell commands + functions)', group: 'hooks' },
    { name: '/memories', description: 'memory injection: status / on / off', group: 'hooks' },
    { name: '/personality', description: 'personality presets: list / set <name> / unset', group: 'hooks', needsArgs: true },
    { name: '/debug-config', description: 'show resolved config (model, profile, ui options, session)', group: 'hooks' },

    { name: '/delegation', description: 'delegation edges [sessionId]', group: 'delegation', subcommands: [
        { sub: 'tree', description: 'delegation tree [sessionId] [status] [depth]' },
        { sub: 'lineage', description: 'delegation lineage [sessionId]' },
        { sub: 'mode', description: 'delegation mode [disabled|explicit|proactive|default]' }
    ] },
    { name: '/goal', description: 'create, show, link, complete, or reopen a persistent goal', group: 'delegation' },
    { name: '/usage', description: 'usage [daily|weekly|cumulative] [sessionId] [since]', group: 'delegation' },
    {
        name: '/quality',
        description: 'quality stats / list / trend by provider',
        group: 'delegation',
        subcommands: [
            { sub: 'trend', description: 'quality trend [provider] [bucketSize] [maxBuckets]' }
        ]
    },
    {
        name: '/compactions',
        description: 'compaction history [sessionId]',
        group: 'delegation',
        subcommands: [
            { sub: 'trend', description: 'compaction trend [sessionId] [bucketSize] [maxBuckets]' }
        ]
    },
    { name: '/compact', description: 'force compaction now [reason]', group: 'delegation' },
    {
        name: '/diagnostics',
        description: 'turn diagnostics [sessionId]',
        group: 'delegation',
        subcommands: [
            { sub: 'list', description: 'turn diagnostics records [sessionId]' },
            { sub: 'trend', description: 'turn diagnostics trend [sessionId] [bucketSize] [maxBuckets]' }
        ]
    },
    { name: '/harness', description: 'harness audit / profile', group: 'delegation', subcommands: [
        { sub: 'audit', description: 'failure-pattern audit [sessionId]' },
        { sub: 'profile', description: 'governance profile list/current/diff' }
    ] },
    { name: '/retry', description: 'retry failed workers', group: 'delegation' },
    { name: '/rollback', description: 'rollback coding task', group: 'delegation' },

    { name: '/ps', description: 'background tasks: list / stop <id>', group: 'system' },
    { name: '/quit', description: 'quit the agent console', group: 'system', aliases: ['/q'] },
    {
        name: '/exit',
        description: 'exit',
        group: 'system',
        aliases: ['/x']
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
export function resolveAgentConsoleCommandDescription(nameOrAlias: string): string | undefined {
    const def = getAgentConsoleCommandDefinition(nameOrAlias);
    if (!def) {
        return undefined;
    }
    return `[${AGENT_CONSOLE_COMMAND_GROUP_LABELS[def.group]}] ${def.description}`;
}

/** Help option row — structurally compatible with AgentConsoleSelectOption. */
export interface AgentConsoleCommandHelpOption {
    label: string;
    value: string;
    description?: string;
}

/** Grouped /help select options: base command rows + subcommand rows per group, '@workspace' last. */
export function buildAgentConsoleHelpOptions(): AgentConsoleCommandHelpOption[] {
    const options: AgentConsoleCommandHelpOption[] = [];
    AGENT_CONSOLE_COMMAND_GROUP_ORDER.forEach(group => {
        AGENT_CONSOLE_COMMAND_DEFINITIONS
            .filter(def => def.group === group)
            .forEach(def => {
                options.push({
                    label: def.name,
                    value: def.name,
                    description: def.description
                });
                (def.subcommands || []).forEach(sub => {
                    const value = `${def.name} ${sub.sub}`;
                    options.push({
                        label: value,
                        value,
                        description: sub.description
                    });
                });
            });
    });
    options.push({ label: '@workspace', value: '@workspace', description: 'context' });
    return options;
}