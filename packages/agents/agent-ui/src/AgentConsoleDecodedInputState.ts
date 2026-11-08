import type { ConsoleTextChunk } from './console-ports';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import { resolveTranscriptLayout } from './AgentConsoleTranscriptLayout';

    export async function processDecodedInput(
        state: AgentConsoleSessionState,
        decoded: { text: string; controlKey?: string; partial?: boolean },
        chunk: ConsoleTextChunk,
        options: {
            isClosed: boolean;
            onExit: (force?: boolean) => void;
            hasActiveTextPrompt: boolean;
            lastRenderedLines?: string[];
            transcriptNavigationController: AgentConsoleTranscriptNavigationController;
        }
    ): Promise<{ handled: boolean; action?: string; value?: string }> {
        if (options.isClosed) {
            return { handled: false };
        }

        const rawText = decoded.text;
        const controlKey = decoded.controlKey;
        if (decoded.partial) {
            return { handled: true };
        }

        if (rawText === '\u0003') {
            options.onExit(true);
            return { handled: true, action: 'exit' };
        }

        // A recalled entry can itself open the suggestion menu. Once history
        // browsing has started, keep up/down on history instead of letting the
        // newly opened menu steal the remaining navigation sequence.
        if ((controlKey === 'up' || controlKey === 'down')
            && state.inputHistoryIndex >= 0
            && !state.inputLocked
            && !state.modalPromptActive
            && !options.hasActiveTextPrompt) {
            const navigated = state.inputHistoryController.navigate(controlKey === 'up' ? -1 : 1);
            return { handled: true, action: 'historyNavigation', value: navigated ? 'navigated' : 'failed' };
        }

        if (state.focusLayers.handleMenuInput(controlKey || '', rawText)) {
            return { handled: true, action: 'menuInput' };
        }

        if (controlKey === 'pageup' || controlKey === 'pagedown') {
            const layout = resolveTranscriptLayout(state.consoleOptions.messageLayout);
            if (layout.ownsHistoryScroll || layout.wheelScrollsHistory || layout.mode === 'viewport') {
                // Surface rows: positive scrolls toward older content (PageUp).
                // Navigation fallback keeps its own -1 = up convention.
                const direction = controlKey === 'pageup' ? -1 : 1;
                // Page keys scroll the viewport; focusing messages here showed
                // the selection hint/colors on a harmless scroll.
                if (state.scrollTranscriptAction) { state.scrollTranscriptAction(-direction * 10); state.syncTranscriptFollowing(); return { handled: true, action: 'transcriptScroll', value: controlKey }; }
                const nav = options.transcriptNavigationController as any;
                if (nav && typeof nav.scrollPage === 'function') nav.scrollPage(direction); else nav.scroll(direction);
                return { handled: true, action: 'transcriptScroll', value: controlKey };
            }
            return { handled: false };
        }

        if (state.focusLayers.hasBlockingSelectMenu()) {
            return { handled: true, action: 'menuBlocked' };
        }

        // While a question is pending, printable keys build a custom answer in
        // the composer (codex/opencode "type your own answer"). Once a draft is
        // present digits are part of that answer; with an empty draft a digit
        // still picks the numbered option below.
        //
        // The TUI decoder groups a fast keystroke burst (or a paste) into one
        // text run, so this must accept the whole printable run, not only
        // `length === 1`; otherwise typing a word was swallowed by the focus
        // layer and Enter answered the highlighted option instead.
        if (state.pendingQuestion && !controlKey && rawText && !/[\r\n]/.test(rawText)
            && !/[\u0000-\u001f\u007f]/.test(rawText)) {
            const singleDigit = rawText.length === 1 && /[0-9]/.test(rawText);
            if (!singleDigit || state.input) {
                state.setInput(`${state.input}${rawText}`, state.input.length + rawText.length);
                return { handled: true, action: 'textInputApplied', value: rawText };
            }
        }
        if (state.pendingQuestion && (controlKey === 'backspace' || rawText === '\b' || rawText === '\u007f')) {
            if (state.input) {
                state.setInput(state.input.slice(0, -1), Math.max(0, state.input.length - 1));
            }
            return { handled: true, action: 'textInputApplied' };
        }

        // Filter-mode typing must bypass resolveFocusShortcutKey (which remaps
        // a/d/y/q to approve/deny/copy/q) so command names filter literally.
        if (state.commandOutputsOpen && state.commandOutputsFilterMode) {
            if (controlKey === 'backspace' || rawText === '\u007f' || rawText === '\b') {
                state.setCommandOutputsFilter(state.commandOutputsFilter.slice(0, -1));
                return { handled: true, action: 'outputsFilter' };
            }
            if (!controlKey && rawText === '/') {
                state.commandOutputsFilterMode = false;
                state.setCommandOutputsFilter('');
                return { handled: true, action: 'outputsFilter' };
            }
            if (!controlKey && rawText && rawText.length === 1 && !/[\r\n]/.test(rawText)) {
                state.setCommandOutputsFilter(`${state.commandOutputsFilter}${rawText}`);
                return { handled: true, action: 'outputsFilter' };
            }
        }

        const otherFocus = state.pendingQuestion || state.focusLayers.hasReviewFocus() || state.focusLayers.hasMessageDetailFocus() || state.focusLayers.hasMessageFocus() || state.focusLayers.hasApprovalFocus() || state.focusLayers.hasScheduledJobFocus() || state.focusLayers.hasToolFocus() || state.focusLayers.hasSessionFocus() || state.hasCommandOutputsFocus();
        const overlayOnly = state.hasTextOverlayFocus() && !otherFocus;
        if (otherFocus || state.hasTextOverlayFocus()) {
            const focusKey = state.focusLayers.resolveShortcutKey(rawText, controlKey);
            if (overlayOnly) {
                // A read-only notice overlay owns only its navigation keys; the
                // composer stays usable (typing and Enter work as in the browser)
                // instead of silently dropping every keystroke.
                if (focusKey && ['escape', 'up', 'down', 'pageup', 'pagedown', 'home', 'end'].includes(focusKey)) {
                    const consumed = await state.handleFocusKey(focusKey, options.transcriptNavigationController);
                    if (consumed) {
                        return { handled: true, action: 'focusKey' };
                    }
                }
            } else {
                if (focusKey) {
                    const consumed = await state.handleFocusKey(focusKey, options.transcriptNavigationController);
                    if (consumed) {
                        return { handled: true, action: 'focusKey' };
                    }
                }
                // Focus layer did not consume the key: let up/down fall through
                // to history navigation, keep swallowing other keys.
                if (controlKey !== 'up' && controlKey !== 'down') {
                    return { handled: true, action: 'focusKey' };
                }
            }
        }

        if ((rawText === '\u001b' || rawText === '\u001b\u001b') && (!controlKey || controlKey === 'escape')) {
            if (state.vimMode && state.inputMode === 'insert') {
                state.setInputMode('normal');
                return { handled: true };
            }
            if (state.status === 'running' || state.status === 'reasoning') {
                return { handled: true, action: 'cancelTurn' };
            }
            await state.focusLayers.handleEscape(options.transcriptNavigationController);
            return { handled: true };
        }
        if (rawText === '\u001b\r' || rawText === '\u001b\n') {
            return { handled: true, action: 'altNewline' };
        }

        // Shift/Ctrl/Alt+Enter (kitty CSI-u, xterm modifyOtherKeys) insert a
        // newline instead of submitting, matching the browser composer.
        if (controlKey === 'newline') {
            return { handled: true, action: 'altNewline' };
        }
        if (controlKey === 'word-left' || controlKey === 'word-right') {
            if (state.focusLayers.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
                return { handled: true, action: 'wordNavigation', value: controlKey };
            }
            return { handled: true };
        }
        if (controlKey === 'delete-word-left' || controlKey === 'delete-word-right') {
            if (state.focusLayers.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
                return { handled: true, action: 'deleteWord', value: controlKey };
            }
            return { handled: true };
        }
        if (controlKey === 'kill-line-end' || controlKey === 'kill-line-start') {
            if (state.focusLayers.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
                return {
                    handled: true,
                    action: 'killLine',
                    value: controlKey === 'kill-line-start' ? 'start' : 'end'
                };
            }
            return { handled: true };
        }
        if (controlKey === 'line-start' || controlKey === 'line-end') {
            if (state.focusLayers.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
                return {
                    handled: true,
                    action: 'draftNavigation',
                    value: controlKey === 'line-start' ? 'start' : 'end'
                };
            }
            return { handled: true };
        }

        if (options.hasActiveTextPrompt && !controlKey && (rawText.includes('\r') || rawText.includes('\n'))) {
            return { handled: true, action: 'textPromptInput', value: rawText };
        }

        if (controlKey === 'return') {
            if (options.hasActiveTextPrompt) {
                return { handled: true, action: 'submitTextPrompt' };
            }
            if (!state.modalPromptActive && !state.inputLocked) {
                return { handled: true, action: 'submit', value: rawText };
            }
            return { handled: true };
        }

        if ((controlKey === 'home' || controlKey === 'end')
            && !state.input.trim()
            && !options.hasActiveTextPrompt
            && !state.inputLocked
            && !state.modalPromptActive
            && state.scrollTranscriptToEdgeAction) {
            const consumed = state.scrollTranscriptToEdgeAction(controlKey === 'home' ? 'start' : 'end');
            if (consumed) {
                state.syncTranscriptFollowing();
                return { handled: true, action: 'transcriptScroll', value: controlKey };
            }
        }
        if (controlKey === 'left' || controlKey === 'right' || controlKey === 'home' || controlKey === 'end') {
            if (state.focusLayers.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
                return { handled: true, action: 'draftNavigation', value: controlKey };
            }
            return { handled: true };
        }

        if (controlKey === 'up' || controlKey === 'down') {
            // Shell-like: up/down recalls history at the prompt unless a
            // blocking interaction (menu/lock/modal/text prompt) is active.
            if (!state.focusLayers.hasBlockingSelectMenu()
                && !state.inputLocked
                && !state.modalPromptActive
                && !options.hasActiveTextPrompt) {
                const navigated = state.inputHistoryController.navigate(controlKey === 'up' ? -1 : 1);
                return { handled: true, action: 'historyNavigation', value: navigated ? 'navigated' : 'failed' };
            }
            return { handled: true };
        }

        if (controlKey === 'tab') {
            if ((state.status === 'running' || state.status === 'reasoning') && state.input.trim()) {
                return { handled: true, action: 'queueDraft' };
            }
            return { handled: true };
        }

        if (controlKey === 'up' || controlKey === 'down' || controlKey === 'escape') {
            return { handled: true };
        }

        if (state.focusLayers.shouldRouteDraftNavigation(options.hasActiveTextPrompt)) {
            return { handled: true, action: 'textInput', value: rawText };
        }

        return { handled: false };
    }
