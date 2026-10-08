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

export type EffortLevel = 'low' | 'medium' | 'high' | 'max';

// ── Model handler context ────────────────────────────────────────────────────

export interface ModelHandlerContext {
    state: {
        readonly sessionId: string;
        readonly modelProfile?: string;
        readonly oneShotModelProfile?: string;
        setModelProfile(value: string): unknown;
        setProvider(value: string): unknown;
        setModel(value: string): unknown;
        setOneShotModelProfile(value: string): unknown;
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
    persistSettings(patch: { thinkingLevel?: EffortLevel }): unknown;
    addModelProvider?(): void | Promise<void>;
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
            label: selected ? `${name} [current]` : name,
            value: name,
            description: [merged.provider, merged.model].filter(Boolean).join(' / '),
            detail: [
                `Profile: ${name}`,
                `Provider: ${merged.provider || '-'}`,
                `Model: ${merged.model || '-'}`,
                merged.baseUrl ? `Base URL: ${merged.baseUrl}` : '',
                profile?.reasoning != null ? `Reasoning: ${profile.reasoning ? 'on' : 'off'}` : '',
                profile?.thinkingBudget != null ? `Thinking budget: ${profile.thinkingBudget}` : ''
            ].filter(Boolean).join('\n')
        };
    });
}

export async function loadModelProfileOptions(ctx: ModelHandlerContext): Promise<AgentConsoleSelectOption[]> {
    if (ctx.appRpc) {
        const profiles = await ctx.appRpc.request('model.list');
        const options: AgentConsoleSelectOption[] = Array.isArray(profiles)
            ? profiles.map((profile: any) => ({
                label: profile?.selected ? `${profile.name} [current]` : String(profile?.name || ''),
                value: String(profile?.name || ''),
                description: [profile?.provider, profile?.model].filter(Boolean).join(' / '),
                detail: [
                    `Profile: ${profile?.name || '-'}`,
                    `Provider: ${profile?.provider || '-'}`,
                    `Model: ${profile?.model || '-'}`,
                    profile?.baseUrl ? `Base URL: ${profile.baseUrl}` : '',
                    profile?.reasoning != null ? `Reasoning: ${profile.reasoning ? 'on' : 'off'}` : '',
                    profile?.thinkingBudget != null ? `Thinking budget: ${profile.thinkingBudget}` : ''
                    ,profile?.capabilities ? `Capabilities: ${Object.entries(profile.capabilities).filter(([, enabled]) => enabled === true || enabled === 'full' || enabled === 'partial').map(([name]) => name).join(', ')}` : ''
                ].filter(Boolean).join('\n')
            })).filter((item: AgentConsoleSelectOption) => !!item.value)
            : [];
        const catalog = await ctx.appRpc.request('model.catalog', {}).catch(() => undefined);
        const seen = new Set(options.map(option => option.value));
        if (catalog && Array.isArray(catalog.models)) {
            for (const entry of catalog.models) {
                const id = String(entry?.id || '').trim();
                if (!id) continue;
                const provider = String(catalog.provider || '').trim();
                const value = provider ? `${provider}/${id}` : id;
                if (seen.has(value)) continue;
                seen.add(value);
                const levels: string[] = Array.isArray(entry?.effort?.supportedLevels) ? entry.effort.supportedLevels : [];
                options.push({
                    label: String(entry?.name || id),
                    value,
                    description: [provider, id].filter(Boolean).join(' / '),
                    detail: [
                        `Provider: ${provider || '-'}`,
                        `Model: ${id}`,
                        levels.length ? `Effort: ${levels.join(', ')}${entry?.effort?.defaultLevel ? ` (default ${entry.effort.defaultLevel})` : ''}` : ''
                    ].filter(Boolean).join('\n')
                });
            }
        }
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
    const options: AgentConsoleSelectOption[] = [...groups.entries()].map(([provider, entries]) => ({
        label: provider,
        value: `__provider__:${provider}`,
        description: `${entries.length} configured model${entries.length === 1 ? '' : 's'}`
    }));
    options.push({
        label: 'Add new provider',
        value: '__add_provider__',
        description: 'Configure another provider connection',
        detail: 'Opens the guided add-provider wizard.'
    });
    if (!options.length) {
        ctx.notify('No model profiles configured. Add a provider in settings.json.');
    }
    const selected = await ctx.select(
        'Model providers',
        options,
        0
    );
    if (selected === '__add_provider__') {
        await ctx.addModelProvider?.();
        return;
    }
    if (!selected?.startsWith('__provider__:')) return;
    const provider = selected.slice('__provider__:'.length);
    const entries = groups.get(provider) || [];
    const tierOf = (value: string): string | undefined => value.match(/(?:^|-)(fast|balanced|strong)$/)?.[1];
    const hasTiers = entries.some(entry => !!tierOf(entry.value));
    const modes: AgentConsoleSelectOption[] = [];
    if (hasTiers) {
        for (const mode of ['auto', 'fast', 'balanced', 'strong'] as const) {
            modes.push({
                label: mode,
                value: mode,
                description: mode === 'auto'
                    ? 'Agent selects a model from request complexity'
                    : entries.find(entry => tierOf(entry.value) === mode)?.description || 'Not configured'
            });
        }
    }
    for (const entry of entries) {
        if (tierOf(entry.value)) continue;
        modes.push({ label: entry.label, value: entry.value, description: entry.description, detail: entry.detail });
    }
    if (!modes.length) {
        ctx.notify(`${provider} has no models configured.`);
        return;
    }
    const mode = await ctx.select(`${provider} · model`, modes, 0);
    if (!mode) return;
    if (mode === 'auto') {
        const fast = entries.find(entry => tierOf(entry.value) === 'fast')?.value;
        const balanced = entries.find(entry => tierOf(entry.value) === 'balanced')?.value;
        const strong = entries.find(entry => tierOf(entry.value) === 'strong')?.value;
        if (!fast || !balanced || !strong) {
            ctx.notify(`${provider} needs fast, balanced, and strong models before auto can be used.`);
            return;
        }
        const model = ctx.options().model || {};
        model.defaultProfile = undefined;
        model.complexityRouting = { ...(model.complexityRouting || {}), simple: fast, moderate: balanced, complex: strong };
        ctx.state.setModelProfile('auto');
        ctx.notify(`Switched ${provider} to auto model routing.`);
        return;
    }
    const effort = await pickModelEffort(ctx, mode);
    await activateModelProfile(ctx, mode, effort);
}

async function pickModelEffort(ctx: ModelHandlerContext, name: string): Promise<EffortLevel | undefined> {
    if (!ctx.appRpc) {
        return undefined;
    }
    const catalog = await ctx.appRpc.request('model.catalog', {}).catch(() => undefined);
    const id = name.includes('/') ? name.slice(name.indexOf('/') + 1) : name;
    const entry = Array.isArray(catalog?.models) ? catalog.models.find((model: any) => model?.id === id) : undefined;
    const levels: EffortLevel[] = Array.isArray(entry?.effort?.supportedLevels)
        ? entry.effort.supportedLevels.filter((level: string) => level === 'low' || level === 'medium' || level === 'high' || level === 'max')
        : [];
    const defaultLevel = entry?.effort?.defaultLevel as EffortLevel | undefined;
    if (levels.length <= 1) {
        return defaultLevel;
    }
    const options: AgentConsoleSelectOption[] = [
        { label: 'default', value: 'default', description: defaultLevel ? `provider default: ${defaultLevel}` : 'provider default' },
        ...levels.map(level => ({
            label: level,
            value: level,
            description: level === defaultLevel ? 'default level' : 'reasoning effort'
        }))
    ];
    const selected = await ctx.select(`Reasoning effort · ${id}`, options, 0);
    if (!selected || selected === 'default') {
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

export async function activateModelProfile(ctx: ModelHandlerContext, profileName: string, reasoningEffort?: EffortLevel): Promise<void> {
    const name = String(profileName || '').trim();
    if (!name) {
        return;
    }
    if (ctx.appRpc) {
        const requestId = ctx.nextActivateRequestId();
        const sessionId = ctx.state.sessionId;
        const result = await ctx.appRpc.request('model.activate', { sessionId, name, ...(reasoningEffort ? { reasoningEffort } : {}) });
        if (requestId !== ctx.peekActivateRequestId() || sessionId !== ctx.state.sessionId) {
            return;
        }
        ctx.state.setModelProfile(String(result?.modelProfile || name));
        if (result?.provider) {
            ctx.state.setProvider(String(result.provider));
        }
        if (result?.model) {
            ctx.state.setModel(String(result.model));
        }
        ctx.updateTerminalTitle();
        ctx.notify(`Switched model profile to ${name}.`);
        await recordRecentModel(ctx, String(result?.modelProfile || name));
        return;
    }
    const opts = ctx.options();
    const profiles = opts.model?.profiles || {};
    if (!profiles[name]) {
        ctx.notify(`Unknown model profile: ${name}`);
        return;
    }
    opts.model = opts.model || {};
    opts.model.defaultProfile = name;
    if (reasoningEffort) {
        opts.model.reasoningEffort = reasoningEffort;
    }
    const resolved = resolveModelProfileConfig(ctx, name);
    ctx.state.setModelProfile(name);
    if (resolved.provider) {
        ctx.state.setProvider(resolved.provider);
    }
    if (resolved.model) {
        ctx.state.setModel(resolved.model);
    }
    ctx.updateTerminalTitle();
    ctx.notify(`Switched model profile to ${name}.`);
    await recordRecentModel(ctx, name);
}

export async function queueNextTurnModelProfile(ctx: ModelHandlerContext, profileName: string): Promise<void> {
    const name = String(profileName || '').trim();
    if (!name) {
        ctx.notify('Usage: /model once <profile>.');
        return;
    }
    if (!ctx.appRpc) {
        const profiles = ctx.options().model?.profiles || {};
        if (!profiles[name]) {
            ctx.notify(`Unknown model profile: ${name}`);
            return;
        }
    }
    ctx.state.setOneShotModelProfile(name);
    ctx.notify(`Queued model profile ${name} for the next prompt.`);
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
        ctx.notify('No active model profile to favorite.');
        return;
    }
    const favorites = ctx.getFavorites();
    const index = favorites.indexOf(name);
    if (index >= 0) {
        favorites.splice(index, 1);
        await persistModelStore(ctx);
        ctx.notify(`Removed ${name} from favorites.`);
    } else {
        favorites.push(name);
        await persistModelStore(ctx);
        ctx.notify(`Added ${name} to favorites.`);
    }
}

export async function cycleRecentModel(ctx: ModelHandlerContext, delta: 1 | -1): Promise<void> {
    if (!ctx.getRecents().length) {
        ctx.notify('No recent models yet.');
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
            ctx.notify('No active model profile to cycle variant for.');
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
    ctx.notify(`Reasoning effort: ${ctx.getReasoningEffort()}.`);
}
