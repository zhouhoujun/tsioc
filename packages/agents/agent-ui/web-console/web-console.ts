import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, COMMAND_EXECUTION_CONTROL, CommandExecutionControlPort, defaultAgentOptions } from '@tsdi/agent';
import { AGENT_IDE_BRIDGE } from '@tsdi/agent-ui';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleRemoteEventBridge,
    AgentConsoleSessionState,
    AgentUiModule,
    HttpAgentConsoleAppRpc,
    VscodeIdeBridge
} from '@tsdi/agent-ui';

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
    /** Register the mobile PWA service worker. Defaults to true. */
    pwa?: boolean;
    /** Service worker URL, relative to the hosting page by default. */
    serviceWorkerUrl?: string;
}

export interface AgentWebConsoleServiceWorkerHost {
    serviceWorker?: {
        register(scriptURL: string, options?: { scope?: string }): Promise<any>;
    };
}

interface AgentWebConsoleGlobal {
    navigator?: AgentWebConsoleServiceWorkerHost;
    __TSDI_AGENT_WEB__?: Partial<AgentWebConsoleOptions>;
    TsdiAgentWeb?: {
        mountAgentWebConsole: typeof mountAgentWebConsole;
        runAgentWebConsole: typeof runAgentWebConsole;
        registerAgentWebConsolePwa: typeof registerAgentWebConsolePwa;
    };
}

export async function registerAgentWebConsolePwa(
    options: Pick<AgentWebConsoleOptions, 'pwa' | 'serviceWorkerUrl'> = {},
    host: AgentWebConsoleServiceWorkerHost = (globalThis as AgentWebConsoleGlobal).navigator ?? {}
): Promise<any | null> {
    if (options.pwa === false || !host.serviceWorker?.register) {
        return null;
    }
    return host.serviceWorker.register(options.serviceWorkerUrl || './sw.js', { scope: './' });
}

function readWindowConfig(): Partial<AgentWebConsoleOptions> {
    const g = globalThis as AgentWebConsoleGlobal;
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
    const ctx = await Application.run(AgentConsoleComponent, {
        deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
        providers: [
            { provide: DOCUMENT, useValue: doc },
            { provide: AGENT_CONSOLE_APP_RPC, useValue: rpc },
            ...(config.state ? [{ provide: AgentConsoleSessionState, useValue: config.state }] : []),
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

    const state = (config.state ?? ctx.get(AgentConsoleSessionState)) as AgentConsoleSessionState;
    // An externally supplied state bypasses constructor injection, so wire its
    // cross-platform control port from this host's injector explicitly.
    if (config.state) {
        state.setCommandExecutionControl(ctx.get(COMMAND_EXECUTION_CONTROL) as CommandExecutionControlPort);
    }

    state.configure({
        sessionId: config.sessionId || state.sessionId || 'console',
        workspace: config.workspace || state.workspace || ''
    });

    const bridge = new AgentConsoleRemoteEventBridge(state, {
        baseUrl,
        token: config.token,
        rpc,
        ...(config.fetchImpl ? { fetchImpl: config.fetchImpl } : {}),
        reconnectDelayMs: 3000,
        onReconnected: () => state.onSessionReconnected?.()
    });

    const rootRef = ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent> | undefined;
    const root = rootRef?.hostView?.rootNodes?.[0] as unknown as HTMLElement | undefined;
    if (root) {
        mount.appendChild(root);
    } else {
        mount.textContent = 'Console component did not render.';
    }

    const disposeBridge = await bridge.subscribe(state.sessionId);
    await registerAgentWebConsolePwa(config).catch(() => null);

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
    (globalThis as AgentWebConsoleGlobal).TsdiAgentWeb = {
        mountAgentWebConsole,
        runAgentWebConsole,
        registerAgentWebConsolePwa
    };
}
