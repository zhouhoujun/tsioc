import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { activateModelProfile, loadModelProfileOptions } from '../src/AgentConsoleModelHandlers';

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
    @Test('merges live catalog models with configured profiles')
    async mergesCatalog() {
        const options = await loadModelProfileOptions(context());
        const values = options.map(option => option.value);
        expect(values).toContain('flash');
        expect(values).toContain('deepseek/deepseek-v4-pro');

        const pro = options.find(option => option.value === 'deepseek/deepseek-v4-pro')!;
        expect(pro.description).toBe('deepseek / deepseek-v4-pro');
        expect(pro.detail).toContain('low, high');
        expect(pro.detail).toContain('default high');
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
            resolveHistoryWorkspace: () => ''
        };

        await activateModelProfile(ctx, 'deepseek/deepseek-v4-pro', 'max');
        expect(calls[0].method).toBe('model.activate');
        expect(calls[0].params.reasoningEffort).toBe('max');
        expect(calls[0].params.name).toBe('deepseek/deepseek-v4-pro');
    }
}
