import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule, ModelAdapter } from '@tsdi/agent';
import { DeepSeekProvider, withDeepSeekProvider } from '@tsdi/agent-providers/deepseek';

@Suite('DeepSeek provider')
export class DeepSeekProviderTest {

    @Test('registers deepseek provider via withDeepSeekProvider')
    async registersDeepSeekProvider() {
        const ctx = await Application.run({
            module: AgentModule,
            providers: withDeepSeekProvider({ apiKey: 'sk-ds-test' })
        });
        try {
            const adapter = ctx.get(ModelAdapter);
            expect(adapter).toBeTruthy();
            expect(adapter).toBeInstanceOf(DeepSeekProvider);
        } finally {
            await ctx.close();
        }
    }

    @Test('creates provider with custom options')
    async createsWithCustomOptions() {
        const provider = new DeepSeekProvider({
            apiKey: 'sk-ds-test',
            model: 'deepseek-reasoner',
            temperature: 0.0,
            maxTokens: 8192
        });
        expect(provider).toBeTruthy();
    }
}
