import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentProviderRegistry, defaultAgentProviderRegistry } from '../src/model/provider-registry';

@Suite('Model provider registry (P84)')
export class ProviderRegistryTest {
    @Test('resolves built-in capabilities')
    resolvesBuiltins() {
        expect(defaultAgentProviderRegistry.get('openai')?.baseUrl).toEqual('https://api.openai.com');
        expect(defaultAgentProviderRegistry.resolveModel('openai', 'gpt-5').capabilities.vision).toEqual(true);
    }
    @Test('parses custom provider maps and normalizes urls')
    parsesCustomMap() {
        const registry = new AgentProviderRegistry(AgentProviderRegistry.parse({ providers: { local: { baseUrl: 'http://localhost:1234/', models: ['coder'] } } }));
        expect(registry.get('LOCAL')?.baseUrl).toEqual('http://localhost:1234');
        expect(registry.get('local')?.models[0].id).toEqual('coder');
    }
    @Test('merges model capability overrides and completes configs')
    completesConfig() {
        const registry = new AgentProviderRegistry([{ id: 'x', apiKeyEnv: 'X_KEY', models: [{ id: 'm', capabilities: { toolCalling: false } }], capabilities: { vision: true } }]);
        expect(registry.resolveModel('x', 'm').capabilities.toolCalling).toEqual(false);
        expect(registry.completeConfig({ provider: 'x', model: 'm' }).apiKeyEnv).toEqual('X_KEY');
        expect(registry.completeConfig({ provider: 'unknown', model: 'm' })).toEqual({ provider: 'unknown', model: 'm' });
    }
}
