export interface SelectWindow {
    start: number;
    count: number;
}

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

export function clampSelectIndex(length: number, selectedIndex: number): number {
    if (!Number.isFinite(length) || length <= 0) return 0;
    const index = Number.isFinite(selectedIndex) ? selectedIndex : 0;
    return Math.max(0, Math.min(length - 1, index));
}

export function resolveSelectWindow(length: number, selectedIndex: number, visibleCount: number): SelectWindow {
    const count = Number.isFinite(visibleCount) && visibleCount > 0 ? Math.floor(visibleCount) : 0;
    if (!Number.isFinite(length) || length <= 0 || count <= 0) return { start: 0, count: 0 };
    const selected = clampSelectIndex(length, selectedIndex);
    if (length <= count) return { start: 0, count: length };
    return {
        start: Math.max(0, Math.min(length - count, selected - Math.floor(count / 2))),
        count
    };
}

export const resolveListWindow = resolveSelectWindow;

export function formatIndexedOptionLabel(index: number, label: string, selected = false): string {
    return `${selected ? '›' : ' '} ${index + 1}. ${label}`;
}

export function clampTextCursor(value: string, cursor: number): number {
    const text = String(value || '');
    const index = Number.isFinite(cursor) ? cursor : text.length;
    return Math.max(0, Math.min(text.length, index));
}

/** Index before the grapheme ending at `cursor` (surrogate/emoji safe). */
export function previousGraphemeIndex(value: string, cursor: number): number {
    const text = String(value || '');
    const index = clampTextCursor(text, cursor);
    if (index <= 0) {
        return 0;
    }
    const Segmenter = (Intl as any).Segmenter;
    if (typeof Segmenter === 'function') {
        let start = 0;
        for (const part of new Segmenter(undefined, { granularity: 'grapheme' }).segment(text.slice(0, index))) {
            start = part.index;
        }
        return start;
    }
    const code = text.codePointAt(index - 1);
    return code != null && code > 0xffff ? index - 2 : index - 1;
}

/** Index after the grapheme starting at `cursor` (surrogate/emoji safe). */
export function nextGraphemeIndex(value: string, cursor: number): number {
    const text = String(value || '');
    const index = clampTextCursor(text, cursor);
    if (index >= text.length) {
        return text.length;
    }
    const Segmenter = (Intl as any).Segmenter;
    if (typeof Segmenter === 'function') {
        for (const part of new Segmenter(undefined, { granularity: 'grapheme' }).segment(text.slice(index))) {
            return index + part.segment.length;
        }
        return text.length;
    }
    const code = text.codePointAt(index);
    return code != null && code > 0xffff ? index + 2 : index + 1;
}

/** Start of the word before `cursor` (skips trailing whitespace first). */
export function previousWordStart(value: string, cursor: number): number {
    const text = String(value || '');
    let index = clampTextCursor(text, cursor);
    while (index > 0 && /\s/.test(text[index - 1])) {
        index -= 1;
    }
    while (index > 0 && !/\s/.test(text[index - 1])) {
        index -= 1;
    }
    return index;
}

/** End of the word after `cursor` (skips leading whitespace first). */
export function nextWordEnd(value: string, cursor: number): number {
    const text = String(value || '');
    let index = clampTextCursor(text, cursor);
    while (index < text.length && /\s/.test(text[index])) {
        index += 1;
    }
    while (index < text.length && !/\s/.test(text[index])) {
        index += 1;
    }
    return index;
}

export function shouldSkipHistoryEntry(value: string): boolean {
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

export function buildBrandBlock(width: number, appTitle = 'TSDI Agent', model = '', workspace = '', version = ''): string[] {
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
/** Split `/command args` into stable command and argument parts. */
export function parseSlashCommandLine(input: string): { raw: string; command: string; args: string } {
    const raw = String(input || '').trim();
    if (!raw.startsWith('/')) {
        return { raw, command: raw, args: '' };
    }
    const firstSpace = raw.indexOf(' ');
    if (firstSpace < 0) {
        return { raw, command: raw, args: '' };
    }
    return {
        raw,
        command: raw.slice(0, firstSpace),
        args: raw.slice(firstSpace + 1).trim()
    };
}
