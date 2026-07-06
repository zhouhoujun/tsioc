import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { OpenAICompatibleModelAdapter, ModelAdapter, ModelRequest, ModelResponse } from '@tsdi/agent';
import { DEEPSEEK_PROVIDER_OPTIONS } from './deepseek-tokens';
import { DeepSeekProviderOptions, defaultDeepSeekProviderOptions } from './deepseek-options';

/**
 * DeepSeek API provider — extends OpenAI compatible with DeepSeek-specific defaults.
 *
 * Reference:
 *   - zeroclaw:  crates/zeroclaw-providers/src/openai.rs  (OpenAiCompatible with deepseek defaults)
 *   - hermes:    plugins/model-providers/deepseek/  (ProviderProfile)
 *
 * Uses the OpenAI-compatible Chat Completions format at api.deepseek.com.
 * Supports models such as deepseek-v4-flash, deepseek-v4-pro, and deepseek-reasoner.
 */
@Injectable()
export class DeepSeekProvider extends OpenAICompatibleModelAdapter {
    constructor(
        @Optional() @Inject(DEEPSEEK_PROVIDER_OPTIONS) options: DeepSeekProviderOptions = {}
    ) {
        super({
            provider: 'deepseek',
            model: options.model ?? defaultDeepSeekProviderOptions.model!,
            baseUrl: options.baseUrl ?? defaultDeepSeekProviderOptions.baseUrl,
            apiKey: options.apiKey,
            apiKeyEnv: options.apiKeyEnv ?? defaultDeepSeekProviderOptions.apiKeyEnv,
            timeoutMs: options.timeoutMs,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            headers: options.headers
        });
    }

    async complete(request: ModelRequest): Promise<ModelResponse> {
        const result = await super.complete(request);
        return result;
    }
}

@Module({
    providers: [
        { provide: DEEPSEEK_PROVIDER_OPTIONS, useValue: defaultDeepSeekProviderOptions },
        { provide: ModelAdapter, useClass: DeepSeekProvider }
    ],
    exports: [DeepSeekProvider]
})
export class DeepSeekProviderModule {
    static withOptions(options?: DeepSeekProviderOptions): ModuleWithProviders<DeepSeekProviderModule> {
        return {
            module: DeepSeekProviderModule,
            providers: [
                { provide: DEEPSEEK_PROVIDER_OPTIONS, useValue: { ...defaultDeepSeekProviderOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withDeepSeekProvider(options?: DeepSeekProviderOptions): any[] {
    return [
        { provide: DEEPSEEK_PROVIDER_OPTIONS, useValue: { ...defaultDeepSeekProviderOptions, ...(options ?? {}) } },
        { provide: ModelAdapter, useClass: DeepSeekProvider }
    ];
}
