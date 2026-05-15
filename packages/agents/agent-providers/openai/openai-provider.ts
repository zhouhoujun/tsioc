import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { OpenAICompatibleModelAdapter, ModelAdapter } from '@tsdi/agent';
import { AGENT_MODEL_ADAPTER } from '@tsdi/agent';
import { OPENAI_PROVIDER_OPTIONS } from './openai-tokens';
import { OpenAIProviderOptions, defaultOpenAIProviderOptions } from './openai-options';

/**
 * OpenAI Chat Completions provider — native integration with the OpenAI API.
 *
 * Reference:
 *   - zeroclaw:  crates/zeroclaw-providers/src/openai.rs  (native OpenAI implementation)
 *   - hermes:    plugins/model-providers/openai/  (ProviderProfile)
 */
@Injectable()
export class OpenAIProvider extends OpenAICompatibleModelAdapter {
    constructor(
        @Optional() @Inject(OPENAI_PROVIDER_OPTIONS) options: OpenAIProviderOptions = {}
    ) {
        super({
            provider: 'openai',
            model: options.model ?? defaultOpenAIProviderOptions.model!,
            baseUrl: options.baseUrl ?? defaultOpenAIProviderOptions.baseUrl,
            apiKey: options.apiKey,
            apiKeyEnv: options.apiKeyEnv ?? defaultOpenAIProviderOptions.apiKeyEnv,
            timeoutMs: options.timeoutMs,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            headers: options.headers
        });
    }
}

@Module({
    providers: [
        {
            provide: OPENAI_PROVIDER_OPTIONS,
            useValue: defaultOpenAIProviderOptions
        },
        { provide: AGENT_MODEL_ADAPTER, useClass: OpenAIProvider },
        { provide: ModelAdapter, useExisting: AGENT_MODEL_ADAPTER }
    ],
    exports: [OpenAIProvider]
})
export class OpenAIProviderModule {
    static withOptions(options?: OpenAIProviderOptions): ModuleWithProviders<OpenAIProviderModule> {
        return {
            module: OpenAIProviderModule,
            providers: [
                { provide: OPENAI_PROVIDER_OPTIONS, useValue: { ...defaultOpenAIProviderOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withOpenAIProvider(options?: OpenAIProviderOptions): any[] {
    return [
        { provide: OPENAI_PROVIDER_OPTIONS, useValue: { ...defaultOpenAIProviderOptions, ...(options ?? {}) } },
        { provide: AGENT_MODEL_ADAPTER, useClass: OpenAIProvider },
        { provide: ModelAdapter, useExisting: AGENT_MODEL_ADAPTER }
    ];
}
