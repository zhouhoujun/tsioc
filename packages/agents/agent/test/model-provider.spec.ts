import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule, AnthropicModelAdapter, ModelAdapter, OpenAICompatibleModelAdapter, RoutedModelAdapter, provideAgent, resolvePromptCachePolicy } from '../src';

class StreamingTimeoutInspectableAdapter extends OpenAICompatibleModelAdapter {
    openStreamingTimeoutContext() {
        return this.createStreamingTimeoutContext();
    }
}

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

    @Test('maps image input parts into openai-compatible user content arrays')
    async mapsImageInputIntoOpenAiContentParts() {
        let call: any;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            call = JSON.parse(init.body);
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'done' },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://example.com',
            apiKey: 'test-key'
        });

        await adapter.complete({
            sessionId: 's-openai-image',
            summary: '',
            memory: [],
            messages: [{
                id: '1',
                role: 'user',
                content: 'describe this image',
                parts: [
                    { type: 'text', text: 'describe this image' },
                    { type: 'image', imageUrl: 'data:image/png;base64,YWJj', mediaType: 'image/png', name: 'cat.png' }
                ],
                createdAt: 1
            }],
            tools: []
        });

        expect(Array.isArray(call.messages[0].content)).toBe(true);
        expect(call.messages[0].content[0]).toEqual({ type: 'text', text: 'describe this image' });
        expect(call.messages[0].content[1]).toEqual({
            type: 'image_url',
            image_url: {
                url: 'data:image/png;base64,YWJj',
                detail: undefined
            }
        });
    }

    @Test('maps image input parts into anthropic image blocks')
    async mapsImageInputIntoAnthropicBlocks() {
        let call: any;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            call = JSON.parse(init.body);
            return {
                ok: true,
                async json() {
                    return {
                        id: 'msg_1',
                        type: 'message',
                        role: 'assistant',
                        content: [{ type: 'text', text: 'done' }],
                        model: 'claude-sonnet-4-20250514',
                        stop_reason: 'end_turn',
                        stop_sequence: null,
                        usage: { input_tokens: 2, output_tokens: 1 }
                    };
                }
            };
        };

        const adapter = new AnthropicModelAdapter({
            provider: 'anthropic',
            model: 'claude-sonnet-4-20250514',
            baseUrl: 'https://anthropic.example',
            apiKey: 'test-key'
        });

        await adapter.complete({
            sessionId: 's-anthropic-image',
            summary: '',
            memory: [],
            messages: [{
                id: '1',
                role: 'user',
                content: 'describe this image',
                parts: [
                    { type: 'text', text: 'describe this image' },
                    { type: 'image', imageUrl: 'data:image/png;base64,YWJj', mediaType: 'image/png', name: 'cat.png' }
                ],
                createdAt: 1
            }],
            tools: []
        });

        expect(Array.isArray(call.messages[0].content)).toBe(true);
        expect(call.messages[0].content[0]).toEqual({ type: 'text', text: 'describe this image' });
        expect(call.messages[0].content[1]).toEqual({
            type: 'image',
            source: {
                type: 'base64',
                media_type: 'image/png',
                data: 'YWJj'
            }
        });
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

    @Test('resolves prompt cache policy from legacy and structured config')
    resolvesPromptCachePolicy() {
        expect(resolvePromptCachePolicy(true)).toEqual({
            enabled: true,
            strategy: 'auto',
            scopes: ['system', 'summary', 'memory']
        });
        expect(resolvePromptCachePolicy({
            enabled: true,
            strategy: 'ephemeral',
            scopes: ['system'],
            minContentChars: 120
        })).toEqual({
            enabled: true,
            strategy: 'ephemeral',
            scopes: ['system'],
            minContentChars: 120,
            ttlSeconds: undefined
        });
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
        expect(result.metadata?.promptCache?.supported).toEqual('partial');
        expect(result.metadata?.promptCache?.applied).toEqual(true);
        expect(result.metadata?.promptCache?.observedCachedPromptTokens).toEqual(4);
        expect(result.metadata?.routing?.complexity).toEqual('complex');
        expect(result.metadata?.routing?.profile).toEqual('claude');
    }

    // Regression: a real 6-deliverable/5-file build task was routed to "flash" and
    // abandoned after ~20 lines, because scoring used only length/lines/keywords.
    @Test('routes a long single-line multi-deliverable build task to the strong profile')
    async routesStructuredBuildTaskToStrongProfile() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
            return {
                ok: true,
                async json() {
                    return {
                        id: 'chatcmpl_1',
                        choices: [{ message: { content: 'done' }, finish_reason: 'stop' }],
                        usage: { prompt_tokens: 10, completion_tokens: 20 }
                    };
                }
            };
        };

        // Mirrors the real ~/.tsdi-agent/settings.json profile layout.
        const adapter = new RoutedModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-flash',
            baseUrl: 'https://deepseek.example',
            apiKey: 'deepseek-key',
            profiles: {
                flash: {
                    provider: 'deepseek',
                    model: 'deepseek-flash',
                    baseUrl: 'https://deepseek.example',
                    apiKey: 'deepseek-key'
                },
                strong: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-pro',
                    baseUrl: 'https://deepseek.example',
                    apiKey: 'deepseek-key'
                }
            },
            complexityRouting: {
                simple: 'flash',
                moderate: 'flash',
                complex: 'strong'
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
                // Verbatim prompt from the real run. No topical complexity keywords.
                content: '为 sleep-mlt 增加月度聚合与 CSV 导入导出能力，要求：1) src/analysis.ts 新增 summarizeMonth(records, monthKey: YYYY-MM) 返回月度聚合(nights、avg duration、avg deep %、avg quality、consistency)，空月份返回全零；2) src/store.ts 新增 parseCsv(text): SleepRecord[]，解析 date,bedtime,wakeTime,quality,deep,rem,light,awake,notes 表头，损坏行跳过不中断；3) src/cli.ts 新增两个命令 monthly --month YYYY-MM(支持 --json) 与 import-csv <file>(读文件批量入库并报告成功/跳过条数，支持 --json)；4) test/analysis.test.ts、test/store.test.ts、test/cli.test.ts 补齐对应测试；5) README.md 补 monthly 与 import-csv 用法小节；6) 最后 npm run build 与 npm test 必须全绿，并 git commit 提交 feat: add monthly summary and CSV import/export。请自主完成全部 6 项，不要中途停下来问我。',
                createdAt: 1
            }]
        });

        expect(result.metadata?.routing?.complexity).toEqual('complex');
        expect(result.metadata?.routing?.profile).toEqual('strong');
        expect(calls[0].body.model).toEqual('deepseek-v4-pro');
    }

    // A short, focused edit is a single-file change: it must stay on the cheap
    // profile. Guards the fix from over-correcting into always-strong routing.
    @Test('keeps a short single-file edit request on the fast profile')
    async keepsShortSingleFileEditOnFastProfile() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
            return {
                ok: true,
                async json() {
                    return {
                        id: 'chatcmpl_1',
                        choices: [{ message: { content: 'done' }, finish_reason: 'stop' }],
                        usage: { prompt_tokens: 10, completion_tokens: 20 }
                    };
                }
            };
        };

        const adapter = new RoutedModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-flash',
            baseUrl: 'https://deepseek.example',
            apiKey: 'deepseek-key',
            profiles: {
                flash: { provider: 'deepseek', model: 'deepseek-flash', baseUrl: 'https://deepseek.example', apiKey: 'deepseek-key' },
                strong: { provider: 'deepseek', model: 'deepseek-v4-pro', baseUrl: 'https://deepseek.example', apiKey: 'deepseek-key' }
            },
            complexityRouting: {
                simple: 'flash',
                moderate: 'flash',
                complex: 'strong'
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
                content: '把 src/cli.ts 里的 usage() 补上 import-csv 命令说明。',
                createdAt: 1
            }]
        });

        expect(result.metadata?.routing?.profile).toEqual('flash');
        expect(calls[0].body.model).toEqual('deepseek-flash');
    }

    @Test('supports structured prompt cache policy on anthropic routes')
    async supportsStructuredPromptCachePolicyOnAnthropicRoutes() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
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
                        usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 2 }
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
                    promptCache: {
                        enabled: true,
                        strategy: 'ephemeral',
                        scopes: ['system'],
                        minContentChars: 10
                    }
                }
            },
            complexityRouting: {
                complex: 'claude'
            }
        });

        await adapter.complete({
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
        expect(Array.isArray(calls[0].body.system)).toEqual(true);
        expect(calls[0].body.system[0].cache_control.type).toEqual('ephemeral');
    }

    @Test('openai-compatible metadata reports observe-only prompt cache support')
    async openAiCompatibleMetadataReportsPromptCacheObservability() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => ({
            ok: true,
            async json() {
                return {
                    choices: [{
                        message: { content: 'ok' },
                        finish_reason: 'stop'
                    }],
                    usage: {
                        prompt_tokens: 8,
                        completion_tokens: 2,
                        total_tokens: 10,
                        prompt_tokens_details: { cached_tokens: 3 }
                    }
                };
            }
        });

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://rehdasu.cn',
            apiKey: 'test-key',
            promptCache: {
                enabled: true,
                strategy: 'persistent',
                scopes: ['system']
            }
        });

        const result = await adapter.complete({
            sessionId: 's-openai-cache',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: 'hi', createdAt: 1 }],
            tools: []
        });

        expect(result.metadata?.promptCache?.supported).toEqual('observe_only');
        expect(result.metadata?.promptCache?.applied).toEqual(false);
        expect(result.metadata?.promptCache?.requested.strategy).toEqual('persistent');
        expect(result.metadata?.promptCache?.observedCachedPromptTokens).toEqual(3);
    }

    @Test('openai provider annotates system message with cache_control ephemeral')
    async openaiProviderAnnotatesSystemPrompt() {
        const calls: Array<{ body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            calls.push({ body: JSON.parse(init.body) });
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
                        usage: {
                            prompt_tokens: 8,
                            completion_tokens: 2,
                            total_tokens: 10,
                            prompt_tokens_details: { cached_tokens: 3 }
                        }
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai',
            model: 'gpt-5.4',
            baseUrl: 'https://api.openai.com',
            apiKey: 'test-key',
            promptCache: {
                enabled: true,
                strategy: 'ephemeral',
                scopes: ['system']
            }
        });

        const result = await adapter.complete({
            sessionId: 's-openai-cache',
            summary: '',
            memory: [],
            messages: [
                { id: 'sys', role: 'system', content: 'You are a helpful agent.', createdAt: 1 },
                { id: 'u1', role: 'user', content: 'hi', createdAt: 2 }
            ],
            tools: [{
                name: 'echo',
                description: 'echo input',
                inputSchema: { type: 'object', properties: { value: { type: 'string' } } }
            }]
        });

        const body = calls[0].body;
        expect(body.messages[0].role).toEqual('system');
        expect(Array.isArray(body.messages[0].content)).toEqual(true);
        expect(body.messages[0].content[0].text).toContain('You are a helpful agent.');
        expect(body.messages[0].content[0].cache_control.type).toEqual('ephemeral');
        expect(result.metadata?.promptCache?.supported).toEqual('full');
        expect(result.metadata?.promptCache?.applied).toEqual(true);
        expect(result.metadata?.promptCache?.appliedScopes).toEqual(['system']);
        expect(result.metadata?.promptCache?.observedCachedPromptTokens).toEqual(3);
    }

    @Test('summary and memory system messages follow the static system prompt')
    async summaryAndMemoryFollowStaticSystemPrompt() {
        let body: any;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            body = JSON.parse(init.body);
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
                        usage: { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 }
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'hermes-70b',
            baseUrl: 'https://gateway.example',
            apiKey: 'test-key'
        });

        await adapter.complete({
            sessionId: 's1',
            summary: 'recent summary',
            memory: [{ id: 'm1', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', createdAt: 1 }],
            messages: [
                { id: 'sys', role: 'system', content: 'STATIC SYSTEM PROMPT', createdAt: 1 },
                { id: 'u1', role: 'user', content: 'hello', createdAt: 2 }
            ],
            tools: []
        });

        expect(body.messages[0].role).toEqual('system');
        expect(body.messages[0].content).toEqual('STATIC SYSTEM PROMPT');
        expect(body.messages[1].role).toEqual('system');
        expect(body.messages[1].content).toContain('Session summary');
        expect(body.messages[2].role).toEqual('system');
        expect(body.messages[2].content).toContain('Memory');
        expect(body.messages[3].role).toEqual('user');
        expect(body.messages[3].content).toEqual('hello');
    }

    @Test('deepseek provider reports partial prompt cache support without annotations')
    async deepseekReportsPartialPromptCache() {
        let body: any;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            body = JSON.parse(init.body);
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
                        usage: {
                            prompt_tokens: 8,
                            completion_tokens: 2,
                            total_tokens: 10,
                            prompt_tokens_details: { cached_tokens: 5 }
                        }
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            baseUrl: 'https://api.deepseek.com',
            apiKey: 'test-key',
            promptCache: true
        });

        const result = await adapter.complete({
            sessionId: 's-deepseek',
            summary: '',
            memory: [],
            messages: [
                { id: 'sys', role: 'system', content: 'You are a helpful agent.', createdAt: 1 },
                { id: 'u1', role: 'user', content: 'hi', createdAt: 2 }
            ],
            tools: []
        });

        expect(body.messages[0].content).toEqual('You are a helpful agent.');
        expect(Array.isArray(body.messages[0].content)).toEqual(false);
        expect(result.metadata?.promptCache?.supported).toEqual('partial');
        expect(result.metadata?.promptCache?.applied).toEqual(false);
        expect(result.metadata?.promptCache?.observedCachedPromptTokens).toEqual(5);
    }

    @Test('adapter detects static prefix breakage across requests')
    async adapterDetectsStaticPrefixBreakage() {
        const calls: Array<{ body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            calls.push({ body: JSON.parse(init.body) });
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
                        usage: { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 }
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'hermes-70b',
            baseUrl: 'https://gateway.example',
            apiKey: 'test-key'
        });

        const request = (tools: any[]): any => ({
            sessionId: 's1',
            summary: '',
            memory: [],
            messages: [
                { id: 'sys', role: 'system', content: 'STATIC SYSTEM PROMPT', createdAt: 1 },
                { id: 'u1', role: 'user', content: 'hello', createdAt: 2 }
            ],
            tools
        });

        const first = await adapter.complete(request([]));
        const broken = await adapter.complete(request([{
            name: 'new_tool',
            description: 'new tool',
            inputSchema: { type: 'object', properties: {} }
        }]));
        const stable = await adapter.complete(request([{
            name: 'new_tool',
            description: 'new tool',
            inputSchema: { type: 'object', properties: {} }
        }]));
        expect(calls[0].body.messages[0].content).toEqual('STATIC SYSTEM PROMPT');
        expect((first.metadata?.promptCache as any)?.prefixBroken).toEqual(false);
        expect((broken.metadata?.promptCache as any)?.prefixBroken).toEqual(true);
        expect((stable.metadata?.promptCache as any)?.prefixBroken).toEqual(false);
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

    @Test('routes based on structured user text parts when content is empty')
    async routesUsingStructuredUserTextParts() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
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

        await adapter.complete({
            sessionId: 's-structured-route',
            summary: '',
            memory: [],
            tools: [],
            messages: [{
                id: 'u2',
                role: 'user',
                content: '',
                parts: [
                    { type: 'text', text: '帮我做一个架构 review，重点看 agent 路由设计。' },
                    { type: 'image', imageUrl: 'data:image/png;base64,YWJj', mediaType: 'image/png' }
                ],
                createdAt: 1
            }]
        });

        expect(calls[0].url).toEqual('https://hermes.example/v1/chat/completions');
        expect(calls[0].body.model).toEqual('hermes-70b');
    }

    @Test('routes to strong profile when falsify rate exceeds threshold')
    async routesFalsifyRateAboveThresholdToStrongProfile() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'strong answer' },
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
                strong: {
                    provider: 'openai',
                    model: 'gpt-4.1',
                    baseUrl: 'https://openai.example',
                    apiKey: 'openai-key'
                }
            },
            routes: [{
                name: 'high-failure-escalation',
                when: { falsifyRateGt: 0.5 },
                profile: 'strong'
            }]
        });

        const result = await adapter.complete({
            sessionId: 's-falsify-high',
            summary: '',
            memory: [],
            tools: [],
            falsifyRate: 0.8,
            messages: [{
                id: 'u2',
                role: 'user',
                content: 'continue after tool failures',
                createdAt: 1
            }]
        });

        expect(calls[0].url).toEqual('https://openai.example/v1/chat/completions');
        expect(calls[0].body.model).toEqual('gpt-4.1');
        expect(result.metadata?.provider).toEqual('openai');
        expect(result.metadata?.routing?.route).toEqual('high-failure-escalation');
        expect(result.metadata?.routing?.profile).toEqual('strong');
        expect(result.metadata?.routing?.falsifyRate).toEqual(0.8);
    }

    @Test('skips falsify rate route when rate is below threshold')
    async skipsFalsifyRateRouteBelowThreshold() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
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
                strong: {
                    provider: 'openai',
                    model: 'gpt-4.1',
                    baseUrl: 'https://openai.example',
                    apiKey: 'openai-key'
                }
            },
            routes: [{
                name: 'high-failure-escalation',
                when: { falsifyRateGt: 0.5 },
                profile: 'strong'
            }]
        });

        const result = await adapter.complete({
            sessionId: 's-falsify-low',
            summary: '',
            memory: [],
            tools: [],
            falsifyRate: 0.2,
            messages: [{
                id: 'u2',
                role: 'user',
                content: 'continue after a few tool results',
                createdAt: 1
            }]
        });

        expect(calls[0].url).toEqual('https://deepseek.example/chat/completions');
        expect(calls[0].body.model).toEqual('deepseek-v4-flash');
        expect(result.metadata?.routing?.route).toBeUndefined();
        expect(result.metadata?.routing?.falsifyRate).toEqual(0.2);
    }

    @Test('skips falsify rate route without ledger evidence')
    async skipsFalsifyRateRouteWithoutLedgerEvidence() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
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
                strong: {
                    provider: 'openai',
                    model: 'gpt-4.1',
                    baseUrl: 'https://openai.example',
                    apiKey: 'openai-key'
                }
            },
            routes: [{
                name: 'high-failure-escalation',
                when: { falsifyRateGt: 0.5 },
                profile: 'strong'
            }]
        });

        const result = await adapter.complete({
            sessionId: 's-falsify-none',
            summary: '',
            memory: [],
            tools: [],
            messages: [{
                id: 'u2',
                role: 'user',
                content: 'first request before any tool evidence',
                createdAt: 1
            }]
        });

        expect(calls[0].url).toEqual('https://deepseek.example/chat/completions');
        expect(calls[0].body.model).toEqual('deepseek-v4-flash');
        expect(result.metadata?.routing?.route).toBeUndefined();
        expect(result.metadata?.routing?.falsifyRate).toBeUndefined();
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

    @Test('falls back to the top-level model when a complexity profile is missing')
    async fallsBackWhenComplexityProfileMissing() {
        const bodies: any[] = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            bodies.push(JSON.parse(init.body));
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
            apiKey: 'k',
            complexityRouting: { simple: 'missing-profile' }
        });

        const result = await adapter.complete({
            sessionId: 's-missing-profile',
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

        expect(result.message).toEqual('ok');
        expect(bodies[0].model).toEqual('gpt-5.4');
        expect(adapter.getWarnings().some(warning => warning.includes('missing-profile'))).toEqual(true);
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

    @Test('falls back to non-streaming completion when streaming request fails before first chunk')
    async fallsBackToNonStreamingCompletionWhenStreamingFailsEarly() {
        this.originalFetch = (globalThis as any).fetch;
        let callCount = 0;
        (globalThis as any).fetch = async (_url: string, options?: any) => {
            callCount += 1;
            const body = JSON.parse(String(options?.body || '{}'));
            if (body.stream === true) {
                throw new Error('fetch failed');
            }
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: {
                                role: 'assistant',
                                content: 'fallback weather reply'
                            },
                            finish_reason: 'stop'
                        }],
                        usage: {
                            prompt_tokens: 4,
                            completion_tokens: 3,
                            total_tokens: 7
                        }
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://rehdasu.cn',
            apiKey: 'test-key',
            timeoutMs: 1000
        });

        const received: Array<{ type: string; content?: string; usage?: any; metadata?: any }> = [];
        for await (const chunk of adapter.stream({
            sessionId: 's1',
            summary: '',
            memory: [],
            messages: [{ id: '1', role: 'user', content: '成都天气', createdAt: 1 }],
            tools: []
        })) {
            received.push(chunk);
        }

        expect(callCount).toEqual(2);
        expect(received[0]?.type).toEqual('text');
        expect(received[0]?.content).toEqual('fallback weather reply');
        expect(received[0]?.metadata?.fallback).toEqual('non_stream');
        expect(received[1]?.type).toEqual('done');
        expect(received[1]?.usage?.totalTokens).toEqual(7);
        expect(received[1]?.metadata?.fallback).toEqual('non_stream');
    }

    @Test('honours the configured timeout for stream inactivity')
    async honoursConfiguredStreamingInactivityTimeout() {
        const originalSetTimeout = globalThis.setTimeout;
        const originalClearTimeout = globalThis.clearTimeout;
        const delays: number[] = [];
        (globalThis as any).setTimeout = (_callback: () => void, delay?: number) => {
            delays.push(Number(delay));
            return { delay };
        };
        (globalThis as any).clearTimeout = () => undefined;

        try {
            const adapter = new StreamingTimeoutInspectableAdapter({
                provider: 'openai-compatible',
                model: 'gpt-5.4',
                baseUrl: 'https://example.com',
                apiKey: 'test-key',
                timeoutMs: 120000
            });
            const context = adapter.openStreamingTimeoutContext();
            context.markActivity();
            context.cleanup();

            expect(delays).toEqual([120000, 120000, 120000, 120000]);
        } finally {
            globalThis.setTimeout = originalSetTimeout;
            globalThis.clearTimeout = originalClearTimeout;
        }
    }

    @Test('routes explicit request profile to the matching profile skipping complexity matching')
    async routesExplicitRequestProfile() {
        const calls: Array<{ url: string; body: any }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, body: JSON.parse(init.body) });
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'strong answer' },
                            finish_reason: 'stop'
                        }],
                        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
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
                strong: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-pro',
                    baseUrl: 'https://deepseek.example',
                    apiKey: 'deepseek-key'
                }
            },
            complexityRouting: {
                complex: 'strong'
            }
        });

        const result = await adapter.complete({
            sessionId: 's1',
            summary: '',
            memory: [],
            tools: [],
            profile: 'strong',
            messages: [{
                id: 'u1',
                role: 'user',
                content: 'simple prompt that would normally stay on the default model',
                createdAt: 1
            }]
        });

        expect(calls[0].body.model).toEqual('deepseek-v4-pro');
        expect(result.metadata?.model).toEqual('deepseek-v4-pro');
        expect(result.metadata?.routing?.profile).toEqual('strong');
    }

    @Test('throws for an unknown explicit request profile')
    async throwsForUnknownExplicitProfile() {
        const adapter = new RoutedModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            baseUrl: 'https://deepseek.example',
            apiKey: 'deepseek-key',
            profiles: {
                strong: { provider: 'deepseek', model: 'deepseek-v4-pro' }
            }
        });

        await expect(adapter.complete({
            sessionId: 's1',
            summary: '',
            memory: [],
            tools: [],
            profile: 'missing-profile',
            messages: [{ id: 'u1', role: 'user', content: 'hello', createdAt: 1 }]
        })).rejects.toThrow(/Unknown model profile 'missing-profile'/);
    }

    @Test('routes anthropic profiles with api keys resolved from ApplicationArguments')
    async routesAnthropicProfilesWithAppArgsApiKey() {
        const calls: Array<{ url: string; headers: Record<string, any> }> = [];
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            calls.push({ url, headers: init.headers || {} });
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
                        usage: { input_tokens: 2, output_tokens: 1 }
                    };
                }
            };
        };

        const appArgs = {
            env: { ANTHROPIC_API_KEY: 'env-anthropic-key' } as Record<string, string>,
            get<T = string>(key: string) {
                return this.env[key] as T;
            }
        };

        const adapter = new RoutedModelAdapter({
            provider: 'anthropic',
            model: 'claude-sonnet-4-20250514',
            baseUrl: 'https://anthropic.example'
        }, appArgs as any);

        const result = await adapter.complete({
            sessionId: 's1',
            summary: '',
            memory: [],
            tools: [],
            messages: [{ id: 'u1', role: 'user', content: 'hello', createdAt: 1 }]
        });

        expect(calls[0].url).toEqual('https://anthropic.example/v1/messages');
        expect(calls[0].headers['x-api-key']).toEqual('env-anthropic-key');
        expect(result.metadata?.provider).toEqual('anthropic');
    }

    @Test('enables anthropic thinking block with default budget when reasoning requested')
    async enablesAnthropicThinkingOnReasoningRequest() {
        let call: { url: string; body: any } | undefined;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            call = { url, body: JSON.parse(init.body) };
            return {
                ok: true,
                async json() {
                    return {
                        type: 'message',
                        role: 'assistant',
                        content: [{ type: 'text', text: 'done' }],
                        model: 'claude-sonnet-4-20250514',
                        stop_reason: 'end_turn',
                        stop_sequence: null,
                        usage: { input_tokens: 2, output_tokens: 1 }
                    };
                }
            };
        };

        const adapter = new AnthropicModelAdapter({
            provider: 'anthropic',
            model: 'claude-sonnet-4-20250514',
            baseUrl: 'https://anthropic.example',
            apiKey: 'test-key'
        });

        await adapter.complete({
            sessionId: 's-reasoning',
            summary: '',
            memory: [],
            reasoning: true,
            messages: [{ id: '1', role: 'user', content: 'think step by step', createdAt: 1 }],
            tools: []
        });

        expect(call?.url).toEqual('https://anthropic.example/v1/messages');
        expect(call?.body.thinking).toEqual({ type: 'enabled', budget_tokens: 2048 });
    }

    @Test('disables temperature and sets reasoning effort on openai-compatible reasoning requests')
    async openAiReasoningRequestDropsTemperature() {
        let call: { url: string; body: any } | undefined;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            call = { url, body: JSON.parse(init.body) };
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'reasoned answer' },
                            finish_reason: 'stop'
                        }],
                        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://example.com',
            apiKey: 'test-key',
            timeoutMs: 1000,
            temperature: 0.7
        });

        await adapter.complete({
            sessionId: 's-reasoning-openai',
            summary: '',
            memory: [],
            reasoning: true,
            messages: [{ id: '1', role: 'user', content: 'think step by step', createdAt: 1 }],
            tools: []
        });

        expect(call?.url).toEqual('https://example.com/v1/chat/completions');
        expect(call?.body.reasoning_effort).toEqual('high');
        expect(call?.body.temperature).toBeUndefined();
    }

    @Test('honors request reasoningEffort override on openai-compatible requests')
    async openAiReasoningEffortPassthrough() {
        let call: { body: any } | undefined;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            call = { body: JSON.parse(init.body) };
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{ message: { content: 'low effort answer' }, finish_reason: 'stop' }],
                        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
                    };
                }
            };
        };
        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            baseUrl: 'https://example.com',
            apiKey: 'test-key',
            timeoutMs: 1000
        });
        await adapter.complete({
            sessionId: 's-effort-low',
            summary: '',
            memory: [],
            reasoning: true,
            reasoningEffort: 'low',
            messages: [{ id: '1', role: 'user', content: 'quick pass', createdAt: 1 }],
            tools: []
        });
        expect(call?.body.reasoning_effort).toEqual('low');
    }

    @Test('derives anthropic thinking budget from reasoningEffort tier')
    async anthropicReasoningEffortBudget() {
        let call: { body: any } | undefined;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            call = { body: JSON.parse(init.body) };
            return {
                ok: true,
                async json() {
                    return { id: 'm1', type: 'message', role: 'assistant', content: [{ type: 'text', text: 'done' }], stop_reason: 'end_turn', usage: { input_tokens: 3, output_tokens: 2 } };
                }
            };
        };
        const adapter = new AnthropicModelAdapter({
            provider: 'anthropic',
            model: 'claude-sonnet-4.5',
            baseUrl: 'https://api.anthropic.com',
            apiKey: 'test-key',
            timeoutMs: 1000
        });
        await adapter.complete({
            sessionId: 's-effort-high',
            summary: '',
            memory: [],
            reasoning: true,
            reasoningEffort: 'high',
            messages: [{ id: '1', role: 'user', content: 'deep reasoning', createdAt: 1 }],
            tools: []
        });
        expect(call?.body.thinking).toEqual({ type: 'enabled', budget_tokens: 4096 });
    }

    @Test('echoes reasoning_content back and sends real tool_calls with input on follow-up requests')
    async echoesReasoningContentAndToolCalls() {
        let call: { url: string; body: any } | undefined;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            call = { url, body: JSON.parse(init.body) };
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'done', reasoning_content: 'follow-up reasoning' },
                            finish_reason: 'stop'
                        }],
                        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
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

        await adapter.complete({
            sessionId: 's-reasoning-echo',
            summary: '',
            memory: [],
            messages: [
                { id: '1', role: 'user', content: 'list my memories', createdAt: 1 },
                {
                    id: '2',
                    role: 'assistant',
                    content: '',
                    createdAt: 2,
                    metadata: {
                        reasoningContent: 'I need to search memory for the topic',
                        toolCalls: [{ id: 'tool-1', name: 'memory.search', input: { query: 'topic' } }]
                    }
                },
                {
                    id: '3',
                    role: 'tool',
                    name: 'memory.search',
                    toolCallId: 'tool-1',
                    content: '{"items":[]}',
                    createdAt: 3,
                    metadata: { toolCallInput: { query: 'topic' } }
                },
                { id: '4', role: 'user', content: 'continue', createdAt: 4 }
            ],
            tools: []
        });

        const assistantMsg = call?.body.messages[1];
        const toolMsg = call?.body.messages[2];
        expect(assistantMsg.role).toEqual('assistant');
        expect(assistantMsg.reasoning_content).toEqual('I need to search memory for the topic');
        expect(assistantMsg.tool_calls).toEqual([{
            id: 'tool-1',
            type: 'function',
            function: { name: 'memory.search', arguments: '{"query":"topic"}' }
        }]);
        expect(toolMsg.role).toEqual('tool');
        expect(toolMsg.tool_call_id).toEqual('tool-1');
    }

    @Test('echoes reasoning_content on plain multi-turn assistant messages')
    async echoesReasoningContentOnPlainAssistantMessages() {
        let call: { url: string; body: any } | undefined;
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any) => {
            call = { url, body: JSON.parse(init.body) };
            return {
                ok: true,
                async json() {
                    return {
                        choices: [{
                            message: { content: 'final answer' },
                            finish_reason: 'stop'
                        }],
                        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
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

        await adapter.complete({
            sessionId: 's-reasoning-plain',
            summary: '',
            memory: [],
            messages: [
                { id: '1', role: 'user', content: 'why is the sky blue', createdAt: 1 },
                {
                    id: '2',
                    role: 'assistant',
                    content: 'short answer',
                    createdAt: 2,
                    metadata: { reasoningContent: 'Rayleigh scattering' }
                },
                { id: '3', role: 'user', content: 'more detail', createdAt: 3 }
            ],
            tools: []
        });

        expect(call?.body.messages[1].role).toEqual('assistant');
        expect(call?.body.messages[1].reasoning_content).toEqual('Rayleigh scattering');
        expect(call?.body.messages[1].tool_calls).toBeUndefined();
    }

    @Test('includes the api error body in model request failures')
    async includesErrorBodyInModelRequestFailures() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => {
            return {
                ok: false,
                status: 400,
                headers: new Map(),
                async text() {
                    return JSON.stringify({
                        error: { message: 'The reasoning_content in the thinking mode must be passed back to the API.' }
                    });
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

        try {
            await adapter.complete({
                sessionId: 's-error-body',
                summary: '',
                memory: [],
                messages: [{ id: '1', role: 'user', content: 'hello', createdAt: 1 }],
                tools: []
            });
            throw new Error('expected the request to fail');
        } catch (error: any) {
            expect(String(error.message)).toContain('Model request failed with 400');
            expect(String(error.message)).toContain('must be passed back to the API');
        }
    }
}
