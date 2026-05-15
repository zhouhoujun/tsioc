import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { ModelAdapter, ModelRequest, ModelResponse, AgentToolCall } from '@tsdi/agent';
import { AGENT_MODEL_ADAPTER } from '@tsdi/agent';
import { GEMINI_PROVIDER_OPTIONS } from './gemini-tokens';
import { GeminiProviderOptions, defaultGeminiProviderOptions } from './gemini-options';

interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

interface GeminiPart {
    text?: string;
    functionCall?: { name: string; args?: any };
    functionResponse?: { name: string; response: any };
}

interface GeminiFunctionDecl {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
}

interface GeminiRequest {
    contents: GeminiContent[];
    systemInstruction?: { parts: GeminiPart[] };
    tools?: { functionDeclarations: GeminiFunctionDecl[] }[];
    generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
    };
}

interface GeminiResponse {
    candidates?: Array<{
        content?: GeminiContent;
        finishReason?: string;
    }>;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
}

/**
 * Google Gemini API provider — native integration via the Gemini REST API.
 *
 * Reference:
 *   - zeroclaw:  crates/zeroclaw-providers/src/gemini.rs  (native Gemini implementation)
 *   - hermes:    agent/gemini_native_adapter.py  (Google AI Studio REST adapter)
 *
 * API format: POST /v1beta/models/{model}:generateContent
 */
@Injectable()
export class GeminiProvider extends ModelAdapter {
    constructor(
        @Optional() @Inject(GEMINI_PROVIDER_OPTIONS) private options: GeminiProviderOptions = {}
    ) {
        super();
    }

    async complete(request: ModelRequest): Promise<ModelResponse> {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error('Missing Gemini API key');
        }

        const body = this.buildRequest(request);
        const model = this.resolveModel();
        const url = `${this.resolveBaseUrl()}/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(this.options.headers ?? {})
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Gemini request failed: ${response.status} ${await response.text().catch(() => '')}`);
        }

        const data = await response.json() as GeminiResponse;
        return this.normalize(data, model);
    }

    private buildRequest(request: ModelRequest): GeminiRequest {
        const systemParts: GeminiPart[] = [];
        if (request.summary) {
            systemParts.push({ text: `Session summary:\n${request.summary}` });
        }
        if (request.memory.length) {
            systemParts.push({ text: `Memory:\n${request.memory.map(r => `- [${r.scope}] ${r.key}: ${r.value}`).join('\n')}` });
        }

        const contents: GeminiContent[] = [];

        for (const msg of request.messages) {
            if (msg.role === 'system') {
                systemParts.push({ text: typeof msg.content === 'string' ? msg.content : '' });
                continue;
            }

            if (msg.role === 'assistant') {
                const parts: GeminiPart[] = [];
                const text = typeof msg.content === 'string' ? msg.content : '';
                if (text) parts.push({ text });

                const toolCalls = msg.metadata?.toolCalls as AgentToolCall[] | undefined;
                if (toolCalls) {
                    for (const tc of toolCalls) {
                        parts.push({ functionCall: { name: tc.name, args: tc.input ?? {} } });
                    }
                }
                contents.push({ role: 'model', parts });
            } else if (msg.role === 'tool') {
                const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                contents.push({
                    role: 'user',
                    parts: [{ functionResponse: { name: msg.name ?? 'tool', response: { result: text } } }]
                });
            } else {
                const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                contents.push({ role: 'user', parts: [{ text }] });
            }
        }

        const body: GeminiRequest = { contents };

        if (systemParts.length) {
            body.systemInstruction = { parts: systemParts };
        }

        if (request.tools.length) {
            body.tools = [{
                functionDeclarations: request.tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema as Record<string, any> | undefined
                }))
            }];
        }

        body.generationConfig = {};
        if (this.options.temperature !== undefined) body.generationConfig.temperature = this.options.temperature;
        if (this.options.maxTokens !== undefined) body.generationConfig.maxOutputTokens = this.options.maxTokens;

        return body;
    }

    private normalize(data: GeminiResponse, model: string): ModelResponse {
        const candidate = data.candidates?.[0];
        const content = candidate?.content;
        let message = '';
        const toolCalls: AgentToolCall[] = [];
        let reasoningContent: string | undefined;

        if (content?.parts) {
            for (const part of content.parts) {
                if (part.text) message += part.text;
                if (part.functionCall) {
                    toolCalls.push({
                        id: `fc-${part.functionCall.name}`,
                        name: part.functionCall.name,
                        input: part.functionCall.args ?? {}
                    });
                }
            }
        }

        return {
            message: message || undefined,
            toolCalls: toolCalls.length ? toolCalls : undefined,
            stopReason: candidate?.finishReason === 'STOP' ? 'end' : 'tool',
            metadata: {
                provider: 'gemini',
                model,
                finishReason: candidate?.finishReason,
                reasoningContent,
                usage: data.usageMetadata
            }
        };
    }

    private resolveModel(): string {
        return this.options.model ?? defaultGeminiProviderOptions.model!;
    }

    private resolveBaseUrl(): string {
        return (this.options.baseUrl ?? defaultGeminiProviderOptions.baseUrl!).replace(/\/+$/, '');
    }

    private resolveApiKey(): string | undefined {
        if (this.options.apiKey) return this.options.apiKey;
        const envKey = this.options.apiKeyEnv ?? defaultGeminiProviderOptions.apiKeyEnv!;
        return process.env[envKey] || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    }
}

@Module({
    providers: [
        { provide: GEMINI_PROVIDER_OPTIONS, useValue: defaultGeminiProviderOptions },
        { provide: AGENT_MODEL_ADAPTER, useClass: GeminiProvider },
        { provide: ModelAdapter, useExisting: AGENT_MODEL_ADAPTER }
    ],
    exports: [GeminiProvider]
})
export class GeminiProviderModule {
    static withOptions(options?: GeminiProviderOptions): ModuleWithProviders<GeminiProviderModule> {
        return {
            module: GeminiProviderModule,
            providers: [
                { provide: GEMINI_PROVIDER_OPTIONS, useValue: { ...defaultGeminiProviderOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withGeminiProvider(options?: GeminiProviderOptions): any[] {
    return [
        { provide: GEMINI_PROVIDER_OPTIONS, useValue: { ...defaultGeminiProviderOptions, ...(options ?? {}) } },
        { provide: AGENT_MODEL_ADAPTER, useClass: GeminiProvider },
        { provide: ModelAdapter, useExisting: AGENT_MODEL_ADAPTER }
    ];
}
