import * as path from 'path';
import * as fs from 'fs';
import { AGENT_CHANNEL_GROUPS, AgentChannelsOptions } from '@tsdi/agent-channels';
import { AGENT_TOOL_GROUPS, AgentRootSettings, AgentToolsOptions, parseAgentSettingsList, resolveAgentToolDiscovery, loadEnvFiles } from '@tsdi/agent-tools';

export interface AgentCliModelRoute {
    name?: string;
    profile?: string;
    provider?: string;
    model?: string;
    apiKey?: string;
    apiKeyEnv?: string;
    baseUrl?: string;
    timeoutMs?: number;
    temperature?: number;
    maxTokens?: number;
    headers?: Record<string, string>;
    thinkingBudget?: number;
    reasoning?: boolean;
    when?: {
        complexity?: 'simple' | 'moderate' | 'complex' | Array<'simple' | 'moderate' | 'complex'>;
        inputPattern?: string;
        containsAny?: string[];
        minInputLength?: number;
        maxInputLength?: number;
    };
}

export interface AgentCliProviderProfile {
    provider: string;
    model: string;
    baseUrl?: string;
    apiKey?: string;
    apiKeyEnv?: string;
    timeoutMs?: number;
    temperature?: number;
    maxTokens?: number;
    headers?: Record<string, string>;
    thinkingBudget?: number;
    reasoning?: boolean;
    defaultProfile?: string;
    profiles?: Record<string, AgentCliProviderProfile>;
    routes?: AgentCliModelRoute[];
    complexityRouting?: Partial<Record<'simple' | 'moderate' | 'complex', string | AgentCliProviderProfile>>;
    complexityThresholds?: {
        simpleMaxScore?: number;
        moderateMaxScore?: number;
    };
}

export interface AgentCliOptions {
    session?: string;
    root?: string;
    tools?: string | string[];
    defaultTools?: boolean;
    channels?: string | string[];
    defaultChannels?: boolean;
    json?: boolean;
    provider?: string;
    model?: string;
    baseUrl?: string;
    apiKey?: string;
    apiKeyEnv?: string;
    timeout?: string;
    workspace?: string;
}

export interface AgentCliResolvedConfig {
    sessionId: string;
    root: string;
    settingsPath: string;
    workspace: string;
    skillRoots: string[];
    tools: AgentToolsOptions;
    channels: AgentChannelsOptions;
    providerProfile?: AgentCliProviderProfile;
    settingsModel?: Partial<AgentCliProviderProfile>;
}

function isCancelledConfigValue(value: unknown): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === 'cancel' || normalized === '/cancel' || normalized === 'q';
}

function hasInvalidConfigSentinel(model?: Partial<AgentCliProviderProfile>): boolean {
    if (!model) {
        return false;
    }
    return isCancelledConfigValue(model.provider)
        || isCancelledConfigValue(model.model)
        || isCancelledConfigValue(model.baseUrl)
        || isCancelledConfigValue(model.apiKey);
}

function sanitizeModelProfile(model: Record<string, any>): Partial<AgentCliProviderProfile> {
    const next: Record<string, any> = { ...model };
    if (next.profiles && typeof next.profiles === 'object' && !Array.isArray(next.profiles)) {
        const sanitizedProfiles = Object.entries(next.profiles as Record<string, any>)
            .reduce((profiles, [name, profile]) => {
                if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
                    return profiles;
                }
                const sanitized = sanitizeModelProfile(profile as Record<string, any>);
                if (hasInvalidConfigSentinel(sanitized)) {
                    return profiles;
                }
                profiles[name] = sanitized;
                return profiles;
            }, {} as Record<string, any>);
        if (Object.keys(sanitizedProfiles).length) {
            next.profiles = sanitizedProfiles;
        } else {
            delete next.profiles;
        }
    }
    if (next.defaultProfile && (!next.profiles || !next.profiles[next.defaultProfile])) {
        delete next.defaultProfile;
    }
    if (next.complexityRouting && typeof next.complexityRouting === 'object' && !Array.isArray(next.complexityRouting)) {
        const sanitizedRouting = Object.entries(next.complexityRouting as Record<string, any>)
            .reduce((routes, [key, entry]) => {
                if (typeof entry === 'string') {
                    if (next.profiles?.[entry]) {
                        routes[key] = entry;
                    }
                    return routes;
                }
                if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                    const sanitized = sanitizeModelProfile(entry as Record<string, any>);
                    if (!hasInvalidConfigSentinel(sanitized)) {
                        routes[key] = sanitized;
                    }
                }
                return routes;
            }, {} as Record<string, any>);
        if (Object.keys(sanitizedRouting).length) {
            next.complexityRouting = sanitizedRouting;
        } else {
            delete next.complexityRouting;
        }
    }
    return next as Partial<AgentCliProviderProfile>;
}

function readSettingsModel(root?: string): Partial<AgentCliProviderProfile> | undefined {
    if (!root) {
        return undefined;
    }
    const resolved = resolveAgentToolDiscovery(root);
    const model = (resolved.settings as any)?.model;
    if (!model || typeof model !== 'object' || Array.isArray(model)) {
        return undefined;
    }
    return sanitizeModelProfile(model as Record<string, any>);
}

function resolveInitialModelSelection(model?: Partial<AgentCliProviderProfile>): Partial<AgentCliProviderProfile> {
    if (!model) {
        return {};
    }
    const fallback = hasInvalidConfigSentinel(model) ? {} : model;
    if (model.provider || model.model) {
        return hasInvalidConfigSentinel(model) ? {} : model;
    }
    if (model.defaultProfile && model.profiles?.[model.defaultProfile]) {
        const selected = model.profiles[model.defaultProfile];
        return hasInvalidConfigSentinel(selected) ? fallback : selected;
    }
    const simpleRoute = model.complexityRouting?.simple;
    if (typeof simpleRoute === 'string' && model.profiles?.[simpleRoute]) {
        const selected = model.profiles[simpleRoute];
        return hasInvalidConfigSentinel(selected) ? fallback : selected;
    }
    if (simpleRoute && typeof simpleRoute === 'object') {
        return hasInvalidConfigSentinel(simpleRoute) ? fallback : simpleRoute;
    }
    const firstProfile = model.profiles ? Object.values(model.profiles)[0] : undefined;
    if (firstProfile && !hasInvalidConfigSentinel(firstProfile)) {
        return firstProfile;
    }
    return fallback || {};
}

function isKnownGroup(name: string, groups: Record<string, unknown>): boolean {
    return Object.prototype.hasOwnProperty.call(groups, name);
}

function readJsonObject(filePath: string): Record<string, any> {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) {
        return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Invalid JSON object at '${filePath}'.`);
    }
    return parsed;
}

function isRecoverableWriteError(error: any): boolean {
    const code = String(error?.code || '');
    return code === 'EACCES' || code === 'EPERM' || code === 'EROFS';
}

function stripLegacyApiKeyEnv<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(item => stripLegacyApiKeyEnv(item)) as T;
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    const next: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, entry]) => {
        if (key === 'apiKeyEnv') {
            return;
        }
        next[key] = stripLegacyApiKeyEnv(entry);
    });
    return next as T;
}

function writeJsonObject(filePath: string, value: Record<string, any>): string {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(stripLegacyApiKeyEnv(value), null, 2) + '\n', 'utf8');
    } catch (error: any) {
        if (!isRecoverableWriteError(error)) {
            throw error;
        }
    }
    return filePath;
}

function resolveLaunchWorkspace(): string {
    let current = process.cwd();
    while (true) {
        if (fs.existsSync(path.join(current, '.git'))) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            return process.cwd();
        }
        current = parent;
    }
}

export function resolveProviderProfile(root: string): AgentCliProviderProfile | undefined {
    const providerPath = path.join(root, 'provider.json');
    const parsed = readJsonObject(providerPath);
    if (!parsed.provider || !parsed.model) {
        return undefined;
    }
    return {
        provider: String(parsed.provider),
        model: String(parsed.model),
        baseUrl: parsed.baseUrl ? String(parsed.baseUrl) : undefined,
        apiKey: parsed.apiKey ? String(parsed.apiKey) : undefined,
        apiKeyEnv: parsed.apiKeyEnv ? String(parsed.apiKeyEnv) : undefined,
        timeoutMs: typeof parsed.timeoutMs === 'number' ? parsed.timeoutMs : undefined
    };
}

export function writeSettingsModelProfile(root: string, profile: Partial<AgentCliProviderProfile>): string {
    const resolvedRoot = path.resolve(root);
    const settingsPath = path.join(resolvedRoot, 'settings.json');
    const current = readJsonObject(settingsPath);
    const currentModel = current.model && typeof current.model === 'object' && !Array.isArray(current.model)
        ? { ...(current.model as Record<string, any>) }
        : undefined;
    let nextModel: Record<string, any> = profile as Record<string, any>;

    if (currentModel?.profiles || currentModel?.defaultProfile || currentModel?.complexityRouting) {
        nextModel = {
            ...currentModel
        };
        const defaultProfileName = typeof currentModel.defaultProfile === 'string'
            ? currentModel.defaultProfile
            : (currentModel.profiles?.flash ? 'flash' : (currentModel.profiles?.fast ? 'fast' : undefined));
        if (defaultProfileName && currentModel.profiles?.[defaultProfileName]) {
            nextModel.profiles = {
                ...currentModel.profiles,
                [defaultProfileName]: {
                    ...currentModel.profiles[defaultProfileName],
                    ...profile
                }
            };
        } else {
            nextModel = {
                ...nextModel,
                ...profile
            };
        }
    }
    const next = {
        ...current,
        model: nextModel
    };
    return writeJsonObject(settingsPath, next);
}

export function writeProviderProfile(root: string, profile: AgentCliProviderProfile): string {
    const providerPath = path.join(root, 'provider.json');
    return writeJsonObject(providerPath, profile as Record<string, any>);
}

export function ensureAgentWorkspaceConfig(root: string, workspaceDirName = 'workspace'): string {
    const resolvedRoot = path.resolve(root);
    const settingsPath = path.join(resolvedRoot, 'settings.json');
    const current = readJsonObject(settingsPath);
    const next = {
        ...current,
        workspace: current.workspace || workspaceDirName
    };
    return writeJsonObject(settingsPath, next);
}

export function resolveCliModelConfig(options: AgentCliOptions, root?: string): AgentCliProviderProfile {
    const settingsModel = readSettingsModel(root);
    const initialModel = resolveInitialModelSelection(settingsModel);
    const providerProfile = root ? resolveProviderProfile(root) : undefined;
    const provider = options.provider || process.env.AGENT_PROVIDER || initialModel.provider || providerProfile?.provider || 'deepseek';
    const model = options.model || process.env.AGENT_MODEL || initialModel.model || providerProfile?.model || 'deepseek-v4-flash';
    const apiKeyEnv = options.apiKeyEnv
        || initialModel.apiKeyEnv
        || settingsModel?.apiKeyEnv
        || providerProfile?.apiKeyEnv
        || resolveProviderApiKeyEnv(provider);
    const apiKey = options.apiKey
        || process.env.AGENT_API_KEY
        || (apiKeyEnv ? process.env[apiKeyEnv] : undefined)
        || initialModel.apiKey
        || settingsModel?.apiKey
        || providerProfile?.apiKey
        || undefined;
    const timeoutMs = parseInt(options.timeout as string) || initialModel.timeoutMs || providerProfile?.timeoutMs || 120000;
    const baseUrl = options.baseUrl || process.env.AGENT_BASE_URL || initialModel.baseUrl || providerProfile?.baseUrl || resolveProviderBaseUrl(provider);

    return {
        ...(settingsModel || {}),
        provider,
        model,
        baseUrl,
        apiKey,
        apiKeyEnv,
        timeoutMs,
        temperature: initialModel.temperature ?? settingsModel?.temperature ?? providerProfile?.temperature,
        maxTokens: initialModel.maxTokens ?? settingsModel?.maxTokens ?? providerProfile?.maxTokens,
        headers: initialModel.headers ?? settingsModel?.headers ?? providerProfile?.headers,
        thinkingBudget: initialModel.thinkingBudget ?? settingsModel?.thinkingBudget ?? providerProfile?.thinkingBudget,
        reasoning: initialModel.reasoning ?? settingsModel?.reasoning ?? providerProfile?.reasoning
    };
}

export function resolveProviderApiKeyEnv(provider: string): string | undefined {
    switch (provider.trim().toLowerCase()) {
        case 'deepseek':
            return 'DEEPSEEK_API_KEY';
        case 'openai':
        case 'openai-compatible':
            return 'OPENAI_API_KEY';
        case 'anthropic':
        case 'claude':
            return 'ANTHROPIC_API_KEY';
        default:
            return undefined;
    }
}

export function resolveProviderBaseUrl(provider: string): string | undefined {
    switch (provider.trim().toLowerCase()) {
        case 'deepseek':
            return 'https://api.deepseek.com';
        case 'openai':
            return 'https://api.openai.com';
        case 'anthropic':
        case 'claude':
            return 'https://api.anthropic.com';
        default:
            return undefined;
    }
}

/**
 * Resolve CLI config, loading .env files from workspace and root directories.
 */
export function resolveCliConfig(options: AgentCliOptions): AgentCliResolvedConfig {
    const resolved = resolveAgentToolDiscovery(options.root);
    const settings: AgentRootSettings = resolved.settings;
    const providerProfile = resolveProviderProfile(resolved.root);
    const settingsModel = readSettingsModel(resolved.root);
    const usesDefaultWorkspacePlaceholder = !options.root
        && !options.workspace
        && (!settings.workspace || settings.workspace === 'workspace');

    // Load .env files early so subsequent code can read process.env
    const workspace = options.workspace
        ? path.resolve(options.workspace)
        : (usesDefaultWorkspacePlaceholder ? resolveLaunchWorkspace() : resolved.workspace);
    loadEnvFiles(workspace, resolved.root, { verbose: true });
    const toolSettings = resolved.tools;
    const toolNames = parseAgentSettingsList(options.tools ?? settings.tools?.values);
    const channelNames = parseAgentSettingsList(options.channels ?? settings.channels?.values);
    const skillRoots = resolved.skillRoots;
    const fileRootDir = options.workspace
        ? path.resolve(options.workspace)
        : (usesDefaultWorkspacePlaceholder ? workspace : (toolSettings.file?.rootDir ?? workspace));
    const tools: AgentToolsOptions = {
        ...toolSettings,
        file: { ...(toolSettings.file ?? {}), rootDir: fileRootDir },
        roots: (toolSettings.roots ?? []).slice(),
        registration: {
            ...(toolSettings.registration ?? {}),
            preset: options.defaultTools === false ? 'none' : (toolSettings.registration?.preset ?? 'default'),
            groups: { ...(toolSettings.registration?.groups ?? {}) },
            items: { ...(toolSettings.registration?.items ?? {}) }
        }
    };
    const channels: AgentChannelsOptions = {
        defaultChannel: channelNames[0],
        registration: {
            preset: options.defaultChannels === false || settings.channels?.defaultEnabled === false ? 'none' : 'default',
            groups: {},
            items: {}
        }
    };

    toolNames.forEach(name => {
        if (isKnownGroup(name, AGENT_TOOL_GROUPS as any)) {
            (tools.registration!.groups as any)[name] = true;
            return;
        }
        (tools.registration!.items as any)[name] = true;
    });

    channelNames.forEach(name => {
        if (isKnownGroup(name, AGENT_CHANNEL_GROUPS as any)) {
            (channels.registration!.groups as any)[name] = true;
            return;
        }
        (channels.registration!.items as any)[name] = true;
    });

    return {
        sessionId: options.session || settings.session || 'default',
        root: resolved.root,
        settingsPath: resolved.settingsPath,
        workspace,
        skillRoots,
        tools,
        channels,
        providerProfile,
        settingsModel
    };
}
