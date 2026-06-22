import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule, ModelAdapter, OpenAICompatibleModelAdapter, provideAgent } from '../src';

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
                        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
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
}
