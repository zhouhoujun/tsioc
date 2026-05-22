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
}
