import { AgentModelConfig, AgentModelOptions, AgentOptions, DEFAULT_AGENT_MODEL_CATALOG, defaultAgentProviderRegistry, fetchAgentModelCatalog } from '@tsdi/agent';

const CONNECTION_FIELDS = ['model', 'baseUrl', 'apiKey', 'apiKeyEnv', 'headers', 'timeoutMs'] as const;

/** True when the provider is the active one, a configured profile, or a built-in provider. */
export function hasModelProvider(options: AgentOptions | undefined, provider: string): boolean {
    const id = String(provider || '').trim();
    const model = options?.model;
    if (!id) {
        return false;
    }
    if (String(model?.provider || '').trim() === id) {
        return true;
    }
    if (Object.values(model?.profiles || {}).some(profile => String(profile?.provider || '').trim() === id)) {
        return true;
    }
    return !!defaultAgentProviderRegistry.get(id);
}

/**
 * Connection config for a provider. Selecting another provider must not keep
 * the active provider's baseUrl/apiKey/headers (that made every catalog look
 * like the active OpenAI-compatible endpoint).
 */
export function resolveModelForProvider(options: AgentOptions | undefined, provider: string): AgentModelOptions {
    const model = (options?.model || {}) as AgentModelOptions;
    const id = String(provider || '').trim();
    if (!id || id === String(model.provider || '').trim()) {
        return model;
    }
    const connection = (config: AgentModelConfig | undefined, providerId: string): AgentModelConfig => {
        if (!config) {
            return { provider: providerId };
        }
        const picked: AgentModelConfig = { provider: providerId };
        for (const field of CONNECTION_FIELDS) {
            const value = (config as any)[field];
            if (value !== undefined) {
                (picked as any)[field] = value;
            }
        }
        return picked;
    };
    const profile = Object.values(model.profiles || {}).find(entry => String(entry?.provider || '').trim() === id);
    if (profile) {
        return { ...model, ...connection(profile, id) };
    }
    const known = defaultAgentProviderRegistry.get(id);
    if (known) {
        return {
            ...model,
            ...connection({ provider: known.id, model: known.models?.[0]?.id, baseUrl: known.baseUrl, apiKeyEnv: known.apiKeyEnv } as AgentModelConfig, known.id)
        };
    }
    return { ...model, provider: id };
}

/** Apply a configured profile to the top-level runtime options (not only defaultProfile). */
export function activateProfileModel(options: AgentOptions, profileName: string, reasoningEffort?: 'low' | 'medium' | 'high' | 'max'): { provider?: string; model?: string; reasoningEffort?: 'low' | 'medium' | 'high' | 'max' } {
    const model = (options.model || {}) as AgentModelOptions;
    const profile = model.profiles?.[profileName] || {};
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
        ...(reasoningEffort !== undefined ? { reasoningEffort } : {})
    };
    return { provider: options.model.provider, model: options.model.model, reasoningEffort: options.model.reasoningEffort };
}

/** Apply a catalog model (possibly not in the bundled registry) to the runtime options. */
export function activateCatalogModel(options: AgentOptions, providerId: string, modelId: string, reasoningEffort?: 'low' | 'medium' | 'high' | 'max'): { provider: string; model: string; reasoningEffort?: 'low' | 'medium' | 'high' | 'max' } {
    const model = options.model || {};
    const resolved = resolveModelForProvider(options, providerId);
    const activeProfile = String(model.defaultProfile || '').trim();
    const sameProvider = providerId === String(model.provider || '').trim();
    // A live model chosen for the active provider is a new model for the
    // selected profile, not just a top-level override. Persisting the profile
    // keeps /model and a later restart from restoring the old model.
    const profiles = sameProvider && activeProfile && model.profiles?.[activeProfile]
        ? { ...model.profiles, [activeProfile]: { ...model.profiles[activeProfile], provider: providerId, model: modelId } }
        : model.profiles;
    const next = {
        ...model,
        ...resolved,
        ...(profiles ? { profiles } : {}),
        provider: providerId,
        model: modelId,
        defaultProfile: sameProvider && activeProfile ? activeProfile : undefined,
        ...(reasoningEffort !== undefined ? { reasoningEffort } : {})
    };
    options.model = next;
    return { provider: providerId, model: modelId, reasoningEffort: next.reasoningEffort };
}

/**
 * Apply `/model` auto routing from the configured tier profiles. Returns null
 * when the provider has not configured fast/balanced/strong profiles.
 */
export function activateAutoRouting(options: AgentOptions): {
    routing: { simple: string; moderate: string; complex: string };
    provider?: string;
    model?: string;
} | null {
    const available = options.model?.profiles || {};
    const tierProfile = (tier: 'fast' | 'balanced' | 'strong') =>
        Object.keys(available).find(key => key === tier || key.endsWith(`-${tier}`));
    const fast = tierProfile('fast');
    const balanced = tierProfile('balanced');
    const strong = tierProfile('strong');
    if (!fast || !balanced || !strong) {
        return null;
    }
    const routing = { simple: fast, moderate: balanced, complex: strong };
    options.model = {
        ...options.model,
        defaultProfile: undefined,
        complexityRouting: { ...(options.model?.complexityRouting || {}), ...routing }
    };
    return { routing, provider: options.model.provider, model: options.model.model };
}

export async function resolveModelCatalog(options: AgentOptions | undefined, provider?: string): Promise<{
    provider: string;
    source: string;
    routingSupported: boolean;
    models: Array<{ id: string; name?: string; effort?: unknown }>;
}> {
    const selected = String(provider || '').trim();
    const resolved = resolveModelForProvider(options, selected);
    const known = selected ? defaultAgentProviderRegistry.get(selected) : undefined;
    const fallbackModels = (known?.models || []).map(entry => ({ id: entry.id, name: (entry as any).name }));
    const fallback = {
        provider: known?.id || selected || String(resolved.provider || ''),
        source: 'static',
        models: fallbackModels
    };
    if (!selected && !String(resolved.baseUrl || '').trim()) {
        // Active provider with no configured endpoint: keep the bundled catalog
        // (the previous default) instead of inventing a provider fallback.
        return { ...DEFAULT_AGENT_MODEL_CATALOG, provider: String(DEFAULT_AGENT_MODEL_CATALOG.provider || resolved.provider || ''), routingSupported: false };
    }
    if (!String(resolved.baseUrl || '').trim()) {
        return { ...fallback, routingSupported: false };
    }
    const catalog = await fetchAgentModelCatalog({
        baseUrl: String(resolved.baseUrl || ''),
        apiKey: resolved.apiKey,
        apiKeyEnv: resolved.apiKeyEnv,
        timeoutMs: resolved.timeoutMs ?? 10000,
        headers: resolved.headers,
        ...(selected ? { fallback: fallback as any } : {})
    });
    return {
        provider: catalog.provider || selected || String(resolved.provider || ''),
        source: catalog.source,
        routingSupported: false,
        models: catalog.models.map(entry => ({ id: entry.id, name: entry.name, effort: entry.effort }))
    };
}
