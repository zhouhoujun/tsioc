import { AgentModelOptions } from '@tsdi/agent';

/**
 * OpenAI-compatible provider options — for any provider supporting
 * the OpenAI Chat Completions API shape (Groq, Together, Mistral, etc.).
 *
 * This is effectively AgentModelOptions + optional reasoning.
 */
export interface OpenAICompatibleProviderOptions extends AgentModelOptions {
    reasoning?: boolean;
}

export const defaultOpenAICompatibleProviderOptions: OpenAICompatibleProviderOptions = {
    provider: 'openai-compatible',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'API_KEY'
};
