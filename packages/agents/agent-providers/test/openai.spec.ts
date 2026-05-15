import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule, AGENT_MODEL_ADAPTER } from '@tsdi/agent';
import { OpenAIProvider, withOpenAIProvider } from '@tsdi/agent-providers/openai';

@Suite('OpenAI provider')
export class OpenAIProviderTest {

    @Test('registers openai provider via withOpenAIProvider')
    async registersOpenAIProvider() {
        const ctx = await Application.run({
            module: AgentModule,
            providers: withOpenAIProvider({ apiKey: 'sk-test' })
        });
        try {
            const adapter = ctx.get(AGENT_MODEL_ADAPTER);
            expect(adapter).toBeTruthy();
            expect(adapter).toBeInstanceOf(OpenAIProvider);
        } finally {
            await ctx.close();
        }
    }

    @Test('creates provider with custom options')
    async createsWithCustomOptions() {
        const provider = new OpenAIProvider({
            apiKey: 'sk-test',
            model: 'gpt-4o-mini',
            temperature: 0.5,
            maxTokens: 2048
        });
        expect(provider).toBeTruthy();
    }
}
