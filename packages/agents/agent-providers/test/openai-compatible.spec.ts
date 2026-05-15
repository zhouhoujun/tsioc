import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule, AGENT_MODEL_ADAPTER } from '@tsdi/agent';
import { OpenAICompatibleProvider, withOpenAICompatibleProvider } from '@tsdi/agent-providers/openai-compatible';

@Suite('OpenAI-Compatible provider')
export class OpenAICompatibleProviderTest {

    @Test('registers generic provider via withOpenAICompatibleProvider')
    async registersGenericProvider() {
        const ctx = await Application.run({
            module: AgentModule,
            providers: withOpenAICompatibleProvider({
                provider: 'groq',
                apiKey: 'gsk-test',
                baseUrl: 'https://api.groq.com/openai/v1'
            })
        });
        try {
            const adapter = ctx.get(AGENT_MODEL_ADAPTER);
            expect(adapter).toBeTruthy();
            expect(adapter).toBeInstanceOf(OpenAICompatibleProvider);
        } finally {
            await ctx.close();
        }
    }

    @Test('creates provider with custom provider settings')
    async createsWithProviderSettings() {
        const provider = new OpenAICompatibleProvider({
            provider: 'together',
            model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
            baseUrl: 'https://api.together.xyz/v1',
            apiKey: 'together-test',
            temperature: 0.7,
            maxTokens: 4096
        });
        expect(provider).toBeTruthy();
    }
}
