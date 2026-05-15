export interface OpenAIProviderOptions {
    apiKey?: string;
    apiKeyEnv?: string;
    model?: string;
    baseUrl?: string;
    timeoutMs?: number;
    temperature?: number;
    maxTokens?: number;
    headers?: Record<string, string>;
}

export const defaultOpenAIProviderOptions: OpenAIProviderOptions = {
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com',
    apiKeyEnv: 'OPENAI_API_KEY'
};
