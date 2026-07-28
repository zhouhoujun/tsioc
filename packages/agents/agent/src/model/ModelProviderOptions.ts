export type AgentModelComplexity = 'simple' | 'moderate' | 'complex';

export type AgentPromptCacheStrategy = 'auto' | 'ephemeral' | 'persistent';
export type AgentPromptCacheScope = 'system' | 'summary' | 'memory';

export interface AgentPromptCachePolicy {
    enabled?: boolean;
    strategy?: AgentPromptCacheStrategy;
    scopes?: AgentPromptCacheScope[];
    minContentChars?: number;
    ttlSeconds?: number;
}

export interface ResolvedAgentPromptCachePolicy {
    enabled: boolean;
    strategy: AgentPromptCacheStrategy;
    scopes: AgentPromptCacheScope[];
    minContentChars?: number;
    ttlSeconds?: number;
}

export type AgentPromptCacheConfig = boolean | AgentPromptCachePolicy;

export interface PromptCacheRuntimeMetadata {
    requested: ResolvedAgentPromptCachePolicy;
    provider: string;
    supported: 'full' | 'partial' | 'observe_only' | 'none';
    applied: boolean;
    appliedStrategy?: AgentPromptCacheStrategy;
    appliedScopes?: AgentPromptCacheScope[];
    observedCachedPromptTokens?: number;
    observedCreatedPromptTokens?: number;
}

export interface AgentModelConfig {
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
    promptCache?: AgentPromptCacheConfig;
}

export interface AgentModelRouteWhen {
    complexity?: AgentModelComplexity | AgentModelComplexity[];
    inputPattern?: string;
    containsAny?: string[];
    minInputLength?: number;
    maxInputLength?: number;
}

export interface AgentModelRoute extends AgentModelConfig {
    name?: string;
    profile?: string;
    when?: AgentModelRouteWhen;
}

export interface AgentModelOptions extends AgentModelConfig {
    defaultProfile?: string;
    profiles?: Record<string, AgentModelConfig>;
    routes?: AgentModelRoute[];
    complexityRouting?: Partial<Record<AgentModelComplexity, string | AgentModelConfig>>;
    complexityThresholds?: {
        simpleMaxScore?: number;
        moderateMaxScore?: number;
    };
}

const DEFAULT_PROMPT_CACHE_SCOPES: AgentPromptCacheScope[] = ['system', 'summary', 'memory'];

export function resolvePromptCachePolicy(config?: AgentPromptCacheConfig): ResolvedAgentPromptCachePolicy {
    if (typeof config === 'boolean') {
        return {
            enabled: config,
            strategy: 'auto',
            scopes: DEFAULT_PROMPT_CACHE_SCOPES.slice()
        };
    }
    const normalizedScopes = Array.isArray(config?.scopes) && config!.scopes.length
        ? Array.from(new Set(config!.scopes))
        : DEFAULT_PROMPT_CACHE_SCOPES.slice();
    return {
        enabled: config?.enabled !== false,
        strategy: config?.strategy || 'auto',
        scopes: normalizedScopes,
        minContentChars: config?.minContentChars,
        ttlSeconds: config?.ttlSeconds
    };
}

export function buildPromptCacheRuntimeMetadata(
    config: AgentPromptCacheConfig | undefined,
    metadata: {
        provider: string;
        supported: PromptCacheRuntimeMetadata['supported'];
        applied: boolean;
        appliedStrategy?: AgentPromptCacheStrategy;
        appliedScopes?: AgentPromptCacheScope[];
        observedCachedPromptTokens?: number;
        observedCreatedPromptTokens?: number;
    }
): PromptCacheRuntimeMetadata {
    return {
        requested: resolvePromptCachePolicy(config),
        provider: metadata.provider,
        supported: metadata.supported,
        applied: metadata.applied,
        appliedStrategy: metadata.appliedStrategy,
        appliedScopes: metadata.appliedScopes,
        observedCachedPromptTokens: metadata.observedCachedPromptTokens,
        observedCreatedPromptTokens: metadata.observedCreatedPromptTokens
    };
}
