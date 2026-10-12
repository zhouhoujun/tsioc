export interface CommonSelectWindow {
    start: number;
    count: number;
}

export type CommonEnterAction = 'submit' | 'newline' | 'confirm-selection';

export interface CommonTextInputChunkOptions {
    submitOnEnter?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    hasSelectMenu?: boolean;
}

export interface CommonTextInputChunkResult {
    value: string;
    cursor: number;
    shouldSubmit: boolean;
    shouldConfirmSelection: boolean;
}

export function clampCommonSelectIndex(length: number, selectedIndex: number): number {
    if (!Number.isFinite(length) || length <= 0) return 0;
    const index = Number.isFinite(selectedIndex) ? selectedIndex : 0;
    return Math.max(0, Math.min(length - 1, index));
}

export function resolveCommonSelectWindow(length: number, selectedIndex: number, visibleCount: number): CommonSelectWindow {
    const count = Number.isFinite(visibleCount) && visibleCount > 0 ? Math.floor(visibleCount) : 0;
    if (!Number.isFinite(length) || length <= 0 || count <= 0) return { start: 0, count: 0 };
    const selected = clampCommonSelectIndex(length, selectedIndex);
    if (length <= count) return { start: 0, count: length };
    return {
        start: Math.max(0, Math.min(length - count, selected - Math.floor(count / 2))),
        count
    };
}

export const resolveCommonListWindow = resolveCommonSelectWindow;

export function formatCommonIndexedOptionLabel(index: number, label: string, selected = false): string {
    return `${selected ? '›' : ' '} ${index + 1}. ${label}`;
}

export function clampCommonTextCursor(value: string, cursor: number): number {
    const text = String(value || '');
    const index = Number.isFinite(cursor) ? cursor : text.length;
    return Math.max(0, Math.min(text.length, index));
}

export function shouldSkipCommonHistoryEntry(value: string): boolean {
    const text = String(value || '').trimStart();
    return !!text && text.startsWith('/');
}

/**
 * Decide whether a raw input chunk should trigger submit on Enter.
 *
 * A plain Enter (`\r` / `\n`) submits. Any chunk that carries embedded
 * newlines (for example a multi-line paste) must NOT submit, otherwise the
 * newlines would be dropped and the lines concatenated. The console renderer
 * has an equivalent helper for its own input pipeline.
 */
export function shouldSubmitCommonTextInputChunk(chunk: Uint8Array | string): boolean {
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

export function processCommonTextInputChunk(
    value: string,
    cursor: number,
    chunk: Uint8Array | string,
    options: CommonTextInputChunkOptions = {}
): CommonTextInputChunkResult {
    const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
    let nextValue = String(value || '');
    let nextCursor = clampCommonTextCursor(nextValue, cursor);
    let shouldSubmit = false;
    let shouldConfirmSelection = false;
    const enterAction = resolveCommonEnterAction({
        ctrlKey: options.ctrlKey,
        altKey: options.altKey || text === '\u001b\r' || text === '\u001b\n',
        hasSelectMenu: options.hasSelectMenu
    });
    for (let index = 0; index < text.length;) {
        const escape = consumeCommonEscapeSequence(nextValue, nextCursor, text, index);
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
    return { value: nextValue, cursor: nextCursor, shouldSubmit, shouldConfirmSelection };
}

interface CommonEscapeConsumption {
    value: string;
    cursor: number;
    nextIndex: number;
}

function consumeCommonEscapeSequence(
    value: string,
    cursor: number,
    text: string,
    index: number
): CommonEscapeConsumption | undefined {
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
            const nextValue = cursor < value.length
                ? `${value.slice(0, cursor)}${value.slice(cursor + 1)}`
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

export function resolveCommonEnterAction(options: { ctrlKey?: boolean; altKey?: boolean; hasSelectMenu?: boolean } = {}): CommonEnterAction {
    if (options.ctrlKey || options.altKey) return 'newline';
    return options.hasSelectMenu ? 'confirm-selection' : 'submit';
}

export function buildCommonBrandBlock(width: number, appTitle = 'TSDI Agent', model = '', workspace = '', version = ''): string[] {
    const title = version ? `${appTitle.toUpperCase()} v${version}` : appTitle.toUpperCase();
    const meta = [String(model || '').trim(), String(workspace || '').trim()].filter(Boolean).join(' · ');
    const innerWidth = Math.max(8, Math.min(Math.max(8, Math.floor(width) - 2), Math.max(title.length, meta.length, 8)));
    const fit = (value: string, centered = false): string => {
        const clipped = value.slice(0, innerWidth);
        const remaining = Math.max(0, innerWidth - clipped.length);
        const left = centered ? Math.floor(remaining / 2) : 0;
        return `│${' '.repeat(left)}${clipped}${' '.repeat(remaining - left)}│`;
    };
    return [`╭${'─'.repeat(innerWidth)}╮`, fit(title, true), fit(meta), `╰${'─'.repeat(innerWidth)}╯`];
}
