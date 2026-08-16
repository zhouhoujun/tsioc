import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';

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
    | 'open-editor';

export const AGENT_CONSOLE_GLOBAL_ACTIONS: AgentConsoleGlobalAction[] = [
    'new-session', 'compact', 'export', 'undo', 'redo', 'sessions',
    'theme', 'model', 'archetypes', 'status', 'copy', 'interrupt-turn', 'command-palette', 'toggle-thinking', 'open-editor'
];

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
    'ctrl+x y': 'copy',
    escape: 'interrupt-turn',
    'ctrl+p': 'command-palette',
    'ctrl+g': 'open-editor'
};

export function normalizeAgentConsoleKeySequence(value: string): string {
    return String(value || '').trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
}

export function isAgentConsoleGlobalAction(value: string): value is AgentConsoleGlobalAction {
    return AGENT_CONSOLE_GLOBAL_ACTIONS.includes(value as AgentConsoleGlobalAction);
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

    configure(overrides?: Record<string, string | null>): void {
        this.overrides = {};
        Object.entries(overrides || {}).forEach(([sequence, action]) => {
            const normalized = normalizeAgentConsoleKeySequence(sequence);
            if (normalized && (action === null || isAgentConsoleGlobalAction(action))) {
                this.overrides[normalized] = action;
            }
        });
    }

    get customBindings(): Record<string, AgentConsoleGlobalAction | null> {
        return { ...this.overrides };
    }

    get effectiveBindings(): Record<string, AgentConsoleGlobalAction> {
        const bindings: Record<string, AgentConsoleGlobalAction> = { ...AGENT_CONSOLE_DEFAULT_KEYMAP };
        Object.entries(this.overrides).forEach(([sequence, action]) => {
            if (action) bindings[sequence] = action;
            else delete bindings[sequence];
        });
        return bindings;
    }

    set(sequence: string, action: string): boolean {
        const normalized = normalizeAgentConsoleKeySequence(sequence);
        if (!normalized || !isAgentConsoleGlobalAction(action)) return false;
        this.overrides = { ...this.overrides, [normalized]: action };
        return true;
    }

    unset(sequence: string): boolean {
        const normalized = normalizeAgentConsoleKeySequence(sequence);
        if (!normalized || !this.effectiveBindings[normalized]) return false;
        this.overrides = { ...this.overrides, [normalized]: null };
        return true;
    }

    reset(): void {
        this.overrides = {};
    }

    resolve(sequence: string): AgentConsoleGlobalAction | undefined {
        return this.effectiveBindings[normalizeAgentConsoleKeySequence(sequence)];
    }
}

@Injectable()
export class AgentConsoleKeymapStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null) {}

    async load(workspace: string): Promise<Record<string, string | null>> {
        if (!workspace || !this.fileAdapter) return {};
        try {
            const text = await this.fileAdapter.readText(this.path(workspace));
            const parsed = JSON.parse(text);
            return parsed?.bindings && typeof parsed.bindings === 'object' ? parsed.bindings : {};
        } catch {
            return {};
        }
    }

    async save(workspace: string, bindings: Record<string, string | null>): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.fileAdapter.join(workspace, '.tsdi-agent');
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({ version: 1, bindings }, null, 2));
    }

    private path(workspace: string): string {
        return this.fileAdapter!.join(workspace, '.tsdi-agent', 'keymap.json');
    }
}
