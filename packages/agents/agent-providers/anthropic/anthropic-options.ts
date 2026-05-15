export interface AnthropicProviderOptions {
    apiKey?: string;
    apiKeyEnv?: string;
    model?: string;
    baseUrl?: string;
    timeoutMs?: number;
    temperature?: number;
    maxTokens?: number;
    /** Anthropic specific: budget for extended thinking in tokens */
    thinkingBudget?: number;
    headers?: Record<string, string>;
}

export const defaultAnthropicProviderOptions: AnthropicProviderOptions = {
    model: 'claude-sonnet-4-20250514',
    baseUrl: 'https://api.anthropic.com',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    maxTokens: 8192
};
