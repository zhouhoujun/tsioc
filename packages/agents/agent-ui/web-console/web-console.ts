import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { ComponentRef, ComponentsModule, ReactiveEffect, reactive } from '@tsdi/components';
import { CommonToastService } from '@tsdi/components/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DomTranscriptFollower, measureDomConsoleColumns } from '@tsdi/components/html';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, COMMAND_EXECUTION_CONTROL, CommandExecutionControlPort, defaultAgentOptions } from '@tsdi/agent';
import { AGENT_IDE_BRIDGE } from '@tsdi/agent-ui';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleKeymapStore,
    AgentConsoleRawModeStore,
    AgentConsoleRemoteEventBridge,
    AgentConsoleSessionState,
    AgentConsoleSettingsData,
    AgentConsoleSettingsStore,
    AGENT_CONSOLE_MARKDOWN_COMPONENT,
    ConsoleTerminalSurfaceAccessor,
    AgentConsoleStatuslineStore,
    AgentConsoleThemeStore,
    AgentConsoleTitleStore,
    AgentUiModule,
    HttpAgentConsoleAppRpc,
    RpcCommandOutputStore,
    VscodeIdeBridge,
    isAgentConsoleThemeName,
    normalizeAgentConsoleStatusline,
    normalizeAgentConsoleTitle,
    sanitizeAgentConsoleSettings
} from '@tsdi/agent-ui';
import { AgentConsoleWebMarkdownComponent } from './AgentConsoleWebMarkdown';

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
 * RPC-backed console stores: the browser is a client of `serve`, so theme,
 * statusline, title, keymap and raw-mode files live in the gateway's workspace
 * (`.tsdi-agent/*.json`), not in browser storage.
 */
export function createRpcConsoleStores(rpc: { request(method: string, params?: any, context?: any): Promise<any> }): {
    theme: { load(workspace: string): Promise<string | undefined>; save(workspace: string, theme: string): Promise<void> };
    statusline: { load(workspace: string): Promise<string[] | undefined>; save(workspace: string, fields: string[]): Promise<void> };
    title: { load(workspace: string): Promise<string[] | undefined>; save(workspace: string, fields: string[]): Promise<void> };
    rawMode: { load(workspace: string): Promise<boolean>; save(workspace: string, enabled: boolean): Promise<void> };
    keymap: {
        load(workspace: string): Promise<Record<string, string | null>>;
        loadContexts(workspace: string): Promise<Record<string, Record<string, string | null>>>;
        save(workspace: string, bindings: Record<string, string | null>, contexts?: Record<string, Record<string, string | null>>): Promise<void>;
    };
} {
    const read = async (name: string): Promise<any> => rpc.request('settings.store.get', { name }).catch(() => null);
    const write = async (name: string, data: any): Promise<void> => { await rpc.request('settings.store.set', { name, data }).catch(() => undefined); };
    return {
        theme: {
            async load(): Promise<string | undefined> {
                const data = await read('theme.json');
                return isAgentConsoleThemeName(String(data?.theme || '')) ? data.theme : undefined;
            },
            async save(_workspace: string, theme: string): Promise<void> {
                await write('theme.json', { version: 1, theme });
            }
        },
        statusline: {
            async load(): Promise<string[] | undefined> {
                return normalizeAgentConsoleStatusline((await read('statusline.json'))?.statusline);
            },
            async save(_workspace: string, fields: string[]): Promise<void> {
                await write('statusline.json', { version: 1, statusline: fields });
            }
        },
        title: {
            async load(): Promise<string[] | undefined> {
                return normalizeAgentConsoleTitle((await read('title.json'))?.title);
            },
            async save(_workspace: string, fields: string[]): Promise<void> {
                await write('title.json', { version: 1, title: fields });
            }
        },
        rawMode: {
            async load(): Promise<boolean> {
                return (await read('raw-mode.json'))?.rawMode === true;
            },
            async save(_workspace: string, enabled: boolean): Promise<void> {
                await write('raw-mode.json', { version: 1, rawMode: enabled });
            }
        },
        keymap: {
            async load(): Promise<Record<string, string | null>> {
                const data = await read('keymap.json');
                return data?.bindings && typeof data.bindings === 'object' ? data.bindings : {};
            },
            async loadContexts(): Promise<Record<string, Record<string, string | null>>> {
                const data = await read('keymap.json');
                return data?.contexts && typeof data.contexts === 'object' ? data.contexts : {};
            },
            async save(_workspace: string, bindings: Record<string, string | null>, contexts?: Record<string, Record<string, string | null>>): Promise<void> {
                await write('keymap.json', { version: 2, bindings, contexts: contexts || {} });
            }
        }
    };
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
    const readFile = async (): Promise<Record<string, any> | null> => {
        const data = await rpc.request('settings.store.get', { name: 'settings.json' }).catch(() => null);
        return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, any> : null;
    };
    return {
        async load(): Promise<AgentConsoleSettingsData> {
            const [file, result] = await Promise.all([
                readFile(),
                rpc.request('settings.ui.get', {}).catch(() => null)
            ]);
            const stored = sanitizeAgentConsoleSettings(file || {});
            // The transcript layout is a terminal concern; keep the browser DOM layout.
            delete stored.messageLayout;
            const data: AgentConsoleSettingsData = {
                ...stored,
                personality: (typeof result?.personality === 'string' && result.personality.trim() ? result.personality.trim() : undefined) || stored.personality,
                memoryInjection: typeof result?.memoryInjection === 'boolean' ? result.memoryInjection : stored.memoryInjection,
                securityLevel: (CONSOLE_SECURITY_LEVELS.includes(String(result?.securityLevel)) ? result.securityLevel : undefined) || stored.securityLevel,
                yoloMode: typeof result?.yoloMode === 'boolean' ? result.yoloMode : stored.yoloMode
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
            // Share the rest of the workspace console settings with the gateway
            // (language, display, timeline, filters); preserve the terminal layout.
            const file = await readFile();
            const next: Record<string, any> = { ...(file || {}), ...data };
            if (file && 'messageLayout' in file) {
                next.messageLayout = file.messageLayout;
            } else {
                delete next.messageLayout;
            }
            await rpc.request('settings.store.set', { name: 'settings.json', data: next }).catch(() => undefined);
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
    const consoleStores = createRpcConsoleStores(rpc);
    const resolveMessagesPanel = (): HTMLElement | null =>
        (mount.querySelector?.('.console-messages-panel') as HTMLElement | null) ?? null;
    const surfaceAccessor = {
        getLastRenderedLines: () => [] as string[],
        getLastRenderedText: () => '',
        getTerminalSize: () => ({ columns: measureDomConsoleColumns(resolveMessagesPanel() ?? mount), rows: 0 }),
        getTerminalViewportRows: () => 0,
        subscribeToSurfaceResize: (listener: () => void): (() => void) => {
            const view = doc.defaultView as (Window & typeof globalThis) | null | undefined;
            const Observer = (view as { ResizeObserver?: typeof ResizeObserver } | null | undefined)?.ResizeObserver;
            if (!Observer) {
                view?.addEventListener?.('resize', listener);
                return () => view?.removeEventListener?.('resize', listener);
            }
            const observer = new Observer(() => listener());
            observer.observe(resolveMessagesPanel() ?? mount);
            return () => observer.disconnect();
        }
    };
    const ctx = await Application.run(AgentConsoleComponent, {
        deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
        providers: [
            { provide: DOCUMENT, useValue: doc },
            { provide: ConsoleTerminalSurfaceAccessor, useValue: surfaceAccessor },
            { provide: AGENT_CONSOLE_APP_RPC, useValue: rpc },
            { provide: AGENT_CONSOLE_MARKDOWN_COMPONENT, useValue: AgentConsoleWebMarkdownComponent },
            { provide: AgentConsoleSettingsStore, useValue: createRpcConsoleSettingsStore(rpc) },
            { provide: AgentConsoleThemeStore, useValue: consoleStores.theme },
            { provide: AgentConsoleStatuslineStore, useValue: consoleStores.statusline },
            { provide: AgentConsoleTitleStore, useValue: consoleStores.title },
            { provide: AgentConsoleRawModeStore, useValue: consoleStores.rawMode },
            { provide: AgentConsoleKeymapStore, useValue: consoleStores.keymap },
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
                            workspace: config.workspace,
                            // Match the terminal host's compact footer; the
                            // statusline stays opt-in on both platforms.
                            workingPresentation: 'compact',
                            showStatusline: false,
                            showMessageTimestamps: false
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

    // The SSE subscription stays open for the life of the console; awaiting it
    // would block mount forever and skip the adapter setup below.
    // The welcome brand block belongs to the transcript start in the TUI;
    // hide it once real rows exist so it does not pin a blank band above the
    // scrolling conversation in the browser.
    const toastService = new CommonToastService();
    const toast = doc.createElement('div');
    toast.className = 'console-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    mount.appendChild(toast);
    const unsubscribeToast = toastService.subscribe(entries => {
        const latest = entries[entries.length - 1];
        toast.textContent = latest?.message || '';
        toast.setAttribute('data-tone', latest?.tone || 'info');
        toast.classList.toggle('is-visible', !!latest);
    });

    const copySelection = (): string => {
        const selection = doc.defaultView?.getSelection?.()?.toString()?.trim() || '';
        return selection;
    };
    const onContextMenu = (event: MouseEvent): void => {
        const text = copySelection();
        if (!text) {
            return;
        }
        event.preventDefault();
        const clipboard = doc.defaultView?.navigator?.clipboard;
        const zh = String(rawState.translator?.currentLocale || '').toLowerCase().startsWith('zh');
        const copied = zh ? '已复制' : 'Copied';
        const done = (): void => { toastService.show(copied, { tone: 'success', durationMs: 1800 }); };
        if (clipboard?.writeText) {
            void clipboard.writeText(text).then(done).catch(done);
            return;
        }
        // Last-resort copy path for browsers without the async clipboard API.
        const area = doc.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.className = 'console-clipboard-fallback';
        doc.body.appendChild(area);
        area.select();
        try { doc.execCommand('copy'); } catch { /* ignore */ }
        area.remove();
        done();
    };
    mount.addEventListener('contextmenu', onContextMenu);

    const transcriptPanel = resolveMessagesPanel();
    let brandObserver: MutationObserver | null = null;
    const syncBrandVisibility = (): void => {
        const hasMessages = !!transcriptPanel?.querySelector('.message-row');
        (root as HTMLElement | undefined)?.classList?.toggle('has-transcript', hasMessages);
    };
    const MutationObserverCtor = (doc.defaultView as (Window & typeof globalThis) | null | undefined)?.MutationObserver;
    if (transcriptPanel && MutationObserverCtor) {
        brandObserver = new MutationObserverCtor(() => syncBrandVisibility());
        brandObserver.observe(transcriptPanel, { childList: true, subtree: true });
    }
    syncBrandVisibility();

    // The shared theme is a style map, so the browser skin cannot infer its
    // name from CSS. Mirror the active terminal theme onto the document for
    // light/dark skin variables; observe style changes because `/theme`
    // updates inline styles rather than replacing the root node.
    let themeObserver: MutationObserver | null = null;
    const syncTheme = (): void => {
        const name = String((rootRef?.instance as unknown as { activeThemeName?: string })?.activeThemeName || 'dark');
        root?.setAttribute('data-theme', name);
        doc.documentElement?.setAttribute('data-agent-theme', name);
    };
    syncTheme();
    if (root && MutationObserverCtor) {
        themeObserver = new MutationObserverCtor(() => syncTheme());
        themeObserver.observe(root, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
    }

    let disposeBridge = (): void => undefined;
    let disposed = false;
    void bridge.subscribe(state.sessionId)
        .then(dispose => {
            if (disposed) {
                dispose();
            } else {
                disposeBridge = dispose;
            }
        })
        .catch(() => undefined);
    void registerAgentWebConsolePwa(config).catch(() => null);

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
            mount.removeEventListener('contextmenu', onContextMenu);
            indicator.removeEventListener('click', onIndicatorClick);
            unsubscribeToast();
            toastService.clear();
            toast.remove();
            follower?.detach();
            indicator.remove();
            brandObserver?.disconnect();
            themeObserver?.disconnect();
            root?.removeAttribute('data-theme');
            doc.documentElement?.removeAttribute('data-agent-theme');
            disposed = true;
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
