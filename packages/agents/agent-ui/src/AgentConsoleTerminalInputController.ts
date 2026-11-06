import type { ConsoleTextChunk, SelectMenuMouseEvent, TerminalInputSequenceResult } from './console-ports';
import { handleComposerEditingAction } from './AgentConsoleComposerEditing';
import { shouldSubmitTextInputChunk } from '@tsdi/components/common';
import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { AGENT_CONSOLE_OVERLAY_HINTS, AGENT_CONSOLE_OVERLAY_TITLES } from './AgentConsoleOverlayPresenter';
import { formatAgentUiLabel, formatAgentUiSessionClosingMessage, formatAgentUiNotice } from './agent-ui.i18n';
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
        markdownContentWidth: number;
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
        moveInputCursorByWord(delta: number): void;
        deleteInputWord(direction: -1 | 1): void;
        killInputToEdge(edge: 'start' | 'end'): void;
        openSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string, kind?: string): void;
        setMessageDetailVisibleLines(value: number): void;
        selectMenuAction?: ((value: string | undefined) => void | Promise<void>) | undefined;
    };
    closing: boolean;
    destroyed: boolean;
    commandPaletteQuery: string;
    sshShell: { write(raw: string): void } | null;
    surfaceAccessor?: {
        notifyNonMouseInput?(options?: { keepSelection?: boolean }): void;
        stopTerminal?(): void;
        writeRawTerminalData?(data: string): void;
        getTerminalSize?(): { columns?: number; cols?: number; rows?: number };
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
    const translate = (key: string, params?: Record<string, any>, fallback?: string) => formatAgentUiLabel(host.translator, key, fallback ?? key, params);
    const paletteTitle = translate('agent.menu.panel.overlay.paletteTitle', undefined, 'Command palette');
    const commands = host.state.commandHints
        .filter(command => fuzzyMatchAgentConsoleCommand(command, query))
        .map(command => {
            const definition = getAgentConsoleCommandDefinition(command);
            const form = formatAgentConsoleCommandArgumentForm(definition, translate);
            return {
                label: command,
                value: command,
                description: [
                    resolveAgentConsoleCommandDescription(
                        command,
                        undefined,
                        (key, fallback) => formatAgentUiLabel(host.translator, key, fallback)
                    ) || translate('agent.menu.panel.overlay.paletteCommandFallback', undefined, 'command'),
                    formatAgentConsoleCommandArgumentTemplate(definition)
                ].filter(Boolean).join(' '),
                detail: form.length ? form.join('\n') : undefined
            };
        });
    host.state.openSelectMenu(query ? `${paletteTitle}: ${query}` : paletteTitle, commands, 0, translate('agent.menu.panel.overlay.paletteHint', undefined, 'type to filter   enter execute'), 'palette');
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
    syncConsoleMarkdownContentWidth(host);
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
    // Page scrolling is not text input: keep an active text selection while
    // the user reads older rows instead of silently clearing the highlight.
    const scrollOnlyKey = decoded.controlKey === 'pageup' || decoded.controlKey === 'pagedown';
    host.surfaceAccessor?.notifyNonMouseInput?.({ keepSelection: scrollOnlyKey });
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
    if (decoded.paste) {
        // Insert the bracketed-paste payload verbatim: embedded newlines must
        // not be treated as Enter/submit, and paste bytes must never be routed
        // through global key handling (digits/menus) or the vim pipeline.
        releaseTranscriptFocusForTextInput(host, decoded.text);
        await host.state.processRawChunk(decoded.text, {
            submitOnEnter: false,
            hasSelectMenu: !!host.state.selectMenu
        });
        return;
    }
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
    // submitted. Decide per **decoded item**: the decoder splits a trailing
    // Enter/Tab off the text run, so the original chunk would otherwise mark
    // the text item as "submit on Enter" and bypass the `/`/`@` menu.
    const submitOnEnter = shouldSubmitTextInputChunk(decoded.text || rawChunk);
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
            // Apply only this decoded item: the decoder may split a trailing
            // Enter/Tab off the run, and submitting `rawChunk` would re-insert
            // the whole text (including the newline) into the draft.
            releaseTranscriptFocusForTextInput(host, decoded.text || rawChunk);
            await host.state.processRawChunk(decoded.text || rawChunk, {
                submitOnEnter,
                hasSelectMenu: !!host.state.selectMenu
            });
            return;
        case 'textInputApplied':
            // The state already applied this run (pending-question custom
            // answer/backspace). Calling processRawChunk again doubled the
            // text into the composer ("gammagamma").
            return;
        case 'draftNavigation':
        case 'wordNavigation':
        case 'deleteWord':
        case 'killLine':
            handleComposerEditingAction(host, outcome.action, outcome.value);
            return;
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

import {
    closingSessionMessageView,
    requestTerminalExitView,
    syncConsoleMarkdownContentWidth,
    syncConsoleMessageDetailViewportView,
    syncMarkdownWidthFromSurface
} from './AgentConsoleTerminalViewHelpers';
export {
    closingSessionMessageView,
    requestTerminalExitView,
    syncConsoleMarkdownContentWidth,
    syncConsoleMessageDetailViewportView,
    syncMarkdownWidthFromSurface
} from './AgentConsoleTerminalViewHelpers';
export type { AgentConsoleMarkdownContentWidthHost } from './AgentConsoleTerminalViewHelpers';
