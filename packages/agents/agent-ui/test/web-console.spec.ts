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
import { mountAgentWebConsole, registerAgentWebConsolePwa } from '../web-console';
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

    @Test('AgentConsoleRemoteEventBridge applies SSE records to state')
    async remoteBridgeAppliesEvents() {
        const state = new AgentConsoleSessionState();
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
