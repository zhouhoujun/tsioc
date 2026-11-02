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

    @Test('a provider without profiles still opens its live server catalog')
    async liveCatalogWithoutProfiles() {
        const calls: Array<{ method: string; params: any }> = [];
        const captured: any[] = [];
        let selects = 0;
        const ctx: any = {
            translator: null,
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    if (method === 'model.list') return [];
                    if (method === 'model.catalog') {
                        return { provider: 'deepseek', models: [{ id: 'server-live-model', name: 'Server Live' }] };
                    }
                    if (method === 'model.activate') {
                        return { provider: 'deepseek', model: params.name, modelProfile: params.name };
                    }
                    return undefined;
                }
            },
            state: {
                sessionId: 's1', modelProfile: '', model: '', provider: '',
                setModelProfile(value: string) { this.modelProfile = value; },
                setModel(value: string) { this.model = value; },
                setProvider(value: string) { this.provider = value; }
            },
            options: () => ({ model: { provider: 'deepseek', model: 'stale-model', baseUrl: 'https://api.deepseek.test/v1' } }),
            notify() {},
            select: async (_title: string, options: any[]) => {
                captured.push(options);
                selects += 1;
                if (selects === 1) return '__provider__:deepseek';
                return options.find(option => option.value === 'deepseek/server-live-model')?.value;
            },
            updateTerminalTitle() {},
            updateModelOptions() {},
            persistSettings: async () => undefined,
            resolveHistoryWorkspace: () => '',
            getFavorites: () => [], setFavorites() {},
            getRecents: () => [], setRecents() {},
            getReasoningEffort: () => 'medium' as const,
            setReasoningEffort() {},
            nextActivateRequestId: () => 1,
            peekActivateRequestId: () => 1
        };
        await openModelSwitcher(ctx);
        expect(calls.some(call => call.method === 'model.catalog' && call.params?.provider === 'deepseek')).toEqual(true);
        expect(calls.some(call => call.method === 'model.activate' && call.params?.name === 'deepseek/server-live-model')).toEqual(true);
        expect(captured[1].map((option: any) => option.value)).toContain('deepseek/server-live-model');
        expect(captured[1].map((option: any) => option.value)).not.toContain('stale-model');
    }

    @Test('auto routing persists through app RPC and updates local options')
    async autoRoutingPersists() {
        const calls: Array<{ method: string; params: any }> = [];
        const updates: any[] = [];
        const settings: any[] = [];
        const options: any = {
            model: {
                provider: 'deepseek', model: 'fast-model',
                profiles: {
                    'p-fast': { provider: 'deepseek', model: 'fast-model' },
                    'p-balanced': { provider: 'deepseek', model: 'balanced-model' },
                    'p-strong': { provider: 'deepseek', model: 'strong-model' }
                }
            }
        };
        let selects = 0;
        const ctx: any = {
            translator: null,
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    if (method === 'model.list') {
                        return Object.keys(options.model.profiles).map(name => ({
                            name, provider: 'deepseek', model: options.model.profiles[name].model
                        }));
                    }
                    if (method === 'model.catalog') {
                        return { provider: 'deepseek', models: [] };
                    }
                    if (method === 'model.activate' && params?.name === 'auto') {
                        return {
                            modelProfile: 'auto',
                            complexityRouting: { simple: 'p-fast', moderate: 'p-balanced', complex: 'p-strong' }
                        };
                    }
                    return undefined;
                }
            },
            state: { sessionId: 's1', modelProfile: '', setModelProfile(value: string) { this.modelProfile = value; } },
            options: () => options,
            notify() {},
            select: async () => (++selects === 1 ? '__provider__:p' : 'auto'),
            updateModelOptions: (model: any) => updates.push(model),
            persistSettings: async (patch: any) => settings.push(patch)
        };
        await openModelSwitcher(ctx);
        expect(calls.some(call => call.method === 'model.activate' && call.params?.name === 'auto')).toEqual(true);
        expect(options.model.defaultProfile).toBeUndefined();
        expect(options.model.complexityRouting).toEqual({ simple: 'p-fast', moderate: 'p-balanced', complex: 'p-strong' });
        expect(updates.length).toEqual(1);
        expect(settings).toContainEqual({ modelProfile: 'auto' });
        expect(ctx.state.modelProfile).toEqual('auto');
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

        const envOnly: any = {
            model: {
                provider: 'openai-compatible', model: 'gpt-5.5', apiKey: 'old-key', baseUrl: 'http://old.example', headers: { 'X-Old': '1' },
                profiles: { 'env-fast': { provider: 'deepseek', model: 'deepseek-flash', apiKeyEnv: 'DEEPSEEK_API_KEY', baseUrl: 'https://api.deepseek.com' } }
            }
        };
        const envCtx: any = { ...ctx, options: () => envOnly };
        await activateModelProfile(envCtx, 'env-fast');
        expect(envOnly.model.apiKey).toBeUndefined();
        expect(envOnly.model.apiKeyEnv).toEqual('DEEPSEEK_API_KEY');
        expect(envOnly.model.baseUrl).toEqual('https://api.deepseek.com');
        expect(envOnly.model.headers).toBeUndefined();
    }

    @Test('bare model ids target the active provider and update console state')
    async bareModelTargetsActiveProvider() {
        const calls: Array<{ method: string; params: any }> = [];
        const state: any = {
            sessionId: 's1', modelProfile: '', provider: '', model: '',
            setModelProfile(value: string) { this.modelProfile = value; },
            setProvider(value: string) { this.provider = value; },
            setModel(value: string) { this.model = value; }
        };
        const ctx: any = {
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    return { modelProfile: `deepseek/${params.name}`, provider: 'deepseek', model: params.name };
                }
            },
            state,
            options: () => ({ model: { provider: 'deepseek', model: 'deepseek-flash', profiles: {} } }),
            notify() {},
            updateTerminalTitle() {},
            nextActivateRequestId: () => 1,
            peekActivateRequestId: () => 1,
            getRecents: () => [], setRecents() {},
            getFavorites: () => [], setFavorites() {},
            getReasoningEffort: () => 'medium' as const,
            setReasoningEffort() {},
            persistSettings: async () => undefined,
            resolveHistoryWorkspace: () => ''
        };

        await activateModelProfile(ctx, 'deepseek-v4.1-flash', undefined, true);
        expect(calls[0].params.name).toEqual('deepseek-v4.1-flash');
        expect(state.provider).toEqual('deepseek');
        expect(state.model).toEqual('deepseek-v4.1-flash');
        expect(state.modelProfile).toEqual('deepseek/deepseek-v4.1-flash');
    }

    @Test('a profile activation falls back to the local profile model when the RPC omits it')
    async profileActivationFallsBackToLocalModel() {
        const state: any = {
            sessionId: 's1', modelProfile: '', provider: '', model: '',
            setModelProfile(value: string) { this.modelProfile = value; },
            setProvider(value: string) { this.provider = value; },
            setModel(value: string) { this.model = value; }
        };
        const ctx: any = {
            appRpc: { request: async () => ({ modelProfile: 'strong', provider: 'deepseek' }) },
            state,
            options: () => ({
                model: {
                    provider: 'deepseek', model: 'deepseek-flash',
                    profiles: { strong: { provider: 'deepseek', model: 'deepseek-v4.1-flash' } }
                }
            }),
            notify() {},
            updateTerminalTitle() {},
            nextActivateRequestId: () => 1,
            peekActivateRequestId: () => 1,
            getRecents: () => [], setRecents() {},
            getFavorites: () => [], setFavorites() {},
            getReasoningEffort: () => 'medium' as const,
            setReasoningEffort() {},
            persistSettings: async () => undefined,
            resolveHistoryWorkspace: () => ''
        };

        await activateModelProfile(ctx, 'strong', undefined, true);
        expect(state.provider).toEqual('deepseek');
        expect(state.model).toEqual('deepseek-v4.1-flash');
        expect(state.modelProfile).toEqual('strong');
    }

    @Test('local provider/model ids switch even without a profile entry')
    async localDirectModelId() {
        const options: any = {
            model: { provider: 'deepseek', model: 'deepseek-flash', profiles: { strong: { provider: 'deepseek', model: 'deepseek-v4.1-flash' } } }
        };
        const state: any = {
            sessionId: 's1', modelProfile: '', provider: '', model: '',
            setModelProfile(value: string) { this.modelProfile = value; },
            setProvider(value: string) { this.provider = value; },
            setModel(value: string) { this.model = value; }
        };
        const ctx: any = {
            appRpc: null,
            state,
            options: () => options,
            notify() {},
            updateTerminalTitle() {},
            updateModelOptions() {},
            getRecents: () => [], setRecents() {},
            getFavorites: () => [], setFavorites() {},
            getReasoningEffort: () => 'medium' as const,
            setReasoningEffort() {},
            persistSettings: async () => undefined,
            resolveHistoryWorkspace: () => ''
        };

        await activateModelProfile(ctx, 'deepseek/deepseek-v4.1-flash', undefined, true);
        expect(options.model.provider).toEqual('deepseek');
        expect(options.model.model).toEqual('deepseek-v4.1-flash');
        expect(state.model).toEqual('deepseek-v4.1-flash');
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
