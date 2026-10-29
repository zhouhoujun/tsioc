import * as http from 'http';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { activateCatalogModel, activateProfileModel, hasModelProvider, resolveModelCatalog } from '../src/app-rpc/modelCatalog';

function listen(server: http.Server): Promise<number> {
    return new Promise(resolve => {
        server.listen(0, '127.0.0.1', () => resolve((server.address() as any).port));
    });
}

@Suite('model catalog providers')
export class ModelCatalogProvidersTest {
    @Test('fetches the selected provider endpoint, not the active one')
    async selectedProvider() {
        const requests: string[] = [];
        const server = http.createServer((req, res) => {
            requests.push(String(req.url || ''));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: [{ id: 'live-alt', name: 'Live Alt' }] }));
        });
        const port = await listen(server);
        try {
            const options: any = {
                model: {
                    provider: 'openai-compatible',
                    model: 'active',
                    baseUrl: 'http://127.0.0.1:1',
                    profiles: { alt: { provider: 'alt', model: 'alt-model', baseUrl: `http://127.0.0.1:${port}` } }
                }
            };
            const catalog = await resolveModelCatalog(options, 'alt');
            expect(catalog.provider).toEqual('alt');
            expect(catalog.models.map(entry => entry.id)).toEqual(['live-alt']);
            expect(requests[0]).toContain('/v1/models');
        } finally {
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    }

    @Test('falls back to the selected provider static models, not the OpenAI default')
    async providerFallback() {
        const options: any = { model: { provider: 'openai', model: 'gpt-4.1' } };
        const catalog = await resolveModelCatalog(options, 'deepseek');
        expect(catalog.provider).toEqual('deepseek');
        const ghost: any = { model: { provider: 'openai', model: 'gpt-4.1', profiles: { ghost: { provider: 'ghost', model: 'x' } } } };
        const empty = await resolveModelCatalog(ghost, 'ghost');
        expect(empty.provider).toEqual('ghost');
        expect(empty.models).toEqual([]);
    }

    @Test('activating a configured profile applies its provider/model to the top-level runtime options')
    profileActivation() {
        const options: any = {
            model: {
                provider: 'openai-compatible',
                model: 'gpt-5.5',
                profiles: { 'fake-fast': { provider: 'fake-openai', model: 'fake-model-a', baseUrl: 'http://fake.example/v1', apiKey: 'k' } }
            }
        };
        const result = activateProfileModel(options, 'fake-fast');
        expect(result.provider).toEqual('fake-openai');
        expect(result.model).toEqual('fake-model-a');
        expect(options.model.provider).toEqual('fake-openai');
        expect(options.model.model).toEqual('fake-model-a');
        expect(options.model.baseUrl).toEqual('http://fake.example/v1');
        expect(options.model.defaultProfile).toEqual('fake-fast');
    }

    @Test('live catalog models activate with the selected provider connection')
    async activateLiveModel() {
        const options: any = {
            model: {
                provider: 'openai-compatible',
                model: 'active',
                baseUrl: 'http://active.example/v1',
                apiKey: 'active-key',
                profiles: { alt: { provider: 'alt', model: 'alt-model', baseUrl: 'http://alt.example/v1', apiKey: 'alt-key' } }
            }
        };
        expect(hasModelProvider(options, 'alt')).toEqual(true);
        expect(hasModelProvider(options, 'ghost')).toEqual(false);
        const activated = activateCatalogModel(options, 'alt', 'live-alt', 'high');
        expect(activated).toEqual({ provider: 'alt', model: 'live-alt', reasoningEffort: 'high' });
        expect(options.model.provider).toEqual('alt');
        expect(options.model.model).toEqual('live-alt');
        expect(options.model.baseUrl).toEqual('http://alt.example/v1');
        expect(options.model.apiKey).toEqual('alt-key');
        expect(options.model.reasoningEffort).toEqual('high');
        expect(options.model.defaultProfile).toBeUndefined();
    }
}
