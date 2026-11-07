import { formatAgentUiSessionClosingMessage } from './agent-ui.i18n';
import type { AgentConsoleTerminalInputHost } from './AgentConsoleTerminalInputController';

export async function requestTerminalExitView(host: AgentConsoleTerminalInputHost, message?: string): Promise<void> {
    const exitMessage = String(message || '').trim();
    if (host.closing) {
        return;
    }
    host.closing = true;
    if (!host.app) {
        if (exitMessage) {
            host.notify(exitMessage);
        }
        host.surfaceAccessor?.stopTerminal?.();
        return;
    }
    host.surfaceAccessor?.stopTerminal?.();
    const rawWriter = host.surfaceAccessor?.writeRawTerminalData;
    try {
        await host.app.close();
    } catch {
        // Teardown must not surface as an unhandled rejection: the Ctrl+C
        // path invokes this fire-and-forget, and /exit awaits it. The core
        // destroy() fix guarantees super.destroy() (component onDestroy:
        // terminal restore + history persist) still runs even when a
        // @Shutdown handler throws during runners.stop().
    }
    if (exitMessage) {
        if (typeof rawWriter === 'function') {
            rawWriter.call(host.surfaceAccessor, `${exitMessage}\n`);
        } else if (typeof globalThis.console?.log === 'function') {
            globalThis.console.log(exitMessage);
        }
    }
}

/** Session closing message for the current session id. */
export function closingSessionMessageView(host: AgentConsoleTerminalInputHost): string {
    const translated = host.translator?.translate('agent.session.closing', {
        sessionId: host.state.sessionId
    });
    if (translated && translated !== 'agent.session.closing') {
        return translated;
    }
    return formatAgentUiSessionClosingMessage(host.translator?.currentLocale, host.state.sessionId);
}

const detailViewportResizeSyncHosts = new WeakSet<AgentConsoleTerminalInputHost>();

/** Keep the console detail page proportional to the active terminal. */
export function syncConsoleMessageDetailViewportView(host: AgentConsoleTerminalInputHost): void {
    if (host.state.consoleOptions.messageToggleInteraction !== 'enter') {
        return;
    }
    ensureDetailViewportResizeSync(host);
    const measured = host.surfaceAccessor?.getTerminalViewportRows?.();
    if (typeof measured === 'number' && Number.isFinite(measured) && measured > 0) {
        syncMessageDetailViewportRows(host, Math.floor(measured));
        return;
    }
    const sizeRows = host.surfaceAccessor?.getTerminalSize?.().rows;
    if (typeof sizeRows === 'number' && Number.isFinite(sizeRows)) {
        syncMessageDetailViewportRows(host, Math.floor(sizeRows) - 6);
    }
}

function syncMessageDetailViewportRows(host: AgentConsoleTerminalInputHost, rows: number): void {
    const visibleLines = Math.max(8, Math.min(40, rows));
    if (host.state.messageDetailVisibleLines !== visibleLines) {
        host.state.setMessageDetailVisibleLines(visibleLines);
    }
}

const markdownWidthResizeSyncHosts = new WeakSet<AgentConsoleMarkdownContentWidthHost>();

/**
 * Keep Markdown tables inside the real terminal width.
 *
 * The parse step runs outside the renderer (and in a worker in browsers), so it
 * cannot measure the transcript itself. Feeding it the surface width keeps grid
 * borders from being wrapped mid-row by the terminal renderer.
 */
export interface AgentConsoleMarkdownContentWidthHost {
    state: { markdownContentWidth: number; maxOverlayVisibleLines?: number };
    destroyed?: boolean;
    surfaceAccessor?: Pick<AgentConsoleTerminalInputHost['surfaceAccessor'] & object,
        'getTerminalSize' | 'subscribeToSurfaceResize'> | null;
}

export function syncMarkdownWidthFromSurface(
    state: { markdownContentWidth: number; maxOverlayVisibleLines?: number },
    surfaceAccessor: AgentConsoleMarkdownContentWidthHost['surfaceAccessor'],
    destroyed = false
): void {
    syncConsoleMarkdownContentWidth({ state, surfaceAccessor, destroyed });
}

export function syncConsoleMarkdownContentWidth(host: AgentConsoleMarkdownContentWidthHost): void {
    ensureMarkdownWidthResizeSync(host);
    const size = host.surfaceAccessor?.getTerminalSize?.();
    const rows = Number(size?.rows);
    if (Number.isFinite(rows) && rows > 0 && typeof host.state.maxOverlayVisibleLines === 'number') {
        // Leave room for the tab bar, dialog chrome, status line and composer.
        host.state.maxOverlayVisibleLines = Math.max(3, Math.floor(rows) - 13);
    }
    const columns = Number(size?.columns ?? size?.cols);
    if (!Number.isFinite(columns) || columns <= 0) {
        return;
    }
    // Leave a small gutter so tables never sit flush against the terminal edge.
    const width = Math.max(24, Math.floor(columns) - 2);
    if (host.state.markdownContentWidth !== width) {
        host.state.markdownContentWidth = width;
    }
}

/** Subscribe once per host so terminal resizes recompute the table width without a keypress. */
function ensureMarkdownWidthResizeSync(host: AgentConsoleMarkdownContentWidthHost): void {
    if (markdownWidthResizeSyncHosts.has(host)) {
        return;
    }
    const accessor = host.surfaceAccessor;
    if (!accessor?.subscribeToSurfaceResize) {
        return;
    }
    markdownWidthResizeSyncHosts.add(host);
    let unsubscribe: (() => void) | undefined;
    unsubscribe = accessor.subscribeToSurfaceResize(() => {
        if (host.destroyed) {
            unsubscribe?.();
            return;
        }
        syncConsoleMarkdownContentWidth(host);
    });
}

/** Subscribe once per host so terminal resizes recompute the detail viewport without a keypress. */
function ensureDetailViewportResizeSync(host: AgentConsoleTerminalInputHost): void {    if (detailViewportResizeSyncHosts.has(host)) {
        return;
    }
    const accessor = host.surfaceAccessor;
    if (!accessor?.subscribeToSurfaceResize) {
        return;
    }
    detailViewportResizeSyncHosts.add(host);
    let unsubscribe: (() => void) | undefined;
    unsubscribe = accessor.subscribeToSurfaceResize(() => {
        if (host.destroyed) {
            unsubscribe?.();
            return;
        }
        syncConsoleMessageDetailViewportView(host);
    });
}
