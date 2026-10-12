import type { ConsoleTextChunk, SelectMenuMouseEvent, TerminalInputSequenceResult } from './console-ports';
import { shouldSubmitCommonTextInputChunk } from '@tsdi/components/common';
import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { AGENT_CONSOLE_OVERLAY_HINTS, AGENT_CONSOLE_OVERLAY_TITLES } from './AgentConsoleOverlayPresenter';
import { formatAgentUiSessionClosingMessage, formatAgentUiNotice } from './agent-ui.i18n';
import { fuzzyMatchAgentConsoleCommand } from './AgentConsoleKeymap';
import { resolveTranscriptLayout } from './AgentConsoleTranscriptLayout';
import {
    formatAgentConsoleCommandArgumentForm,
    formatAgentConsoleCommandArgumentTemplate,
    getAgentConsoleCommandDefinition,
    resolveAgentConsoleCommandDescription
} from './AgentConsoleCommandRegistry';

/** Ctrl+] detaches from an active SSH shell session. */
const SSH_SHELL_DETACH_SEQUENCE = '\x1d';

/**
 * Host surface required by the terminal input controller.
 * The component satisfies this interface structurally when delegating.
 */
export interface AgentConsoleTerminalInputHost {
    transcriptNavigationController: import('./AgentConsoleTranscriptNavigation').AgentConsoleTranscriptNavigationController;
    state: {
        sessionId: string;
        vimMode: boolean;
        inputMode: string;
        commandHints: string[];
        selectMenu?: { title?: string; kind?: string } | null;
        messageDetailVisibleLines: number;
        consoleOptions: { messageToggleInteraction?: string; messageLayout?: string };
        isSshShellActive: boolean;
        focusLayers: { isAnyFocusActive(): boolean };
        handleVimKey(key: string): boolean;
        processDecodedInput(
            decoded: { text: string; controlKey?: string; partial?: boolean },
            chunk: ConsoleTextChunk,
            options: {
                isClosed: boolean;
                onExit: (force?: boolean) => void;
                hasActiveTextPrompt: boolean;
                lastRenderedLines?: string[];
                transcriptNavigationController: import('./AgentConsoleTranscriptNavigation').AgentConsoleTranscriptNavigationController;
            }
        ): Promise<{ handled: boolean; action?: string; value?: string }>;
        processRawChunk(
            chunk: string,
            options?: { submitOnEnter?: boolean; ctrlKey?: boolean; altKey?: boolean; hasSelectMenu?: boolean }
        ): Promise<{ submitted: boolean; confirmedSelection: boolean }>;
        moveInputCursor(delta: number): void;
        moveInputCursorToEdge(position: 'start' | 'end'): void;
        openSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string, kind?: string): void;
        setMessageDetailVisibleLines(value: number): void;
        selectMenuAction?: ((value: string | undefined) => void | Promise<void>) | undefined;
    };
    closing: boolean;
    destroyed: boolean;
    commandPaletteQuery: string;
    sshShell: { write(raw: string): void } | null;
    surfaceAccessor?: {
        notifyNonMouseInput?(): void;
        stopTerminal?(): void;
        writeRawTerminalData?(data: string): void;
        getTerminalSize?(): { rows?: number };
        getTerminalViewportRows?(): number;
        subscribeToSurfaceResize?(listener: () => void): () => void;
        dispatchMouse?(mouse: SelectMenuMouseEvent): void;
        isPagerOpen?(): boolean;
        closePager?(): boolean;
        pagerHandleKey?(key: 'up' | 'down' | 'pageup' | 'pagedown' | 'home' | 'end'): boolean;
        pagerSearch?(query: string, options?: { caseSensitive?: boolean }): number;
        pagerTypeChar?(char: string): number;
        pagerBackspace?(): number;
    } | null;
    app?: { close(): Promise<unknown> } | null;
    translator?: { translate(key: string, params?: Record<string, unknown>): string | undefined; currentLocale?: string } | null;
    sessionService?: { cancelTurn(sessionId: string): Promise<boolean> } | null;
    isTurnInProgress(): boolean;
    notify(message: string, duration?: number): void;
    scrollMessages?(delta: number): void;
    getTerminalRenderedLines(): string[];
    handleGlobalKeyInput(raw: string): Promise<boolean>;
    detachSshShell(reason: 'detached' | 'closed'): Promise<void>;
    submit(): Promise<void>;
    queueDraft(): boolean;
    handleCommand(value: string): Promise<boolean>;
    focusComposer?(): void;
}

function releaseTranscriptFocusForTextInput(host: AgentConsoleTerminalInputHost, text: string): void {
    if (!text) return;
    if (host.focusComposer) host.focusComposer();
    else host.transcriptNavigationController.setFocused(false);
}

/** Open the command palette with an optional pre-filter query. */
export function openCommandPaletteView(host: AgentConsoleTerminalInputHost, query = ''): void {
    host.commandPaletteQuery = query;
    const commands = host.state.commandHints
        .filter(command => fuzzyMatchAgentConsoleCommand(command, query))
        .map(command => {
            const definition = getAgentConsoleCommandDefinition(command);
            const form = formatAgentConsoleCommandArgumentForm(definition);
            return {
                label: command,
                value: command,
                description: [
                    resolveAgentConsoleCommandDescription(command) || 'command',
                    formatAgentConsoleCommandArgumentTemplate(definition)
                ].filter(Boolean).join(' '),
                detail: form.length ? form.join('\n') : undefined
            };
        });
    host.state.openSelectMenu(query ? `${AGENT_CONSOLE_OVERLAY_TITLES.palette}: ${query}` : AGENT_CONSOLE_OVERLAY_TITLES.palette, commands, 0, AGENT_CONSOLE_OVERLAY_HINTS.palette, 'palette');
    host.state.selectMenuAction = async value => {
        host.commandPaletteQuery = '';
        if (value) await host.handleCommand(value);
    };
}

/** Route raw terminal input typed while the command palette overlay is open. */
export async function handleCommandPaletteInputView(host: AgentConsoleTerminalInputHost, decoded: TerminalInputSequenceResult, raw: string): Promise<boolean> {
    if (host.state.selectMenu?.kind !== 'palette') return false;
    if ((decoded.controlKey as string | undefined) === 'backspace' || raw === '\u007f' || raw === '\b') {
        openCommandPaletteView(host, host.commandPaletteQuery.slice(0, -1));
        return true;
    }
    if (decoded.controlKey || raw === '\u001b' || raw === '\r' || raw === '\n') return false;
    if (raw && !/[\u0000-\u001f\u007f]/.test(raw)) {
        openCommandPaletteView(host, `${host.commandPaletteQuery}${raw}`);
        return true;
    }
    return false;
}

/**
 * Route raw terminal input into the base-layer transcript pager while it is open.
 * Navigation + find are owned by the base surface; agent-ui only maps keys to it.
 */
export function handleTranscriptPagerInputView(host: AgentConsoleTerminalInputHost, raw: string): boolean {
    const surface = host.surfaceAccessor;
    if (!surface?.isPagerOpen?.()) {
        return false;
    }
    const key = String(raw || '');
    if (key === '\u001b' || key === '\u001b\u001b') {
        surface.closePager?.();
        return true;
    }
    if (key === '\u001b[A' || key === '\u001bOA') {
        surface.pagerHandleKey?.('up');
        return true;
    }
    if (key === '\u001b[B' || key === '\u001bOB') {
        surface.pagerHandleKey?.('down');
        return true;
    }
    if (key === '\u001b[5~') {
        surface.pagerHandleKey?.('pageup');
        return true;
    }
    if (key === '\u001b[6~') {
        surface.pagerHandleKey?.('pagedown');
        return true;
    }
    if (key === '\u001b[H' || key === '\u001b[1~' || key === '\u001bOH') {
        surface.pagerHandleKey?.('home');
        return true;
    }
    if (key === '\u001b[F' || key === '\u001b[4~' || key === '\u001bOF') {
        surface.pagerHandleKey?.('end');
        return true;
    }
    if (key === '\u007f' || key === '\b') {
        surface.pagerBackspace?.();
        return true;
    }
    if (key.length === 1 && key >= ' ' && key !== '\u007f') {
        surface.pagerTypeChar?.(key);
        return true;
    }
    if (key.length === 1 && key < ' ') {
        // Control keys (e.g. Ctrl+C) fall through to global handling.
        return false;
    }
    // Swallow other read-only navigation sequences so they never reach the composer.
    return true;
}

/** Route decoded terminal input through the palette, global key, vim, and prompt pipelines. */
export async function handleTerminalInputView(
    host: AgentConsoleTerminalInputHost,
    decoded: TerminalInputSequenceResult,
    chunk: ConsoleTextChunk
): Promise<void> {
    if (host.closing) {
        return;
    }
    syncConsoleMessageDetailViewportView(host);
    if (decoded.mouse) {
        if (resolveTranscriptLayout(host.state.consoleOptions.messageLayout).wheelScrollsHistory && (decoded.mouse.button & 64) !== 0) {
            host.scrollMessages?.((decoded.mouse.button & 1) === 0 ? -1 : 1);
            return;
        }
        host.surfaceAccessor?.dispatchMouse?.(decoded.mouse);
        return;
    }
    if (decoded.partial) {
        return;
    }
    host.surfaceAccessor?.notifyNonMouseInput?.();
    if (host.state.isSshShellActive && host.sshShell) {
        const raw = typeof chunk === 'string' ? chunk : chunk.toString();
        if (raw === SSH_SHELL_DETACH_SEQUENCE) {
            await host.detachSshShell('detached');
            return;
        }
        host.sshShell.write(raw);
        return;
    }
    const rawChunk = typeof chunk === 'string' ? chunk : chunk.toString();
    if (await handleCommandPaletteInputView(host, decoded, rawChunk)) {
        return;
    }
    if (handleTranscriptPagerInputView(host, rawChunk)) {
        return;
    }
    if (await host.handleGlobalKeyInput(rawChunk)) {
        return;
    }
    if (host.state.vimMode && !host.state.focusLayers.isAnyFocusActive() && host.state.inputMode === 'normal') {
        const raw = typeof chunk === 'string' ? chunk : chunk.toString();
        if (decoded.controlKey === 'return') {
            return;
        }
        if (!decoded.controlKey && raw && raw !== '\u001b' && !/[\u0000-\u001f\u007f]/.test(raw)) {
            host.state.handleVimKey(raw);
            return;
        }
    }
    // A plain Enter submits, but a chunk carrying embedded newlines (a
    // multi-line paste) must be inserted verbatim instead of being joined and
    // submitted. `shouldSubmitCommonTextInputChunk` distinguishes the two.
    const submitOnEnter = shouldSubmitCommonTextInputChunk(rawChunk);
    const outcome = await host.state.processDecodedInput(decoded, chunk, {
        isClosed: host.destroyed,
        onExit: () => {
            void requestTerminalExitView(host, closingSessionMessageView(host));
        },
        hasActiveTextPrompt: false,
        lastRenderedLines: host.getTerminalRenderedLines(),
        transcriptNavigationController: host.transcriptNavigationController
    });
    if (!outcome.handled && decoded.text) {
        releaseTranscriptFocusForTextInput(host, decoded.text);
        await host.state.processRawChunk(decoded.text, {
            submitOnEnter,
            hasSelectMenu: !!host.state.selectMenu
        });
        return;
    }
    switch (outcome.action) {
        case 'submit':
            // Keep terminal input dispatch available while the turn runs so
            // Esc/Ctrl+C can reach the cancellation path immediately.
            void host.submit();
            return;
        case 'cancelTurn':
            if (host.isTurnInProgress()) {
                const cancelled = await host.sessionService?.cancelTurn(host.state.sessionId) ?? false;
                host.notify(formatAgentUiNotice(host.translator, cancelled
                    ? 'cancellingTurn'
                    : 'noRunningTurn'));
            }
            return;
        case 'queueDraft':
            host.queueDraft();
            return;
        case 'textInput':
            releaseTranscriptFocusForTextInput(host, rawChunk);
            await host.state.processRawChunk(rawChunk, {
                submitOnEnter,
                hasSelectMenu: !!host.state.selectMenu
            });
            return;
        case 'draftNavigation':
            switch (outcome.value) {
                case 'left':
                    host.state.moveInputCursor(-1);
                    return;
                case 'right':
                    host.state.moveInputCursor(1);
                    return;
                case 'home':
                    host.state.moveInputCursorToEdge('start');
                    return;
                case 'end':
                    host.state.moveInputCursorToEdge('end');
                    return;
                default:
                    return;
            }
        case 'altNewline':
            releaseTranscriptFocusForTextInput(host, '\n');
            await host.state.processRawChunk('\n', {
                submitOnEnter: false,
                altKey: true,
                hasSelectMenu: !!host.state.selectMenu
            });
            return;
        default:
            return;
    }
}

/** Gracefully request terminal/app shutdown, restoring the host terminal first. */
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

/** Subscribe once per host so terminal resizes recompute the detail viewport without a keypress. */
function ensureDetailViewportResizeSync(host: AgentConsoleTerminalInputHost): void {
    if (detailViewportResizeSyncHosts.has(host)) {
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
