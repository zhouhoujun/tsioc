/**
 * Model profile handlers for AgentConsoleComponent (P199 batch D).
 *
 * Extracted verbatim from the component: logic is unchanged and every
 * dependency arrives through the minimal `ModelHandlerContext`. The mutable
 * model-store state (`modelFavorites` / `modelRecents` / `modelReasoningEffort`
 * / `activateModelRequestId`) stays on the component and is reached through
 * getter/setter hooks. `options()` returns the live config object so handler
 * mutations keep the original semantics.
 */
import { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import { AgentOptions } from '@tsdi/agent';
import { formatAgentUiLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import { applyProfileSelection } from './AgentConsoleSettingsStore';

function menuLabel(ctx: ModelHandlerContext, key: string, fallback: string, params?: Record<string, any>): string {
    return formatAgentUiLabel(ctx.translator, key, fallback, params);
}

export type EffortLevel = 'low' | 'medium' | 'high' | 'max';

// ── Model handler context ────────────────────────────────────────────────────

export interface ModelHandlerContext {
    translator?: AgentUiTranslator | null;
    state: {
        readonly sessionId: string;
        readonly modelProfile?: string;
        readonly oneShotModelProfile?: string;
        setModelProfile(value: string): unknown;
        setProvider(value: string): unknown;
        setModel(value: string): unknown;
        setOneShotModelProfile(value: string): unknown;
        closeSelectMenu?(): void;
        readonly input?: string;
        setInput?(value: string, cursor?: number): void;
    };
    appRpc: { request(method: string, payload?: Record<string, any>, context?: any): Promise<any> } | null | undefined;
    options(): AgentOptions;
    modelStore: {
        load(workspace: string): Promise<{ favorites?: string[]; recents?: string[] } | undefined>;
        save(workspace: string, data: { favorites: string[]; recents: string[] }): Promise<void>;
    } | null | undefined;
    notify(message: string, duration?: number): void;
    select(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string): Promise<string | undefined>;
    updateTerminalTitle(): void;
    persistSettings(patch: { thinkingLevel?: EffortLevel; modelProfile?: string }): unknown;
    addModelProvider?(): void | Promise<void>;
    activateModelProfile?(name: string, effort?: EffortLevel, silent?: boolean): Promise<void>;
    updateModelOptions?(model: any): void;
    resolveHistoryWorkspace(): string;
    getFavorites(): string[];
    setFavorites(value: string[]): void;
    getRecents(): string[];
    setRecents(value: string[]): void;
    getReasoningEffort(): EffortLevel;
    setReasoningEffort(value: EffortLevel): void;
    nextActivateRequestId(): number;
    peekActivateRequestId(): number;
}

// ── Profile resolution ───────────────────────────────────────────────────────

export function resolveInitialModelProfile(ctx: ModelHandlerContext): string {
    const model = ctx.options().model;
    if (model?.defaultProfile === 'strong') {
        return 'strong';
    }
    if (model?.defaultProfile === 'flash' || model?.defaultProfile === 'fast') {
        return 'flash';
    }
    if (model?.thinkingBudget || model?.reasoning) {
        return 'strong';
    }
    return '';
}

export function resolveModelProfileConfig(ctx: ModelHandlerContext, profileName: string): AgentUiResolvedModelProfile {
    const model = (ctx.options().model || {}) as AgentUiResolvedModelProfile;
    const baseHeaders = model.headers ? { ...model.headers } : undefined;
    const profile = model.profiles?.[profileName] || {} as AgentUiResolvedModelProfile;
    return {
        ...model,
        ...profile,
        headers: {
            ...(baseHeaders || {}),
            ...(profile.headers || {})
        }
    };
}

// ── Switcher options ─────────────────────────────────────────────────────────

export function getModelProfileOptions(ctx: ModelHandlerContext): AgentConsoleSelectOption[] {
    const model = ctx.options().model as AgentUiResolvedModelProfile | undefined;
    const profiles = model?.profiles || {};
    const entries = Object.entries(profiles).filter(([, profile]) => !!profile);
    if (!entries.length) {
        return [];
    }
    const currentProfile = String(model?.defaultProfile || ctx.state.modelProfile || '').trim();
    return entries.map(([name, profile]) => {
        const merged = resolveModelProfileConfig(ctx, name);
        const selected = currentProfile === name;
        return {
            label: selected ? `${name} ${menuLabel(ctx, 'agent.menu.model.current', '[current]')}` : name,
            value: name,
            description: [merged.provider, merged.model].filter(Boolean).join(' / '),
            detail: [
                menuLabel(ctx, 'agent.menu.model.profile', 'Profile: {name}', { name }),
                menuLabel(ctx, 'agent.menu.model.provider', 'Provider: {name}', { name: merged.provider || '-' }),
                menuLabel(ctx, 'agent.menu.model.model', 'Model: {name}', { name: merged.model || '-' }),
                merged.baseUrl ? menuLabel(ctx, 'agent.menu.model.baseUrl', 'Base URL: {url}', { url: merged.baseUrl }) : '',
                profile?.reasoning != null ? menuLabel(ctx, 'agent.menu.model.reasoning', 'Reasoning: {state}', {
                    state: profile.reasoning
                        ? menuLabel(ctx, 'agent.menu.model.reasoningOn', 'on')
                        : menuLabel(ctx, 'agent.menu.model.reasoningOff', 'off')
                }) : '',
                profile?.thinkingBudget != null ? menuLabel(ctx, 'agent.menu.model.thinkingBudget', 'Thinking budget: {budget}', { budget: profile.thinkingBudget }) : ''
            ].filter(Boolean).join('\n')
        };
    });
}
export async function loadModelProfileOptions(ctx: ModelHandlerContext): Promise<AgentConsoleSelectOption[]> {
    if (ctx.appRpc) {
        const profiles = await ctx.appRpc.request('model.list');
        const options: AgentConsoleSelectOption[] = Array.isArray(profiles)
            ? profiles.map((profile: any) => ({
                label: profile?.selected ? `${profile.name} ${menuLabel(ctx, 'agent.menu.model.current', '[current]')}` : String(profile?.name || ''),
                value: String(profile?.name || ''),
                description: [profile?.provider, profile?.model].filter(Boolean).join(' / '),
                detail: [
                    menuLabel(ctx, 'agent.menu.model.profile', 'Profile: {name}', { name: profile?.name || '-' }),
                    menuLabel(ctx, 'agent.menu.model.provider', 'Provider: {name}', { name: profile?.provider || '-' }),
                    menuLabel(ctx, 'agent.menu.model.model', 'Model: {name}', { name: profile?.model || '-' }),
                    profile?.baseUrl ? menuLabel(ctx, 'agent.menu.model.baseUrl', 'Base URL: {url}', { url: profile.baseUrl }) : '',
                    profile?.reasoning != null ? menuLabel(ctx, 'agent.menu.model.reasoning', 'Reasoning: {state}', {
                        state: profile.reasoning
                            ? menuLabel(ctx, 'agent.menu.model.reasoningOn', 'on')
                            : menuLabel(ctx, 'agent.menu.model.reasoningOff', 'off')
                    }) : '',
                    profile?.thinkingBudget != null ? menuLabel(ctx, 'agent.menu.model.thinkingBudget', 'Thinking budget: {budget}', { budget: profile.thinkingBudget }) : ''
                    ,profile?.capabilities ? menuLabel(ctx, 'agent.menu.model.capabilities', 'Capabilities: {names}', {
                        names: Object.entries(profile.capabilities).filter(([, enabled]) => enabled === true || enabled === 'full' || enabled === 'partial').map(([name]) => name).join(', ')
                    }) : ''
                ].filter(Boolean).join('\n')
            })).filter((item: AgentConsoleSelectOption) => !!item.value)
            : [];
        return options;
    }
    return getModelProfileOptions(ctx);
}

export async function openModelSwitcher(ctx: ModelHandlerContext): Promise<void> {
    const profiles = await loadModelProfileOptions(ctx);
    const groups = new Map<string, AgentConsoleSelectOption[]>();
    for (const profile of profiles) {
        const tierMatch = profile.value.match(/^(.*)-(fast|balanced|strong)$/);
        const provider = tierMatch?.[1] || String(profile.description || '').split('/')[0].trim() || profile.value;
        const group = groups.get(provider) || [];
        group.push(profile);
        groups.set(provider, group);
    }
    // Profiles are optional. With a configured top-level provider we can still
    // ask the server for its live catalog instead of showing bundled/static
    // model ids just because no profile aliases exist yet.
    if (!groups.size) {
        const activeProvider = String(ctx.options().model?.provider || '').trim();
        if (!activeProvider) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'modelProfilesConfigured'));
            return;
        }
        groups.set(activeProvider, []);
    }
    const providerOptions: AgentConsoleSelectOption[] = [...groups.entries()].map(([provider, entries]) => ({
        label: provider,
        value: `__provider__:${provider}`,
        description: entries.length
            ? (entries.length === 1
                ? menuLabel(ctx, 'agent.menu.model.configuredOne', '{count} configured model', { count: entries.length })
                : menuLabel(ctx, 'agent.menu.model.configuredMany', '{count} configured models', { count: entries.length }))
            : menuLabel(ctx, 'agent.menu.model.liveCatalog', 'Live server models')
    }));
    providerOptions.push({
        label: menuLabel(ctx, 'agent.menu.model.addProvider', 'Add new provider'),
        value: '__add_provider__',
        description: menuLabel(ctx, 'agent.menu.model.addProviderDescription', 'Configure another provider connection'),
        detail: menuLabel(ctx, 'agent.menu.model.addProviderDetail', 'Opens the guided add-provider wizard.')
    });

    let provider: string | null = null;
    let providerIndex = 0;
    let modelIndex = 0;
    let entries: AgentConsoleSelectOption[] = [];
    let providerModels: any[] = [];
    let modes: AgentConsoleSelectOption[] = [];
    while (true) {
        if (!provider) {
            const selected = await ctx.select(
                menuLabel(ctx, 'agent.menu.model.title', 'Model providers'),
                providerOptions,
                providerIndex
            );
            if (!selected) {
                return;
            }
            if (selected === '__add_provider__') {
                await ctx.addModelProvider?.();
                return;
            }
            if (!selected.startsWith('__provider__:')) {
                return;
            }
            provider = selected.slice('__provider__:'.length);
            providerIndex = Math.max(0, providerOptions.findIndex(option => option.value === selected));
            const fetched = await fetchProviderCatalog(ctx, provider);
            providerModels = fetched.models;
            // Server models are the source of truth; configured profiles follow
            // as aliases for routes/tiers. This keeps a newer server catalog
            // ahead of stale model ids saved in settings.json.
            entries = [...fetched.options];
            const seen = new Set(entries.map(entry => entry.value));
            for (const configured of groups.get(provider) || []) {
                if (seen.has(configured.value)) {
                    continue;
                }
                seen.add(configured.value);
                entries.push(configured);
            }
            modes = buildProviderModes(ctx, entries);
            modelIndex = 0;
            if (!modes.length) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'providerHasNoModels', { provider }));
                provider = null;
                continue;
            }
        }
        const mode = await ctx.select(
            menuLabel(ctx, 'agent.menu.model.listTitle', '{provider} · model', { provider }),
            modes,
            modelIndex
        );
        if (!mode) {
            // Esc on the model list returns to the provider list.
            provider = null;
            continue;
        }
        modelIndex = Math.max(0, modes.findIndex(option => option.value === mode));
        if (mode === 'auto') {
            const tierOf = (value: string): string | undefined => value.match(/(?:^|-)(fast|balanced|strong)$/)?.[1];
            const fast = entries.find(entry => tierOf(entry.value) === 'fast')?.value;
            const balanced = entries.find(entry => tierOf(entry.value) === 'balanced')?.value;
            const strong = entries.find(entry => tierOf(entry.value) === 'strong')?.value;
            if (!fast || !balanced || !strong) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'providerNeedsFastBalancedStrong', { provider }));
                return;
            }
            const model = ctx.options().model || {};
            if (ctx.appRpc) {
                const result = await ctx.appRpc.request('model.activate', {
                    sessionId: ctx.state.sessionId,
                    name: 'auto'
                }).catch(() => undefined);
                if (!result) {
                    ctx.notify(formatAgentUiNotice(ctx.translator, 'providerNeedsFastBalancedStrong', { provider }));
                    return;
                }
                model.complexityRouting = result.complexityRouting || result.routing || model.complexityRouting;
            } else {
                model.complexityRouting = { ...(model.complexityRouting || {}), simple: fast, moderate: balanced, complex: strong };
            }
            model.defaultProfile = undefined;
            ctx.updateModelOptions?.(model);
            ctx.state.setModelProfile('auto');
            await ctx.persistSettings({ modelProfile: 'auto' });
            ctx.notify(formatAgentUiNotice(ctx.translator, 'switchedAutoModel', { provider }));
            return;
        }
        const tier = /^(fast|balanced|strong)$/.exec(mode)?.[1];
        const activationName = tier ? (entries.find(entry => new RegExp(`(?:^|-)${tier}$`).test(entry.value))?.value || mode) : mode;
        const effort = await pickModelEffort(ctx, activationName, provider, providerModels);
        if (effort === 'back') continue;
        await activateModelProfile(ctx, activationName, effort);
        return;
    }
}
export async function fetchProviderCatalog(ctx: ModelHandlerContext, provider: string): Promise<{ options: AgentConsoleSelectOption[]; models: any[] }> {
    if (!ctx.appRpc) {
        return { options: [], models: [] };
    }
    const catalog = await ctx.appRpc.request('model.catalog', { provider }).catch(() => undefined);
    const models: any[] = catalog && Array.isArray(catalog.models) ? catalog.models : [];
    const catalogProvider = String(catalog?.provider || provider || '').trim();
    const options = models.map(entry => {
        const id = String(entry?.id || '').trim();
        if (!id) {
            return null;
        }
        const levels: string[] = Array.isArray(entry?.effort?.supportedLevels) ? entry.effort.supportedLevels : [];
        return {
            label: String(entry?.name || id),
            value: id.includes('/') ? id : `${catalogProvider}/${id}`,
            description: [catalogProvider, id].filter(Boolean).join(' / '),
            detail: [
                menuLabel(ctx, 'agent.menu.model.provider', 'Provider: {name}', { name: catalogProvider || '-' }),
                menuLabel(ctx, 'agent.menu.model.model', 'Model: {name}', { name: id }),
                levels.length ? menuLabel(ctx, 'agent.menu.model.effort', 'Effort: {levels} (default {default})', {
                    levels: levels.join(', '),
                    default: entry?.effort?.defaultLevel || '-'
                }) : ''
            ].filter(Boolean).join('\n')
        } as AgentConsoleSelectOption;
    }).filter((entry): entry is AgentConsoleSelectOption => !!entry);
    return { options, models };
}

function buildProviderModes(ctx: ModelHandlerContext, entries: AgentConsoleSelectOption[]): AgentConsoleSelectOption[] {
    const tierOf = (value: string): string | undefined => value.match(/(?:^|-)(fast|balanced|strong)$/)?.[1];
    const hasTiers = entries.some(entry => !!tierOf(entry.value));
    const modes: AgentConsoleSelectOption[] = [];
    if (hasTiers) {
        for (const mode of ['auto', 'fast', 'balanced', 'strong'] as const) {
            const modeLabelKey = `agent.menu.model.mode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
            modes.push({
                label: menuLabel(ctx, modeLabelKey, mode),
                value: mode,
                description: mode === 'auto'
                    ? menuLabel(ctx, 'agent.menu.model.autoDescription', 'Agent selects a model from request complexity')
                    : entries.find(entry => tierOf(entry.value) === mode)?.description || menuLabel(ctx, 'agent.menu.model.notConfigured', 'Not configured')
            });
        }
    }
    for (const entry of entries) {
        if (tierOf(entry.value)) continue;
        modes.push({ label: entry.label, value: entry.value, description: entry.description, detail: entry.detail });
    }
    return modes;
}

async function pickModelEffort(ctx: ModelHandlerContext, name: string, provider?: string, models?: any[]): Promise<EffortLevel | 'back' | undefined> {
    if (!ctx.appRpc) {
        return undefined;
    }
    const selectedProvider = provider || (name.includes('/') ? name.slice(0, name.indexOf('/')) : undefined);
    const catalogModels = models ?? (await ctx.appRpc.request('model.catalog', selectedProvider ? { provider: selectedProvider } : {}).catch(() => undefined))?.models;
    const id = name.includes('/') ? name.slice(name.indexOf('/') + 1) : name;
    const entry = Array.isArray(catalogModels) ? catalogModels.find((model: any) => model?.id === id) : undefined;
    const levels: EffortLevel[] = Array.isArray(entry?.effort?.supportedLevels)
        ? entry.effort.supportedLevels.filter((level: string) => level === 'low' || level === 'medium' || level === 'high' || level === 'max')
        : [];
    const defaultLevel = entry?.effort?.defaultLevel as EffortLevel | undefined;
    if (levels.length <= 1) {
        return defaultLevel;
    }
    const options: AgentConsoleSelectOption[] = [
        {
            label: menuLabel(ctx, 'agent.menu.model.effortDefault', 'default'),
            value: 'default',
            description: defaultLevel
                ? menuLabel(ctx, 'agent.menu.model.providerDefaultLevel', 'provider default: {level}', { level: defaultLevel })
                : menuLabel(ctx, 'agent.menu.model.providerDefault', 'provider default')
        },
        ...levels.map(level => ({
            label: level,
            value: level,
            description: level === defaultLevel
                ? menuLabel(ctx, 'agent.menu.model.effortDefault', 'default')
                : menuLabel(ctx, 'agent.menu.model.reasoningEffort', 'reasoning effort')
        }))
    ];
    const selected = await ctx.select(menuLabel(ctx, 'agent.menu.model.effortTitle', 'Reasoning effort · {id}', { id }), options, 0);
    if (!selected) {
        return 'back';
    }
    if (selected === 'default') {
        return undefined;
    }
    return selected as EffortLevel;
}

// ── Store persistence ────────────────────────────────────────────────────────

export async function restoreModelStore(ctx: ModelHandlerContext): Promise<void> {
    const data = await ctx.modelStore?.load(ctx.resolveHistoryWorkspace());
    ctx.setFavorites(data?.favorites || []);
    ctx.setRecents(data?.recents || []);
    const configuredEffort = ctx.options().model?.reasoningEffort;
    ctx.setReasoningEffort(configuredEffort && ['low', 'medium', 'high', 'max'].includes(configuredEffort) ? configuredEffort as EffortLevel : 'medium');
}

export async function persistModelStore(ctx: ModelHandlerContext): Promise<void> {
    await ctx.modelStore?.save(ctx.resolveHistoryWorkspace(), {
        favorites: ctx.getFavorites(),
        recents: ctx.getRecents()
    });
}

export async function recordRecentModel(ctx: ModelHandlerContext, name: string): Promise<void> {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
        return;
    }
    ctx.setRecents([trimmed, ...ctx.getRecents().filter((item) => item !== trimmed)].slice(0, 10));
    await persistModelStore(ctx);
}

// ── Activation ───────────────────────────────────────────────────────────────

export async function activateModelProfile(ctx: ModelHandlerContext, profileName: string, reasoningEffort?: EffortLevel, silent = false): Promise<void> {
    const name = String(profileName || '').trim();
    if (!name) {
        return;
    }
    const opts = ctx.options();
    const profiles = opts.model?.profiles || {};
    const localProfile = profiles[name];
    const separator = name.indexOf('/');
    if (ctx.appRpc) {
        const requestId = ctx.nextActivateRequestId();
        const sessionId = ctx.state.sessionId;
        const result = await ctx.appRpc.request('model.activate', { sessionId, name, ...(reasoningEffort ? { reasoningEffort } : {}) });
        if (requestId !== ctx.peekActivateRequestId() || sessionId !== ctx.state.sessionId) {
            return;
        }
        const expected = localProfile ? resolveModelProfileConfig(ctx, name) : undefined;
        const fallbackModel = separator > 0 ? name.slice(separator + 1) : name;
        const provider = String(result?.provider || expected?.provider || opts.model?.provider || '');
        const model = String(result?.model || expected?.model || fallbackModel || opts.model?.model || '');
        const modelProfile = String(result?.modelProfile || name);
        ctx.state.setModelProfile(modelProfile);
        if (provider) {
            ctx.state.setProvider(provider);
        }
        if (model) {
            ctx.state.setModel(model);
        }
        // Keep the local options in step with the gateway response so other
        // console surfaces reading options.model do not show the old model.
        if (opts.model) {
            opts.model = {
                ...opts.model,
                ...(provider ? { provider } : {}),
                ...(model ? { model } : {}),
                defaultProfile: modelProfile
            };
        }
        ctx.updateTerminalTitle();
        if (!silent) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'switchedModelProfile', { name: modelProfile }));
        }
        await recordRecentModel(ctx, modelProfile);
        await ctx.persistSettings({ modelProfile });
        return;
    }
    if (!localProfile) {
        const directProvider = separator > 0 ? name.slice(0, separator).trim() : '';
        const directModel = separator > 0
            ? name.slice(separator + 1).trim()
            : (!opts.model?.provider ? '' : name);
        if (!directModel || (separator > 0 && !directProvider)) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'unknownModelProfile', { name }));
            return;
        }
        const provider = directProvider || String(opts.model?.provider || '');
        opts.model = {
            ...opts.model,
            ...(provider ? { provider } : {}),
            model: directModel,
            defaultProfile: undefined
        };
        ctx.updateModelOptions?.(opts.model);
        ctx.state.setModelProfile(name);
        if (provider) {
            ctx.state.setProvider(provider);
        }
        ctx.state.setModel(directModel);
        ctx.updateTerminalTitle();
        if (!silent) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'switchedModelProfile', { name }));
        }
        await recordRecentModel(ctx, name);
        await ctx.persistSettings({ modelProfile: name });
        return;
    }
    const resolved = resolveModelProfileConfig(ctx, name);
    applyProfileSelection(opts, name, reasoningEffort);
    ctx.updateModelOptions?.(opts.model);
    ctx.state.setModelProfile(name);
    if (resolved.provider) {
        ctx.state.setProvider(resolved.provider);
    }
    if (resolved.model) {
        ctx.state.setModel(resolved.model);
    }
    ctx.updateTerminalTitle();
    if (!silent) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'switchedModelProfile', { name: name }));
    }
    await recordRecentModel(ctx, name);
    await ctx.persistSettings({ modelProfile: name });
}

export async function queueNextTurnModelProfile(ctx: ModelHandlerContext, profileName: string): Promise<void> {
    const name = String(profileName || '').trim();
    if (!name) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'modelOnceUsage'));
        return;
    }
    if (!ctx.appRpc) {
        const profiles = ctx.options().model?.profiles || {};
        if (!profiles[name]) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'unknownModelProfile', { name: name }));
            return;
        }
    }
    ctx.state.setOneShotModelProfile(name);
    ctx.notify(formatAgentUiNotice(ctx.translator, 'queuedModelProfile', { name: name }));
}

export function consumePendingTurnModelProfile(ctx: ModelHandlerContext): string | undefined {
    const profile = String(ctx.state.oneShotModelProfile || '').trim();
    if (!profile) {
        return undefined;
    }
    ctx.state.setOneShotModelProfile('');
    return profile;
}

// ── Favorites / recents / reasoning effort ───────────────────────────────────

export async function toggleModelFavorite(ctx: ModelHandlerContext): Promise<void> {
    const name = String(ctx.state.modelProfile || ctx.options().model?.defaultProfile || '').trim();
    if (!name) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'noActiveProfileFavorite'));
        return;
    }
    const favorites = ctx.getFavorites();
    const index = favorites.indexOf(name);
    if (index >= 0) {
        favorites.splice(index, 1);
        await persistModelStore(ctx);
        ctx.notify(formatAgentUiNotice(ctx.translator, 'removedFavorites', { name: name }));
    } else {
        favorites.push(name);
        await persistModelStore(ctx);
        ctx.notify(formatAgentUiNotice(ctx.translator, 'addedFavorites', { name: name }));
    }
}

export async function cycleRecentModel(ctx: ModelHandlerContext, delta: 1 | -1): Promise<void> {
    if (!ctx.getRecents().length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'recentModelsYet'));
        return;
    }
    const current = String(ctx.state.modelProfile || ctx.options().model?.defaultProfile || '').trim();
    let index = ctx.getRecents().indexOf(current);
    if (index < 0) {
        index = delta > 0 ? -1 : 0;
    }
    const recents = ctx.getRecents();
    const next = recents[(index + delta + recents.length) % recents.length];
    await activateModelProfile(ctx, next);
}

export async function cycleModelVariant(ctx: ModelHandlerContext): Promise<void> {
    const tiers: EffortLevel[] = ['low', 'medium', 'high', 'max'];
    const current = ctx.getReasoningEffort();
    const next = tiers[(tiers.indexOf(current) + 1) % tiers.length];
    await setModelReasoningEffort(ctx, next);
}

export async function setModelReasoningEffort(ctx: ModelHandlerContext, next: EffortLevel): Promise<void> {
    if (ctx.appRpc) {
        const sessionId = ctx.state.sessionId;
        const name = String(ctx.state.modelProfile || ctx.options().model?.defaultProfile || '').trim();
        if (!name) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'noActiveProfileCycle'));
            return;
        }
        const requestId = ctx.nextActivateRequestId();
        const result = await ctx.appRpc.request('model.activate', { sessionId, name, reasoningEffort: next });
        if (requestId !== ctx.peekActivateRequestId() || sessionId !== ctx.state.sessionId) {
            return;
        }
        const returned = String(result?.reasoningEffort || '');
        if (returned === 'low' || returned === 'medium' || returned === 'high' || returned === 'max') {
            next = returned;
        }
    }
    ctx.setReasoningEffort(next);
    const opts = ctx.options();
    opts.model = opts.model || {};
    opts.model.reasoningEffort = next;
    await ctx.persistSettings({ thinkingLevel: next });
    ctx.notify(formatAgentUiNotice(ctx.translator, 'reasoningEffort', { effort: ctx.getReasoningEffort() }));
}
