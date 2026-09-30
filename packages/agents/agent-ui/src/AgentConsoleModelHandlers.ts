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
    persistSettings(patch: { thinkingLevel?: 'low' | 'medium' | 'high' }): unknown;
    addModelProvider?(): void | Promise<void>;
    resolveHistoryWorkspace(): string;
    getFavorites(): string[];
    setFavorites(value: string[]): void;
    getRecents(): string[];
    setRecents(value: string[]): void;
    getReasoningEffort(): 'low' | 'medium' | 'high';
    setReasoningEffort(value: 'low' | 'medium' | 'high'): void;
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
        return Array.isArray(profiles)
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
    const tiers = new Map(entries.map(entry => {
        const match = entry.value.match(/(?:^|-)(fast|balanced|strong)$/);
        return [match?.[1] || entry.value, entry] as const;
    }));
    const modes: AgentConsoleSelectOption[] = ['auto', 'fast', 'balanced', 'strong'].map(mode => ({
        label: mode,
        value: mode,
        description: mode === 'auto'
            ? 'Agent selects a model from request complexity'
            : tiers.get(mode)?.description || 'Not configured'
    }));
    const mode = await ctx.select(`${provider} · model mode`, modes, 0);
    if (!mode) return;
    if (mode === 'auto') {
        const fast = tiers.get('fast')?.value;
        const balanced = tiers.get('balanced')?.value;
        const strong = tiers.get('strong')?.value;
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
    const target = tiers.get(mode);
    if (!target) {
        ctx.notify(`${provider} has no ${mode} model configured.`);
        return;
    }
    await activateModelProfile(ctx, target.value);
}

// ── Store persistence ────────────────────────────────────────────────────────

export async function restoreModelStore(ctx: ModelHandlerContext): Promise<void> {
    const data = await ctx.modelStore?.load(ctx.resolveHistoryWorkspace());
    ctx.setFavorites(data?.favorites || []);
    ctx.setRecents(data?.recents || []);
    const configuredEffort = ctx.options().model?.reasoningEffort;
    ctx.setReasoningEffort(configuredEffort === 'max' ? 'high' : (configuredEffort || 'medium'));
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

export async function activateModelProfile(ctx: ModelHandlerContext, profileName: string): Promise<void> {
    const name = String(profileName || '').trim();
    if (!name) {
        return;
    }
    if (ctx.appRpc) {
        const requestId = ctx.nextActivateRequestId();
        const sessionId = ctx.state.sessionId;
        const result = await ctx.appRpc.request('model.activate', { sessionId, name });
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
    const tiers: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const current = ctx.getReasoningEffort();
    const next = tiers[(tiers.indexOf(current) + 1) % tiers.length];
    await setModelReasoningEffort(ctx, next);
}

export async function setModelReasoningEffort(ctx: ModelHandlerContext, next: 'low' | 'medium' | 'high'): Promise<void> {
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
        if (returned === 'low' || returned === 'medium' || returned === 'high') {
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
