import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { ComponentRef, ComponentsModule, ReactiveEffect, reactive } from '@tsdi/components';
import { ToastService } from '@tsdi/components/common/toast';
import { installStyleSheet, UI_CSS, UI_STYLE_ID } from '@tsdi/components/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DomOverlayAnchors, DomTranscriptFollower, measureDomConsoleColumns } from '@tsdi/components/html';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, AgentRuntime, AgentScheduler, COMMAND_EXECUTION_CONTROL, CommandExecutionControlPort, defaultAgentOptions, InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AGENT_IDE_BRIDGE } from '@tsdi/agent-ui';
import {
    AgentConsoleComponent,
    AgentConsoleKeymapStore,
    AgentConsoleRawModeStore,
    AgentConsoleRemoteEventBridge,
    AgentConsoleSessionState,
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
} from '@tsdi/agent-ui';
import type { AgentConsoleOptions } from '@tsdi/agent-ui';
import { AgentConsoleWebMarkdownComponent } from './AgentConsoleWebMarkdown';
import { AgentConsoleRemoteRuntime, AgentConsoleRemoteScheduler } from './remote-runtime';
import { openAgentConsoleDialogDeepLink } from './dialog-deeplink';
import { focusWebConsoleComposer } from './focus-composer';
import { routeAgentConsoleWheel } from './wheel-routing';
import { routeAgentConsoleHistoryKey } from './history-keys';
import { bindContextMenuCopy } from './clipboard';
import { createWebSidebar } from './sidebar';
import { createRpcConsoleSettingsStore, createRpcConsoleStores } from './rpc-stores';
import { mountAgentWebSettingsPage } from './settings-page';
export { createRpcConsoleSettingsStore, createRpcConsoleStores } from './rpc-stores';
import { loadAgentConsoleAttentionCounts } from './counts';
import { keepTranscriptSelection } from './selection-anchor';
import { installAgentWebAttention } from './notifications';

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

export interface AgentWebConsoleOptions {
    /** Gateway base URL, e.g. http://localhost:3100 */
    baseUrl?: string;
    /** Optional gateway bearer token */
    token?: string;
    /** Initial session id */
    sessionId?: string;
    /** Dialog route id opened on mount (`?dialog=model`). */
    dialog?: string;
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
    /**
     * Pin transcript/display options for this mount (e.g. a gate that must see
     * every seeded row). The web host's fixed console defaults still win for
     * workspace/statusline; everything else is merged under them.
     */
    consoleOptions?: Partial<AgentConsoleOptions>;
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
    // Shared primitives (card/switch/search/empty/kbd/badge) ship a neutral
    // skin; install it once for the settings page and any other common widgets.
    installStyleSheet(doc, UI_STYLE_ID, UI_CSS);

    const rpc = new HttpAgentConsoleAppRpc({
        baseUrl,
        token: config.token,
        timeoutMs: config.timeoutMs,
        ...(config.fetchImpl ? { fetchImpl: config.fetchImpl } : {})
    });
    const consoleStores = createRpcConsoleStores(rpc);
    const resolveMessagesPanel = (): HTMLElement | null =>
        (mount.querySelector?.('.console-messages-panel') as HTMLElement | null) ?? null;
    let follower: DomTranscriptFollower | null = null;
    const requestOlderMessages = (): void => {
        const instance = ctx.runners.getRef(AgentConsoleComponent)?.instance as any;
        instance?.onTerminalViewportTop?.();
    };
    const surfaceAccessor = {
        getLastRenderedLines: () => [] as string[],
        getLastRenderedText: () => '',
        getTerminalSize: () => ({ columns: measureDomConsoleColumns(resolveMessagesPanel() ?? mount), rows: 0 }),
        getTerminalViewportRows: () => 0,
        notifyViewportPrepend: () => follower?.notifyPrepend(),
        // /activity and message navigation reveal by source message id in the
        // DOM; row math is a terminal-only concept.
        revealMessage: (messageId: string): boolean => {
            const panel = resolveMessagesPanel() ?? mount;
            const rows = panel?.querySelectorAll?.('[data-message-id]');
            if (!rows) {
                return false;
            }
            for (const row of Array.from(rows) as HTMLElement[]) {
                if (row.getAttribute('data-message-id') === messageId) {
                    row.scrollIntoView?.({ block: 'center' });
                    return true;
                }
            }
            return false;
        },
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
        deps: [AgentUiModule, HtmlTemplateModule, ComponentsModule],
        providers: [
            { provide: DOCUMENT, useValue: doc },
            { provide: AgentRuntime, useValue: new AgentConsoleRemoteRuntime() },
            { provide: AgentScheduler, useValue: new AgentConsoleRemoteScheduler() },
            { provide: COMMAND_EXECUTION_CONTROL, useValue: new InMemoryCommandExecutionControl() },
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
                    // Per-mount model copy: profile/reasoning writes must not
                    // reach the shared default singleton.
                    model: { ...(defaultAgentOptions.model || {}) },
                    ui: {
                        ...defaultAgentOptions.ui,
                        title: 'TSDI Agent Web Console',
                        console: {
                            ...(defaultAgentOptions.ui?.console || {}),
                            ...(config.consoleOptions || {}),
                            workspace: config.workspace,
                            // `/settings` opens the card popup in the browser;
                            // the terminal keeps its composer-anchored center.
                            settingsSurface: config.consoleOptions?.settingsSurface ?? 'page',
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
    // Hidden-page attention notifications (approvals/questions/turn end).
    const disposeAttention = installAgentWebAttention({
        document: doc,
        state,
        effect: ctx.get(ReactiveEffect)
    });
    // Browsers have a pointer: reveal each tab's close affordance on hover.
    state.tabCloseOnHover = true;

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
    // `/settings` opens the card page on the browser and mounts it lazily on
    // the themed console root, so the popup shares the active theme.
    let settingsPage: Awaited<ReturnType<typeof mountAgentWebSettingsPage>> | null = null;
    const ensureSettingsPage = async (): Promise<void> => {
        if (settingsPage) {
            return;
        }
        settingsPage = await mountAgentWebSettingsPage({ document: doc, state: rawState, mount: root });
    };
    state.settingsPageMountAction = () => { void ensureSettingsPage(); };
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
    // Selection copy feeds the same toast queue the console component paints,
    // so the browser and terminal share one transient-feedback surface.
    const toastService = ctx.get(ToastService);

    const disposeContextMenu = bindContextMenuCopy({
        document: doc,
        mount,
        toast: toastService,
        isZh: () => String(rawState.translator?.currentLocale || '').toLowerCase().startsWith('zh')
    });

    const transcriptPanel = resolveMessagesPanel();
    const selectionKeeper = transcriptPanel
        ? keepTranscriptSelection(transcriptPanel, doc)
        : { dispose: () => undefined };
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
    const overlayAnchors = new DomOverlayAnchors({
        document: doc,
        container: mount,
        footer: (root?.querySelector?.('[renderregion="footer"]') as HTMLElement | null)
            ?? (root?.querySelector?.('.console-input-panel') as HTMLElement | null),
        composer: (root?.querySelector?.('.input-shell') as HTMLElement | null)
            ?? (root?.querySelector?.('textarea.agent-input') as HTMLElement | null),
        indicator,
        footerVariable: '--agent-web-footer-height'
    });
    overlayAnchors.attach();

    let followerElement: HTMLElement | null = null;
    const resolveFollower = (): DomTranscriptFollower | null => {
        const element = (root?.querySelector?.('.console-messages-panel') as HTMLElement | null) ?? null;
        if (!element) {
            return null;
        }
        if (element !== followerElement) {
            follower?.detach();
            followerElement = element;
            const translate = (key: string, fallback: string, params?: any): string => {
                try {
                    return state.translator?.translate(key, params) || fallback;
                } catch {
                    return fallback;
                }
            };
            const stripArrow = (value: string): string => value.replace(/^↓\s*/, '');
            follower = new DomTranscriptFollower(element, indicator, {
                labels: {
                    newMessages: stripArrow(translate('agent.message.newBelow', '{count} new', { count: '{count}' })),
                    jumpToBottom: stripArrow(translate('agent.message.jumpToBottom', 'Jump to bottom'))
                },
                onReachTop: requestOlderMessages
            });
            follower.attach();
        }
        return follower;
    };
    const onWheel = (event: WheelEvent): void => routeAgentConsoleWheel(event, {
        getState: () => state,
        resolveFollower,
        requestOlderMessages
    });
    const onIndicatorClick = (): void => {
        follower?.resumeFollow();
    };
    const onKeyDown = (event: KeyboardEvent): void => routeAgentConsoleHistoryKey(event, {
        getState: () => state,
        resolveFollower,
        requestOlderMessages
    });
    mount.addEventListener('wheel', onWheel, { passive: false });
    mount.addEventListener('keydown', onKeyDown);
    indicator.addEventListener('click', onIndicatorClick);
    // Observe content growth from the initial render, not only after the first wheel.
    resolveFollower();

    focusWebConsoleComposer(doc, root);

    const sidebar = createWebSidebar({
        document: doc,
        mount,
        state,
        runCommand: command => (rootRef?.instance as unknown as { handleCommand?: (value: string) => Promise<boolean> } | undefined)?.handleCommand?.(command) ?? Promise.resolve(false),
        navigate: sessionId => {
            const view = doc.defaultView;
            if (!view) return;
            // Switch like the tab strip does: in place, so a running turn in
            // another tab keeps streaming and the sidebar finder keeps its
            // query/project scope. The URL still reflects the active session
            // for refresh/share.
            const tabs = state.sessionTabsAction;
            if (tabs?.select) {
                tabs.select(sessionId);
                if (view.history?.replaceState) {
                    const params = new URLSearchParams(view.location.search);
                    params.set('session', sessionId);
                    params.delete('dialog');
                    view.history.replaceState(null, '', `${view.location.pathname}?${params.toString()}`);
                }
                return;
            }
            const params = new URLSearchParams(view.location.search);
            params.set('session', sessionId);
            params.delete('dialog');
            view.location.href = `${view.location.pathname}?${params.toString()}`;
        },
        refreshSessions: () => {
            const instance = rootRef?.instance as unknown as { refreshSessions?: (currentId?: string) => Promise<void> } | undefined;
            return instance?.refreshSessions?.(state.sessionId);
        },
        openSettingsPage: () => {
            // `openSettingsPage` flips the page state and invokes
            // `settingsPageMountAction`, which mounts the popup app lazily.
            const instance = rootRef?.instance as unknown as { openSettingsPage?: () => Promise<boolean> } | undefined;
            void instance?.openSettingsPage?.();
        },
        loadCounts: () => loadAgentConsoleAttentionCounts({
            request: (method, params) => rpc.request(method, params),
            sessionId: () => state.sessionId,
            pendingQuestions: () => state.pendingQuestionQueue?.length || 0,
            queuedPrompts: () => Number(state.queuedPromptCount) || 0
        })
    });

    // ⌘K / Ctrl+K is the browser's search convention: focus the session
    // finder instead of inventing a browser-only palette.
    const onFinderShortcut = (event: KeyboardEvent): void => {
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && String(event.key || '').toLowerCase() === 'k') {
            event.preventDefault();
            sidebar.focusSessionSearch();
        }
    };
    doc.addEventListener('keydown', onFinderShortcut);

    // Deep link: `?dialog=model` opens the same dialog as `/dialog model`.
    if (config.dialog) {
        const instance = rootRef?.instance as unknown as {
            handleCommand?: (command: string) => Promise<boolean>;
        } | undefined;
        openAgentConsoleDialogDeepLink({
            dialog: config.dialog,
            translator: state.translator,
            handleCommand: command => instance?.handleCommand?.(command) ?? Promise.resolve(false),
            notify: message => toastService.show(message, { durationMs: 4000 })
        });
    }

    return {
        ctx,
        state,
        dispose: async () => {
            mount.removeEventListener('wheel', onWheel);
            mount.removeEventListener('keydown', onKeyDown);
            disposeContextMenu();
            disposeAttention();
            doc.removeEventListener('keydown', onFinderShortcut);
            sidebar.dispose();
            indicator.removeEventListener('click', onIndicatorClick);
            overlayAnchors.dispose();
            selectionKeeper.dispose();
            toastService.clear();
            follower?.detach();
            indicator.remove();
            await settingsPage?.dispose();
            settingsPage = null;
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
