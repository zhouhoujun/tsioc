import * as fs from 'fs';
import * as path from 'path';
import type { AgentOptions } from '@tsdi/agent';
import type { ApprovalRule } from '@tsdi/agent';

export interface ConsoleUiSettingsPatch {
    personality?: string | null;
    memoryInjection?: boolean;
    securityLevel?: string | null;
    yoloMode?: boolean;
    thinkingLevel?: string | null;
    modelProfile?: string | null;
    /** Approval wait budget in milliseconds; new requests use it immediately. */
    approvalTimeoutMs?: number | null;
    /** Opt-in read-only shell scanner for the shared runtime policy. */
    readOnlyShell?: boolean;
    /** Default agent profile (archetype) applied to the shared runtime options. */
    defaultArchetype?: string | null;
    /** Ordered approval rules (string patterns or category objects). */
    approvalRequireApproval?: ApprovalRule[] | null;
    /** Project-scoped tool allow list applied to the runtime approval manager. */
    approvalAllowRules?: string[] | null;
}

/** Ordered approval rules: strings or category objects; unknown shapes are dropped. */
export function sanitizeApprovalRequireApproval(value: unknown): ApprovalRule[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const rules: ApprovalRule[] = [];
    for (const item of value) {
        if (typeof item === 'string') {
            const rule = item.trim();
            if (rule) rules.push(rule);
            continue;
        }
        if (!item || typeof item !== 'object') {
            continue;
        }
        const category = String((item as any).category || '').trim();
        if (!category) {
            continue;
        }
        const action = ['ask', 'allow', 'deny'].includes((item as any).action) ? (item as any).action : undefined;
        const mode = (item as any).mode === 'auto-deny' ? 'auto-deny' : undefined;
        const names = Array.isArray((item as any).names)
            ? (item as any).names.map((name: unknown) => String(name || '').trim()).filter(Boolean).slice(0, 50)
            : undefined;
        const rawResource = (item as any).resource;
        const resource = typeof rawResource === 'string' && rawResource.trim()
            ? rawResource.trim()
            : Array.isArray(rawResource)
                ? rawResource.map((entry: unknown) => String(entry || '').trim()).filter(Boolean).slice(0, 50)
                : undefined;
        rules.push({
            category: category as any,
            ...(names?.length ? { names } : {}),
            ...(resource && (!Array.isArray(resource) || resource.length) ? { resource } : {}),
            ...(action ? { action } : {}),
            ...(mode ? { mode } : {})
        });
    }
    return rules;
}

/** Durable allow rules: trimmed, deduplicated and bounded like the console store. */
export function sanitizeApprovalAllowRules(value: unknown): string[] {    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set<string>();
    return value
        .map(item => typeof item === 'string' ? item.trim() : '')
        .filter(rule => rule && !seen.has(rule) && !!seen.add(rule))
        .slice(-50);
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
    const thinkingLevel = ['low', 'medium', 'high', 'max'].includes(String(params.thinkingLevel)) ? String(params.thinkingLevel) : undefined;
    const modelProfile = typeof params.modelProfile === 'string' && params.modelProfile.trim() ? params.modelProfile.trim() : undefined;
    const approvalTimeoutMs = Number.isFinite(Number(params.approvalTimeoutMs)) && Number(params.approvalTimeoutMs) > 0
        ? Math.max(1000, Math.min(300000, Math.floor(Number(params.approvalTimeoutMs))))
        : undefined;
    (options as any).ui = ui;
    const readOnlyShell = typeof params.readOnlyShell === 'boolean' ? params.readOnlyShell : undefined;
    if (readOnlyShell !== undefined) {
        (options as any).policy = {
            ...((options as any).policy || {}),
            approval: { ...((options as any).policy?.approval || {}), readOnlyShell }
        };
    }
    const defaultArchetype = typeof params.defaultArchetype === 'string' && params.defaultArchetype.trim()
        ? params.defaultArchetype.trim()
        : undefined;
    if (defaultArchetype) {
        (options as any).policy = { ...((options as any).policy || {}), defaultArchetype };
        (options as any).defaultArchetype = defaultArchetype;
    }
    const approvalRequireApproval = Array.isArray(params.approvalRequireApproval)
        ? sanitizeApprovalRequireApproval(params.approvalRequireApproval)
        : undefined;
    if (approvalRequireApproval) {
        (options as any).policy = {
            ...((options as any).policy || {}),
            approval: { ...((options as any).policy?.approval || {}), requireApproval: approvalRequireApproval }
        };
    }
    const approvalAllowRules = Array.isArray(params.approvalAllowRules)
        ? sanitizeApprovalAllowRules(params.approvalAllowRules)
        : undefined;
    persistConsoleUiSettings(options, ui, securityLevel, params.yoloMode, thinkingLevel, modelProfile, approvalTimeoutMs, approvalAllowRules, readOnlyShell, defaultArchetype, approvalRequireApproval);
    return {
        personality: ui.personality,
        memoryInjection: ui.memoryInjection,
        securityLevel,
        yoloMode: params.yoloMode,
        thinkingLevel,
        modelProfile,
        ...(approvalTimeoutMs ? { approvalTimeoutMs } : {}),
        ...(readOnlyShell !== undefined ? { readOnlyShell } : {}),
        ...(defaultArchetype ? { defaultArchetype } : {}),
        ...(approvalRequireApproval ? { approvalRequireApproval } : {}),
        ...(approvalAllowRules ? { approvalAllowRules } : {})
    };
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
export function readConsoleUiSettings(workspace: string): { personality?: string; memoryInjection?: boolean; securityLevel?: string; yoloMode?: boolean; thinkingLevel?: 'low' | 'medium' | 'high' | 'max'; modelProfile?: string; approvalAllowRules?: string[]; readOnlyShell?: boolean; defaultArchetype?: string; approvalRequireApproval?: ApprovalRule[]; sessionApprovalRules?: Record<string, ApprovalRule[]> } {
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
            yoloMode: typeof parsed?.yoloMode === 'boolean' ? parsed.yoloMode : undefined,
            thinkingLevel: ['low', 'medium', 'high', 'max'].includes(String(parsed?.thinkingLevel)) ? parsed.thinkingLevel : undefined,
            modelProfile: typeof parsed?.modelProfile === 'string' && parsed.modelProfile.trim() ? parsed.modelProfile.trim() : undefined,
            approvalAllowRules: Array.isArray(parsed?.approvalAllowRules)
                ? sanitizeApprovalAllowRules(parsed.approvalAllowRules)
                : undefined,
            readOnlyShell: typeof parsed?.readOnlyShell === 'boolean' ? parsed.readOnlyShell : undefined,
            sessionApprovalRules: parsed?.sessionApprovalRules && typeof parsed.sessionApprovalRules === 'object' && !Array.isArray(parsed.sessionApprovalRules)
                ? parsed.sessionApprovalRules as Record<string, ApprovalRule[]>
                : undefined,
            defaultArchetype: typeof parsed?.defaultArchetype === 'string' && parsed.defaultArchetype.trim() ? parsed.defaultArchetype.trim() : undefined,
            approvalRequireApproval: Array.isArray(parsed?.approvalRequireApproval)
                ? sanitizeApprovalRequireApproval(parsed.approvalRequireApproval)
                : undefined
        };
    } catch {
        return {};
    }
}

function persistConsoleUiSettings(
    options: AgentOptions,
    ui: Record<string, any>,
    securityLevel?: string,
    yoloMode?: boolean,
    thinkingLevel?: string,
    modelProfile?: string,
    approvalTimeoutMs?: number,
    approvalAllowRules?: string[],
    readOnlyShell?: boolean,
    defaultArchetype?: string,
    approvalRequireApproval?: ApprovalRule[]
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
    if (thinkingLevel) {
        next.thinkingLevel = thinkingLevel;
    }
    if (modelProfile) {
        next.modelProfile = modelProfile;
    }
    if (approvalTimeoutMs) {
        next.approvalTimeoutMs = approvalTimeoutMs;
    }
    if (approvalAllowRules) {
        if (approvalAllowRules.length) {
            next.approvalAllowRules = approvalAllowRules;
        } else {
            delete next.approvalAllowRules;
        }
    }
    if (typeof readOnlyShell === 'boolean') {
        next.readOnlyShell = readOnlyShell;
    }
    if (defaultArchetype) {
        next.defaultArchetype = defaultArchetype;
    }
    if (Array.isArray(approvalRequireApproval)) {
        if (approvalRequireApproval.length) {
            next.approvalRequireApproval = approvalRequireApproval;
        } else {
            delete next.approvalRequireApproval;
        }
    }
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(next, null, 2));
    } catch {
        // Persistence is best-effort; the runtime options still changed.
    }
}
