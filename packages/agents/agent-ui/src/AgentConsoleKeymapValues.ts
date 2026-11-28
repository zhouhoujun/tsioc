/**
 * Keymap value domain: contexts, action names and the guard for contexts.
 *
 * Split out so the slash-command registry can declare keymap argument
 * completions without importing the keymap service (the registry stays free of
 * service dependencies and module cycles).
 */

export type AgentConsoleKeymapContext = 'global' | 'composer' | 'list' | 'approval' | 'pager';

export const AGENT_CONSOLE_KEYMAP_CONTEXTS: AgentConsoleKeymapContext[] = ['global', 'composer', 'list', 'approval', 'pager'];

export function isAgentConsoleKeymapContext(value: string): value is AgentConsoleKeymapContext {
    return AGENT_CONSOLE_KEYMAP_CONTEXTS.includes(value as AgentConsoleKeymapContext);
}

export type AgentConsoleGlobalAction =
    | 'new-session'
    | 'compact'
    | 'export'
    | 'undo'
    | 'redo'
    | 'sessions'
    | 'theme'
    | 'model'
    | 'archetypes'
    | 'archetype-cycle'
    | 'status'
    | 'copy'
    | 'copy-draft'
    | 'interrupt-turn'
    | 'command-palette'
    | 'toggle-thinking'
    | 'open-editor'
    | 'thread-child-first'
    | 'thread-cycle-next'
    | 'thread-cycle-prev'
    | 'thread-parent'
    | 'message-page-up'
    | 'message-page-down'
    | 'message-half-page-up'
    | 'message-half-page-down'
    | 'message-line-up'
    | 'message-line-down'
    | 'message-first'
    | 'message-last'
    | 'message-last-user'
    | 'message-prev-user'
    | 'message-next-user'
    | 'model-favorite-toggle'
    | 'model-cycle-recent'
    | 'model-cycle-recent-back'
    | 'model-variant-cycle'
    | 'which-key-toggle'
    | 'which-key-layout-toggle'
    | 'which-key-pending-toggle'
    | 'status-health'
    | 'timeline-mode'
    | 'command-outputs'
    | 'queue-follow-up'
    | 'queue-priority'
    | 'clear-scrollback'
    | 'clear-input'
    | 'stash-draft'
    | 'tab-next'
    | 'tab-prev'
    | 'tab-reopen'
    | 'tab-close'
    | 'tab-history-back'
    | 'tab-history-forward'
    | 'tab-select-1'
    | 'tab-select-2'
    | 'tab-select-3'
    | 'tab-select-4'
    | 'tab-select-5'
    | 'tab-select-6'
    | 'tab-select-7'
    | 'tab-select-8'
    | 'tab-select-9';

export const AGENT_CONSOLE_GLOBAL_ACTIONS: AgentConsoleGlobalAction[] = [
    'new-session', 'compact', 'export', 'undo', 'redo', 'sessions',
    'copy-draft', 'theme', 'model', 'archetypes', 'archetype-cycle', 'status', 'copy', 'interrupt-turn', 'command-palette', 'toggle-thinking', 'open-editor',
    'thread-child-first', 'thread-cycle-next', 'thread-cycle-prev', 'thread-parent',
    'message-page-up', 'message-page-down', 'message-half-page-up', 'message-half-page-down', 'message-line-up', 'message-line-down', 'message-first', 'message-last', 'message-last-user', 'message-prev-user', 'message-next-user',
    'model-favorite-toggle', 'model-cycle-recent', 'model-cycle-recent-back', 'model-variant-cycle',
    'which-key-toggle', 'which-key-layout-toggle', 'which-key-pending-toggle', 'status-health', 'timeline-mode', 'command-outputs', 'queue-follow-up', 'queue-priority', 'clear-scrollback', 'clear-input', 'stash-draft',
    'tab-next', 'tab-prev', 'tab-reopen', 'tab-close',
    'tab-history-back', 'tab-history-forward',
    'tab-select-1', 'tab-select-2', 'tab-select-3', 'tab-select-4', 'tab-select-5',
    'tab-select-6', 'tab-select-7', 'tab-select-8', 'tab-select-9'
];
