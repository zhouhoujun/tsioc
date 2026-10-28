import * as fs from 'fs';
import * as path from 'path';
import type { AgentOptions } from '@tsdi/agent';

export interface ConsoleUiSettingsPatch {
    personality?: string | null;
    memoryInjection?: boolean;
}

/**
 * Apply a console preference to the shared runtime options and persist it to
 * the workspace settings, so turns started through the gateway (web console,
 * attached terminal) honour `/personality` and `/memories on|off` too.
 */
export function applyConsoleUiSettings(options: AgentOptions, params: ConsoleUiSettingsPatch = {}): Record<string, any> {
    const ui = { ...((options as any).ui || {}) };
    if (Object.prototype.hasOwnProperty.call(params, 'personality')) {
        if (params.personality) {
            ui.personality = String(params.personality);
        } else {
            delete ui.personality;
        }
    }
    if (typeof params.memoryInjection === 'boolean') {
        ui.memoryInjection = params.memoryInjection;
    }
    (options as any).ui = ui;
    persistConsoleUiSettings(options, ui);
    return { personality: ui.personality, memoryInjection: ui.memoryInjection };
}

/** Read the persisted console preferences for a workspace (serve startup). */
export function readConsoleUiSettings(workspace: string): { personality?: string; memoryInjection?: boolean } {
    const dir = String(workspace || '').trim();
    if (!dir) {
        return {};
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, '.tsdi-agent', 'settings.json'), 'utf8'));
        return {
            personality: typeof parsed?.personality === 'string' && parsed.personality.trim() ? parsed.personality.trim() : undefined,
            memoryInjection: typeof parsed?.memoryInjection === 'boolean' ? parsed.memoryInjection : undefined
        };
    } catch {
        return {};
    }
}

function persistConsoleUiSettings(options: AgentOptions, ui: Record<string, any>): void {
    const workspace = String((options as any).workspace || '').trim();
    if (!workspace) {
        return;
    }
    const file = path.join(workspace, '.tsdi-agent', 'settings.json');
    let current: Record<string, any> = {};
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
        current = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        // A brand-new workspace has no settings file yet: start from empty.
    }
    const next = { ...current };
    if (ui.personality) {
        next.personality = ui.personality;
    } else {
        delete next.personality;
    }
    if (typeof ui.memoryInjection === 'boolean') {
        next.memoryInjection = ui.memoryInjection;
    }
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(next, null, 2));
    } catch {
        // Persistence is best-effort; the runtime options still changed.
    }
}
