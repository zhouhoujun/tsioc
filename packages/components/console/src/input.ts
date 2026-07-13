export interface ConsoleTextInputState {
    value: string;
    cursor: number;
}

export type ConsoleEnterAction = 'submit' | 'newline' | 'confirm-selection';

export interface ConsoleTextInputChunkOptions {
    submitOnEnter?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    hasSelectMenu?: boolean;
}

export interface ConsoleTextInputChunkResult extends ConsoleTextInputState {
    shouldSubmit: boolean;
    shouldConfirmSelection: boolean;
}

export interface ConsoleSelectOptionLike {
    label: string;
    value: string;
    description?: string;
    detail?: unknown;
}

export interface ConsoleSelectWindow {
    start: number;
    count: number;
}

export interface ConsoleListWindow {
    start: number;
    count: number;
}

export interface ConsoleCursorPlacementState {
    isTTY: boolean;
    isSelecting?: boolean;
    hasBlockingSelectMenu?: boolean;
    inputLocked?: boolean;
    modalPromptActive?: boolean;
    hasActiveTextPrompt?: boolean;
    hasSessionFocus?: boolean;
    hasMessageFocus?: boolean;
    hasMessageDetailFocus?: boolean;
}

export interface ConsoleDraftNavigationState {
    hasBlockingSelectMenu?: boolean;
    hasSessionFocus?: boolean;
    hasMessageFocus?: boolean;
    hasMessageDetailFocus?: boolean;
    inputLocked?: boolean;
    modalPromptActive?: boolean;
    hasActiveTextPrompt?: boolean;
}

export interface ConsoleDuplicatedKeypressState {
    lastRawKey?: string;
    lastRawAt?: number;
    now: number;
    keyName?: string;
    text?: string;
}

export interface ConsoleRawKeypressSuppressionState {
    rawText?: string;
    controlKey?: string;
    submitTriggered?: boolean;
    menuKey?: string;
}

export interface ConsoleTranscriptVisibilityState {
    showingExitFrame?: boolean;
    hasSessionFocus?: boolean;
    hasMessageFocus?: boolean;
    hasMessageDetailFocus?: boolean;
}

export function shouldSubmitConsoleTextChunk(chunk: Buffer | string): boolean {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
    if (!text || isConsoleAltEnterChunk(text)) {
        return false;
    }
    const normalized = text.replace(/\r\n/g, '\n');
    if (!normalized.includes('\n') && !normalized.includes('\r')) {
        return false;
    }
    if (/^[\r\n]+$/.test(normalized)) {
        return normalized.length <= 2;
    }
    const trimmed = normalized.replace(/[\r\n]+$/, '');
    const trailing = normalized.slice(trimmed.length);
    if (!trimmed || !trailing) {
        return false;
    }
    if (/[\r\n]/.test(trimmed)) {
        return false;
    }
    return /^[\r\n]+$/.test(trailing);
}

export function shouldPlaceConsoleCursor(state: ConsoleCursorPlacementState): boolean {
    if (!state.isTTY || state.isSelecting || state.hasBlockingSelectMenu) {
        return false;
    }
    if (state.hasSessionFocus || state.hasMessageFocus || state.hasMessageDetailFocus) {
        return false;
    }
    if (state.modalPromptActive || state.inputLocked) {
        return !!state.hasActiveTextPrompt;
    }
    return true;
}

export function shouldRouteConsoleDraftNavigation(state: ConsoleDraftNavigationState): boolean {
    if (state.hasBlockingSelectMenu || state.hasSessionFocus || state.hasMessageFocus || state.hasMessageDetailFocus) {
        return false;
    }
    if (state.hasActiveTextPrompt) {
        return true;
    }
    return !state.inputLocked && !state.modalPromptActive;
}

export function shouldSuppressConsoleDuplicatedKeypress(state: ConsoleDuplicatedKeypressState): boolean {
    const rawKey = state.lastRawKey || '';
    if (!rawKey || !state.lastRawAt || state.now - state.lastRawAt > 40) {
        return false;
    }
    const keyName = state.keyName || '';
    if (keyName && rawKey === keyName) {
        return true;
    }
    if (state.text && /^\d$/.test(state.text) && rawKey === 'digit') {
        return true;
    }
    return false;
}

export function resolveConsoleRawKeypressSuppressionKey(
    state: ConsoleRawKeypressSuppressionState
): string | undefined {
    if (state.controlKey) {
        return state.controlKey;
    }
    const menuKey = state.menuKey || '';
    if (/^\d$/.test(menuKey)) {
        return 'digit';
    }
    if (menuKey) {
        return menuKey;
    }
    if (state.submitTriggered) {
        return 'return';
    }
    return undefined;
}

export function shouldRenderConsoleTranscript(state: ConsoleTranscriptVisibilityState): boolean {
    return !state.showingExitFrame
        && !state.hasSessionFocus
        && !state.hasMessageFocus
        && !state.hasMessageDetailFocus;
}

export function clampConsoleSelectIndex(optionsLength: number, selectedIndex: number): number {
    if (!Number.isFinite(optionsLength) || optionsLength <= 0) {
        return 0;
    }
    const nextIndex = Number.isFinite(selectedIndex) ? selectedIndex : 0;
    return Math.max(0, Math.min(optionsLength - 1, nextIndex));
}

export function resolveConsoleSelectWindow(
    optionsLength: number,
    selectedIndex: number,
    visibleCount: number
): ConsoleSelectWindow {
    const count = Number.isFinite(visibleCount) && visibleCount > 0 ? Math.floor(visibleCount) : 0;
    if (!Number.isFinite(optionsLength) || optionsLength <= 0 || count <= 0) {
        return { start: 0, count: 0 };
    }
    const safeSelectedIndex = clampConsoleSelectIndex(optionsLength, selectedIndex);
    if (optionsLength <= count) {
        return { start: 0, count: optionsLength };
    }
    return {
        start: Math.max(0, Math.min(
            optionsLength - count,
            safeSelectedIndex - Math.floor(count / 2)
        )),
        count
    };
}

export function resolveConsoleListWindow(
    itemsLength: number,
    selectedIndex: number,
    visibleCount: number
): ConsoleListWindow {
    return resolveConsoleSelectWindow(itemsLength, selectedIndex, visibleCount);
}

export function formatConsoleIndexedOptionLabel(index: number, label: string, selected = false): string {
    const marker = selected ? '›' : ' ';
    return `${marker} ${index + 1}. ${label}`;
}

export function resolveConsoleSelectDetailLines(
    option?: ConsoleSelectOptionLike | null,
    limits: { text?: number; json?: number } = {}
): string[] {
    if (!option) {
        return [];
    }
    const textLimit = Number.isFinite(limits.text) && (limits.text as number) > 0 ? Math.floor(limits.text as number) : 3;
    const jsonLimit = Number.isFinite(limits.json) && (limits.json as number) > 0 ? Math.floor(limits.json as number) : 6;
    const detail = option.detail ?? option.description ?? option.label;
    if (typeof detail === 'string') {
        return detail
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .slice(0, textLimit);
    }
    if (detail == null) {
        return [];
    }
    return JSON.stringify(detail, null, 2)
        .split('\n')
        .slice(0, jsonLimit);
}

export function clampConsoleTextCursor(value: string, cursor: number): number {
    const text = String(value || '');
    const nextCursor = Number.isFinite(cursor) ? cursor : text.length;
    return Math.max(0, Math.min(text.length, nextCursor));
}

export function resolveConsoleEnterAction(options: {
    ctrlKey?: boolean;
    altKey?: boolean;
    hasSelectMenu?: boolean;
} = {}): ConsoleEnterAction {
    if (options.ctrlKey || options.altKey) {
        return 'newline';
    }
    return options.hasSelectMenu ? 'confirm-selection' : 'submit';
}

function isConsoleAltEnterChunk(text: string): boolean {
    return text === '\u001b\r' || text === '\u001b\n';
}

export function processConsoleTextInputChunk(
    value: string,
    cursor: number,
    chunk: Buffer | string,
    options: ConsoleTextInputChunkOptions = {}
): ConsoleTextInputChunkResult {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
    const baseState = {
        value: String(value || ''),
        cursor: clampConsoleTextCursor(value, cursor)
    };
    if (!text) {
        return {
            ...baseState,
            shouldSubmit: false,
            shouldConfirmSelection: false
        };
    }

    const submitOnEnter = options.submitOnEnter !== false;
    const enterAction = resolveConsoleEnterAction({
        ctrlKey: options.ctrlKey,
        altKey: options.altKey || isConsoleAltEnterChunk(text),
        hasSelectMenu: options.hasSelectMenu
    });

    let nextValue = baseState.value;
    let nextCursor = baseState.cursor;
    let shouldSubmit = false;
    let shouldConfirmSelection = false;
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (char === '\r' || char === '\n') {
            if (submitOnEnter && enterAction === 'submit') {
                shouldSubmit = true;
                continue;
            }
            if (submitOnEnter && enterAction === 'confirm-selection') {
                shouldConfirmSelection = true;
                continue;
            }
            nextValue = `${nextValue.slice(0, nextCursor)}\n${nextValue.slice(nextCursor)}`;
            nextCursor += 1;
            continue;
        }
        const next = applyConsoleTextInputChunk(nextValue, nextCursor, char);
        nextValue = next.value;
        nextCursor = next.cursor;
    }
    return {
        value: nextValue,
        cursor: nextCursor,
        shouldSubmit,
        shouldConfirmSelection
    };
}

export function applyConsoleTextInputChunk(value: string, cursor: number, chunk: Buffer | string): ConsoleTextInputState {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
    if (!text) {
        return { value: String(value || ''), cursor: clampConsoleTextCursor(value, cursor) };
    }
    let nextValue = String(value || '');
    let nextCursor = clampConsoleTextCursor(nextValue, cursor);
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (char === '\t') {
            continue;
        }
        if (char === '\u007f' || char === '\b') {
            if (nextCursor > 0) {
                nextValue = `${nextValue.slice(0, nextCursor - 1)}${nextValue.slice(nextCursor)}`;
                nextCursor -= 1;
            }
            continue;
        }
        if (char === '\u001b') {
            const seq3 = text.slice(index, index + 3);
            const seq4 = text.slice(index, index + 4);
            if (seq3 === '\u001b[D') {
                nextCursor = Math.max(0, nextCursor - 1);
                index += 2;
                continue;
            }
            if (seq3 === '\u001b[C') {
                nextCursor = Math.min(nextValue.length, nextCursor + 1);
                index += 2;
                continue;
            }
            if (seq3 === '\u001b[H') {
                nextCursor = 0;
                index += 2;
                continue;
            }
            if (seq3 === '\u001b[F') {
                nextCursor = nextValue.length;
                index += 2;
                continue;
            }
            if (seq4 === '\u001b[3~') {
                if (nextCursor < nextValue.length) {
                    nextValue = `${nextValue.slice(0, nextCursor)}${nextValue.slice(nextCursor + 1)}`;
                }
                index += 3;
                continue;
            }
            if (text[index + 1] === '[') {
                let seqEnd = index + 2;
                while (seqEnd < text.length) {
                    const code = text.charCodeAt(seqEnd);
                    if (code >= 0x40 && code <= 0x7e) {
                        break;
                    }
                    seqEnd += 1;
                }
                index = seqEnd < text.length ? seqEnd : text.length;
                continue;
            }
            if (text[index + 1] === 'O') {
                index = Math.min(text.length - 1, index + 2);
                continue;
            }
            continue;
        }
        if (char < ' ') {
            continue;
        }
        nextValue = `${nextValue.slice(0, nextCursor)}${char}${nextValue.slice(nextCursor)}`;
        nextCursor += char.length;
    }
    return {
        value: nextValue,
        cursor: nextCursor
    };
}

export function syncConsoleEditableElement(
    element: any,
    state: ConsoleTextInputState & { focused?: boolean }
): void {
    if (!element) {
        return;
    }
    const value = String(state.value || '');
    const cursor = clampConsoleTextCursor(value, state.cursor);
    if ('value' in element && element.value !== value) {
        element.value = value;
    }
    if (typeof element.textContent === 'string' && element.tagName?.toLowerCase?.() === 'textarea') {
        element.textContent = value;
    }
    const ownerDocument = element?.ownerDocument;
    const isActive = ownerDocument?.activeElement === element;
    if (state.focused && typeof element.focus === 'function' && !isActive) {
        try {
            element.focus();
        } catch {
            // Ignore renderers without native focus support.
        }
    }
    if (!state.focused && typeof element.blur === 'function' && isActive) {
        try {
            element.blur();
        } catch {
            // Ignore renderers without native blur support.
        }
    }
    if (state.focused && typeof element.setSelectionRange === 'function') {
        try {
            element.setSelectionRange(cursor, cursor);
        } catch {
            // Ignore renderers without native selection support.
        }
    }
}
