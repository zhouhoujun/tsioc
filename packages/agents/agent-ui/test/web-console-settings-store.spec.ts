import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createRpcConsoleSettingsStore } from '../web-console';

interface RpcCall {
    method: string;
    params?: any;
}

function fakeRpc(loadResult: any, calls: RpcCall[]) {
    return {
        request: async (method: string, params?: any) => {
            calls.push({ method, params });
            if (method === 'settings.ui.get') {
                return loadResult;
            }
            return { ok: true };
        }
    };
}

@Suite('web console RPC settings store')
export class WebConsoleSettingsStoreTest {
    @Test('loads the gateway-owned preferences and saves them back')
    async roundTrip() {
        const calls: RpcCall[] = [];
        const store = createRpcConsoleSettingsStore(fakeRpc({
            personality: 'terse',
            memoryInjection: false,
            securityLevel: 'full',
            yoloMode: true
        }, calls));
        expect(await store.load('/work')).toEqual({
            personality: 'terse',
            memoryInjection: false,
            securityLevel: 'full',
            yoloMode: true
        });
        await store.save('/work', { personality: 'terse', memoryInjection: false, securityLevel: 'full', yoloMode: true });
        expect(calls[1]).toEqual({
            method: 'settings.ui.set',
            params: { personality: 'terse', memoryInjection: false, securityLevel: 'full', yoloMode: true }
        });
    }

    @Test('clears an unset personality with null and ignores invalid values')
    async clears() {
        const calls: RpcCall[] = [];
        const store = createRpcConsoleSettingsStore(fakeRpc({ personality: 'terse' }, calls));
        expect(await store.load('/work')).toMatchObject({ personality: 'terse' });
        await store.save('/work', { memoryInjection: true });
        expect(calls[1]).toEqual({ method: 'settings.ui.set', params: { personality: null, memoryInjection: true } });
    }

    @Test('a failed read does not clear a persisted personality on an unrelated save')
    async failedRead() {
        const calls: RpcCall[] = [];
        const store = createRpcConsoleSettingsStore({
            request: async (method: string, params?: any) => {
                calls.push({ method, params });
                if (method === 'settings.ui.get') {
                    throw new Error('offline');
                }
                return { ok: true };
            }
        });
        await store.load('/work');
        await store.save('/work', { memoryInjection: false, securityLevel: 'ask' });
        expect(calls[1]).toEqual({ method: 'settings.ui.set', params: { memoryInjection: false, securityLevel: 'ask' } });
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
