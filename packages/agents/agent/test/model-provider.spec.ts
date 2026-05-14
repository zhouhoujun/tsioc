import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AGENT_MODEL_ADAPTER } from '../src/tokens';
import { AgentModule, createModelAdapter, DeepSeekModelAdapter, OpenAICompatibleModelAdapter, defaultAgentOptions, provideAgent } from '../src';

@Suite('Agent model providers')
export class ModelProviderTest {
    private originalFetch = (globalThis as any).fetch;

    @Before()
    setup() {
        delete process.env.DEEPSEEK_API_KEY;
    }

    @After()
    teardown() {
        (globalThis as any).fetch = this.originalFetch;
        delete process.env.DEEPSEEK_API_KEY;
    }

    @Test('creates deepseek adapter by default')
    createDefaultAdapter() {
        const adapter = createModelAdapter(defaultAgentOptions.model);
        expect(adapter instanceof DeepSeekModelAdapter).toEqual(true);
    }

    @Test('creates openai compatible adapter for custom provider')
    createCompatibleAdapter() {
        const adapter = createModelAdapter({
            provider: 'openai-compatible',
            model: 'gpt-test',
            baseUrl: 'https://example.com',
            apiKey: 'test-key'
        });
        expect(adapter instanceof OpenAICompatibleModelAdapter).toEqual(true);
        expect(adapter instanceof DeepSeekModelAdapter).toEqual(false);
    }

    @Test('maps summary memory and tools into openai request')
    async mapsRequestShape() {
        let call: any;
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
                                    function: {
                                        name: 'echo',
                                        arguments: '{"value":"ok"}'
                                    }
                                }],
                                reasoning_content: 'internal'
                            },
                            finish_reason: 'tool_calls'
                        }],
                        usage: {
                            prompt_tokens: 3,
                            completion_tokens: 2,
                            total_tokens: 5
                        }
                    };
                }
            };
        };

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-chat',
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
    }

    @Test('agent module withOptions overrides default model provider')
    async moduleWithOptionsOverridesProvider() {
        const ctx = await Application.run(AgentModule.withOptions({
            model: {
                provider: 'openai-compatible',
                model: 'custom-model',
                baseUrl: 'https://example.com',
                apiKey: 'test-key'
            }
        }));
        try {
            const adapter = ctx.get(AGENT_MODEL_ADAPTER) as OpenAICompatibleModelAdapter;
            expect(adapter instanceof OpenAICompatibleModelAdapter).toEqual(true);
            expect(adapter instanceof DeepSeekModelAdapter).toEqual(false);
        } finally {
            await ctx.close();
        }
    }

    @Test('provideAgent overrides default model provider')
    async provideAgentOverridesProvider() {
        const ctx = await Application.run(provideAgent({
            model: {
                provider: 'openai-compatible',
                model: 'custom-model',
                baseUrl: 'https://example.com',
                apiKey: 'test-key'
            }
        }));
        try {
            const adapter = ctx.get(AGENT_MODEL_ADAPTER) as OpenAICompatibleModelAdapter;
            expect(adapter instanceof OpenAICompatibleModelAdapter).toEqual(true);
            expect(adapter instanceof DeepSeekModelAdapter).toEqual(false);
        } finally {
            await ctx.close();
        }
    }
}
