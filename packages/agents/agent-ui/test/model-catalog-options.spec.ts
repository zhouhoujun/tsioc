import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { activateModelProfile, fetchProviderCatalog, loadModelProfileOptions, openModelSwitcher } from '../src/AgentConsoleModelHandlers';

function context() {
    return {
        appRpc: {
            request: async (method: string) => {
                if (method === 'model.list') {
                    return [{ name: 'flash', provider: 'deepseek', model: 'deepseek-v4-flash', selected: true }];
                }
                if (method === 'model.catalog') {
                    return {
                        provider: 'deepseek',
                        source: 'remote',
                        models: [
                            { id: 'deepseek-v4-flash', name: 'Flash' },
                            { id: 'deepseek-v4-pro', name: 'Pro', effort: { supportedLevels: ['low', 'high'], defaultLevel: 'high' } }
                        ]
                    };
                }
                return undefined;
            }
        },
        state: { sessionId: 's1', modelProfile: '' },
        options: () => ({}),
        notify() {},
        resolveHistoryWorkspace: () => '',
        getFavorites: () => [],
        setFavorites() {},
        getRecents: () => [],
        setRecents() {},
        getReasoningEffort: () => 'medium' as const,
        setReasoningEffort() {}
    } as any;
}

@Suite('model catalog options')
export class ModelCatalogOptionsTest {
    @Test('loads configured profiles quickly and fetches live catalog models per provider')
    async profilesAndLiveCatalog() {
        const options = await loadModelProfileOptions(context());
        const values = options.map(option => option.value);
        expect(values).toContain('flash');
        expect(values).not.toContain('deepseek/deepseek-v4-pro');

        const live = await fetchProviderCatalog(context(), 'deepseek');
        const pro = live.options.find(option => option.value === 'deepseek/deepseek-v4-pro')!;
        expect(pro.description).toBe('deepseek / deepseek-v4-pro');
        expect(pro.detail).toContain('low, high');
        expect(pro.detail).toContain('default high');
    }

    @Test('fetches the selected provider catalog live and Esc returns to the provider list')
    async liveCatalogAndEscBack() {
        const calls: Array<{ method: string; params: any }> = [];
        const titles: string[] = [];
        const captured: any[] = [];
        let selects = 0;
        const ctx: any = {
            translator: null,
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    if (method === 'model.list') {
                        return [
                            { name: 'gpt-5.5', provider: 'openai-compatible', model: 'gpt-5.5', selected: true },
                            { name: 'deepseek-fast', provider: 'deepseek', model: 'deepseek-flash' }
                        ];
                    }
                    if (method === 'model.catalog') {
                        return params?.provider === 'openai-compatible'
                            ? { provider: 'openai-compatible', models: [{ id: 'live-model', name: 'Live' }] }
                            : { provider: params?.provider || 'deepseek', models: [] };
                    }
                    return undefined;
                }
            },
            state: { sessionId: 's1', modelProfile: 'gpt-5.5' },
            options: () => ({ model: { profiles: {} } }),
            notify() {},
            select: async (title: string, options: any[]) => {
                titles.push(title);
                captured.push(options);
                selects += 1;
                if (selects === 1) return '__provider__:openai-compatible';
                return undefined;
            }
        };
        await openModelSwitcher(ctx);
        expect(titles.filter(title => title.includes('Model providers')).length).toEqual(2);
        expect(captured[1].map((option: any) => option.value)).toContain('openai-compatible/live-model');
        expect(calls.some(entry => entry.method === 'model.catalog' && entry.params?.provider === 'openai-compatible')).toEqual(true);
    }

    @Test('activating a configured profile without app RPC merges it into the runtime options')
    async localProfileActivation() {
        const options: any = {
            model: {
                provider: 'openai-compatible',
                model: 'gpt-5.5',
                profiles: { 'deepseek-fast': { provider: 'deepseek', model: 'deepseek-flash', baseUrl: 'https://api.deepseek.com' } }
            }
        };
        const ctx: any = {
            appRpc: null,
            state: { sessionId: 's1', setModelProfile() {}, setProvider() {}, setModel() {} },
            options: () => options,
            notify() {},
            updateTerminalTitle() {},
            getRecents: () => [], setRecents() {},
            getFavorites: () => [], setFavorites() {},
            getReasoningEffort: () => 'medium' as const,
            setReasoningEffort() {},
            persistSettings: async () => undefined,
            resolveHistoryWorkspace: () => ''
        };
        await activateModelProfile(ctx, 'deepseek-fast');
        expect(options.model.provider).toEqual('deepseek');
        expect(options.model.model).toEqual('deepseek-flash');
        expect(options.model.baseUrl).toEqual('https://api.deepseek.com');
        expect(options.model.defaultProfile).toEqual('deepseek-fast');
    }

    @Test('active model selection forwards the chosen reasoning effort')
    async forwardsEffort() {
        const calls: Array<{ method: string; params: any }> = [];
        const ctx: any = {
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    return { modelProfile: params.name, provider: 'deepseek', model: 'deepseek-v4-pro', reasoningEffort: params.reasoningEffort };
                }
            },
            state: {
                sessionId: 's1', modelProfile: '', oneShotModelProfile: '',
                setModelProfile() {}, setProvider() {}, setModel() {}
            },
            options: () => ({}),
            notify() {},
            updateTerminalTitle() {},
            nextActivateRequestId: () => 1,
            peekActivateRequestId: () => 1,
            getRecents: () => [], setRecents() {},
            getFavorites: () => [], setFavorites() {},
            getReasoningEffort: () => 'medium' as const,
            setReasoningEffort() {},
            persistSettings: async (patch: any) => { calls.push({ method: 'persistSettings', params: patch }); },
            resolveHistoryWorkspace: () => ''
        };

        await activateModelProfile(ctx, 'deepseek/deepseek-v4-pro', 'max');
        expect(calls[0].method).toBe('model.activate');
        expect(calls.some(call => call.method === 'persistSettings' && call.params.modelProfile === 'deepseek/deepseek-v4-pro')).toEqual(true);
        expect(calls[0].params.reasoningEffort).toBe('max');
        expect(calls[0].params.name).toBe('deepseek/deepseek-v4-pro');
    }
}
