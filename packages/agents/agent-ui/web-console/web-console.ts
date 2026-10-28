import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { ComponentRef, ComponentsModule, ReactiveEffect, reactive } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DomTranscriptFollower } from '@tsdi/components/html';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, COMMAND_EXECUTION_CONTROL, CommandExecutionControlPort, defaultAgentOptions } from '@tsdi/agent';
import { AGENT_IDE_BRIDGE } from '@tsdi/agent-ui';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleRemoteEventBridge,
    AgentConsoleSessionState,
    AgentConsoleSettingsData,
    AgentConsoleSettingsStore,
    AgentUiModule,
    HttpAgentConsoleAppRpc,
    RpcCommandOutputStore,
    VscodeIdeBridge
} from '@tsdi/agent-ui';

const CONSOLE_SECURITY_LEVELS = ['read-only', 'ask', 'auto', 'full'];

/**
 * Ask the gateway for a fresh one-time pairing link. The browser is already
 * paired, so `/pair` means "share with another device"; the terminal QR is
 * not used here (the links are shown in the console overlay).
 */
export async function requestWebPairing(
    baseUrl: string,
    token?: string,
    fetchImpl?: typeof fetch
): Promise<{ url?: string; urls?: string[]; code?: string; expiresAt?: number } | null> {
    const request = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    if (!request) {
        return null;
    }
    try {
        const response = await request(`${String(baseUrl || '').replace(/\/+$/, '')}/api/pair/create`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            return null;
        }
        const payload = await response.json();
        const urls = Array.isArray(payload?.urls) ? payload.urls.map(String).filter(Boolean) : [];
        return urls.length ? { urls, code: payload.code, expiresAt: payload.expiresAt } : null;
    } catch {
        return null;
    }
}

/**
 * Browser settings store: persist the console preferences the gateway owns
 * (personality, memory injection, security level, yolo) through `settings.ui.*`
 * so `/permissions` and `/personality` survive a reload and are applied to
 * turns in the gateway process.
 */
export function createRpcConsoleSettingsStore(rpc: { request(method: string, params?: any, context?: any): Promise<any> }): {
    load(workspace: string): Promise<AgentConsoleSettingsData>;
    save(workspace: string, data: AgentConsoleSettingsData): Promise<void>;
} {
    let lastLoaded: AgentConsoleSettingsData | null = null;
    return {
        async load(): Promise<AgentConsoleSettingsData> {
            const result = await rpc.request('settings.ui.get', {}).catch(() => null);
            const data: AgentConsoleSettingsData = {
                personality: typeof result?.personality === 'string' && result.personality.trim() ? result.personality.trim() : undefined,
                memoryInjection: typeof result?.memoryInjection === 'boolean' ? result.memoryInjection : undefined,
                securityLevel: CONSOLE_SECURITY_LEVELS.includes(String(result?.securityLevel)) ? result.securityLevel : undefined,
                yoloMode: typeof result?.yoloMode === 'boolean' ? result.yoloMode : undefined
            };
            lastLoaded = data;
            return data;
        },
        async save(_workspace: string, data: AgentConsoleSettingsData): Promise<void> {
            const patch: Record<string, any> = {};
            if (typeof data.personality === 'string' && data.personality) {
                patch.personality = data.personality;
            } else if (lastLoaded?.personality) {
                // Only clear a preset we actually loaded; a failed read must not wipe it.
                patch.personality = null;
            }
            if (typeof data.memoryInjection === 'boolean') {
                patch.memoryInjection = data.memoryInjection;
            }
            if (data.securityLevel) {
                patch.securityLevel = data.securityLevel;
            }
            if (typeof data.yoloMode === 'boolean') {
                patch.yoloMode = data.yoloMode;
            }
            await rpc.request('settings.ui.set', patch).catch(() => undefined);
        }
    };
}

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
    /** Reconnect delay for the SSE event bridge after a dropped connection, in ms. Defaults to 3000. */
    reconnectDelayMs?: number;
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
            { provide: AgentConsoleSettingsStore, useValue: createRpcConsoleSettingsStore(rpc) },
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

    const rawState = (config.state ?? ctx.get(AgentConsoleSessionState)) as AgentConsoleSessionState;
    // Mutate the reactive proxy (owned by the app's shared ReactiveEffect), not
    // the raw instance: raw mutations bypass the set trap and silently never
    // re-render the bindings.
    const state = reactive(rawState, ctx.get(ReactiveEffect));
    // An externally supplied state bypasses constructor injection, so wire its
    // cross-platform control port from this host's injector explicitly.
    if (config.state) {
        state.setCommandExecutionControl(ctx.get(COMMAND_EXECUTION_CONTROL) as CommandExecutionControlPort);
    }
    state.setCommandOutputStore(new RpcCommandOutputStore(rpc, () => state.sessionId));

    state.configure({
        sessionId: config.sessionId || state.sessionId || 'console',
        workspace: config.workspace || state.workspace || ''
    });
    state.pairAction = () => requestWebPairing(baseUrl, config.token, config.fetchImpl);

    const bridge = new AgentConsoleRemoteEventBridge(state, {
        baseUrl,
        token: config.token,
        rpc,
        ...(config.fetchImpl ? { fetchImpl: config.fetchImpl } : {}),
        reconnectDelayMs: config.reconnectDelayMs ?? 3000,
        onReconnected: () => state.onSessionReconnected?.()
    });

    const rootRef = ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent> | undefined;
    const root = rootRef?.hostView?.rootNodes?.[0] as unknown as HTMLElement | undefined;
    if (root) {
        // Mount = replace: a prior mount (or pre-existing page content) must not
        // linger as ghost DOM under the next console, or DOM metrics/bindings
        // sample a stale panel that never settles. (P285 regressions: mobile,
        // cjk, disconnect all re-mounted into the same #agent-console container.)
        mount.replaceChildren(root);
    } else {
        mount.textContent = 'Console component did not render.';
    }

    const disposeBridge = await bridge.subscribe(state.sessionId);
    await registerAgentWebConsolePwa(config).catch(() => null);

    // Platform adaptation: the base-layer DomTranscriptFollower (backed by the
    // shared ScrollBox) owns viewport history scrolling, sticky-follow, and the
    // "N new messages / jump to bottom" indicator. Business state is never mutated.
    const indicator = doc.createElement('button');
    indicator.className = 'console-new-messages';
    indicator.type = 'button';
    indicator.style.display = 'none';
    indicator.setAttribute('aria-live', 'polite');
    mount.appendChild(indicator);

    let follower: DomTranscriptFollower | null = null;
    let followerElement: HTMLElement | null = null;
    const resolveFollower = (): DomTranscriptFollower | null => {
        const element = (root?.querySelector?.('.console-messages-panel') as HTMLElement | null) ?? null;
        if (!element) {
            return null;
        }
        if (element !== followerElement) {
            follower?.detach();
            followerElement = element;
            follower = new DomTranscriptFollower(element, indicator);
            follower.attach();
        }
        return follower;
    };
    const onWheel = (event: WheelEvent): void => {
        if (state.messageLayout !== 'viewport' || event.deltaY === 0) {
            return;
        }
        const activeFollower = resolveFollower();
        if (!activeFollower) {
            return;
        }
        activeFollower.wheel(event.deltaY);
        event.preventDefault();
    };
    const onIndicatorClick = (): void => {
        follower?.resumeFollow();
    };
    mount.addEventListener('wheel', onWheel, { passive: false });
    indicator.addEventListener('click', onIndicatorClick);
    // Observe content growth from the initial render, not only after the first wheel.
    resolveFollower();

    return {
        ctx,
        state,
        dispose: async () => {
            mount.removeEventListener('wheel', onWheel);
            indicator.removeEventListener('click', onIndicatorClick);
            follower?.detach();
            indicator.remove();
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
