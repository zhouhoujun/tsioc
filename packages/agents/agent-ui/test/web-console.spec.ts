import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test, Before, After } from '@tsdi/unit';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { AgentModule, AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, defaultAgentOptions } from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleRemoteEventBridge,
    AgentConsoleSessionState,
    AgentUiModule,
    HttpAgentConsoleAppRpc
} from '../src';
import { mountAgentWebConsole, registerAgentWebConsolePwa, requestWebPairing } from '../web-console';
import * as legacyWebEntry from '../web';

@Suite('Agent web console entry')
export class AgentWebConsoleTest {
    ctx!: ApplicationContext;
    dom!: JSDOM;

    @Before()
    async init() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body><div id="agent-console"></div></body></html>', {
            runScripts: 'dangerously',
            resources: 'usable',
            url: 'http://localhost:3100/'
        });
        (this.dom.window as any).process = {
            env: {},
            cwd: () => '/',
            platform: 'browser',
            version: '',
            versions: {},
            nextTick: (fn: () => void) => setTimeout(fn, 0),
            on: () => undefined,
            argv: []
        };
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [
                { provide: DOCUMENT, useValue: this.dom.window.document },
                {
                    provide: AGENT_CONSOLE_APP_RPC,
                    useValue: new HttpAgentConsoleAppRpc({
                        baseUrl: 'http://localhost:3100',
                        fetchImpl: (async () => {
                            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { sessionId: 'w1' } }), { status: 200 });
                        }) as any
                    })
                },
                {
                    provide: AGENT_OPTIONS,
                    useValue: {
                        ...defaultAgentOptions,
                        ui: { ...defaultAgentOptions.ui, title: 'Web Test' },
                        bootstrapTurn: { sessionId: 'w1' }
                    }
                }
            ]
        });
    }

    @After()
    async clean() {
        await this.ctx?.close();
        if (global.gc) global.gc();
    }

    @Test('the browser /pair asks the gateway for a fresh one-time link')
    async webPairing() {
        const calls: any[] = [];
        const fetchImpl = (async (url: string, init: any) => {
            calls.push({ url, method: init?.method, headers: init?.headers });
            return new Response(JSON.stringify({
                urls: ['http://127.0.0.1:3100/?pair=abc', 'http://192.168.1.9:3100/?pair=abc'],
                code: 'abc',
                expiresAt: Date.now() + 5 * 60_000
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }) as any;
        const result = await requestWebPairing('http://127.0.0.1:3100/', 'secret', fetchImpl);
        expect(result?.urls).toEqual(['http://127.0.0.1:3100/?pair=abc', 'http://192.168.1.9:3100/?pair=abc']);
        expect(result?.code).toEqual('abc');
        expect(calls[0].url).toEqual('http://127.0.0.1:3100/api/pair/create');
        expect(calls[0].method).toEqual('POST');
        expect(calls[0].headers.Authorization).toEqual('Bearer secret');

        const denied = await requestWebPairing('http://127.0.0.1:3100', 'secret', (async () => new Response('{}', { status: 401 })) as any);
        expect(denied).toEqual(null);
        const empty = await requestWebPairing('http://127.0.0.1:3100', 'secret', (async () => new Response(JSON.stringify({ urls: [] }), { status: 200 })) as any);
        expect(empty).toEqual(null);
        const broken = await requestWebPairing('http://127.0.0.1:3100', 'secret', (async () => { throw new Error('offline'); }) as any);
        expect(broken).toEqual(null);
    }

    @Test('mountAgentWebConsole throws without a baseUrl')
    async mountRequiresBaseUrl() {
        let thrown: any = null;
        try {
            await mountAgentWebConsole({});
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
        expect(thrown.message).toContain('baseUrl');
    }

    @Test('keeps the legacy web entry compatible')
    legacyWebEntryCompatibility() {
        expect(legacyWebEntry.mountAgentWebConsole).toBe(mountAgentWebConsole);
        expect(legacyWebEntry.registerAgentWebConsolePwa).toBe(registerAgentWebConsolePwa);
    }

    @Test('registers the mobile PWA service worker and supports opt-out')
    async registersPwa() {
        const calls: any[] = [];
        const host = {
            serviceWorker: {
                register: async (url: string, options: any) => {
                    calls.push({ url, options });
                    return { scope: options.scope };
                }
            }
        };
        const registration = await registerAgentWebConsolePwa({}, host);
        expect(calls).toEqual([{ url: './sw.js', options: { scope: './' } }]);
        expect(registration.scope).toEqual('./');
        expect(await registerAgentWebConsolePwa({ pwa: false }, host)).toBeNull();
    }

    @Test('HttpAgentConsoleAppRpc exposes request and stream over fetch')
    async rpcClientShape() {
        const rpc = new HttpAgentConsoleAppRpc({
            baseUrl: 'http://localhost:3100',
            fetchImpl: (async () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: true } }), { status: 200 })) as any
        });
        const result = await rpc.request('app.ping');
        expect(result.ok).toEqual(true);
        expect(typeof rpc.stream).toEqual('function');
    }

    @Test('HttpAgentConsoleAppRpc forwards request correlation metadata')
    async rpcForwardsRequestMeta() {
        let body: any;
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://gateway', fetchImpl: async (_url, init) => {
            body = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { ok: true } }), { status: 200 });
        } });
        await rpc.request('app.ping', {}, { requestId: 'req-1', sessionEpoch: 2 });
        expect(body.meta).toEqual({ requestId: 'req-1', sessionEpoch: 2 });
    }

    @Test('AgentConsoleRemoteEventBridge applies SSE records to state')
    async remoteBridgeAppliesEvents() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 'w1' });
        const events = [
            'event: turn_started\ndata: {"sessionId":"w1"}\n\n',
            'event: tool_invoked\ndata: {"sessionId":"w1","toolName":"echo"}\n\n'
        ];
        const fetchImpl = async () => {
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    for (const event of events) {
                        controller.enqueue(new TextEncoder().encode(event));
                    }
                    controller.close();
                }
            });
            return new Response(stream, { status: 200 });
        };
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://localhost:3100',
            fetchImpl: fetchImpl as any,
            reconnectDelayMs: 100_000
        });
        const dispose = await bridge.subscribe('w1');
        dispose();
        expect(state.status).toEqual('running');
        expect(state.runningTools).toEqual(['echo']);
    }

    @Test('mounting does not wait for the long-lived SSE subscription')
    async mountDoesNotAwaitSse() {
        const doc = this.dom.window.document;
        const container = doc.createElement('div');
        doc.body.appendChild(container);
        const previousDocument = (globalThis as any).document;
        (globalThis as any).document = doc;
        const fetchImpl = (async (url: string) => {
            if (String(url).includes('/api/events')) {
                // A connected SSE stream never resolves its fetch promise.
                return new Promise<Response>(() => undefined);
            }
            return new Response(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                result: { sessionId: 'w1', id: 'w1', messages: [], sections: [], items: [], todos: [], steps: [] }
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }) as any;
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        let mounted: any;
        try {
            mounted = await Promise.race([
                mountAgentWebConsole({
                    baseUrl: 'http://localhost:3100',
                    sessionId: 'w1',
                    fetchImpl,
                    mount: container,
                    state,
                    pwa: false
                }),
                new Promise((_resolve, reject) => setTimeout(() => reject(new Error('mount blocked on the SSE stream')), 5000))
            ]);
            expect(container.children.length).toBeGreaterThan(0);
            expect(mounted.state).toBeTruthy();
        } finally {
            (globalThis as any).document = previousDocument;
            await mounted?.dispose?.();
        }
    }

    @Test('mounting restores a persisted model profile without failing')
    async mountAppliesPersistedModelProfile() {
        const doc = this.dom.window.document;
        const container = doc.createElement('div');
        doc.body.appendChild(container);
        const previousDocument = (globalThis as any).document;
        (globalThis as any).document = doc;
        const fetchImpl = (async (url: string, init: any) => {
            if (String(url).includes('/api/events')) {
                return new Response('event: connected\ndata: {}\n\n', {
                    status: 200,
                    headers: { 'Content-Type': 'text/event-stream' }
                });
            }
            let method = '';
            try {
                method = JSON.parse(String(init?.body || '{}')).method || '';
            } catch {
                method = '';
            }
            const result = method === 'settings.store.get'
                ? { modelProfile: 'openai/fake-web-model' }
                : { sessionId: 'w1', id: 'w1', messages: [], sections: [], items: [], todos: [], steps: [] };
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }) as any;
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        let mounted: any;
        try {
            mounted = await mountAgentWebConsole({
                baseUrl: 'http://localhost:3100',
                sessionId: 'w1',
                fetchImpl,
                mount: container,
                state,
                pwa: false,
                reconnectDelayMs: 100_000
            });
            expect(mounted.state).toBeTruthy();
            expect(container.children.length).toBeGreaterThan(0);
        } finally {
            (globalThis as any).document = previousDocument;
            await mounted?.dispose?.();
        }
    }

    @Test('renders console component into the DOM')
    async rendersIntoDom() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as any;
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as HTMLElement;
        expect(root).toBeTruthy();
        const html = root.innerHTML || root.textContent || '';
        expect(html.length).toBeGreaterThan(0);
    }
}
