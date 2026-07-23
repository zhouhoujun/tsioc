export type AgentModelComplexity = 'simple' | 'moderate' | 'complex';

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
    promptCache?: boolean;
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
