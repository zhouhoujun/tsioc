import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AnthropicModelAdapter,
    DEFAULT_AGENT_MODEL_ID,
    DEFAULT_AGENT_PROVIDER_ID,
    DEFAULT_ANTHROPIC_API_KEY_ENV,
    DEFAULT_ANTHROPIC_BASE_URL,
    DEFAULT_ANTHROPIC_MODEL_ID,
    DEFAULT_OPENAI_COMPATIBLE_API_KEY_ENV,
    DEFAULT_OPENAI_COMPATIBLE_BASE_URL,
    OpenAICompatibleModelAdapter,
    defaultAgentOptions,
    defaultAgentProviderRegistry
} from '../src';

interface RecordingAppArgs {
    get<T>(key: string): T | undefined;
}

function recordingAppArgs(seen: string[]): RecordingAppArgs {
    return { get: key => { seen.push(key); return undefined; } };
}

class InspectableOpenAIAdapter extends OpenAICompatibleModelAdapter {
    resolvedModel(): string { return this.resolveModel(); }
    resolvedBaseUrl(): string { return this.resolveBaseUrl(); }
    resolvedApiKey(): string | undefined { return this.resolveApiKey(); }
}

class InspectableAnthropicAdapter extends AnthropicModelAdapter {
    resolvedModel(): string { return this.resolveModel(); }
    resolvedBaseUrl(): string { return this.resolveBaseUrl(); }
    resolvedApiKey(): string | undefined { return this.resolveApiKey(); }
}

@Suite('Agent model defaults')
export class AgentModelDefaultsSpec {
    @Test('schema defaults consume the single-source constants')
    optionsUseSingleSource() {
        expect(defaultAgentOptions.model?.provider).toBe(DEFAULT_AGENT_PROVIDER_ID);
        expect(defaultAgentOptions.model?.model).toBe(DEFAULT_AGENT_MODEL_ID);
        expect(defaultAgentOptions.model?.baseUrl).toBe(DEFAULT_OPENAI_COMPATIBLE_BASE_URL);
        expect(defaultAgentOptions.model?.apiKeyEnv).toBe(DEFAULT_OPENAI_COMPATIBLE_API_KEY_ENV);
    }

    @Test('provider registry is the single source for default endpoints and key env')
    registryIsEndpointSource() {
        const deepseek = defaultAgentProviderRegistry.get(DEFAULT_AGENT_PROVIDER_ID);
        expect(deepseek?.baseUrl).toBe(DEFAULT_OPENAI_COMPATIBLE_BASE_URL);
        expect(deepseek?.apiKeyEnv).toBe(DEFAULT_OPENAI_COMPATIBLE_API_KEY_ENV);
        const anthropic = defaultAgentProviderRegistry.get('anthropic');
        expect(anthropic?.baseUrl).toBe(DEFAULT_ANTHROPIC_BASE_URL);
        expect(anthropic?.apiKeyEnv).toBe(DEFAULT_ANTHROPIC_API_KEY_ENV);
    }

    @Test('adapters fall back to the centralized defaults instead of inline vendor literals')
    adaptersUseSingleSource() {
        const openaiEnv: string[] = [];
        const openai = new InspectableOpenAIAdapter({ provider: DEFAULT_AGENT_PROVIDER_ID }, recordingAppArgs(openaiEnv) as any);
        expect(openai.resolvedModel()).toBe(DEFAULT_AGENT_MODEL_ID);
        expect(openai.resolvedBaseUrl()).toBe(DEFAULT_OPENAI_COMPATIBLE_BASE_URL);
        openai.resolvedApiKey();
        expect(openaiEnv[0]).toBe(DEFAULT_OPENAI_COMPATIBLE_API_KEY_ENV);

        const anthropicEnv: string[] = [];
        const anthropic = new InspectableAnthropicAdapter({ provider: 'anthropic' }, recordingAppArgs(anthropicEnv) as any);
        expect(anthropic.resolvedModel()).toBe(DEFAULT_ANTHROPIC_MODEL_ID);
        expect(anthropic.resolvedBaseUrl()).toBe(DEFAULT_ANTHROPIC_BASE_URL);
        anthropic.resolvedApiKey();
        expect(anthropicEnv[0]).toBe(DEFAULT_ANTHROPIC_API_KEY_ENV);
    }

    @Test('explicit config still overrides the centralized defaults')
    explicitConfigWins() {
        const adapter = new InspectableOpenAIAdapter({
            provider: 'openai-compatible',
            model: 'custom-model',
            baseUrl: 'https://example.com/'
        });
        expect(adapter.resolvedModel()).toBe('custom-model');
        expect(adapter.resolvedBaseUrl()).toBe('https://example.com');
    }
}
