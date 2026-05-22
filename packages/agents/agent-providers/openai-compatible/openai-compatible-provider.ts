import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { OpenAICompatibleModelAdapter, ModelAdapter } from '@tsdi/agent';
import { OPENAI_COMPATIBLE_PROVIDER_OPTIONS } from './openai-compatible-tokens';
import { OpenAICompatibleProviderOptions, defaultOpenAICompatibleProviderOptions } from './openai-compatible-options';

/**
 * Generic OpenAI-compatible provider adapter.
 *
 * Use this for any provider that exposes an OpenAI-compatible Chat Completions
 * API endpoint: Groq, Together AI, Mistral, xAI/Grok, Perplexity, Fireworks,
 * DeepInfra, HuggingFace, Cohere, Cerebras, Sambanova, etc.
 *
 * Reference:
 *   - zeroclaw:  crates/zeroclaw-providers/src/compatible.rs  (OpenAiCompatibleProvider)
 *   - hermes:    agent/transports/chat_completions.py  (ChatCompletionsTransport)
 *
 * Usage:
 * ```typescript
 * // Register with custom provider settings
 * withOpenAICompatibleProvider({
 *   provider: 'groq',
 *   model: 'mixtral-8x7b-32768',
 *   baseUrl: 'https://api.groq.com/openai/v1',
 *   apiKeyEnv: 'GROQ_API_KEY'
 * })
 * ```
 */
@Injectable()
export class OpenAICompatibleProvider extends OpenAICompatibleModelAdapter {
    constructor(
        @Optional() @Inject(OPENAI_COMPATIBLE_PROVIDER_OPTIONS) options: OpenAICompatibleProviderOptions = {}
    ) {
        super({
            provider: options.provider ?? defaultOpenAICompatibleProviderOptions.provider!,
            model: options.model ?? defaultOpenAICompatibleProviderOptions.model!,
            baseUrl: options.baseUrl ?? defaultOpenAICompatibleProviderOptions.baseUrl,
            apiKey: options.apiKey,
            apiKeyEnv: options.apiKeyEnv ?? defaultOpenAICompatibleProviderOptions.apiKeyEnv,
            timeoutMs: options.timeoutMs,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            headers: options.headers
        });
    }
}

@Module({
    providers: [
        { provide: OPENAI_COMPATIBLE_PROVIDER_OPTIONS, useValue: defaultOpenAICompatibleProviderOptions },
        { provide: ModelAdapter, useClass: OpenAICompatibleProvider }
    ],
    exports: [OpenAICompatibleProvider]
})
export class OpenAICompatibleProviderModule {
    static withOptions(options?: OpenAICompatibleProviderOptions): ModuleWithProviders<OpenAICompatibleProviderModule> {
        return {
            module: OpenAICompatibleProviderModule,
            providers: [
                { provide: OPENAI_COMPATIBLE_PROVIDER_OPTIONS, useValue: { ...defaultOpenAICompatibleProviderOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withOpenAICompatibleProvider(options?: OpenAICompatibleProviderOptions): any[] {
    return [
        { provide: OPENAI_COMPATIBLE_PROVIDER_OPTIONS, useValue: { ...defaultOpenAICompatibleProviderOptions, ...(options ?? {}) } },
        { provide: ModelAdapter, useClass: OpenAICompatibleProvider }
    ];
}
