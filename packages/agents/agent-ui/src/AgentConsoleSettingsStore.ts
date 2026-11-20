import { FileAdapter } from '@tsdi/common';
import { defaultAgentProviderRegistry } from '@tsdi/agent';
import type { ApprovalRule } from '@tsdi/agent';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentConsolePathProvider, resolveAgentConsoleDirectory, resolveAgentConsoleStoreFile } from './AgentConsolePathProvider';

export interface AgentConsoleSettingsData {
    language?: string;
    vimMode?: boolean;
    showThinking?: boolean;
    showTimestamps?: boolean;
    showToolOutput?: boolean;
    showUsername?: boolean;
    steerMode?: boolean;
    queueMode?: boolean;
    transcriptWindowMessages?: 20 | 40 | 80 | 120;
    approvalTimeoutMs?: number;
    /** Opt-in read-only shell scanner: inspection commands skip the prompt. */
    readOnlyShell?: boolean;
    /** Show release highlights after an upgrade (default on once the feature has been seen). */
    highlights?: boolean;
    /** Highest release-highlights version the user has acknowledged. */
    highlightsSeenVersion?: string;
    /** Default agent profile (archetype) for new sessions. */
    defaultArchetype?: string;
    /** Ordered approval rules (string tool/category patterns or category objects). */
    approvalRequireApproval?: ApprovalRule[];
    /** Project-scoped tool allow list (durable "always allow"). */
    approvalAllowRules?: string[];
    messageSelectionPageSize?: 4 | 6 | 10;
    activityVerbosity?: 'low' | 'medium' | 'high';
    timelineMode?: boolean;
    timelineViewMode?: 'off' | 'compact' | 'steps' | 'verbose';
    messageLayout?: 'scrollback' | 'viewport' | 'dynamic' | 'stream';
    thinkingLevel?: 'low' | 'medium' | 'high' | 'max';
    yoloMode?: boolean;
    securityLevel?: 'read-only' | 'ask' | 'auto' | 'full';
    personality?: string;
    memoryInjection?: boolean;
    taskFilter?: 'all' | 'failed' | 'rollback' | 'lineage';
    taskLineageRootId?: string;
    planTodoFilter?: 'all' | 'active' | 'blocked' | 'failed';
    touchMode?: boolean;
    modelProfile?: string;
    lastSessionId?: string;
    openSessionIds?: string[];
}

export function applyPersistedPreferences(
    options: any,
    persisted: { personality?: string; memoryInjection?: boolean; thinkingLevel?: 'low' | 'medium' | 'high' | 'max'; readOnlyShell?: boolean; highlights?: boolean; defaultArchetype?: string; approvalRequireApproval?: ApprovalRule[] } | null | undefined
): void {
    if (!options || !persisted) {
        return;
    }
    const ui = { ...(options.ui || {}) };
    if (typeof persisted.personality === 'string' && persisted.personality.trim()) {
        ui.personality = persisted.personality.trim();
    }
    if (typeof persisted.memoryInjection === 'boolean') {
        ui.memoryInjection = persisted.memoryInjection;
    }
    options.ui = ui;
    if (persisted.thinkingLevel) {
        options.model = { ...(options.model || {}), reasoningEffort: persisted.thinkingLevel };
    }
    if (typeof persisted.readOnlyShell === 'boolean') {
        // The approval strategy reads this live from the shared options object.
        options.policy = {
            ...(options.policy || {}),
            approval: { ...(options.policy?.approval || {}), readOnlyShell: persisted.readOnlyShell }
        };
    }
    if (typeof persisted.highlights === 'boolean') {
        options.ui = { ...(options.ui || {}), highlights: persisted.highlights };
    }
    if (typeof persisted.defaultArchetype === 'string' && persisted.defaultArchetype.trim()) {
        options.policy = { ...(options.policy || {}), defaultArchetype: persisted.defaultArchetype.trim() };
        options.defaultArchetype = persisted.defaultArchetype.trim();
    }
    if (Array.isArray(persisted.approvalRequireApproval)) {
        // The approval strategy reads this live from the shared options object.
        options.policy = {
            ...(options.policy || {}),
            approval: { ...(options.policy?.approval || {}), requireApproval: persisted.approvalRequireApproval }
        };
    }
}

/** Merge a configured profile into the top-level options without leaking the previous provider's credentials. */
export function applyProfileSelection(options: any, name: string, reasoningEffort?: 'low' | 'medium' | 'high' | 'max'): boolean {
    const profileName = String(name || '').trim();
    const model = options?.model;
    const profile = model?.profiles?.[profileName];
    if (!options || !profile) {
        return false;
    }
    const providerChanged = !!profile.provider && profile.provider !== model.provider;
    options.model = {
        ...model,
        ...profile,
        provider: profile.provider || model.provider,
        model: profile.model || model.model,
        // A profile may only override the model/tier while sharing the active
        // provider's credential. Clear credentials only on a provider switch.
        apiKey: profile.apiKey ?? (providerChanged ? undefined : model.apiKey),
        apiKeyEnv: profile.apiKeyEnv ?? (providerChanged ? undefined : model.apiKeyEnv),
        headers: profile.headers ?? (providerChanged ? undefined : model.headers),
        ...(profile.baseUrl ? { baseUrl: profile.baseUrl } : (providerChanged ? { baseUrl: undefined } : {})),
        defaultProfile: profileName,
        ...(reasoningEffort ? { reasoningEffort } : {})
    };
    return true;
}

/** Apply a persisted active model profile (or provider/model id) to the runtime options. */
export function applyPersistedModelProfile(options: any, name?: string | null): boolean {
    const profileName = String(name || '').trim();
    if (!options || !profileName) {
        return false;
    }
    const model = { ...(options.model || {}) };
    if (applyProfileSelection(options, profileName)) {
        return true;
    }
    const separator = profileName.indexOf('/');
    if (separator <= 0) {
        return false;
    }
    const provider = profileName.slice(0, separator);
    const modelId = profileName.slice(separator + 1);
    // Older builds could persist a tier label as a direct model id (for
    // example `openai-compatible/strong`) after a stale profile activation.
    // Treat it as invalid instead of routing every turn to a nonexistent model.
    if (['strong', 'flash', 'fast', 'balanced'].includes(modelId.toLowerCase())) {
        return false;
    }
    const match = Object.values(model.profiles || {}).find(entry => String((entry as any)?.provider || '') === provider) as any;
    if (match) {
        options.model = { ...model, ...match, provider, model: modelId, defaultProfile: undefined };
        return true;
    }
    const known = defaultAgentProviderRegistry.get(provider);
    if (known) {
        // Keep the active endpoint's credentials when both ids address the
        // same baseUrl (catalog `deepseek` vs an `openai-compatible` profile
        // pointing at api.deepseek.com). Cleared only on a real endpoint change.
        const sameEndpoint = !!model.baseUrl && !!known.baseUrl
            && normalizeModelEndpoint(model.baseUrl) === normalizeModelEndpoint(known.baseUrl);
        options.model = {
            ...model,
            provider,
            model: modelId,
            ...(known.baseUrl ? { baseUrl: known.baseUrl } : {}),
            ...(known.apiKeyEnv ? { apiKeyEnv: sameEndpoint && model.apiKeyEnv ? model.apiKeyEnv : known.apiKeyEnv } : {}),
            apiKey: sameEndpoint ? (model.apiKey ?? undefined) : undefined,
            headers: sameEndpoint ? (model.headers ?? undefined) : undefined,
            defaultProfile: undefined
        };
    } else {
        options.model = { ...model, provider, model: modelId, defaultProfile: undefined };
    }
    return true;
}

function normalizeModelEndpoint(value?: string): string {
    return String(value || '').trim().replace(/\/+$/, '').toLowerCase();
}

/** Validate persisted console settings; shared by the file store and the web RPC store. */
export function sanitizeAgentConsoleSettings(parsed: any): AgentConsoleSettingsData {
    const timelineViewMode = resolveTimelineViewMode(parsed);
    return {
        language: typeof parsed?.language === 'string' && parsed.language.trim() ? parsed.language.trim() : undefined,
        vimMode: typeof parsed?.vimMode === 'boolean' ? parsed.vimMode : undefined,
        showThinking: typeof parsed?.showThinking === 'boolean' ? parsed.showThinking : undefined,
        showTimestamps: typeof parsed?.showTimestamps === 'boolean' ? parsed.showTimestamps : undefined,
        showToolOutput: typeof parsed?.showToolOutput === 'boolean' ? parsed.showToolOutput : undefined,
        showUsername: typeof parsed?.showUsername === 'boolean' ? parsed.showUsername : undefined,
        steerMode: typeof parsed?.steerMode === 'boolean' ? parsed.steerMode : undefined,
        queueMode: typeof parsed?.queueMode === 'boolean' ? parsed.queueMode : undefined,
        transcriptWindowMessages: [20, 40, 80, 120].includes(Number(parsed?.transcriptWindowMessages))
            ? Number(parsed.transcriptWindowMessages) as 20 | 40 | 80 | 120
            : undefined,
        approvalTimeoutMs: Number.isFinite(Number(parsed?.approvalTimeoutMs)) && Number(parsed.approvalTimeoutMs) > 0
            ? Math.max(1000, Math.min(300000, Math.floor(Number(parsed.approvalTimeoutMs))))
            : undefined,
        readOnlyShell: typeof parsed?.readOnlyShell === 'boolean' ? parsed.readOnlyShell : undefined,
        highlights: typeof parsed?.highlights === 'boolean' ? parsed.highlights : undefined,
        highlightsSeenVersion: typeof parsed?.highlightsSeenVersion === 'string' && parsed.highlightsSeenVersion.trim() ? parsed.highlightsSeenVersion.trim() : undefined,
        defaultArchetype: typeof parsed?.defaultArchetype === 'string' && parsed.defaultArchetype.trim() ? parsed.defaultArchetype.trim() : undefined,
        approvalRequireApproval: sanitizeApprovalRequireApproval(parsed?.approvalRequireApproval),
        approvalAllowRules: sanitizeApprovalAllowRules(parsed?.approvalAllowRules),
        messageSelectionPageSize: [4, 6, 10].includes(Number(parsed?.messageSelectionPageSize))
            ? Number(parsed.messageSelectionPageSize) as 4 | 6 | 10
            : undefined,
        activityVerbosity: parsed?.activityVerbosity === 'low'
            ? 'low'
            : parsed?.activityVerbosity === 'medium'
                ? 'medium'
                : parsed?.activityVerbosity === 'high' ? 'high' : undefined,
        timelineViewMode,
        messageLayout: parsed?.messageLayout === 'scrollback' || parsed?.messageLayout === 'stream'
            ? 'scrollback'
            : parsed?.messageLayout === 'viewport' || parsed?.messageLayout === 'dynamic'
                ? 'viewport'
                : undefined,
        thinkingLevel: parsed?.thinkingLevel === 'low' || parsed?.thinkingLevel === 'medium' || parsed?.thinkingLevel === 'high' || parsed?.thinkingLevel === 'max'
            ? parsed.thinkingLevel
            : undefined,
        yoloMode: typeof parsed?.yoloMode === 'boolean' ? parsed.yoloMode : undefined,
        securityLevel: ['read-only', 'ask', 'auto', 'full'].includes(parsed?.securityLevel) ? parsed.securityLevel : undefined,
        personality: typeof parsed?.personality === 'string' && parsed.personality.trim() ? parsed.personality.trim() : undefined,
        memoryInjection: typeof parsed?.memoryInjection === 'boolean' ? parsed.memoryInjection : undefined,
        taskFilter: ['all', 'failed', 'rollback', 'lineage'].includes(parsed?.taskFilter) ? parsed.taskFilter : undefined,
        taskLineageRootId: typeof parsed?.taskLineageRootId === 'string' && parsed.taskLineageRootId.trim() ? parsed.taskLineageRootId.trim() : undefined,
        planTodoFilter: ['all', 'active', 'blocked', 'failed'].includes(parsed?.planTodoFilter) ? parsed.planTodoFilter : undefined,
        touchMode: typeof parsed?.touchMode === 'boolean' ? parsed.touchMode : undefined,
        modelProfile: typeof parsed?.modelProfile === 'string' && parsed.modelProfile.trim() ? parsed.modelProfile.trim() : undefined,
        lastSessionId: typeof parsed?.lastSessionId === 'string' && parsed.lastSessionId.trim() ? parsed.lastSessionId.trim() : undefined,
        openSessionIds: sanitizeOpenSessionIds(parsed?.openSessionIds)
    };
}

/** Ordered approval rules: strings or category objects; unknown shapes are dropped. */
export function sanitizeApprovalRequireApproval(value: unknown): ApprovalRule[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
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
    return rules.length ? rules : undefined;
}

/** Durable allow patterns are trimmed, deduplicated and bounded. */
export function sanitizeApprovalAllowRules(value: unknown): string[] | undefined {    if (!Array.isArray(value)) {
        return undefined;
    }
    const seen = new Set<string>();
    const rules = value
        .map(item => typeof item === 'string' ? item.trim() : '')
        .filter(rule => rule && !seen.has(rule) && !!seen.add(rule));
    return rules.length ? rules.slice(-50) : undefined;
}

/** Open tabs are bounded and deduplicated; the most recently opened ids win. */
export function sanitizeOpenSessionIds(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const seen = new Set<string>();
    const ids = value
        .map(item => typeof item === 'string' ? item.trim() : '')
        .filter(id => id && !seen.has(id) && !!seen.add(id));
    return ids.length ? ids.slice(-50) : undefined;
}

@Injectable()
export class AgentConsoleSettingsStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null, @Optional() private paths?: AgentConsolePathProvider | null) {}

    async load(workspace: string): Promise<AgentConsoleSettingsData> {
        if (!workspace || !this.fileAdapter) return {};
        try {
            const text = await this.fileAdapter.readText(this.path(workspace));
            return sanitizeAgentConsoleSettings(JSON.parse(text));
        } catch {
            return {};
        }
    }

    async save(workspace: string, data: AgentConsoleSettingsData): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.paths?.dotDirectory(workspace) || resolveAgentConsoleDirectory(this.fileAdapter, workspace);
        await this.fileAdapter.mkdir(directory, { recursive: true });
        const mode = data.timelineViewMode ?? (typeof data.timelineMode === 'boolean' ? (data.timelineMode ? 'compact' : 'off') : undefined);
        const path = this.path(workspace);
        const payload = JSON.stringify({
            version: 2,
            ...(data.language ? { language: data.language } : {}),
            ...(typeof data.vimMode === 'boolean' ? { vimMode: data.vimMode } : {}),
            ...(typeof data.showThinking === 'boolean' ? { showThinking: data.showThinking } : {}),
            ...(typeof data.showTimestamps === 'boolean' ? { showTimestamps: data.showTimestamps } : {}),
            ...(typeof data.showToolOutput === 'boolean' ? { showToolOutput: data.showToolOutput } : {}),
            ...(typeof data.showUsername === 'boolean' ? { showUsername: data.showUsername } : {}),
            ...(typeof data.steerMode === 'boolean' ? { steerMode: data.steerMode } : {}),
            ...(typeof data.queueMode === 'boolean' ? { queueMode: data.queueMode } : {}),
            ...(data.transcriptWindowMessages ? { transcriptWindowMessages: data.transcriptWindowMessages } : {}),
            ...(data.approvalTimeoutMs ? { approvalTimeoutMs: data.approvalTimeoutMs } : {}),
            ...(typeof data.readOnlyShell === 'boolean' ? { readOnlyShell: data.readOnlyShell } : {}),
            ...(typeof data.highlights === 'boolean' ? { highlights: data.highlights } : {}),
            ...(data.highlightsSeenVersion ? { highlightsSeenVersion: data.highlightsSeenVersion } : {}),
            ...(data.defaultArchetype ? { defaultArchetype: data.defaultArchetype } : {}),
            ...(data.approvalRequireApproval?.length ? { approvalRequireApproval: data.approvalRequireApproval } : {}),
            ...(data.messageSelectionPageSize ? { messageSelectionPageSize: data.messageSelectionPageSize } : {}),
            ...(data.activityVerbosity ? { activityVerbosity: data.activityVerbosity } : {}),
            ...(mode ? { timelineViewMode: mode } : {}),
            ...(data.messageLayout ? { messageLayout: data.messageLayout } : {}),
            ...(data.thinkingLevel ? { thinkingLevel: data.thinkingLevel } : {}),
            ...(typeof data.yoloMode === 'boolean' ? { yoloMode: data.yoloMode } : {}),
            ...(data.securityLevel ? { securityLevel: data.securityLevel } : {}),
            ...(data.personality ? { personality: data.personality } : {}),
            ...(typeof data.memoryInjection === 'boolean' ? { memoryInjection: data.memoryInjection } : {}),
            ...(data.taskFilter ? { taskFilter: data.taskFilter } : {}),
            ...(data.taskLineageRootId ? { taskLineageRootId: data.taskLineageRootId } : {}),
            ...(data.planTodoFilter ? { planTodoFilter: data.planTodoFilter } : {}),
            ...(typeof data.touchMode === 'boolean' ? { touchMode: data.touchMode } : {}),
            ...(data.modelProfile ? { modelProfile: data.modelProfile } : {}),
            ...(data.lastSessionId ? { lastSessionId: data.lastSessionId } : {}),
            ...(data.openSessionIds?.length ? { openSessionIds: sanitizeOpenSessionIds(data.openSessionIds) } : {})
        }, null, 2);
        await this.writeAtomic(path, payload);
    }

    /**
     * Replace the settings file via temp + rename when the adapter supports it.
     * Two overlapping writes otherwise leave trailing bytes from the longer
     * payload (observed as `}}` after toggling a setting and exiting quickly).
     */
    private async writeAtomic(path: string, payload: string): Promise<void> {
        const adapter = this.fileAdapter!;
        if (typeof adapter.rename !== 'function') {
            await adapter.writeText(path, payload);
            return;
        }
        const temporary = `${path}.tmp`;
        await adapter.writeText(temporary, payload);
        try {
            await adapter.rename(temporary, path);
        } catch (error) {
            await adapter.remove(temporary, { force: true }).catch(() => undefined);
            throw error;
        }
    }

    private path(workspace: string): string {
        return this.paths?.storeFile(workspace, 'settings.json') || resolveAgentConsoleStoreFile(this.fileAdapter!, workspace, 'settings.json');
    }
}

const TIMELINE_VIEW_MODES = new Set<string>(['off', 'compact', 'steps', 'verbose']);

function resolveTimelineViewMode(parsed: Record<string, unknown>): 'off' | 'compact' | 'steps' | 'verbose' | undefined {
    if (typeof parsed?.timelineViewMode === 'string' && TIMELINE_VIEW_MODES.has(parsed.timelineViewMode)) {
        return parsed.timelineViewMode as 'off' | 'compact' | 'steps' | 'verbose';
    }
    if (typeof parsed?.timelineMode === 'boolean') {
        return parsed.timelineMode ? 'compact' : 'off';
    }
    return undefined;
}
