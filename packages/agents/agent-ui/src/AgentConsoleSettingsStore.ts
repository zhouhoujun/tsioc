import { FileAdapter } from '@tsdi/common';
import { defaultAgentProviderRegistry } from '@tsdi/agent';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentConsolePathProvider, resolveAgentConsoleDirectory, resolveAgentConsoleStoreFile } from './AgentConsolePathProvider';

export interface AgentConsoleSettingsData {
    language?: string;
    vimMode?: boolean;
    showThinking?: boolean;
    showTimestamps?: boolean;
    showToolOutput?: boolean;
    showUsername?: boolean;
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
    modelProfile?: string;
}

export function applyPersistedPreferences(
    options: any,
    persisted: { personality?: string; memoryInjection?: boolean; thinkingLevel?: 'low' | 'medium' | 'high' | 'max' } | null | undefined
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
        apiKey: profile.apiKey,
        apiKeyEnv: profile.apiKeyEnv,
        headers: profile.headers,
        ...(profile.baseUrl ? { baseUrl: profile.baseUrl } : (providerChanged ? { baseUrl: undefined } : {})),
        defaultProfile: profileName,
        ...(reasoningEffort ? { reasoningEffort } : {})
    };
    return true;
}

/** Apply a persisted active model profile (or provider/model id) to the runtime options. */
export function applyPersistedModelProfile(options: any, name?: string | null): void {
    const profileName = String(name || '').trim();
    if (!options || !profileName) {
        return;
    }
    const model = { ...(options.model || {}) };
    if (applyProfileSelection(options, profileName)) {
        return;
    }
    const separator = profileName.indexOf('/');
    if (separator <= 0) {
        return;
    }
    const provider = profileName.slice(0, separator);
    const modelId = profileName.slice(separator + 1);
    const match = Object.values(model.profiles || {}).find(entry => String((entry as any)?.provider || '') === provider) as any;
    if (match) {
        options.model = { ...model, ...match, provider, model: modelId, defaultProfile: undefined };
        return;
    }
    const known = defaultAgentProviderRegistry.get(provider);
    options.model = known
        ? {
            ...model,
            provider,
            model: modelId,
            ...(known.baseUrl ? { baseUrl: known.baseUrl } : {}),
            ...(known.apiKeyEnv ? { apiKeyEnv: known.apiKeyEnv } : {}),
            apiKey: undefined,
            headers: undefined,
            defaultProfile: undefined
        }
        : { ...model, provider, model: modelId, defaultProfile: undefined };
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
        modelProfile: typeof parsed?.modelProfile === 'string' && parsed.modelProfile.trim() ? parsed.modelProfile.trim() : undefined
    };
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
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({
            version: 2,
            ...(data.language ? { language: data.language } : {}),
            ...(typeof data.vimMode === 'boolean' ? { vimMode: data.vimMode } : {}),
            ...(typeof data.showThinking === 'boolean' ? { showThinking: data.showThinking } : {}),
            ...(typeof data.showTimestamps === 'boolean' ? { showTimestamps: data.showTimestamps } : {}),
            ...(typeof data.showToolOutput === 'boolean' ? { showToolOutput: data.showToolOutput } : {}),
            ...(typeof data.showUsername === 'boolean' ? { showUsername: data.showUsername } : {}),
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
            ...(data.modelProfile ? { modelProfile: data.modelProfile } : {})
        }, null, 2));
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
