import * as fs from 'fs';
import * as path from 'path';
import type { AgentOptions } from '@tsdi/agent';

export interface ConsoleUiSettingsPatch {
    personality?: string | null;
    memoryInjection?: boolean;
    securityLevel?: string | null;
    yoloMode?: boolean;
}

const SECURITY_LEVELS = ['read-only', 'ask', 'auto', 'full'];
const CONSOLE_STORE_FILES = new Set(['settings.json', 'theme.json', 'statusline.json', 'title.json', 'keymap.json', 'raw-mode.json']);
const MAX_CONSOLE_STORE_BYTES = 256 * 1024;

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
    const securityLevel = SECURITY_LEVELS.includes(String(params.securityLevel)) ? String(params.securityLevel) : undefined;
    (options as any).ui = ui;
    persistConsoleUiSettings(options, ui, securityLevel, params.yoloMode);
    return { personality: ui.personality, memoryInjection: ui.memoryInjection, securityLevel, yoloMode: params.yoloMode };
}

/** Read one console store file from the gateway workspace (web console clients). */
export function readConsoleStore(workspace: string, name: string): any {
    const file = consoleStoreFile(workspace, name);
    if (!file) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

/** Write one allowlisted console store file in the gateway workspace. */
export function writeConsoleStore(workspace: string, name: string, data: any): void {
    const file = consoleStoreFile(workspace, name);
    if (!file) {
        throw new Error('Console store requires a workspace');
    }
    const text = JSON.stringify(data ?? {}, null, 2);
    if (Buffer.byteLength(text, 'utf8') > MAX_CONSOLE_STORE_BYTES) {
        throw new Error('Console store payload is too large');
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
}

function consoleStoreFile(workspace: string, name: string): string | null {
    const dir = String(workspace || '').trim();
    if (!CONSOLE_STORE_FILES.has(name)) {
        throw new Error(`Unsupported console store: ${name}`);
    }
    return dir ? path.join(dir, '.tsdi-agent', name) : null;
}

/** Read the persisted console preferences for a workspace (serve startup). */
export function readConsoleUiSettings(workspace: string): { personality?: string; memoryInjection?: boolean; securityLevel?: string; yoloMode?: boolean } {
    const dir = String(workspace || '').trim();
    if (!dir) {
        return {};
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, '.tsdi-agent', 'settings.json'), 'utf8'));
        return {
            personality: typeof parsed?.personality === 'string' && parsed.personality.trim() ? parsed.personality.trim() : undefined,
            memoryInjection: typeof parsed?.memoryInjection === 'boolean' ? parsed.memoryInjection : undefined,
            securityLevel: SECURITY_LEVELS.includes(String(parsed?.securityLevel)) ? parsed.securityLevel : undefined,
            yoloMode: typeof parsed?.yoloMode === 'boolean' ? parsed.yoloMode : undefined
        };
    } catch {
        return {};
    }
}

function persistConsoleUiSettings(
    options: AgentOptions,
    ui: Record<string, any>,
    securityLevel?: string,
    yoloMode?: boolean
): void {
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
    if (securityLevel) {
        next.securityLevel = securityLevel;
    }
    if (typeof yoloMode === 'boolean') {
        next.yoloMode = yoloMode;
    }
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(next, null, 2));
    } catch {
        // Persistence is best-effort; the runtime options still changed.
    }
}
