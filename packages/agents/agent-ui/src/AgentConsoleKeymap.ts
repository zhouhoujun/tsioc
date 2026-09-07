import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentConsolePathProvider, resolveAgentConsoleDirectory, resolveAgentConsoleStoreFile } from './AgentConsolePathProvider';

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
    | 'status'
    | 'copy'
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
    | 'clear-scrollback';

export const AGENT_CONSOLE_GLOBAL_ACTIONS: AgentConsoleGlobalAction[] = [
    'new-session', 'compact', 'export', 'undo', 'redo', 'sessions',
    'theme', 'model', 'archetypes', 'status', 'copy', 'interrupt-turn', 'command-palette', 'toggle-thinking', 'open-editor',
    'thread-child-first', 'thread-cycle-next', 'thread-cycle-prev', 'thread-parent',
    'message-page-up', 'message-page-down', 'message-half-page-up', 'message-half-page-down', 'message-line-up', 'message-line-down', 'message-first', 'message-last', 'message-last-user',
    'model-favorite-toggle', 'model-cycle-recent', 'model-cycle-recent-back', 'model-variant-cycle',
    'which-key-toggle', 'which-key-layout-toggle', 'which-key-pending-toggle', 'status-health', 'timeline-mode', 'command-outputs', 'queue-follow-up', 'clear-scrollback'
];

export const AGENT_CONSOLE_PAGER_DEFAULT_KEYMAP: Record<string, AgentConsoleGlobalAction> = {
    down: 'thread-child-first',
    right: 'thread-cycle-next',
    left: 'thread-cycle-prev',
    up: 'thread-parent',
    pageup: 'message-page-up',
    pagedown: 'message-page-down',
    home: 'message-first',
    end: 'message-last',
    'shift+g': 'message-last-user',
    'ctrl+u': 'message-half-page-up',
    'ctrl+d': 'message-half-page-down',
    'ctrl+n': 'message-line-up',
    'ctrl+b': 'message-line-down'
};

/** Opens transcript navigation from an empty composer. */
export const AGENT_CONSOLE_COMPOSER_DEFAULT_KEYMAP: Record<string, AgentConsoleGlobalAction> = {
    pageup: 'message-page-up',
    /** While a turn is running, Tab queues the composer draft as the next follow-up prompt. */
    tab: 'queue-follow-up',
    /** Empty composer Ctrl+L clears the visible scrollback without resetting the session. */
    'ctrl+l': 'clear-scrollback'
};

export const AGENT_CONSOLE_DEFAULT_KEYMAP: Record<string, AgentConsoleGlobalAction> = {
    'ctrl+x n': 'new-session',
    'ctrl+x c': 'compact',
    'ctrl+x x': 'export',
    'ctrl+x u': 'undo',
    'ctrl+x r': 'redo',
    'ctrl+x l': 'sessions',
    'ctrl+x t': 'toggle-thinking',
    'ctrl+x shift+t': 'theme',
    'ctrl+x m': 'model',
    'ctrl+x a': 'archetypes',
    'ctrl+x s': 'status',
    escape: 'interrupt-turn',
    'ctrl+p': 'command-palette',
    'ctrl+g': 'open-editor',
    'ctrl+f': 'model-favorite-toggle',
    f2: 'model-cycle-recent',
    'shift+f2': 'model-cycle-recent-back',
    'ctrl+t': 'model-variant-cycle',
    'ctrl+alt+k': 'which-key-toggle',
    'ctrl+x h': 'status-health',
    'ctrl+x g': 'timeline-mode'
};
export function normalizeAgentConsoleKeySequence(value: string): string {
    return String(value || '').trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
}

export function isAgentConsoleGlobalAction(value: string): value is AgentConsoleGlobalAction {
    return AGENT_CONSOLE_GLOBAL_ACTIONS.includes(value as AgentConsoleGlobalAction);
}

export function isAgentConsoleThreadNavigationAction(action: string): boolean {
    return action === 'thread-child-first' || action === 'thread-cycle-next'
        || action === 'thread-cycle-prev' || action === 'thread-parent';
}

export function isAgentConsoleMessageNavigationAction(action: string): boolean {
    return action === 'message-page-up' || action === 'message-page-down'
        || action === 'message-half-page-up' || action === 'message-half-page-down'
        || action === 'message-line-up' || action === 'message-line-down'
        || action === 'message-first' || action === 'message-last'
        || action === 'message-last-user';
}

export function fuzzyMatchAgentConsoleCommand(command: string, query: string): boolean {
    const target = command.toLowerCase();
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    let index = 0;
    for (const char of target) {
        if (char === needle[index]) index += 1;
        if (index === needle.length) return true;
    }
    return false;
}

@Injectable()
export class AgentConsoleKeymap {
    private overrides: Record<string, AgentConsoleGlobalAction | null> = {};
    private contextOverrides: Partial<Record<AgentConsoleKeymapContext, Record<string, AgentConsoleGlobalAction | null>>> = {};

    configure(overrides?: Record<string, string | null>): void {
        this.overrides = {};
        Object.entries(overrides || {}).forEach(([sequence, action]) => {
            const normalized = normalizeAgentConsoleKeySequence(sequence);
            if (normalized && (action === null || isAgentConsoleGlobalAction(action))) {
                this.overrides[normalized] = action;
            }
        });
    }

    configureContext(context: AgentConsoleKeymapContext, overrides?: Record<string, string | null>): void {
        const map: Record<string, AgentConsoleGlobalAction | null> = {};
        Object.entries(overrides || {}).forEach(([sequence, action]) => {
            const normalized = normalizeAgentConsoleKeySequence(sequence);
            if (normalized && (action === null || isAgentConsoleGlobalAction(action))) {
                map[normalized] = action;
            }
        });
        this.contextOverrides = { ...this.contextOverrides, [context]: map };
    }

    get customBindings(): Record<string, AgentConsoleGlobalAction | null> {
        return { ...this.overrides };
    }

    customBindingsFor(context: AgentConsoleKeymapContext): Record<string, AgentConsoleGlobalAction | null> {
        if (context === 'global') return this.customBindings;
        return { ...(this.contextOverrides[context] || {}) };
    }

    effectiveBindings(context: AgentConsoleKeymapContext = 'global'): Record<string, AgentConsoleGlobalAction> {
        const bindings: Record<string, AgentConsoleGlobalAction> = {
            ...AGENT_CONSOLE_DEFAULT_KEYMAP,
            ...(context === 'composer' ? AGENT_CONSOLE_COMPOSER_DEFAULT_KEYMAP : {}),
            ...(context === 'pager' ? AGENT_CONSOLE_PAGER_DEFAULT_KEYMAP : {})
        };
        Object.entries(this.overrides).forEach(([sequence, action]) => {
            if (action) bindings[sequence] = action;
            else delete bindings[sequence];
        });
        if (context !== 'global') {
            Object.entries(this.contextOverrides[context] || {}).forEach(([sequence, action]) => {
                if (action) bindings[sequence] = action;
                else delete bindings[sequence];
            });
        }
        return bindings;
    }

    set(sequence: string, action: string, context: AgentConsoleKeymapContext = 'global'): boolean {
        const normalized = normalizeAgentConsoleKeySequence(sequence);
        if (!normalized || !isAgentConsoleGlobalAction(action)) return false;
        if (context === 'global') {
            this.overrides = { ...this.overrides, [normalized]: action };
        } else {
            this.contextOverrides = {
                ...this.contextOverrides,
                [context]: { ...(this.contextOverrides[context] || {}), [normalized]: action }
            };
        }
        return true;
    }

    unset(sequence: string, context: AgentConsoleKeymapContext = 'global'): boolean {
        const normalized = normalizeAgentConsoleKeySequence(sequence);
        if (!normalized || !this.effectiveBindings(context)[normalized]) return false;
        if (context === 'global') {
            this.overrides = { ...this.overrides, [normalized]: null };
        } else {
            this.contextOverrides = {
                ...this.contextOverrides,
                [context]: { ...(this.contextOverrides[context] || {}), [normalized]: null }
            };
        }
        return true;
    }

    reset(context?: AgentConsoleKeymapContext): void {
        if (!context || context === 'global') {
            this.overrides = {};
            if (!context) this.contextOverrides = {};
            return;
        }
        this.contextOverrides = { ...this.contextOverrides, [context]: {} };
    }

    resolve(sequence: string, context: AgentConsoleKeymapContext = 'global'): AgentConsoleGlobalAction | undefined {
        return this.effectiveBindings(context)[normalizeAgentConsoleKeySequence(sequence)];
    }

    conflicts(sequence: string, action: AgentConsoleGlobalAction, context: AgentConsoleKeymapContext): Array<{ context: AgentConsoleKeymapContext; action: AgentConsoleGlobalAction }> {
        const normalized = normalizeAgentConsoleKeySequence(sequence);
        const found: Array<{ context: AgentConsoleKeymapContext; action: AgentConsoleGlobalAction }> = [];
        AGENT_CONSOLE_KEYMAP_CONTEXTS.forEach(other => {
            if (other === context) return;
            const existing = this.effectiveBindings(other)[normalized];
            if (existing && existing !== action) found.push({ context: other, action: existing });
        });
        return found;
    }
}

@Injectable()
export class AgentConsoleKeymapStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null, @Optional() private paths?: AgentConsolePathProvider | null) {}

    async load(workspace: string): Promise<Record<string, string | null>> {
        const parsed = await this.read(workspace);
        return parsed?.bindings && typeof parsed.bindings === 'object'
            ? parsed.bindings as Record<string, string | null>
            : {};
    }

    async loadContexts(workspace: string): Promise<Partial<Record<AgentConsoleKeymapContext, Record<string, string | null>>>> {
        const parsed = await this.read(workspace);
        if (!parsed?.contexts || typeof parsed.contexts !== 'object') return {};
        const result: Partial<Record<AgentConsoleKeymapContext, Record<string, string | null>>> = {};
        Object.entries(parsed.contexts).forEach(([context, bindings]) => {
            if (isAgentConsoleKeymapContext(context) && bindings && typeof bindings === 'object') {
                result[context] = bindings as Record<string, string | null>;
            }
        });
        return result;
    }

    async save(
        workspace: string,
        bindings: Record<string, string | null>,
        contexts?: Partial<Record<AgentConsoleKeymapContext, Record<string, string | null>>>
    ): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.paths?.dotDirectory(workspace) || resolveAgentConsoleDirectory(this.fileAdapter, workspace);
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({ version: 2, bindings, contexts: contexts || {} }, null, 2));
    }

    private async read(workspace: string): Promise<{ version?: number; bindings?: unknown; contexts?: unknown } | undefined> {
        if (!workspace || !this.fileAdapter) return undefined;
        try {
            return JSON.parse(await this.fileAdapter.readText(this.path(workspace)));
        } catch {
            return undefined;
        }
    }

    private path(workspace: string): string {
        return this.paths?.storeFile(workspace, 'keymap.json') || resolveAgentConsoleStoreFile(this.fileAdapter!, workspace, 'keymap.json');
    }
}
