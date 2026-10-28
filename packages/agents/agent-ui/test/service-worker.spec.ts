import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'web', 'sw.js'), 'utf8');
const SCOPE = 'http://localhost:3100/';

interface SwHarness {
    cached: Map<string, Response>;
    fetchCalls: string[];
    deleted: string[];
    cacheName: string;
    install(): Promise<void>;
    activate(): Promise<void>;
    dispatch(pathname: string, mode?: string): Promise<Response | undefined>;
}

function createHarness(options: { online?: boolean; networkBody?: string } = {}): SwHarness {
    const cached = new Map<string, Response>();
    const fetchCalls: string[] = [];
    const deleted: string[] = [];
    const listeners: Record<string, (event: any) => void> = {};
    const harness = {
        cached,
        fetchCalls,
        deleted,
        cacheName: ''
    } as SwHarness;

    const cache = {
        addAll: async (assets: string[]) => {
            for (const asset of assets) {
                cached.set(new URL(asset, SCOPE).href, new Response(`install:${asset}`));
            }
        },
        put: async (request: any, response: Response) => {
            cached.set(String(request.url), response);
        }
    };
    const caches = {
        open: async (name: string) => {
            harness.cacheName = name;
            return cache;
        },
        match: async (request: any) => cached.get(typeof request === 'string' ? new URL(request, SCOPE).href : String(request.url)),
        keys: async () => ['tsdi-agent-shell-v1', harness.cacheName].filter(Boolean),
        delete: async (name: string) => {
            deleted.push(name);
            return true;
        }
    };
    const fetchImpl = async (request: any) => {
        const url = String(request.url || request);
        fetchCalls.push(url);
        if (options.online === false) {
            throw new Error('offline');
        }
        return new Response(options.networkBody ?? `network:${url}`);
    };
    const self = {
        registration: { scope: SCOPE },
        addEventListener: (type: string, handler: (event: any) => void) => {
            listeners[type] = handler;
        },
        skipWaiting: () => undefined,
        clients: { claim: () => undefined }
    };
    vm.runInNewContext(SOURCE, { self, caches, fetch: fetchImpl, URL, Response, Promise, Set, Map, console });

    harness.install = async () => {
        const waits: Array<Promise<any>> = [];
        listeners.install({ waitUntil: (promise: Promise<any>) => waits.push(promise) });
        await Promise.all(waits);
    };
    harness.activate = async () => {
        const waits: Array<Promise<any>> = [];
        listeners.activate({ waitUntil: (promise: Promise<any>) => waits.push(promise) });
        await Promise.all(waits);
    };
    harness.dispatch = async (pathname: string, mode = 'cors') => {
        const request = { method: 'GET', url: new URL(pathname, SCOPE).href, mode };
        let responded: Promise<Response> | undefined;
        const waits: Array<Promise<any>> = [];
        listeners.fetch({
            request,
            respondWith: (promise: Promise<Response>) => { responded = promise; },
            waitUntil: (promise: Promise<any>) => waits.push(promise)
        });
        if (!responded) {
            return undefined;
        }
        const response = await responded;
        await Promise.all(waits);
        return response;
    };
    return harness;
}

@Suite('web console service worker')
export class ServiceWorkerTest {
    @Test('precaches the header script so the offline shell can boot')
    async cachesHeader() {
        const sw = createHarness();
        await sw.install();
        expect(sw.cached.has(`${SCOPE}header.js`)).toEqual(true);
        expect(sw.cached.has(`${SCOPE}dist/agent-console.js`)).toEqual(true);
        // The cache name must move with the release, otherwise an upgraded
        // bundle stays pinned in the old cache.
        expect(sw.cacheName).not.toEqual('tsdi-agent-shell-v1');
    }

    @Test('serves fresh shell assets online and only falls back to the cache offline')
    async networkFirst() {
        const online = createHarness({ networkBody: 'fresh-console' });
        await online.install();
        const fresh = await online.dispatch('dist/agent-console.js');
        expect(await fresh!.text()).toEqual('fresh-console');
        expect(online.fetchCalls).toContain(`${SCOPE}dist/agent-console.js`);
        expect(await (online.cached.get(`${SCOPE}dist/agent-console.js`)!).text()).toEqual('fresh-console');

        const offline = createHarness({ online: false });
        await offline.install();
        const stale = await offline.dispatch('dist/agent-console.js');
        expect(await stale!.text()).toEqual('install:./dist/agent-console.js');
    }

    @Test('leaves RPC and event-stream requests to the network')
    async bypassesApi() {
        const sw = createHarness();
        await sw.install();
        expect(await sw.dispatch('api/events?sessionId=x')).toBeUndefined();
        expect(await sw.dispatch('rpc')).toBeUndefined();
        expect(sw.fetchCalls).toEqual([]);
    }

    @Test('activation drops older shell caches')
    async activationDropsOldCaches() {
        const sw = createHarness();
        await sw.install();
        await sw.activate();
        expect(sw.deleted).toEqual(['tsdi-agent-shell-v1']);
        expect(sw.deleted).not.toContain(sw.cacheName);
    }
}
