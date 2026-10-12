import { fitByDisplayWidth, getDisplayWidth } from './display-width';

export type ConsoleTextChunk = Uint8Array | string;

export function decodeConsoleTextChunk(chunk: ConsoleTextChunk | null | undefined): string {
    if (typeof chunk === 'string') {
        return chunk;
    }
    if (chunk instanceof Uint8Array) {
        if (typeof TextDecoder !== 'undefined') {
            return new TextDecoder().decode(chunk);
        }
        const bufferCtor = (globalThis as { Buffer?: { from?(input: Uint8Array): { toString(encoding?: string): string } } }).Buffer;
        if (typeof bufferCtor?.from === 'function') {
            return bufferCtor.from(chunk).toString('utf8');
        }
    }
    if (chunk == null) {
        return '';
    }
    return String(chunk);
}

export function encodeConsoleBase64Utf8(text: string): string {
    if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
        const bytes = new TextEncoder().encode(String(text || ''));
        let binary = '';
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
    }
    const bufferCtor = (globalThis as { Buffer?: { from?(input: string, encoding?: string): { toString(encoding?: string): string } } }).Buffer;
    if (typeof bufferCtor?.from === 'function') {
        return bufferCtor.from(String(text || ''), 'utf8').toString('base64');
    }
    return '';
}

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

export interface ConsoleClipboardSelection {
    start: number;
    end: number;
    text: string;
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

export function shouldSkipConsoleHistoryEntry(value: string): boolean {
    const text = String(value || '').trimStart();
    return !!text && text.startsWith('/');
}

export function shouldPreserveConsoleDraftFromHistory(value: string): boolean {
    return shouldSkipConsoleHistoryEntry(value);
}

export function isConsolePlaceholderActive(value: string, placeholder?: string): boolean {
    return !String(value || '') && !!String(placeholder || '');
}

export function resolveConsolePlaceholderDisplayValue(
    value: string,
    placeholder?: string,
    focused = false
): string {
    const text = String(value || '');
    if (text) {
        return text;
    }
    const placeholderText = String(placeholder || '');
    if (!placeholderText) {
        return '';
    }
    return focused ? ` ${placeholderText}` : placeholderText;
}

export function shouldSubmitConsoleTextChunk(chunk: ConsoleTextChunk): boolean {
    const text = decodeConsoleTextChunk(chunk);
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
    if (state.text && rawKey === state.text) {
        return true;
    }
    if (state.text && rawKey === 'text') {
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

export function resolveConsoleOptionLabelColumnWidth(
    options: Array<{ label?: string }>,
    startIndex = 0
): number {
    return options.reduce((width, option, index) => Math.max(
        width,
        getDisplayWidth(formatConsoleIndexedOptionLabel(startIndex + index, String(option?.label || ''), false))
    ), 0);
}

export function formatConsoleSelectOptionTableRow(
    index: number,
    label: string,
    selected = false,
    description = '',
    labelColumnWidth = 0,
    descriptionMaxWidth = 32
): string {
    const left = formatConsoleIndexedOptionLabel(index, label, selected);
    const rawRight = String(description || '').replace(/\s+/g, ' ').trim();
    const right = descriptionMaxWidth > 0 ? fitByDisplayWidth(rawRight, descriptionMaxWidth) : rawRight;
    if (!right) {
        return left;
    }
    const padding = ' '.repeat(Math.max(0, labelColumnWidth - getDisplayWidth(left)));
    return `${left}${padding}  ${right}`;
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

export function normalizeConsoleClipboardText(tagName: string | undefined, text: string): string {
    const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return String(tagName || '').toLowerCase() === 'textarea'
        ? normalized
        : normalized.replace(/\n+/g, ' ');
}

export function resolveConsoleClipboardSelection(
    value: string,
    selectionStart: number,
    selectionEnd: number
): ConsoleClipboardSelection {
    const text = String(value || '');
    const start = clampConsoleTextCursor(text, Math.min(selectionStart, selectionEnd));
    const end = clampConsoleTextCursor(text, Math.max(selectionStart, selectionEnd));
    return {
        start,
        end,
        text: text.slice(start, end)
    };
}

export function applyConsoleClipboardPaste(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    clipboardText: string,
    tagName?: string
): ConsoleTextInputState {
    const text = String(value || '');
    const selection = resolveConsoleClipboardSelection(text, selectionStart, selectionEnd);
    const insertText = normalizeConsoleClipboardText(tagName, clipboardText);
    const nextValue = `${text.slice(0, selection.start)}${insertText}${text.slice(selection.end)}`;
    return {
        value: nextValue,
        cursor: selection.start + insertText.length
    };
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

interface ConsoleEscapeConsumption {
    value: string;
    cursor: number;
    nextIndex: number;
}

// Sequences must be stepped over atomically: applying escape bytes one
// character at a time drops the leading ESC and leaks the remaining bytes
// (`[A`) into the editor as literal text.
function consumeConsoleEscapeSequence(
    value: string,
    cursor: number,
    text: string,
    index: number
): ConsoleEscapeConsumption | undefined {
    if (text[index] !== '\u001b') {
        return undefined;
    }
    const marker = text[index + 1];
    if (marker === '[') {
        const final = text[index + 2];
        if (final === 'D') {
            return { value, cursor: Math.max(0, cursor - 1), nextIndex: index + 3 };
        }
        if (final === 'C') {
            return { value, cursor: Math.min(value.length, cursor + 1), nextIndex: index + 3 };
        }
        if (final === 'H') {
            return { value, cursor: 0, nextIndex: index + 3 };
        }
        if (final === 'F') {
            return { value, cursor: value.length, nextIndex: index + 3 };
        }
        if (final === '3' && text[index + 3] === '~') {
            const nextValue = cursor < value.length
                ? `${value.slice(0, cursor)}${value.slice(cursor + 1)}`
                : value;
            return { value: nextValue, cursor, nextIndex: index + 4 };
        }
        let seqEnd = index + 2;
        while (seqEnd < text.length) {
            const code = text.charCodeAt(seqEnd);
            if (code >= 0x40 && code <= 0x7e) {
                break;
            }
            seqEnd += 1;
        }
        const nextIndex = seqEnd < text.length ? seqEnd + 1 : text.length;
        return { value, cursor, nextIndex };
    }
    if (marker === 'O') {
        return { value, cursor, nextIndex: Math.min(text.length, index + 3) };
    }
    return { value, cursor, nextIndex: index + 1 };
}

export function processConsoleTextInputChunk(
    value: string,
    cursor: number,
    chunk: ConsoleTextChunk,
    options: ConsoleTextInputChunkOptions = {}
): ConsoleTextInputChunkResult {
    const text = decodeConsoleTextChunk(chunk);
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
    for (let index = 0; index < text.length;) {
        const escape = consumeConsoleEscapeSequence(nextValue, nextCursor, text, index);
        if (escape) {
            nextValue = escape.value;
            nextCursor = escape.cursor;
            index = escape.nextIndex;
            continue;
        }
        const char = text[index];
        if (char === '\r' || char === '\n') {
            if (submitOnEnter && enterAction === 'submit') {
                shouldSubmit = true;
                index += 1;
                continue;
            }
            if (submitOnEnter && enterAction === 'confirm-selection') {
                shouldConfirmSelection = true;
                index += 1;
                continue;
            }
            nextValue = `${nextValue.slice(0, nextCursor)}\n${nextValue.slice(nextCursor)}`;
            nextCursor += 1;
            index += 1;
            continue;
        }
        const next = applyConsoleTextInputChunk(nextValue, nextCursor, char);
        nextValue = next.value;
        nextCursor = next.cursor;
        index += 1;
    }
    return {
        value: nextValue,
        cursor: nextCursor,
        shouldSubmit,
        shouldConfirmSelection
    };
}

export function applyConsoleTextInputChunk(value: string, cursor: number, chunk: ConsoleTextChunk): ConsoleTextInputState {
    const text = decodeConsoleTextChunk(chunk);
    if (!text) {
        return { value: String(value || ''), cursor: clampConsoleTextCursor(value, cursor) };
    }
    let nextValue = String(value || '');
    let nextCursor = clampConsoleTextCursor(nextValue, cursor);
    for (let index = 0; index < text.length;) {
        const escape = consumeConsoleEscapeSequence(nextValue, nextCursor, text, index);
        if (escape) {
            nextValue = escape.value;
            nextCursor = escape.cursor;
            index = escape.nextIndex;
            continue;
        }
        const char = text[index];
        if (char === '\t') {
            index += 1;
            continue;
        }
        if (char === '\u007f' || char === '\b') {
            if (nextCursor > 0) {
                nextValue = `${nextValue.slice(0, nextCursor - 1)}${nextValue.slice(nextCursor)}`;
                nextCursor -= 1;
            }
            index += 1;
            continue;
        }
        if (char < ' ') {
            index += 1;
            continue;
        }
        nextValue = `${nextValue.slice(0, nextCursor)}${char}${nextValue.slice(nextCursor)}`;
        nextCursor += char.length;
        index += 1;
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
    if (typeof element.setAttribute === 'function') {
        element.setAttribute('value', value);
        element.setAttribute('cursorPos', String(cursor));
        if (state.focused !== undefined) {
            element.setAttribute('focused', state.focused ? 'true' : 'false');
        }
    }
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
