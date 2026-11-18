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
