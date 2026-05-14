export interface AgentModelOptions {
    provider?: string;
    model?: string;
    apiKey?: string;
    apiKeyEnv?: string;
    baseUrl?: string;
    timeoutMs?: number;
    temperature?: number;
    maxTokens?: number;
    headers?: Record<string, string>;
}
