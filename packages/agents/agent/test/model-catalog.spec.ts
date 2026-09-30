import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    DEFAULT_AGENT_MODEL_CATALOG,
    fetchAgentModelCatalog,
    findAgentModel,
    isSupportedModel,
    parseAgentModelCatalog,
    resolveModelEffort
} from '../src';

const DEEPSEEK_MODELS_PAYLOAD = {
    object: 'list',
    data: [
        {
            id: 'deepseek-flash',
            object: 'model',
            owned_by: 'deepseek',
            name: 'DeepSeek-V4.1-Flash',
            context_window: 1048576,
            max_output_tokens: 393216,
            input_modalities: ['text', 'image'],
            output_modalities: ['text'],
            effort: { supported_levels: ['low', 'high', 'max'], default_level: 'high' }
        },
        {
            id: 'deepseek-v4-pro',
            object: 'model',
            name: 'DeepSeek-V4-Pro',
            context_window: 1048576,
            max_output_tokens: 393216,
            input_modalities: ['text'],
            output_modalities: ['text'],
            effort: { supported_levels: ['low', 'high', 'max'], default_level: 'high' }
        }
    ]
};

@Suite('Agent model catalog')
export class AgentModelCatalogSpec {
    @Test('parses a provider /models payload')
    parsesModelsPayload() {
        const catalog = parseAgentModelCatalog(DEEPSEEK_MODELS_PAYLOAD, 'deepseek');
        expect(catalog.source).toBe('remote');
        expect(catalog.models.map(model => model.id)).toEqual(['deepseek-flash', 'deepseek-v4-pro']);

        const flash = findAgentModel(catalog, 'deepseek-flash');
        expect(flash?.name).toBe('DeepSeek-V4.1-Flash');
        expect(flash?.contextWindow).toBe(1048576);
        expect(flash?.inputModalities).toEqual(['text', 'image']);
        expect(flash?.effort?.supportedLevels).toEqual(['low', 'high', 'max']);
        expect(flash?.effort?.defaultLevel).toBe('high');
    }

    @Test('falls back to bundled catalog for an empty or malformed payload')
    emptyPayloadUsesBundled() {
        expect(parseAgentModelCatalog({ object: 'list', data: [] }).source).toBe('bundled');
        expect(parseAgentModelCatalog(null).models).toEqual([]);
        expect(DEFAULT_AGENT_MODEL_CATALOG.models.map(model => model.id)).toEqual(['deepseek-flash', 'deepseek-v4-pro']);
    }

    @Test('resolves effort against supported levels')
    resolvesEffort() {
        const catalog = parseAgentModelCatalog(DEEPSEEK_MODELS_PAYLOAD, 'deepseek');
        expect(resolveModelEffort(catalog, 'deepseek-v4-pro', 'max')).toBe('max');
        expect(resolveModelEffort(catalog, 'deepseek-v4-pro')).toBe('high');
        expect(resolveModelEffort(catalog, 'unknown-model')).toBeUndefined();
        expect(isSupportedModel(catalog, 'deepseek-flash')).toBe(true);
        expect(isSupportedModel(catalog, 'deepseek-4.1-flash')).toBe(false);
    }

    @Test('fetches remote catalog and falls back on failure')
    async fetchesAndFallsBack() {
        const remote = await fetchAgentModelCatalog({
            baseUrl: 'https://api.deepseek.com',
            fetchImpl: (async () => ({ ok: true, json: async () => DEEPSEEK_MODELS_PAYLOAD })) as unknown as typeof fetch
        });
        expect(remote.source).toBe('remote');
        expect(remote.models.length).toBe(2);

        const failed = await fetchAgentModelCatalog({
            baseUrl: 'https://api.deepseek.com',
            fetchImpl: (async () => { throw new Error('network down'); }) as unknown as typeof fetch
        });
        expect(failed.source).toBe('bundled');
        expect(failed.models.map(model => model.id)).toEqual(['deepseek-flash', 'deepseek-v4-pro']);

        const notOk = await fetchAgentModelCatalog({
            baseUrl: 'https://api.deepseek.com',
            fetchImpl: (async () => ({ ok: false, status: 401, json: async () => ({}) })) as unknown as typeof fetch
        });
        expect(notOk.source).toBe('bundled');
    }
}
