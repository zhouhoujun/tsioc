export interface DeepSeekProviderOptions {
    apiKey?: string;
    apiKeyEnv?: string;
    model?: string;
    baseUrl?: string;
    timeoutMs?: number;
    temperature?: number;
    maxTokens?: number;
    headers?: Record<string, string>;
    /** DeepSeek specific: enable reasoning model (deepseek-reasoner) */
    reasoning?: boolean;
}

export const defaultDeepSeekProviderOptions: DeepSeekProviderOptions = {
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    reasoning: false
};
