export interface GeminiProviderOptions {
    apiKey?: string;
    apiKeyEnv?: string;
    model?: string;
    baseUrl?: string;
    timeoutMs?: number;
    temperature?: number;
    maxTokens?: number;
    headers?: Record<string, string>;
}

export const defaultGeminiProviderOptions: GeminiProviderOptions = {
    model: 'gemini-2.0-flash',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKeyEnv: 'GEMINI_API_KEY'
};
