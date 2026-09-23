import * as path from 'path';
import * as fs from 'fs';
import { AgentHooksOptions, AgentProviderRegistry, defaultAgentProviderRegistry, resolveAgentWorkspacePath } from '@tsdi/agent';
import { AgentTuiResolvedConfig, mergeAgentTuiConfig } from '@tsdi/agent-ui';
import { AGENT_CHANNEL_GROUPS, AgentChannelsOptions } from '@tsdi/agent-channels';
import { AGENT_TOOL_GROUPS, AgentRootSettings, AgentToolsOptions, McpOAuthCredentialStore, parseAgentSettingsList, resolveAgentToolDiscovery, loadEnvFiles } from '@tsdi/agent-tools';
import { SshOptions } from '@tsdi/agent-ssh';

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
        falsifyRateGt?: number;
    };
}

export interface AgentCliSavedModelProfile {
    name: string;
    provider: string;
    flashModel: string;
    strongModel: string;
    baseUrl?: string;
    apiKey?: string;
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
    savedProfiles?: Record<string, AgentCliSavedModelProfile>;
    activeSavedProfile?: string;
}

export interface AgentCliOptions {
    session?: string;
    root?: string;
    tools?: string | string[];
    image?: string | string[];
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
    stream?: boolean;
    outputLastMessage?: boolean;
    tuiTheme?: string;
    tuiKeybinds?: Record<string, string | null>;
    tuiScrollSpeed?: string;
    tuiAttentionSound?: boolean;
    tuiLeaderTimeout?: string;
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
    hooks?: AgentHooksOptions;
    harnessProfile?: string;
    ssh?: SshOptions;
    tui?: AgentTuiResolvedConfig;
}

export const AGENT_HOOKS_FILE = 'hooks.json';

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
    if (next.savedProfiles && typeof next.savedProfiles === 'object' && !Array.isArray(next.savedProfiles)) {
        const sanitizedSavedProfiles = Object.entries(next.savedProfiles as Record<string, any>)
            .reduce((profiles, [name, profile]) => {
                if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
                    return profiles;
                }
                const provider = String(profile.provider || '').trim();
                const flashModel = String(profile.flashModel || '').trim();
                const strongModel = String(profile.strongModel || '').trim();
                if (!provider || !flashModel || !strongModel) {
                    return profiles;
                }
                profiles[name] = {
                    name: String(profile.name || name),
                    provider,
                    flashModel,
                    strongModel,
                    baseUrl: profile.baseUrl ? String(profile.baseUrl) : undefined,
                    apiKey: profile.apiKey ? String(profile.apiKey) : undefined
                };
                return profiles;
            }, {} as Record<string, AgentCliSavedModelProfile>);
        if (Object.keys(sanitizedSavedProfiles).length) {
            next.savedProfiles = sanitizedSavedProfiles;
        } else {
            delete next.savedProfiles;
        }
    }
    if (next.activeSavedProfile && (!next.savedProfiles || !next.savedProfiles[next.activeSavedProfile])) {
        delete next.activeSavedProfile;
    }
    return next as Partial<AgentCliProviderProfile>;
}

function readSettingsModel(root?: string): Partial<AgentCliProviderProfile> | undefined {
    if (!root) {
        return undefined;
    }
    const model = readJsonObject(path.join(path.resolve(root), 'settings.json')).model;
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
    return restoreStoredApiKeys(filePath, parsed);
}

function cliCredentialId(filePath: string): string {
    return `cli-config:${path.basename(filePath)}`;
}

function cliCredentialStore(filePath: string): McpOAuthCredentialStore {
    return new McpOAuthCredentialStore(path.join(path.dirname(filePath), 'mcp-credentials.json'));
}

function collectApiKeys(value: unknown, prefix = '', result: Record<string, string> = {}): Record<string, string> {
    if (Array.isArray(value)) {
        value.forEach((item, index) => collectApiKeys(item, `${prefix}/${index}`, result));
    } else if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
            const next = `${prefix}/${key}`;
            if (key === 'apiKey' && typeof entry === 'string' && entry.trim()) result[next] = entry;
            else collectApiKeys(entry, next, result);
        });
    }
    return result;
}

function restoreStoredApiKeys(filePath: string, value: Record<string, any>): Record<string, any> {
    const stored = cliCredentialStore(filePath).get(cliCredentialId(filePath))?.token.accessToken;
    if (!stored) return value;
    const keys = JSON.parse(stored) as Record<string, string>;
    Object.entries(keys).forEach(([pointer, secret]) => {
        const segments = pointer.split('/').filter(Boolean);
        let target: any = value;
        for (let index = 0; index < segments.length - 1; index++) {
            if (!target?.[segments[index]] || typeof target[segments[index]] !== 'object') return;
            target = target[segments[index]];
        }
        if (target && segments.length) target[segments[segments.length - 1]] = secret;
    });
    return value;
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
        if (key === 'apiKeyEnv' || key === 'apiKey') {
            return;
        }
        next[key] = stripLegacyApiKeyEnv(entry);
    });
    return next as T;
}

function writeJsonObject(filePath: string, value: Record<string, any>): string {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const apiKeys = collectApiKeys(value);
        if (Object.keys(apiKeys).length) {
            cliCredentialStore(filePath).set(cliCredentialId(filePath), {
                accessToken: JSON.stringify(apiKeys), tokenType: 'Internal'
            });
        }
        fs.writeFileSync(filePath, JSON.stringify(stripLegacyApiKeyEnv(value), null, 2) + '\n', 'utf8');
    } catch (error: any) {
        if (!isRecoverableWriteError(error)) {
            throw error;
        }
    }
    return filePath;
}

export function resolveLaunchWorkspace(): string {
    return resolveAgentWorkspacePath({
        currentDirectory: process.cwd(),
        fallbackWorkspace: process.cwd(),
        adapter: {
            resolve: (...paths) => path.resolve(...paths),
            join: (...paths) => path.join(...paths),
            existsSync: (target) => fs.existsSync(target)
        },
        dirname: (target) => path.dirname(target)
    });
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

export function resolveProviderRegistry(root: string): AgentProviderRegistry {
    const parsed = readJsonObject(path.join(root, 'provider.json'));
    if (!parsed.providers) return defaultAgentProviderRegistry;
    const custom = AgentProviderRegistry.parse(parsed);
    const byId = new Map(defaultAgentProviderRegistry.list().map(item => [item.id, item]));
    for (const provider of custom) byId.set(provider.id, provider);
    return new AgentProviderRegistry([...byId.values()]);
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
        model: sanitizeModelProfile(nextModel)
    };
    return writeJsonObject(settingsPath, next);
}

export interface AgentCliSettingsHealReport {
    changed: boolean;
    removedProfiles: string[];
    removedRoutes: string[];
    removedSavedProfiles: string[];
    droppedDefaultProfile: boolean;
}

let lastSettingsHealReport: AgentCliSettingsHealReport | null = null;

export function getLastSettingsHealReport(): AgentCliSettingsHealReport | null {
    return lastSettingsHealReport;
}

/**
 * Rewrite `settings.json` with the sanitized model config when the stored model
 * contains invalid sentinels, dangling profiles/routes or nested duplicates.
 * Returns what was removed so callers (e.g. `doctor`) can report it.
 */
export function healSettingsModelConfig(root?: string): AgentCliSettingsHealReport {
    const empty: AgentCliSettingsHealReport = {
        changed: false,
        removedProfiles: [],
        removedRoutes: [],
        removedSavedProfiles: [],
        droppedDefaultProfile: false
    };
    lastSettingsHealReport = empty;
    if (!root) {
        return empty;
    }
    const settingsPath = path.join(path.resolve(root), 'settings.json');
    if (!fs.existsSync(settingsPath)) {
        return empty;
    }
    const current = readJsonObject(settingsPath);
    const rawModel = current.model;
    if (!rawModel || typeof rawModel !== 'object' || Array.isArray(rawModel)) {
        return empty;
    }
    const sanitized = sanitizeModelProfile(rawModel as Record<string, any>);
    if (JSON.stringify(sanitized) === JSON.stringify(rawModel)) {
        return empty;
    }
    const report: AgentCliSettingsHealReport = {
        changed: true,
        removedProfiles: removedConfigKeys(rawModel.profiles, sanitized.profiles),
        removedRoutes: removedConfigKeys(rawModel.complexityRouting, sanitized.complexityRouting),
        removedSavedProfiles: removedConfigKeys(rawModel.savedProfiles, sanitized.savedProfiles),
        droppedDefaultProfile: !!rawModel.defaultProfile && !sanitized.defaultProfile
    };
    writeJsonObject(settingsPath, { ...current, model: sanitized });
    lastSettingsHealReport = report;
    return report;
}

function removedConfigKeys(raw?: Record<string, any>, sanitized?: Record<string, any>): string[] {
    const before = raw && typeof raw === 'object' ? Object.keys(raw) : [];
    const after = new Set(sanitized && typeof sanitized === 'object' ? Object.keys(sanitized) : []);
    return before.filter(key => !after.has(key));
}

export function writeInteractiveModelProfile(root: string, profile: AgentCliProviderProfile): string {    const resolvedRoot = path.resolve(root);
    const settingsPath = path.join(resolvedRoot, 'settings.json');
    const current = readJsonObject(settingsPath);
    return writeJsonObject(settingsPath, {
        ...current,
        model: profile as Record<string, any>
    });
}

export function writeProviderProfile(root: string, profile: AgentCliProviderProfile): string {
    const providerPath = path.join(root, 'provider.json');
    return writeJsonObject(providerPath, profile as Record<string, any>);
}

export function listSavedModelProfiles(profile?: Partial<AgentCliProviderProfile>): AgentCliSavedModelProfile[] {
    const savedProfiles = profile?.savedProfiles || {};
    return Object.values(savedProfiles)
        .filter((item): item is AgentCliSavedModelProfile => !!item && !!item.name && !!item.provider && !!item.flashModel && !!item.strongModel)
        .sort((left, right) => left.name.localeCompare(right.name));
}

export function ensureAgentWorkspaceConfig(root: string, workspaceDirName = 'workspace'): string {    const resolvedRoot = path.resolve(root);
    const settingsPath = path.join(resolvedRoot, 'settings.json');
    const current = readJsonObject(settingsPath);
    const next = {
        ...current,
        workspace: current.workspace || workspaceDirName
    };
    return writeJsonObject(settingsPath, next);
}

export function resolveCliTuiConfigFile(root?: string): Record<string, any> {
    if (!root) {
        return {};
    }
    try {
        const filePath = path.join(root, 'tui.json');
        if (!fs.existsSync(filePath)) {
            return {};
        }
        const parsed = readJsonObject(filePath);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function parseEnvKeybinds(value?: string): Record<string, string | null> | undefined {
    if (!value) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, string | null>)
            : undefined;
    } catch {
        return undefined;
    }
}

export function resolveCliTuiConfig(options: AgentCliOptions, root?: string): AgentTuiResolvedConfig {
    const file = resolveCliTuiConfigFile(root);
    const envKeybinds = parseEnvKeybinds(process.env.TSDI_AGENT_TUI_KEYBINDS);
    const envLayer: Record<string, any> = {};
    if (process.env.TSDI_AGENT_TUI_THEME) envLayer.theme = process.env.TSDI_AGENT_TUI_THEME;
    if (process.env.TSDI_AGENT_TUI_SCROLL_SPEED) envLayer.scrollSpeed = parseInt(process.env.TSDI_AGENT_TUI_SCROLL_SPEED, 10);
    if (process.env.TSDI_AGENT_TUI_ATTENTION_SOUND) envLayer.attentionSound = process.env.TSDI_AGENT_TUI_ATTENTION_SOUND === '1' || process.env.TSDI_AGENT_TUI_ATTENTION_SOUND === 'true';
    if (process.env.TSDI_AGENT_TUI_LEADER_TIMEOUT) envLayer.leaderTimeout = parseInt(process.env.TSDI_AGENT_TUI_LEADER_TIMEOUT, 10);
    if (envKeybinds) {
        envLayer.keybinds = envKeybinds;
    }    const cliLayer: Record<string, any> = {};
    if (options.tuiTheme) cliLayer.theme = options.tuiTheme;
    if (options.tuiKeybinds) cliLayer.keybinds = options.tuiKeybinds;
    if (options.tuiScrollSpeed) cliLayer.scrollSpeed = parseInt(options.tuiScrollSpeed, 10);
    if (typeof options.tuiAttentionSound === 'boolean') cliLayer.attentionSound = options.tuiAttentionSound;
    if (options.tuiLeaderTimeout) cliLayer.leaderTimeout = parseInt(options.tuiLeaderTimeout, 10);
    return mergeAgentTuiConfig(file, envLayer, cliLayer);
}

export function resolveCliModelConfig(options: AgentCliOptions, root?: string): AgentCliProviderProfile {
    const settingsModel = readSettingsModel(root);
    const initialModel = resolveInitialModelSelection(settingsModel);
    const providerProfile = root ? resolveProviderProfile(root) : undefined;
    const providerRegistry = root ? resolveProviderRegistry(root) : defaultAgentProviderRegistry;
    const provider = options.provider || process.env.AGENT_PROVIDER || initialModel.provider || providerProfile?.provider || 'deepseek';
    const model = options.model || process.env.AGENT_MODEL || initialModel.model || providerProfile?.model || 'deepseek-v4-flash';
    const apiKeyEnv = options.apiKeyEnv
        || initialModel.apiKeyEnv
        || settingsModel?.apiKeyEnv
        || providerProfile?.apiKeyEnv
        || providerRegistry.get(provider)?.apiKeyEnv;
    const apiKey = options.apiKey
        || process.env.AGENT_API_KEY
        || (apiKeyEnv ? process.env[apiKeyEnv] : undefined)
        || initialModel.apiKey
        || settingsModel?.apiKey
        || providerProfile?.apiKey
        || undefined;
    const timeoutMs = parseInt(options.timeout as string) || initialModel.timeoutMs || providerProfile?.timeoutMs || 120000;
    const baseUrl = options.baseUrl || process.env.AGENT_BASE_URL || initialModel.baseUrl || providerProfile?.baseUrl || providerRegistry.get(provider)?.baseUrl;

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
    const normalized = provider.trim().toLowerCase() === 'claude' ? 'anthropic' : provider;
    return defaultAgentProviderRegistry.get(normalized)?.apiKeyEnv;
}

export function resolveProviderBaseUrl(provider: string): string | undefined {
    const normalized = provider.trim().toLowerCase() === 'claude' ? 'anthropic' : provider;
    return defaultAgentProviderRegistry.get(normalized)?.baseUrl;
}

function isAgentHooksObject(value: unknown): value is AgentHooksOptions {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function resolveCliHooks(root?: string): AgentHooksOptions | undefined {
    const resolvedRoot = path.resolve(root || resolveAgentToolDiscovery(root).root);
    const hooksPath = path.join(resolvedRoot, AGENT_HOOKS_FILE);
    const parsed = readJsonObject(hooksPath);
    return isAgentHooksObject(parsed) ? parsed : undefined;
}

/**
 * Resolve CLI config, loading .env files from workspace and root directories.
 */
export function resolveCliConfig(options: AgentCliOptions): AgentCliResolvedConfig {
    const resolved = resolveAgentToolDiscovery(options.root);
    const settings: AgentRootSettings = resolved.settings;
    const providerProfile = resolveProviderProfile(resolved.root);
    healSettingsModelConfig(resolved.root);
    const settingsModel = readSettingsModel(resolved.root);
    const hooks = resolveCliHooks(resolved.root);
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
        sessionId: options.session || `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        root: resolved.root,
        settingsPath: resolved.settingsPath,
        workspace,
        skillRoots,
        tools,
        channels,
        providerProfile,
        settingsModel,
        hooks,
        harnessProfile: settings.harness?.profile,
        tui: resolveCliTuiConfig(options, resolved.root),
        ...(settings.ssh ? { ssh: settings.ssh } : {})
    };
}
