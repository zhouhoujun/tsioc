import type { AgentConsoleCommandDefinition } from './AgentConsoleCommandRegistry';
import { AGENT_CONSOLE_GLOBAL_ACTIONS, AGENT_CONSOLE_KEYMAP_CONTEXTS } from './AgentConsoleKeymapValues';

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
    { name: '/permissions', description: 'show or change the security level (read-only/ask/auto/full) and readonly/sandbox permissions', group: 'core', args: [{ name: 'area', type: 'enum', values: ['status', 'level', 'readonly', 'plan', 'sandbox'] }, { name: 'arg', variadic: true }] },
    { name: '/settings', description: 'unified settings dialog: general, keybinds, providers', group: 'core' },
    { name: '/yolo', description: 'toggle auto-approve mode: /yolo [on|off]', group: 'core', args: [{ name: 'mode', type: 'enum', values: ['on', 'off'] }] },
    { name: '/feedback', description: 'packaging diagnostics for feedback reports', group: 'core', hidden: true },
    { name: '/undo', description: 'revert the last file change', group: 'core' },
    { name: '/redo', description: 're-apply the last undone file change', group: 'core' },
    { name: '/copy', description: 'copy reply: /copy [input|workspace|session|model], ctrl+x shift+c copies the draft', group: 'core', hidden: true, args: [{ name: 'target', type: 'enum', values: ['input', 'workspace', 'session', 'model'] }] },
    { name: '/archetype', description: 'switch session archetype: /archetype [build|plan|review|name]', group: 'core', args: [{ name: 'name' }] },
    { name: '/plan', description: 'toggle read-only plan mode (write tools denied)', group: 'core', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', '1', '0', 'true', 'false'] }] },

    { name: '/sessions', description: 'browse or search sessions (type to filter)', group: 'session' },
    { name: '/session', description: 'focus or switch session: /session [<id>]', group: 'session', args: [{ name: 'id' }] },
    { name: '/new', description: 'start a new session: /new [<id>]', group: 'session', args: [{ name: 'id' }] },
    { name: '/resume', description: 'resume an existing or archived session', group: 'session' },
    { name: '/archive', description: 'archive the current session without deleting its transcript', group: 'session' },
    { name: '/fork', description: 'fork the current session [messageId]', group: 'session', args: [{ name: 'messageId' }] },
    { name: '/side', description: 'open a temporary side session fork', group: 'session', args: [{ name: 'messageId' }] },
    { name: '/share', description: 'create a shareable link for this session (gateway)', group: 'session' },
    { name: '/unshare', description: 'revoke a session share: /unshare [token]', group: 'session', needsArgs: true, args: [{ name: 'token' }] },
    { name: '/rename', description: 'rename the current session: /rename <name>', group: 'session', needsArgs: true, args: [{ name: 'name', variadic: true }] },
    { name: '/title', description: 'window title fields and legacy session rename: /title [list|set field1,field2|unset field]', group: 'session', hidden: true, args: [{ name: 'arg', variadic: true }] },
    { name: '/pin', description: 'pin the current session to the top of the list', group: 'session' },
    { name: '/unpin', description: 'unpin the current session', group: 'session' },
    { name: '/sections', description: 'session sections: /sections [<label> to create]', group: 'session', hidden: true, args: [{ name: 'label', variadic: true }] },
    { name: '/threads', description: 'browse session threads: /threads [<id>]', group: 'session' },
    { name: '/threadplan', description: 'thread plan todos', group: 'session', hidden: true },
    { name: '/threadreview', description: 'thread coding task review', group: 'session', hidden: true },
    { name: '/projects', description: 'browse sessions by project: /projects [<id>]', group: 'session' },
    { name: '/search', description: 'search sessions: /search <query>', group: 'session', needsArgs: true, args: [{ name: 'query', required: true, variadic: true }] },
    { name: '/snapshot', description: 'snapshot current session: /snapshot [label]', group: 'session', args: [{ name: 'label' }] },
    { name: '/snapshots', description: 'list / restore / delete session snapshots', group: 'session', args: [{ name: 'verb', type: 'enum', values: ['list', 'restore', 'delete'] }, { name: 'id' }] },
    { name: '/git-snapshots', description: 'git step snapshots: list / diff <ref> / revert <messageId> / unrevert', group: 'session', args: [{ name: 'operation', type: 'enum', values: ['list', 'diff', 'revert', 'restore', 'unrevert'] }, { name: 'arg', variadic: true }] },
    { name: '/export', description: 'export session transcript [json|jsonl] [sessionId] [path]', group: 'session', args: [{ name: 'arg', variadic: true }] },
    { name: '/cd', description: 'change working directory: /cd <path>', group: 'session', needsArgs: true, args: [{ name: 'path', variadic: true }] },
    { name: '/pwd', description: 'print current working directory', group: 'session' },
    { name: '/init', description: 'generate AGENTS.md project context', group: 'session', args: [{ name: 'arg', type: 'enum', values: ['--force'] }] },
    { name: '/ssh', description: 'SSH hosts: list / connect / disconnect / forward', group: 'session', args: [{ name: 'action', type: 'enum', values: ['list', 'ls', 'connect', 'disconnect', 'shell', 'forward', 'help', '?'] }, { name: 'arg', variadic: true }] },

    { name: '/theme', description: 'preview or apply a saved UI theme', group: 'display', args: [{ name: 'name' }] },
    { name: '/thinking', description: 'toggle reasoning/thinking message visibility (Ctrl+X T)', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', 'show', 'hide'] }] },
    { name: '/timeline', description: 'toggle compact chronological timeline view (Ctrl+X G)', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['off', 'compact', 'steps', 'verbose'] }] },
    { name: '/display', description: 'toggle message timestamp visibility: /display [on|off|critical]', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', 'show', 'hide', 'critical'] }] },
    { name: '/layout', description: 'switch transcript layout: /layout [scrollback|viewport]', group: 'display', hidden: true, args: [{ name: 'mode', type: 'enum', values: ['scrollback', 'viewport'] }] },
    { name: '/tui', description: 'switch TUI buffer mode: /tui [fullscreen|scrollback]', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['fullscreen', 'scrollback', 'viewport'] }] },
    { name: '/outputs', description: 'command results history: browse /outputs; up/down/j/k move, / filter, enter copy', group: 'display' },
    { name: '/pager', description: 'full-history transcript pager: /pager [query] to search; Esc close, ↑↓/PgUp/PgDn scroll', group: 'display' },
    { name: '/raw', description: 'toggle raw plain-text scrollback (no markdown reflow): /raw [on|off]', group: 'display', args: [{ name: 'mode', type: 'enum', values: ['on', 'off', 'show', 'hide'] }] },
    { name: '/statusline', description: 'status bar fields: list / set field1,field2 / unset field', group: 'display', args: [{ name: 'verb', type: 'enum', values: ['list', 'set', 'unset'] }, { name: 'fields', variadic: true }] },

    { name: '/editor', description: 'edit the draft in an external editor (Ctrl+G)', group: 'input', args: [{ name: 'initial', variadic: true }] },
    { name: '/queue', description: 'queued follow-up prompts: /queue [list|clear] (Tab while a turn is running)', group: 'input', args: [{ name: 'verb', type: 'enum', values: ['list', 'clear'] }] },
    { name: '/stash', description: 'named draft stash: ctrl+x shift+s push, /stash [list|pop <name>|rm <name>]', group: 'input', args: [{ name: 'verb', type: 'enum', values: ['list', 'push', 'save', 'pop', 'restore', 'rm', 'drop', 'delete'] }, { name: 'name', variadic: true }] },
    { name: '/voice', description: 'voice session status/start/stop/cancel', group: 'input', args: [{ name: 'verb', type: 'enum', values: ['start', 'stop', 'cancel', 'status'] }] },
    { name: '/ide', description: 'IDE bridge: show attached editor context', group: 'input', args: [{ name: 'arg', variadic: true }] },
    { name: '/multiline', description: 'multiline', group: 'input', hidden: true },
    { name: '/send', description: 'send the multiline draft', group: 'input', hidden: true },
    { name: '/cancel', description: 'cancel running turn', group: 'input', hidden: true },
    { name: '/clear', description: 'start a new session (clear the current conversation)', group: 'input', hidden: true },
    { name: '/attach', description: 'attach an image for the next prompt', group: 'input', args: [{ name: 'arg', variadic: true }] },

    // Review owns an extensible subcommand grammar, so keep its tail variadic.
    { name: '/review', description: 'coding task review', group: 'review', args: [{ name: 'command', variadic: true }] },
    { name: '/diff', description: 'worktree diff: /diff [--staged|--unstaged|--untracked|paths]', group: 'review', args: [{ name: 'pathOrFlag', variadic: true }] },
    { name: '/approvals', description: 'approvals', group: 'review' },
    {
        name: '/approve',
        description: 'approve pending approval request: /approve [<id>]',
        group: 'review',
        hidden: true,
        args: [{ name: 'id' }],
        subcommands: [
            { sub: 'retry', description: 'retry the most recent auto-review-rejected action once' }
        ]
    },
    { name: '/deny', description: 'deny pending approval request: /deny [<id>]', group: 'review', hidden: true, args: [{ name: 'id' }] },
    { name: '/jobs', description: 'scheduled jobs: /jobs [<taskId>]', group: 'review', args: [{ name: 'taskId' }] },
    { name: '/tasks', description: 'task inspector: /tasks [<taskId>]', group: 'review', args: [{ name: 'taskId' }] },
    { name: '/toolruns', description: 'inspect tool runs for this session', group: 'review', hidden: true },

    { name: '/hooks', description: 'show registered lifecycle hooks (stages + shell commands + functions)', group: 'hooks' },
    { name: '/memories', description: 'memory injection: status / on / off', group: 'hooks', args: [{ name: 'verb', type: 'enum', values: ['list', 'injected', 'add', 'remove', 'rm', 'on', 'off'] }, { name: 'arg', variadic: true }] },
    { name: '/personality', description: 'personality presets: list / set <name> / unset', group: 'hooks', args: [{ name: 'verb', type: 'enum', values: ['list', 'set', 'unset'] }, { name: 'name' }] },
    { name: '/debug-config', description: 'show resolved config (model, profile, ui options, session)', group: 'hooks', hidden: true },

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
        hidden: true,
        args: [{ name: 'arg', variadic: true }],
        subcommands: [
            { sub: 'trend', description: 'quality trend [provider] [bucketSize] [maxBuckets]' }
        ]
    },
    {
        name: '/compactions',
        description: 'compaction history [sessionId]',
        group: 'delegation',
        hidden: true,
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
        hidden: true,
        args: [{ name: 'arg', variadic: true }],
        subcommands: [
            { sub: 'list', description: 'turn diagnostics records [sessionId]' },
            { sub: 'trend', description: 'turn diagnostics trend [sessionId] [bucketSize] [maxBuckets]' }
        ]
    },
    { name: '/harness', description: 'harness audit / profile', group: 'delegation', hidden: true, args: [{ name: 'arg', variadic: true }], subcommands: [
        { sub: 'audit', description: 'failure-pattern audit [sessionId]' },
        { sub: 'profile', description: 'governance profile list/current/diff' }
    ] },
    { name: '/retry', description: 'retry failed workers: /retry [<taskId>]', group: 'delegation', args: [{ name: 'taskId' }] },
    { name: '/rollback', description: 'rollback coding task: /rollback [<taskId>]', group: 'delegation', args: [{ name: 'taskId' }] },

    { name: '/reload', description: 'reload workspace settings, theme, keymap, statusline and mentions', group: 'system' },
    { name: '/pair', description: 'pair a browser with the running web console', group: 'system', aliases: ['/web'] },
    { name: '/restart', description: 'restart the TUI and resume the current session', group: 'system' },
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

