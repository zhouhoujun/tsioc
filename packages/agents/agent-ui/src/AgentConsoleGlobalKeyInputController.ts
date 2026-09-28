import type { AgentMessage } from '@tsdi/agent';
import type { AgentConsoleGlobalAction, AgentConsoleKeymap, AgentConsoleKeymapContext } from './AgentConsoleKeymap';
import { decodeGlobalKey } from './AgentConsoleStreamHelpers';
import { isAgentConsoleMessageNavigationAction, isAgentConsoleThreadNavigationAction } from './AgentConsoleKeymap';
import { moveMessageSelectionPage, selectFirstMessage, selectLastMessage, selectLastUserMessage } from './AgentConsoleTranscriptNavigation';

/**
 * Host surface required by the global key input controller.
 * The component satisfies this interface structurally when delegating.
 */
export interface AgentConsoleGlobalKeyInputHost {
    state: {
        hasCommandOutputsFocus(): boolean;
        commandOutputsFilterMode: boolean;
        commandOutputsFilter: string;
        setCommandOutputsFilter(filter: string): void;
        dismissFocusLayer(): Promise<boolean>;
        handleFocusKey(key: string): Promise<boolean>;
        selectMenu?: { title?: string } | null;
        whichKeyVisible: boolean;
        setWhichKeyVisible(visible: boolean): void;
        isAnyFocusActive(): boolean;
        hasMessageFocus(): boolean;
        focusLatestLongMessage(): boolean;
        displayMessages: AgentMessage[];
        selectedMessageId: string;
        messagesFocused: boolean;
        messageDetailScroll: number;
        messageDetailColumnScroll: number;
        setMessagesFocused(focused: boolean): void;
        consoleOptions: { messageSelectionPageSize: number };
        showThinking: boolean;
        setShowThinking(visible: boolean): void;
        toggleWhichKeyLayout(): void;
        toggleWhichKeyFilterCustom(): void;
        whichKeyPage: number;
        setWhichKeyPage(page: number): void;
        messageDetailOpen: boolean;
    };
    globalKeyPending: string;
    keymapRecording?: { context: AgentConsoleKeymapContext; action: AgentConsoleGlobalAction };
    commandPaletteQuery: string;
    globalKeymap?: AgentConsoleKeymap | null;
    isTurnInProgress(): boolean;
    interruptTurn(): Promise<void>;
    notify(message: string, duration?: number): void;
    handleCommand(value: string): Promise<boolean>;
    persistGlobalKeymap(): Promise<void>;
    runTimelineModeCommand(args?: string): Promise<boolean>;
    runEditorCommand(args?: string): Promise<boolean>;
    handleIdleEscape(): Promise<boolean>;
    clearScrollback(): boolean;
    toggleWhichKeyOverlay(): void;
    refreshWhichKeyBindings(): void;
    toggleHealthPopover(): Promise<void>;
    navigateThreadChildFirst(): Promise<boolean>;
    navigateThreadCycle(delta: 1 | -1): Promise<boolean>;
    navigateThreadParent(): Promise<boolean>;
    openCommandPalette(query?: string): void;
    requestTerminalExit(message?: string): Promise<void>;
    resolveKeymapContext(): AgentConsoleKeymapContext;
    canThreadNavigate(): boolean;
    canMessageNavigate(): boolean;
    toggleModelFavorite(): Promise<void>;
    cycleRecentModel(delta: 1 | -1): Promise<void>;
    cycleModelVariant(): Promise<void>;
    queueDraft(): boolean;
}

/**
 * Handles a raw browser/terminal global key input before the composer path.
 * Normalizes modifier combos, drives keymap recording, and dispatches
 * focus-aware navigation (command outputs filter, command palette,
 * which-key overlay, edit-last-message Esc machine).
 */
export async function handleBrowserGlobalKeyInputView(
    host: AgentConsoleGlobalKeyInputHost,
    key: string,
    modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }
): Promise<boolean> {
    const ctrlKey = !!(modifiers.ctrlKey || modifiers.metaKey);
    const altKey = !!modifiers.altKey;
    const rawKey = String(key || '').toLowerCase();
    // TUI raw mode delivers Ctrl+C as the ETX control character rather
    // than a `c` key with ctrlKey metadata.
    if (rawKey === '\u0003' && host.isTurnInProgress()) {
        await host.interruptTurn();
        return true;
    }
    const normalizedKey = ctrlKey
        ? (altKey ? `ctrl+alt+${rawKey}` : `ctrl+${rawKey}`)
        : /^f\d{1,2}$/.test(rawKey)
            ? (modifiers.shiftKey ? `shift+${rawKey}` : rawKey)
            : modifiers.shiftKey && /^[A-Z]$/.test(String(key || ''))
                ? `shift+${rawKey}`
                : rawKey;
    const arrowKeys: Record<string, string> = {
        arrowup: 'up',
        arrowdown: 'down',
        arrowleft: 'left',
        arrowright: 'right'
    };
    const navKeys: Record<string, string> = {
        pageup: 'pageup',
        pagedown: 'pagedown',
        home: 'home',
        end: 'end'
    };
    const functionKeys: Record<string, string> = {
        f1: 'f1', f2: 'f2', f3: 'f3', f4: 'f4',
        f5: 'f5', f6: 'f6', f7: 'f7', f8: 'f8',
        f9: 'f9', f10: 'f10', f11: 'f11', f12: 'f12',
        'shift+f1': 'shift+f1', 'shift+f2': 'shift+f2', 'shift+f3': 'shift+f3', 'shift+f4': 'shift+f4',
        'shift+f5': 'shift+f5', 'shift+f6': 'shift+f6', 'shift+f7': 'shift+f7', 'shift+f8': 'shift+f8',
        'shift+f9': 'shift+f9', 'shift+f10': 'shift+f10', 'shift+f11': 'shift+f11', 'shift+f12': 'shift+f12'
    };
    const mappedKey = arrowKeys[normalizedKey] || navKeys[normalizedKey] || functionKeys[normalizedKey] || normalizedKey;
    if (host.keymapRecording) {
        if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
            host.keymapRecording = undefined;
            host.notify('Keymap recording cancelled.');
            return true;
        }
        if (mappedKey) {
            const { context, action } = host.keymapRecording;
            host.keymapRecording = undefined;
            if (host.globalKeymap!.set(mappedKey, action, context)) {
                await host.persistGlobalKeymap();
                host.notify(`Keymap set: ${mappedKey} -> ${action} (${context}).`);
            } else {
                host.notify(`Cannot bind ${mappedKey}: unknown action ${action}.`);
            }
        }
        return true;
    }
    if (host.state.hasCommandOutputsFocus()) {
        if (host.state.commandOutputsFilterMode) {
            if (!ctrlKey && normalizedKey === 'backspace') {
                host.state.setCommandOutputsFilter(host.state.commandOutputsFilter.slice(0, -1));
                return true;
            }
            if (!ctrlKey && normalizedKey === '/') {
                host.state.commandOutputsFilterMode = false;
                host.state.setCommandOutputsFilter('');
                return true;
            }
            if (!ctrlKey && key.length === 1 && !/[\r\n]/.test(key)) {
                host.state.setCommandOutputsFilter(`${host.state.commandOutputsFilter}${key}`);
                return true;
            }
        }
        if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
            host.state.commandOutputsFilterMode = false;
            await host.state.dismissFocusLayer();
            return true;
        }
        if (!ctrlKey && mappedKey) {
            if (await host.state.handleFocusKey(mappedKey)) return true;
            if (key.length === 1) return true;
            return false;
        }
    }
    if (host.state.selectMenu?.title?.startsWith('Command palette')) {
        if (normalizedKey === 'ctrl+p') return handleGlobalKeySequenceView(host, normalizedKey);
        if (!ctrlKey && normalizedKey === 'backspace') {
            host.openCommandPalette(host.commandPaletteQuery.slice(0, -1));
            return true;
        }
        if (!ctrlKey && key.length === 1) {
            host.openCommandPalette(`${host.commandPaletteQuery}${key}`);
            return true;
        }
        return false;
    }
    if (host.state.whichKeyVisible) {
        if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
            host.state.setWhichKeyVisible(false);
            return true;
        }
        if (mappedKey && host.globalKeymap!.resolve(mappedKey, host.resolveKeymapContext()) !== 'which-key-toggle') {
            host.state.setWhichKeyVisible(false);
        }
    }
    // In a terminal, Ctrl+C is commonly configured as copy while idle,
    // but must act as an interrupt during an active turn. Keep the idle
    // binding untouched so copy continues to work.
    if (ctrlKey && rawKey === 'c' && host.isTurnInProgress()) {
        await host.interruptTurn();
        return true;
    }
    if (ctrlKey && rawKey === 'c') {
        // Raw-mode terminals do not emit SIGINT. Preserve the familiar
        // shell behaviour for an idle console; when text is selected the
        // terminal emulator consumes Ctrl+C for copy before this handler.
        void host.requestTerminalExit();
        return true;
    }
    if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey) && host.isTurnInProgress()) {
        await host.interruptTurn();
        return true;
    }
    if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey) && (host.state.selectMenu || host.state.isAnyFocusActive())) {
        host.globalKeyPending = '';
        return false;
    }
    if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
        const action = host.globalKeymap!.resolve('escape', host.resolveKeymapContext());
        if (action === 'interrupt-turn') {
            if (!host.isTurnInProgress()) return host.handleIdleEscape();
            await host.interruptTurn();
            return true;
        }
        if (!action) return false;
        await executeGlobalKeyActionView(host, action);
        return true;
    }
    if (!ctrlKey && !arrowKeys[normalizedKey] && !navKeys[normalizedKey] && !functionKeys[normalizedKey] && key.length !== 1 && !host.globalKeyPending) return false;
    return handleGlobalKeySequenceView(host, mappedKey);
}


/**
 * Handles a raw TUI terminal global key input (control sequences, escape
 * prefixes, keymap recording, which-key navigation) before composer focus.
 * Returns whether the input was consumed.
 */
export async function handleGlobalKeyInputView(host: AgentConsoleGlobalKeyInputHost, raw: string): Promise<boolean> {
        // Raw terminals encode Ctrl+C as ETX. Handle it before keymap/focus
        // routing so an active turn is always cancellable.
        if (raw === '\u0003' || raw === '\u0003'.toString()) {
            if (host.isTurnInProgress()) {
                await host.interruptTurn();
                return true;
            }
        }
        if (host.keymapRecording) {
            if (raw === '\u001b') {
                host.keymapRecording = undefined;
                host.notify('Keymap recording cancelled.');
                return true;
            }
            const key = decodeGlobalKey(raw);
            if (key) {
                const { context, action } = host.keymapRecording;
                host.keymapRecording = undefined;
                if (host.globalKeymap!.set(key, action, context)) {
                    await host.persistGlobalKeymap();
                    host.notify(`Keymap set: ${key} -> ${action} (${context}).`);
                } else {
                    host.notify(`Cannot bind ${key}: unknown action ${action}.`);
                }
            }
            return true;
        }
        if (raw === '\u001b' && host.state.whichKeyVisible) {
            host.state.setWhichKeyVisible(false);
            return true;
        }
        // Escape must cancel an active turn even when an input/focus panel is
        // currently active; focus dismissal is only for idle consoles.
        if (raw === '\u001b' && host.isTurnInProgress()) {
            await host.interruptTurn();
            return true;
        }
        if (raw === '\u001b' && (host.state.selectMenu || host.state.isAnyFocusActive())) return false;
        if (raw === '\u001b') {
            const action = host.globalKeymap!.resolve('escape', host.resolveKeymapContext());
            if (action === 'interrupt-turn') {
                if (!host.isTurnInProgress()) return host.handleIdleEscape();
                await host.interruptTurn();
                return true;
            }
            if (!action) return false;
            await executeGlobalKeyActionView(host, action);
            return true;
        }
        const key = decodeGlobalKey(raw);
        if (!key) {
            if (raw === '\u001b') host.globalKeyPending = '';
            return false;
        }
        if (host.state.whichKeyVisible && key !== 'ctrl+alt+k') {
            if (key === 'n') {
                host.state.setWhichKeyPage(host.state.whichKeyPage + 1);
                host.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'p') {
                host.state.setWhichKeyPage(host.state.whichKeyPage - 1);
                host.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'l' || key === 'L') {
                host.state.toggleWhichKeyLayout();
                host.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'f' || key === 'F') {
                host.state.toggleWhichKeyFilterCustom();
                host.refreshWhichKeyBindings();
                return true;
            }
            host.state.setWhichKeyVisible(false);
        }
        return handleGlobalKeySequenceView(host, key);
    }
/**
 * Resolves a possibly-prefixed global key sequence against the active
 * keymap context, driving prefix buffering and navigation guards before
 * dispatching the resolved action.
 */
export async function handleGlobalKeySequenceView(host: AgentConsoleGlobalKeyInputHost, key: string): Promise<boolean> {
        const sequence = host.globalKeyPending ? `${host.globalKeyPending} ${key}` : key;
        const context = host.resolveKeymapContext();
        const action = host.globalKeymap!.resolve(sequence, context);
        const isPrefix = Object.keys(host.globalKeymap!.effectiveBindings(context)).some(binding => binding.startsWith(`${sequence} `));
        if (isPrefix && !action) {
            host.globalKeyPending = sequence;
            return true;
        }
        if (host.globalKeyPending) {
            host.globalKeyPending = '';
            if (!action) return true;
        }
        if (!action) return false;
        if (isAgentConsoleThreadNavigationAction(action) && !host.canThreadNavigate()) return false;
        if (isAgentConsoleMessageNavigationAction(action) && !host.canMessageNavigate()) {
            const canEnterTranscript = action === 'message-page-up'
                && !host.state.hasMessageFocus()
                && !host.state.messageDetailOpen
                && !host.state.selectMenu;
            if (!canEnterTranscript) return false;
        }
        return await executeGlobalKeyActionView(host, action);
    }
/**
 * Executes a global keymap action, either natively or by dispatching the
 * equivalent slash command. Returns whether the action was consumed.
 */
export async function executeGlobalKeyActionView(
    host: AgentConsoleGlobalKeyInputHost,
    action: AgentConsoleGlobalAction
): Promise<boolean> {
    if (action === 'command-palette') {
        host.openCommandPalette();
        return true;
    }
    if (action === 'interrupt-turn') {
        await host.interruptTurn();
        return true;
    }
    if (action === 'theme') {
        await host.handleCommand('/theme');
        return true;
    }
    if (action === 'toggle-thinking') {
        host.state.setShowThinking(!host.state.showThinking);
        host.notify(host.state.showThinking ? 'Showing reasoning messages.' : 'Hiding reasoning messages.');
        return true;
    }
    if (action === 'open-editor') {
        await host.runEditorCommand();
        return true;
    }
    if (action === 'thread-child-first') {
        return host.navigateThreadChildFirst();
    }
    if (action === 'thread-cycle-next') {
        return host.navigateThreadCycle(1);
    }
    if (action === 'thread-cycle-prev') {
        return host.navigateThreadCycle(-1);
    }
    if (action === 'thread-parent') {
        return host.navigateThreadParent();
    }
    if (action === 'message-page-up') {
        if (!host.state.hasMessageFocus()) {
            return host.state.focusLatestLongMessage();
        }
        moveMessageSelectionPage(host.state, -1);
        return true;
    }
    if (action === 'message-page-down') {
        moveMessageSelectionPage(host.state, 1);
        return true;
    }
    if (action === 'message-half-page-up') {
        moveMessageSelectionPage(host.state, -1, Math.max(1, Math.floor(host.state.consoleOptions.messageSelectionPageSize / 2)));
        return true;
    }
    if (action === 'message-half-page-down') {
        moveMessageSelectionPage(host.state, 1, Math.max(1, Math.floor(host.state.consoleOptions.messageSelectionPageSize / 2)));
        return true;
    }
    if (action === 'message-line-up') {
        moveMessageSelectionPage(host.state, -1, 1);
        return true;
    }
    if (action === 'message-line-down') {
        moveMessageSelectionPage(host.state, 1, 1);
        return true;
    }
    if (action === 'message-first') {
        selectFirstMessage(host.state);
        return true;
    }
    if (action === 'message-last') {
        selectLastMessage(host.state);
        return true;
    }
    if (action === 'message-last-user') {
        selectLastUserMessage(host.state);
        return true;
    }
    if (action === 'model-favorite-toggle') {
        await host.toggleModelFavorite();
        return true;
    }
    if (action === 'model-cycle-recent') {
        await host.cycleRecentModel(1);
        return true;
    }
    if (action === 'model-cycle-recent-back') {
        await host.cycleRecentModel(-1);
        return true;
    }
    if (action === 'model-variant-cycle') {
        await host.cycleModelVariant();
        return true;
    }
    if (action === 'which-key-toggle') {
        host.toggleWhichKeyOverlay();
        return true;
    }
    if (action === 'which-key-layout-toggle') {
        host.state.toggleWhichKeyLayout();
        if (host.state.whichKeyVisible) {
            host.refreshWhichKeyBindings();
        }
        return true;
    }
    if (action === 'which-key-pending-toggle') {
        host.state.toggleWhichKeyFilterCustom();
        if (host.state.whichKeyVisible) {
            host.refreshWhichKeyBindings();
        }
        return true;
    }
    if (action === 'status-health') {
        await host.toggleHealthPopover();
        return true;
    }
    if (action === 'timeline-mode') {
        await host.runTimelineModeCommand();
        return true;
    }
    if (action === 'queue-follow-up') {
        return host.queueDraft();
    }
    if (action === 'clear-scrollback') {
        return host.clearScrollback();
    }
    const commands: Record<Exclude<AgentConsoleGlobalAction, 'command-palette' | 'theme' | 'interrupt-turn' | 'toggle-thinking' | 'open-editor' | 'thread-child-first' | 'thread-cycle-next' | 'thread-cycle-prev' | 'thread-parent' | 'message-page-up' | 'message-page-down' | 'message-half-page-up' | 'message-half-page-down' | 'message-line-up' | 'message-line-down' | 'message-first' | 'message-last' | 'message-last-user' | 'model-favorite-toggle' | 'model-cycle-recent' | 'model-cycle-recent-back' | 'model-variant-cycle' | 'which-key-toggle' | 'which-key-layout-toggle' | 'which-key-pending-toggle' | 'status-health' | 'timeline-mode' | 'queue-follow-up' | 'clear-scrollback'>, string> = {
        'new-session': '/new',
        compact: '/compact',
        export: '/export',
        undo: '/undo',
        redo: '/redo',
        sessions: '/sessions',
        model: '/model',
        archetypes: '/archetype',
        status: '/status',
        copy: '/copy',
        'command-outputs': '/outputs'
    };
    await host.handleCommand(commands[action]);
    return true;
}