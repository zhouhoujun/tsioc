import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import type { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import { formatAgentUiLabel, formatAgentUiNotice } from './agent-ui.i18n';
import type { EffortLevel, ModelHandlerContext } from './AgentConsoleModelHandlers';

export function menuLabel(ctx: ModelHandlerContext, key: string, fallback: string, params?: Record<string, any>): string {
    return formatAgentUiLabel(ctx.translator, key, fallback, params);
}

export function resolveInitialModelProfile(ctx: ModelHandlerContext): string {
    const model = ctx.options().model;
    if (model?.defaultProfile === 'strong') {
        return 'strong';
    }
    if (model?.defaultProfile === 'flash' || model?.defaultProfile === 'fast') {
        return 'flash';
    }
    // A reasoning flag alone must not invent a `strong` tier: stale settings
    // once rendered `strong` while the runtime used the direct model.
    if ((model?.thinkingBudget || model?.reasoning) && model?.profiles?.strong) {
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

export function buildProviderModes(ctx: ModelHandlerContext, entries: AgentConsoleSelectOption[]): AgentConsoleSelectOption[] {
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

export async function pickModelEffort(ctx: ModelHandlerContext, name: string, provider?: string, models?: any[]): Promise<EffortLevel | 'back' | undefined> {
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
