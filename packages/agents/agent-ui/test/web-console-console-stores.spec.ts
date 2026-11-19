import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { defaultAgentConsoleStatusline, defaultAgentConsoleTitle } from '../src';
import { createRpcConsoleSettingsStore, createRpcConsoleStores } from '../web-console';

interface RpcCall {
    method: string;
    params?: any;
}

function fakeRpc(calls: RpcCall[] = [], files: Record<string, any> = {}) {
    return {
        files,
        request: async (method: string, params?: any) => {
            calls.push({ method, params });
            if (method === 'settings.store.get') {
                return files[params?.name] ?? null;
            }
            if (method === 'settings.store.set') {
                files[params?.name] = params?.data;
                return { ok: true };
            }
            return null;
        }
    };
}

@Suite('web console RPC stores')
export class WebConsoleStoresTest {
    @Test('theme, statusline, title, raw mode and keymap round-trip through the gateway workspace')
    async roundTrip() {
        const calls: RpcCall[] = [];
        const rpc = fakeRpc(calls);
        const stores = createRpcConsoleStores(rpc);

        await stores.theme.save('/work', 'light');
        expect(await stores.theme.load('/work')).toEqual('light');
        expect(calls[0]).toEqual({ method: 'settings.store.set', params: { name: 'theme.json', data: { version: 1, theme: 'light' } } });

        await stores.statusline.save('/work', ['model', 'tokens']);
        expect(await stores.statusline.load('/work')).toEqual(['model', 'tokens']);
        await stores.title.save('/work', ['project', 'branch']);
        expect(await stores.title.load('/work')).toEqual(['project', 'branch']);
        await stores.rawMode.save('/work', true);
        expect(await stores.rawMode.load('/work')).toEqual(true);

        const contexts = { messages: { 'messages.copy': 'ctrl+y' } };
        await stores.keymap.save('/work', { 'global.open': 'ctrl+o' }, contexts);
        expect(await stores.keymap.load('/work')).toEqual({ 'global.open': 'ctrl+o' });
        expect(await stores.keymap.loadContexts('/work')).toEqual(contexts);
    }

    @Test('unknown themes and empty files fall back to the defaults')
    async defaults() {
        const rpc = fakeRpc([], { 'theme.json': { theme: 'nope' } });
        const stores = createRpcConsoleStores(rpc);
        expect(await stores.theme.load('/work')).toEqual(undefined);
        expect(await stores.statusline.load('/work')).toEqual(defaultAgentConsoleStatusline);
        expect(await stores.title.load('/work')).toEqual(defaultAgentConsoleTitle);
        expect(await stores.rawMode.load('/work')).toEqual(false);
        expect(await stores.keymap.load('/work')).toEqual({});
        expect(await stores.keymap.loadContexts('/work')).toEqual({});
    }

    @Test('RPC failures never throw and leave defaults')
    async failures() {
        const stores = createRpcConsoleStores({
            request: async () => { throw new Error('offline'); }
        });
        await stores.theme.save('/work', 'light');
        expect(await stores.theme.load('/work')).toEqual(undefined);
        expect(await stores.statusline.load('/work')).toEqual(defaultAgentConsoleStatusline);
        expect(await stores.title.load('/work')).toEqual(defaultAgentConsoleTitle);
        expect(await stores.rawMode.load('/work')).toEqual(false);
        expect(await stores.keymap.load('/work')).toEqual({});
    }
}

@Suite('web console settings store')
export class WebConsoleSettingsStoreTest {
    @Test('save writes the workspace settings file and the gateway ui patch once')
    async savesThroughBothRpcs() {
        const calls: RpcCall[] = [];
        const rpc = fakeRpc(calls, { 'settings.json': { showThinking: true, messageLayout: 'viewport' } });
        const store = createRpcConsoleSettingsStore(rpc);
        await store.load('/work');
        await store.save('/work', {
            showThinking: false,
            personality: 'reviewer',
            memoryInjection: true,
            securityLevel: 'ask',
            yoloMode: false
        } as any);
        const fileWrites = calls.filter(call => call.method === 'settings.store.set' && call.params?.name === 'settings.json');
        const uiWrites = calls.filter(call => call.method === 'settings.ui.set');
        expect(fileWrites.length).toEqual(1);
        expect(uiWrites.length).toEqual(1);
        expect(fileWrites[0].params.data.showThinking).toEqual(false);
        // The terminal layout is never overwritten by the browser.
        expect(fileWrites[0].params.data.messageLayout).toEqual('viewport');
        expect(uiWrites[0].params).toMatchObject({
            personality: 'reviewer',
            memoryInjection: true,
            securityLevel: 'ask',
            yoloMode: false
        });
    }

    @Test('load prefers gateway ui values over the settings file')
    async loadMergesGatewayValues() {
        const rpc = fakeRpc([], {
            'settings.json': { showThinking: true, personality: 'stale', securityLevel: 'read-only' }
        });
        const store = createRpcConsoleSettingsStore({
            request: async (method: string, params?: any) => {
                if (method === 'settings.store.get') {
                    return rpc.files[params?.name] ?? null;
                }
                if (method === 'settings.ui.get') {
                    return { personality: 'reviewer', securityLevel: 'full', memoryInjection: false };
                }
                return null;
            }
        });
        const settings = await store.load('/work');
        expect(settings.personality).toEqual('reviewer');
        expect(settings.securityLevel).toEqual('full');
        expect(settings.memoryInjection).toEqual(false);
        expect(settings.showThinking).toEqual(true);
    }

    @Test('RPC failures do not throw and keep the last loaded state')
    async failuresAreQuiet() {
        const store = createRpcConsoleSettingsStore({
            request: async () => { throw new Error('offline'); }
        });
        const loaded = await store.load('/work');
        expect(loaded.securityLevel).toEqual(undefined);
        await store.save('/work', { yoloMode: true } as any);
    }
}
