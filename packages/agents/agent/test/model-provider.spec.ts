import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule, ModelAdapter, OpenAICompatibleModelAdapter, RoutedModelAdapter, provideAgent } from '../src';

@Suite('Agent model providers')
export class ModelProviderTest {
    private originalFetch: any;

    @After()
    teardown() {
        (globalThis as any).fetch = this.originalFetch;
    }

    @Test('creates default adapter via module')
    async createDefaultAdapter() {
        const ctx = await Application.run(AgentModule);
        try {
            const adapter = ctx.get(ModelAdapter);
            expect(adapter).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('maps summary memory and tools into openai request')
    async mapsRequestShape() {
        let call: any;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            call = { url, init };
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: {
                                content: 'done',
                                tool_calls: [{
                                    id: 'tool-1',
                                    function: { name: 'echo', arguments: '{"value":"ok"}' }
                                }],
                                reasoning_content: 'internal'
                            },
                            finish_reason: 'tool_calls'
                        }],
                        usage: {
                            prompt_tokens: 3,
                            completion_tokens: 2,
                            total_tokens: 5,
                            prompt_tokens_details: { cached_tokens: 1 }
                        }
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            baseUrl: 'https://example.com',
            apiKey: 'test-key',
            timeoutMs: 1000
        });
        const result = await adapter.complete({
            sessionId: 's1',
            summary: 'recent summary',
            memory: [{ id: 'm1', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', createdAt: 1 }],
            messages: [{ id: '1', role: 'user', content: 'hello', createdAt: 1 }],
            tools: [{
                name: 'echo',
                description: 'echo input',
                inputSchema: { type: 'object', properties: { value: { type: 'string' } } }
            }]
        });

        expect(call.url).toEqual('https://example.com/chat/completions');
        const body = JSON.parse(call.init.body);
        expect(body.messages[0].role).toEqual('system');
        expect(body.messages[0].content).toContain('recent summary');
        expect(body.messages[1].content).toContain('topic: router');
        expect(body.messages[2].content).toEqual('hello');
        expect(body.tools[0].function.name).toEqual('echo');
        expect(result.toolCalls?.[0].input.value).toEqual('ok');
        expect(result.metadata?.reasoningContent).toEqual('internal');
        expect((result.metadata?.usage as any).promptTokens).toEqual(3);
        expect((result.metadata?.usage as any).cachedPromptTokens).toEqual(1);
    }

    @Test('provideAgent works with model config')
    async provideAgentWorks() {
        const ctx = await Application.run({
            module: AgentModule,
            providers: provideAgent({
                model: { provider: 'echo', model: 'echo' }
            })
        });
        try {
            const adapter = ctx.get(ModelAdapter);
            expect(adapter).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('provideAgent returns providers and AgentModule.withOptions returns module metadata')
    provideAgentReturnsProviders() {
        const providers = provideAgent({ model: { provider: 'echo', model: 'echo' } });
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);

        const result = AgentModule.withOptions({ model: { provider: 'echo', model: 'echo' } });
        expect(result.module).toBe(AgentModule);
        expect(Array.isArray(result.providers)).toBe(true);
        expect(result.providers?.length).toBeGreaterThan(0);
    }

    @Test('routes complex prompts to claude profile')
    async routesComplexPromptsToClaude() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
            if (String(url).includes('/v1/messages')) {
                return {
                    ok: true,
                    async json() {
                        return {
                            id: 'msg_1',
                            type: 'message',
                            role: 'assistant',
                            content: [{ type: 'text', text: 'claude answer' }],
                            model: 'claude-sonnet-4-20250514',
                            stop_reason: 'end_turn',
                            stop_sequence: null,
                            usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 4, cache_creation_input_tokens: 6 }
                        };
                    }
                };
            }
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'default answer' },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };
        };

        const adapter = new RoutedModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            baseUrl: 'https://deepseek.example',
            apiKey: 'deepseek-key',
            profiles: {
                claude: {
                    provider: 'claude',
                    model: 'claude-sonnet-4-20250514',
                    baseUrl: 'https://anthropic.example',
                    apiKey: 'anthropic-key',
                    thinkingBudget: 2048,
                    promptCache: true
                }
            },
            complexityRouting: {
                complex: 'claude'
            }
        });

        const result = await adapter.complete({
            sessionId: 's1',
            summary: 'stable project context',
            memory: [],
            tools: [],
            messages: [{
                id: 'u1',
                role: 'user',
                content: '请分析这个多阶段分布式系统的架构权衡、根因排查路径以及迁移方案，并给出详细的推理步骤。',
                createdAt: 1
            }]
        });

        expect(calls[0].url).toEqual('https://anthropic.example/v1/messages');
        expect(calls[0].body.model).toEqual('claude-sonnet-4-20250514');
        expect(calls[0].body.thinking.budget_tokens).toEqual(2048);
        expect(Array.isArray(calls[0].body.system)).toEqual(true);
        expect(calls[0].body.system[0].cache_control.type).toEqual('ephemeral');
        expect(result.metadata?.provider).toEqual('anthropic');
        expect((result.metadata?.usage as any).cachedPromptTokens).toEqual(4);
        expect(result.metadata?.routing?.complexity).toEqual('complex');
        expect(result.metadata?.routing?.profile).toEqual('claude');
    }

    @Test('routes keyword matched prompts to hermes openai compatible provider')
    async routesKeywordMatchedPromptsToHermesProvider() {
        const calls: Array<{ url: string; body: any; auth: string | undefined }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({
                url,
                body: JSON.parse(init.body),
                auth: init.headers?.authorization
            });
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'hermes answer' },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };
        };

        const adapter = new RoutedModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            baseUrl: 'https://deepseek.example',
            apiKey: 'deepseek-key',
            routes: [{
                name: 'architecture-review',
                when: { containsAny: ['架构', 'architecture'] },
                provider: 'hermes',
                model: 'hermes-70b',
                baseUrl: 'https://hermes.example/v1',
                apiKey: 'hermes-key'
            }]
        });

        const result = await adapter.complete({
            sessionId: 's2',
            summary: '',
            memory: [],
            tools: [],
            messages: [{
                id: 'u2',
                role: 'user',
                content: '帮我做一个架构 review，重点看 agent 路由设计。',
                createdAt: 1
            }]
        });

        expect(calls[0].url).toEqual('https://hermes.example/v1/chat/completions');
        expect(calls[0].body.model).toEqual('hermes-70b');
        expect(calls[0].auth).toEqual('Bearer hermes-key');
        expect(result.metadata?.provider).toEqual('openai-compatible');
        expect(result.metadata?.routing?.route).toEqual('architecture-review');
    }

    @Test('inherits top-level api key when complexity routing selects a profile')
    async inheritsTopLevelApiKeyForComplexityProfile() {
        const calls: Array<{ auth: string | undefined; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            calls.push({
                auth: init.headers?.authorization,
                body: JSON.parse(init.body)
            });
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'ok' },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };
        };

        const adapter = new RoutedModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://rehdasu.cn',
            apiKey: 'top-level-key',
            defaultProfile: 'flash',
            profiles: {
                flash: {
                    provider: 'openai-compatible',
                    model: 'gpt-5.4',
                    baseUrl: 'https://rehdasu.cn'
                },
                strong: {
                    provider: 'openai-compatible',
                    model: 'gpt-5.5',
                    baseUrl: 'https://rehdasu.cn',
                    reasoning: true
                }
            },
            complexityRouting: {
                simple: 'flash',
                moderate: 'flash',
                complex: 'strong'
            }
        });

        const result = await adapter.complete({
            sessionId: 's-top-level-key',
            summary: '',
            memory: [],
            tools: [],
            messages: [{
                id: 'u1',
                role: 'user',
                content: 'hi',
                createdAt: 1
            }]
        });

        expect(calls[0].auth).toEqual('Bearer top-level-key');
        expect(calls[0].body.model).toEqual('gpt-5.4');
        expect(result.message).toEqual('ok');
    }

    @Test('sanitizes dotted tool names for openai-compatible requests and restores them on parse')
    async sanitizesDottedToolNamesAndRestoresOriginalNames() {
        let call: any;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            call = JSON.parse(init.body);
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: {
                                content: '',
                                tool_calls: [{
                                    id: 'tool-1',
                                    function: {
                                        name: 'memory_list',
                                        arguments: '{"query":"router"}'
                                    }
                                }]
                            },
                            finish_reason: 'tool_calls'
                        }]
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://rehdasu.cn',
            apiKey: 'test-key'
        });

        const result = await adapter.complete({
            sessionId: 's4',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: 'hi', createdAt: 1 }],
            tools: [{
                name: 'memory.list',
                description: 'search memory',
                inputSchema: { type: 'object', properties: { query: { type: 'string' } } }
            }]
        });

        expect(call.tools[0].function.name).toEqual('memory_list');
        expect(result.toolCalls?.[0].name).toEqual('memory.list');
        expect(result.toolCalls?.[0].input.query).toEqual('router');
    }

    @Test('uses v1 chat completions for openai-compatible providers without versioned base url')
    async usesVersionedChatCompletionPathForOpenAiCompatibleProvider() {
        this.originalFetch = (globalThis as any).fetch;
        const calls: string[] = [];
        (globalThis as any).fetch = async (url: string) => {
            calls.push(url);
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: {
                                role: 'assistant',
                                content: 'ok'
                            },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'redhus',
            baseUrl: 'https://rehdasu.cn',
            apiKey: 'test-key'
        });

        const result = await adapter.complete({
            sessionId: 's3',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: 'hi', createdAt: 1 }],
            tools: []
        });

        expect(calls[0]).toEqual('https://rehdasu.cn/v1/chat/completions');
        expect(result.message).toEqual('ok');
    }

    @Test('parses openai-compatible streaming text from array and alternate fields')
    async parsesOpenAiCompatibleStreamingVariants() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => {
            const encoder = new TextEncoder();
            const chunks = [
                'data: {"choices":[{"delta":{"content":[{"type":"text","text":"hello "}]},"finish_reason":null}]}\n\n',
                'data: {"choices":[{"delta":{"text":"world","reasoning":"thinking"},"finish_reason":null}]}\n\n',
                'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":2,"total_tokens":5,"prompt_tokens_details":{"cached_tokens":1}}}\n\n',
                'data: [DONE]\n\n'
            ];
            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
                        controller.close();
                    }
                })
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'redhus',
            baseUrl: 'https://example.com',
            apiKey: 'test-key',
            timeoutMs: 1000
        });

        const received: Array<{ type: string; content?: string; usage?: any }> = [];
        for await (const chunk of adapter.stream({
            sessionId: 's1',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: 'hello', createdAt: 1 }],
            tools: []
        })) {
            received.push(chunk);
        }

        expect(received.filter(item => item.type === 'text').map(item => item.content).join('')).toBe('hello world');
        expect(received.filter(item => item.type === 'reasoning').map(item => item.content).join('')).toBe('thinking');
        expect(received.some(item => item.type === 'done' && item.usage?.totalTokens === 5 && item.usage?.cachedPromptTokens === 1)).toBe(true);
    }

    @Test('parses openai-compatible streaming tool calls from choice message payload')
    async parsesOpenAiCompatibleStreamingMessageToolCalls() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => {
            const encoder = new TextEncoder();
            const chunks = [
                'data: {"choices":[{"delta":{},"message":{"tool_calls":[{"id":"call_1","type":"function","function":{"name":"weather_now","arguments":"{\\"city\\":\\"成都\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n',
                'data: [DONE]\n\n'
            ];
            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
                        controller.close();
                    }
                })
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://rehdasu.cn',
            apiKey: 'test-key',
            timeoutMs: 1000
        });

        const received: any[] = [];
        for await (const chunk of adapter.stream({
            sessionId: 's1',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: '成都天气', createdAt: 1 }],
            tools: [{
                name: 'weather.now',
                description: 'get weather',
                inputSchema: { type: 'object', properties: { city: { type: 'string' } } }
            }]
        })) {
            received.push(chunk);
        }

        const done = received.find(item => item.type === 'done');
        expect(done?.toolCalls?.[0].name).toBe('weather.now');
        expect(done?.toolCalls?.[0].input.city).toBe('成都');
    }

    @Test('parses openai-compatible streaming legacy function_call payload')
    async parsesOpenAiCompatibleStreamingLegacyFunctionCall() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => {
            const encoder = new TextEncoder();
            const chunks = [
                'data: {"choices":[{"delta":{"function_call":{"name":"weather_now","arguments":"{\\"city\\":\\"成都\\"}"}},"finish_reason":"tool_calls"}]}\n\n',
                'data: [DONE]\n\n'
            ];
            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
                        controller.close();
                    }
                })
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://rehdasu.cn',
            apiKey: 'test-key',
            timeoutMs: 1000
        });

        const received: any[] = [];
        for await (const chunk of adapter.stream({
            sessionId: 's1',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: '成都天气', createdAt: 1 }],
            tools: [{
                name: 'weather.now',
                description: 'get weather',
                inputSchema: { type: 'object', properties: { city: { type: 'string' } } }
            }]
        })) {
            received.push(chunk);
        }

        const done = received.find(item => item.type === 'done');
        expect(done?.toolCalls?.[0].name).toBe('weather.now');
        expect(done?.toolCalls?.[0].input.city).toBe('成都');
    }

    @Test('parses openai-compatible streaming tool calls embedded in delta content arrays')
    async parsesOpenAiCompatibleStreamingContentEmbeddedToolCalls() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => {
            const encoder = new TextEncoder();
            const chunks = [
                'data: {"choices":[{"delta":{"content":[{"type":"tool_call","id":"call_1","function":{"name":"weather_now","arguments":"{\\"city\\":\\"成"}}]},"finish_reason":null}]}\n\n',
                'data: {"choices":[{"delta":{"content":[{"tool_calls":[{"index":0,"function":{"arguments":"都\\"}"}}]}]},"finish_reason":"tool_calls"}]}\n\n',
                'data: [DONE]\n\n'
            ];
            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
                        controller.close();
                    }
                })
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://rehdasu.cn',
            apiKey: 'test-key',
            timeoutMs: 1000
        });

        const received: any[] = [];
        for await (const chunk of adapter.stream({
            sessionId: 's1',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: '成都天气', createdAt: 1 }],
            tools: [{
                name: 'weather.now',
                description: 'get weather',
                inputSchema: { type: 'object', properties: { city: { type: 'string' } } }
            }]
        })) {
            received.push(chunk);
        }

        const done = received.find(item => item.type === 'done');
        expect(done?.toolCalls?.[0].name).toBe('weather.now');
        expect(done?.toolCalls?.[0].input.city).toBe('成都');
    }

    @Test('parses openai-compatible streaming text when final sse buffer lacks trailing newline')
    async parsesOpenAiCompatibleStreamingWithoutTrailingNewline() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => {
            const encoder = new TextEncoder();
            const chunks = [
                'data: {"choices":[{"delta":{"content":"hello"},"finish_reason":null}]}'
            ];
            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
                        controller.close();
                    }
                })
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'redhus',
            baseUrl: 'https://example.com',
            apiKey: 'test-key',
            timeoutMs: 1000
        });

        const received: Array<{ type: string; content?: string }> = [];
        for await (const chunk of adapter.stream({
            sessionId: 's1',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: 'hello', createdAt: 1 }],
            tools: []
        })) {
            received.push(chunk);
        }

        expect(received.filter(item => item.type === 'text').map(item => item.content).join('')).toBe('hello');
    }
}
