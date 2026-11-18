import { clampTextCursor, nextGraphemeIndex, previousGraphemeIndex, previousWordStart } from './text';

export type EnterAction = 'submit' | 'newline' | 'confirm-selection';

export interface TextInputChunkOptions {
    submitOnEnter?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    hasSelectMenu?: boolean;
}

export interface TextInputChunkResult {
    value: string;
    cursor: number;
    shouldSubmit: boolean;
    shouldConfirmSelection: boolean;
}

/**
 * Decide whether a raw input chunk should trigger submit on Enter.
 *
 * A plain Enter (`\r` / `\n`) submits. Any chunk that carries embedded
 * newlines (for example a multi-line paste) must NOT submit, otherwise the
 * newlines would be dropped and the lines concatenated. The console renderer
 * has an equivalent helper for its own input pipeline.
 */
export function shouldSubmitTextInputChunk(chunk: Uint8Array | string): boolean {
    const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
    if (!text || text === '\u001b\r' || text === '\u001b\n') {
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

export function processTextInputChunk(
    value: string,
    cursor: number,
    chunk: Uint8Array | string,
    options: TextInputChunkOptions = {}
): TextInputChunkResult {
    const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
    let nextValue = String(value || '');
    let nextCursor = clampTextCursor(nextValue, cursor);
    let shouldSubmit = false;
    let shouldConfirmSelection = false;
    const enterAction = resolveEnterAction({
        ctrlKey: options.ctrlKey,
        altKey: options.altKey || text === '\u001b\r' || text === '\u001b\n',
        hasSelectMenu: options.hasSelectMenu
    });
    for (let index = 0; index < text.length;) {
        if (text.startsWith('\u001b\u007f', index) || text.startsWith('\u001b\b', index)) {
            const start = previousWordStart(nextValue, nextCursor);
            nextValue = `${nextValue.slice(0, start)}${nextValue.slice(nextCursor)}`;
            nextCursor = start;
            index += 2;
            continue;
        }
        const escape = consumeEscapeSequence(nextValue, nextCursor, text, index);
        if (escape) {
            nextValue = escape.value;
            nextCursor = escape.cursor;
            index = escape.nextIndex;
            continue;
        }
        const char = text[index];
        if (char === '\r' || char === '\n') {
            if (options.submitOnEnter !== false && enterAction === 'submit') {
                shouldSubmit = true;
            } else if (options.submitOnEnter !== false && enterAction === 'confirm-selection') {
                shouldConfirmSelection = true;
            } else {
                nextValue = `${nextValue.slice(0, nextCursor)}\n${nextValue.slice(nextCursor)}`;
                nextCursor += 1;
            }
            index += 1;
            continue;
        }
        if (char === '\t') {
            index += 1;
            continue;
        }
        if (char === '\u007f' || char === '\b') {
            const start = previousGraphemeIndex(nextValue, nextCursor);
            if (start < nextCursor) {
                nextValue = `${nextValue.slice(0, start)}${nextValue.slice(nextCursor)}`;
                nextCursor = start;
            }
            index += 1;
            continue;
        }
        // Emacs-style composer editing (TUI terminals send these as raw C0).
        if (char === '\u0001') { nextCursor = 0; index += 1; continue; }
        if (char === '\u0005') { nextCursor = nextValue.length; index += 1; continue; }
        if (char === '\u000b') { nextValue = nextValue.slice(0, nextCursor); index += 1; continue; }
        if (char === '\u0015') { nextValue = nextValue.slice(nextCursor); nextCursor = 0; index += 1; continue; }
        if (char === '\u0017') {
            const start = previousWordStart(nextValue, nextCursor);
            nextValue = `${nextValue.slice(0, start)}${nextValue.slice(nextCursor)}`;
            nextCursor = start;
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
    return { value: nextValue, cursor: nextCursor, shouldSubmit, shouldConfirmSelection };
}

interface EscapeConsumption {
    value: string;
    cursor: number;
    nextIndex: number;
}

function consumeEscapeSequence(
    value: string,
    cursor: number,
    text: string,
    index: number
): EscapeConsumption | undefined {
    if (text[index] !== '\u001b') {
        return undefined;
    }
    const marker = text[index + 1];
    if (marker === '[') {
        const final = text[index + 2];
        if (final === 'D') return { value, cursor: Math.max(0, cursor - 1), nextIndex: index + 3 };
        if (final === 'C') return { value, cursor: Math.min(value.length, cursor + 1), nextIndex: index + 3 };
        if (final === 'H') return { value, cursor: 0, nextIndex: index + 3 };
        if (final === 'F') return { value, cursor: value.length, nextIndex: index + 3 };
        if (final === '3' && text[index + 3] === '~') {
            const end = nextGraphemeIndex(value, cursor);
            const nextValue = end > cursor
                ? `${value.slice(0, cursor)}${value.slice(end)}`
                : value;
            return { value: nextValue, cursor, nextIndex: index + 4 };
        }
        let seqEnd = index + 2;
        while (seqEnd < text.length) {
            const code = text.charCodeAt(seqEnd);
            if (code >= 0x40 && code <= 0x7e) break;
            seqEnd += 1;
        }
        return { value, cursor, nextIndex: seqEnd < text.length ? seqEnd + 1 : text.length };
    }
    if (marker === 'O') {
        return { value, cursor, nextIndex: Math.min(text.length, index + 3) };
    }
    return { value, cursor, nextIndex: index + 1 };
}

export function resolveEnterAction(options: { ctrlKey?: boolean; altKey?: boolean; hasSelectMenu?: boolean } = {}): EnterAction {
    if (options.ctrlKey || options.altKey) return 'newline';
    return options.hasSelectMenu ? 'confirm-selection' : 'submit';
}
