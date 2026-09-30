export type AgentModelEffortLevel = 'low' | 'medium' | 'high' | 'max';

export interface AgentModelEffortInfo {
    supportedLevels: AgentModelEffortLevel[];
    defaultLevel?: AgentModelEffortLevel;
}

export interface AgentModelInfo {
    id: string;
    name?: string;
    contextWindow?: number;
    maxOutputTokens?: number;
    inputModalities?: string[];
    outputModalities?: string[];
    effort?: AgentModelEffortInfo;
}

export interface AgentModelCatalog {
    provider?: string;
    source: 'remote' | 'bundled';
    fetchedAt?: number;
    models: AgentModelInfo[];
}

const EFFORT_LEVELS: AgentModelEffortLevel[] = ['low', 'medium', 'high', 'max'];

function normalizeEffortLevel(value: unknown): AgentModelEffortLevel | undefined {
    const level = String(value ?? '').trim().toLowerCase();
    return (EFFORT_LEVELS as string[]).includes(level) ? level as AgentModelEffortLevel : undefined;
}

/**
 * Bundled fallback so routing/validation works offline. Mirrors the DeepSeek
 * `/models` payload (`deepseek-flash` / `deepseek-v4-pro`, effort low/high/max).
 */
export const DEFAULT_AGENT_MODEL_CATALOG: AgentModelCatalog = {
    provider: 'deepseek',
    source: 'bundled',
    models: [
        {
            id: 'deepseek-flash',
            name: 'DeepSeek-V4.1-Flash',
            contextWindow: 1048576,
            maxOutputTokens: 393216,
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            effort: { supportedLevels: ['low', 'high', 'max'], defaultLevel: 'high' }
        },
        {
            id: 'deepseek-v4-pro',
            name: 'DeepSeek-V4-Pro',
            contextWindow: 1048576,
            maxOutputTokens: 393216,
            inputModalities: ['text'],
            outputModalities: ['text'],
            effort: { supportedLevels: ['low', 'high', 'max'], defaultLevel: 'high' }
        }
    ]
};

function asStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const list = value.map(item => String(item ?? '').trim()).filter(Boolean);
    return list.length ? list : undefined;
}

export function parseAgentModelCatalog(payload: unknown, provider?: string): AgentModelCatalog {
    const data = (payload as { data?: unknown } | null | undefined)?.data;
    const list = Array.isArray(data) ? data : [];
    const models: AgentModelInfo[] = [];
    for (const raw of list) {
        const entry = raw as Record<string, any>;
        const id = String(entry?.id ?? '').trim();
        if (!id) {
            continue;
        }
        const supportedLevels = asStringArray(entry?.effort?.supported_levels)
            ?.map(normalizeEffortLevel)
            .filter((level): level is AgentModelEffortLevel => !!level);
        const defaultLevel = normalizeEffortLevel(entry?.effort?.default_level);
        models.push({
            id,
            name: entry?.name ? String(entry.name) : undefined,
            contextWindow: Number.isFinite(entry?.context_window) ? Number(entry.context_window) : undefined,
            maxOutputTokens: Number.isFinite(entry?.max_output_tokens) ? Number(entry.max_output_tokens) : undefined,
            inputModalities: asStringArray(entry?.input_modalities),
            outputModalities: asStringArray(entry?.output_modalities),
            effort: supportedLevels?.length ? { supportedLevels, defaultLevel } : undefined
        });
    }
    return { provider, source: models.length ? 'remote' : 'bundled', fetchedAt: Date.now(), models };
}

export function findAgentModel(catalog: AgentModelCatalog | undefined, modelId: string | undefined): AgentModelInfo | undefined {
    const id = String(modelId ?? '').trim();
    if (!id || !catalog) {
        return undefined;
    }
    return catalog.models.find(model => model.id === id);
}

export function isSupportedModel(catalog: AgentModelCatalog | undefined, modelId: string | undefined): boolean {
    return !!findAgentModel(catalog, modelId);
}

export function resolveModelEffort(
    catalog: AgentModelCatalog | undefined,
    modelId: string | undefined,
    requested?: AgentModelEffortLevel
): AgentModelEffortLevel | undefined {
    const model = findAgentModel(catalog, modelId);
    const supported = model?.effort?.supportedLevels;
    if (requested && (!supported || supported.includes(requested))) {
        return requested;
    }
    return model?.effort?.defaultLevel ?? (supported?.length ? supported[0] : undefined);
}

export interface FetchAgentModelCatalogOptions {
    baseUrl: string;
    apiKey?: string;
    apiKeyEnv?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
    fallback?: AgentModelCatalog;
}

/** Fetch `/models`; falls back to the bundled catalog on any failure. */
export async function fetchAgentModelCatalog(options: FetchAgentModelCatalogOptions): Promise<AgentModelCatalog> {
    const fallback = options.fallback ?? DEFAULT_AGENT_MODEL_CATALOG;
    const fetchImpl = options.fetchImpl ?? (globalThis as { fetch?: typeof fetch }).fetch;
    if (!fetchImpl) {
        return fallback;
    }
    const base = String(options.baseUrl || '').replace(/\/+$/, '');
    if (!base) {
        return fallback;
    }
    const url = /\/v\d+$/.test(base) ? `${base}/models` : `${base}/v1/models`;
    const apiKey = options.apiKey
        ?? (options.apiKeyEnv ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[options.apiKeyEnv] : undefined);
    const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
    const timer = options.timeoutMs && controller ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined;
    try {
        const response = await fetchImpl(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
                ...(options.headers ?? {})
            },
            signal: controller?.signal
        });
        if (!response.ok) {
            return fallback;
        }
        const parsed = parseAgentModelCatalog(await response.json(), fallback.provider);
        return parsed.models.length ? parsed : fallback;
    } catch {
        return fallback;
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}
