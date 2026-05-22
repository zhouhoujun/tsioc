import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule, ModelAdapter, AgentMessage } from '@tsdi/agent';
import { GeminiProvider, withGeminiProvider } from '@tsdi/agent-providers/gemini';

const testMsg = (role: AgentMessage['role'], content: string): AgentMessage => ({
    id: `t-${Date.now()}`,
    role,
    content,
    createdAt: Date.now()
});

@Suite('Gemini provider')
export class GeminiProviderTest {

    @Test('registers gemini provider via withGeminiProvider')
    async registersGeminiProvider() {
        const ctx = await Application.run({
            module: AgentModule,
            providers: withGeminiProvider({ apiKey: 'ai-test-key' })
        });
        try {
            const adapter = ctx.get(ModelAdapter);
            expect(adapter).toBeTruthy();
            expect(adapter).toBeInstanceOf(GeminiProvider);
        } finally {
            await ctx.close();
        }
    }

    @Test('creates provider with custom options')
    async createsWithCustomOptions() {
        const provider = new GeminiProvider({
            apiKey: 'ai-test-key',
            model: 'gemini-2.0-flash-lite',
            temperature: 0.3
        });
        expect(provider).toBeTruthy();
    }

    @Test('throws without api key on complete call')
    async throwsWithoutApiKey() {
        const provider = new GeminiProvider({ apiKey: '' });
        await expect(provider.complete({
            sessionId: 'test',
            messages: [testMsg('user', 'hello')],
            tools: [],
            memory: []
        })).rejects.toThrow('Missing Gemini API key');
    }
}
