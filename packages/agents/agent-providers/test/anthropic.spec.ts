import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule, ModelAdapter, AgentMessage } from '@tsdi/agent';
import { AnthropicProvider, withAnthropicProvider } from '@tsdi/agent-providers/anthropic';

const testMsg = (role: AgentMessage['role'], content: string): AgentMessage => ({
    id: `t-${Date.now()}`,
    role,
    content,
    createdAt: Date.now()
});

@Suite('Anthropic provider')
export class AnthropicProviderTest {

    @Test('registers anthropic provider via withAnthropicProvider')
    async registersAnthropicProvider() {
        const ctx = await Application.run({
            module: AgentModule,
            providers: withAnthropicProvider({ apiKey: 'sk-ant-test' })
        });
        try {
            const adapter = ctx.get(ModelAdapter);
            expect(adapter).toBeTruthy();
            expect(adapter).toBeInstanceOf(AnthropicProvider);
        } finally {
            await ctx.close();
        }
    }

    @Test('creates provider with custom options')
    async createsWithCustomOptions() {
        const provider = new AnthropicProvider({
            apiKey: 'sk-ant-test',
            model: 'claude-sonnet-4-20250514',
            thinkingBudget: 16000,
            maxTokens: 16384
        });
        expect(provider).toBeTruthy();
    }

    @Test('throws without api key on complete call')
    async throwsWithoutApiKey() {
        const provider = new AnthropicProvider({ apiKey: '' });
        await expect(provider.complete({
            sessionId: 'test',
            messages: [testMsg('user', 'hello')],
            tools: [],
            memory: []
        })).rejects.toThrow('Missing Anthropic API key');
    }

    @Test('applies prompt cache and normalizes cached usage')
    async appliesPromptCacheAndNormalizesCachedUsage() {
        const originalFetch = (globalThis as any).fetch;
        let body: any;
        (globalThis as any).fetch = async (_url: string, init: any) => {
            body = JSON.parse(init.body);
            return {
                ok: true,
                async json() {
                    return {
                        id: 'msg-1',
                        type: 'message',
                        role: 'assistant',
                        content: [{ type: 'text', text: 'ok' }],
                        model: 'claude-sonnet-4-20250514',
                        stop_reason: 'end_turn',
                        stop_sequence: null,
                        usage: {
                            input_tokens: 10,
                            output_tokens: 2,
                            cache_read_input_tokens: 3,
                            cache_creation_input_tokens: 7
                        }
                    };
                }
            };
        };
        try {
            const provider = new AnthropicProvider({ apiKey: 'sk-ant-test', promptCache: true });
            const result = await provider.complete({
                sessionId: 'test',
                summary: 'stable context',
                messages: [testMsg('user', 'hello')],
                tools: [],
                memory: []
            });

            expect(Array.isArray(body.system)).toEqual(true);
            expect(body.system[0].cache_control.type).toEqual('ephemeral');
            expect((result.metadata?.usage as any).cachedPromptTokens).toEqual(3);
            expect((result.metadata?.providerUsage as any).cache_creation_input_tokens).toEqual(7);
        } finally {
            (globalThis as any).fetch = originalFetch;
        }
    }
}
