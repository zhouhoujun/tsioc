import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, defaultAgentOptions } from '@tsdi/agent';
import { AGENT_IDE_BRIDGE } from './index';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleRemoteEventBridge,
    AgentConsoleSessionState,
    AgentUiModule,
    HttpAgentConsoleAppRpc,
    VscodeIdeBridge
} from './index';

export interface AgentWebConsoleOptions {
    /** Gateway base URL, e.g. http://localhost:3100 */
    baseUrl?: string;
    /** Optional gateway bearer token */
    token?: string;
    /** Initial session id */
    sessionId?: string;
    /** Workspace label shown in the console */
    workspace?: string;
    /** DOM container to mount the console into */
    mount?: HTMLElement | null;
    /** Session state instance (defaults to a fresh one) */
    state?: AgentConsoleSessionState;
    /** Fetch implementation override (tests) */
    fetchImpl?: typeof fetch;
    /** Timeout for RPC requests in ms */
    timeoutMs?: number;
}

function readWindowConfig(): Partial<AgentWebConsoleOptions> {
    const g = globalThis as { __TSDI_AGENT_WEB__?: Partial<AgentWebConsoleOptions> };
    return g.__TSDI_AGENT_WEB__ ?? {};
}

export async function mountAgentWebConsole(
    input: AgentWebConsoleOptions = {}
): Promise<{ ctx: ApplicationContext; state: AgentConsoleSessionState; dispose: () => Promise<void> }> {
    const config = { ...readWindowConfig(), ...input };
    const baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
    if (!baseUrl) {
        throw new Error('mountAgentWebConsole requires baseUrl (gateway address)');
    }
    const mount = config.mount
        ?? (typeof document !== 'undefined' ? document.getElementById('agent-console') : null);
    if (!mount) {
        throw new Error('mountAgentWebConsole requires a mount element (or #agent-console in the DOM)');
    }

    const doc = typeof document !== 'undefined' ? document : null;
    if (!doc) {
        throw new Error('mountAgentWebConsole must run in a browser DOM environment');
    }

    const rpc = new HttpAgentConsoleAppRpc({
        baseUrl,
        token: config.token,
        timeoutMs: config.timeoutMs,
        ...(config.fetchImpl ? { fetchImpl: config.fetchImpl } : {})
    });
    const state = config.state ?? new AgentConsoleSessionState();

    const ctx = await Application.run(AgentConsoleComponent, {
        deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
        providers: [
            { provide: DOCUMENT, useValue: doc },
            { provide: AGENT_CONSOLE_APP_RPC, useValue: rpc },
            { provide: AGENT_IDE_BRIDGE, useValue: new VscodeIdeBridge(doc.defaultView ?? globalThis) },
            {
                provide: AGENT_OPTIONS,
                useValue: {
                    ...defaultAgentOptions,
                    ui: {
                        ...defaultAgentOptions.ui,
                        title: 'TSDI Agent Web Console',
                        console: {
                            ...(defaultAgentOptions.ui?.console || {}),
                            workspace: config.workspace
                        }
                    },
                    bootstrapTurn: config.sessionId ? { sessionId: config.sessionId } : undefined
                }
            }
        ]
    });

    state.configure({
        sessionId: config.sessionId || state.sessionId || 'console',
        workspace: config.workspace || state.workspace || ''
    });

    const bridge = new AgentConsoleRemoteEventBridge(state, {
        baseUrl,
        token: config.token,
        rpc,
        ...(config.fetchImpl ? { fetchImpl: config.fetchImpl } : {}),
        reconnectDelayMs: 3000
    });

    const rootNodes = ctx.runners.getRef(AgentConsoleComponent) as any;
    const root = rootNodes?.hostView?.rootNodes?.[0] as HTMLElement | undefined;
    if (root) {
        mount.appendChild(root);
    } else {
        mount.textContent = 'Console component did not render.';
    }

    const disposeBridge = await bridge.subscribe(state.sessionId);

    return {
        ctx,
        state,
        dispose: async () => {
            disposeBridge();
            await ctx.close();
        }
    };
}

export async function runAgentWebConsole(options: AgentWebConsoleOptions = {}): Promise<void> {
    await mountAgentWebConsole(options);
}

if (typeof globalThis !== 'undefined') {
    (globalThis as any).TsdiAgentWeb = {
        mountAgentWebConsole,
        runAgentWebConsole
    };
}
