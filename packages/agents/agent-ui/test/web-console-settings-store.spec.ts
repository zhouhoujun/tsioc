import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createRpcConsoleSettingsStore } from '../web-console';

interface RpcCall {
    method: string;
    params?: any;
}

function fakeRpc(loadResult: any, calls: RpcCall[], fileResult: any = null) {
    return {
        request: async (method: string, params?: any) => {
            calls.push({ method, params });
            if (method === 'settings.ui.get') {
                return loadResult;
            }
            if (method === 'settings.store.get') {
                return fileResult;
            }
            return { ok: true };
        }
    };
}

function call(calls: RpcCall[], method: string): RpcCall | undefined {
    return calls.find(entry => entry.method === method);
}

@Suite('web console RPC settings store')
export class WebConsoleSettingsStoreTest {
    @Test('loads the workspace settings file plus the gateway-owned preferences and saves them back')
    async roundTrip() {
        const calls: RpcCall[] = [];
        const store = createRpcConsoleSettingsStore(fakeRpc({
            personality: 'terse',
            memoryInjection: false,
            securityLevel: 'full',
            yoloMode: true
        }, calls, { language: 'zh', messageLayout: 'scrollback' }));
        expect(await store.load('/work')).toEqual({
            language: 'zh',
            personality: 'terse',
            memoryInjection: false,
            securityLevel: 'full',
            yoloMode: true
        });
        await store.save('/work', { language: 'zh', personality: 'terse', memoryInjection: false, securityLevel: 'full', yoloMode: true });
        expect(call(calls, 'settings.store.set')?.params).toEqual({
            name: 'settings.json',
            data: { language: 'zh', messageLayout: 'scrollback', personality: 'terse', memoryInjection: false, securityLevel: 'full', yoloMode: true }
        });
        expect(call(calls, 'settings.ui.set')?.params).toEqual({
            personality: 'terse', memoryInjection: false, securityLevel: 'full', yoloMode: true
        });
    }

    @Test('clears an unset personality with null and ignores invalid values')
    async clears() {
        const calls: RpcCall[] = [];
        const store = createRpcConsoleSettingsStore(fakeRpc({ personality: 'terse' }, calls, { language: 'zh' }));
        expect(await store.load('/work')).toMatchObject({ personality: 'terse', language: 'zh' });
        await store.save('/work', { memoryInjection: true });
        expect(call(calls, 'settings.ui.set')?.params).toEqual({ personality: null, memoryInjection: true });
        expect(call(calls, 'settings.store.set')?.params.data).toMatchObject({ language: 'zh', memoryInjection: true });
    }

    @Test('a failed read does not clear a persisted personality on an unrelated save')
    async failedRead() {
        const calls: RpcCall[] = [];
        const store = createRpcConsoleSettingsStore({
            request: async (method: string, params?: any) => {
                calls.push({ method, params });
                if (method === 'settings.ui.get' || method === 'settings.store.get') {
                    throw new Error('offline');
                }
                return { ok: true };
            }
        });
        await store.load('/work');
        await store.save('/work', { memoryInjection: false, securityLevel: 'ask' });
        expect(call(calls, 'settings.ui.set')?.params).toEqual({ memoryInjection: false, securityLevel: 'ask' });
    }

    @Test('swallows gateway failures')
    async failures() {
        const store = createRpcConsoleSettingsStore({
            request: async () => { throw new Error('offline'); }
        });
        expect(await store.load('/work')).toEqual({
            personality: undefined,
            memoryInjection: undefined,
            securityLevel: undefined,
            yoloMode: undefined
        });
        await store.save('/work', { securityLevel: 'ask' });
    }
}
