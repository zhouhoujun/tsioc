/**
 * ANSI SGR sequence scanner.
 *
 * The previous implementation called `value.slice(index).match(...)` for every
 * escape byte, which allocated a substring (and ran a regex) per sequence. This
 * scanner walks the same `ESC [ digits/semicolons m` grammar in place, so
 * measuring a styled line is allocation-free and linear.
 */
function ansiSequenceLength(value: string, index: number): number {
    if (value.charCodeAt(index) !== 0x1b || value.charCodeAt(index + 1) !== 0x5b) {
        return 0;
    }
    let cursor = index + 2;
    while (cursor < value.length) {
        const code = value.charCodeAt(cursor);
        if (code === 0x6d) {
            return cursor + 1 - index;
        }
        // [0-9;] only, matching the previous /^\x1b\[[0-9;]*m/ contract.
        if (code >= 0x30 && code <= 0x3b) {
            cursor += 1;
            continue;
        }
        return 0;
    }
    return 0;
}

/**
 * Display width of one code point: 0 for zero-width/combining glyphs, 2 for
 * full-width (CJK, emoji), 1 otherwise. Kept separate from `getDisplayWidth`
 * so slice/pad loops never re-measure a single character through the full
 * string scanner.
 */
export function codePointDisplayWidth(codePoint: number): number {
    if (
        codePoint === 0 ||
        codePoint === 0x200b ||
        codePoint === 0x200c ||
        codePoint === 0x200d ||
        (codePoint >= 0x0300 && codePoint <= 0x036f) ||
        (codePoint >= 0xfe00 && codePoint <= 0xfe0f)
    ) {
        return 0;
    }
    return isWideCodePoint(codePoint) ? 2 : 1;
}

/**
 * Full-width / wide code points occupy two display columns (CJK, emoji, etc.).
 * Renderer-neutral width primitives shared by agent-ui and console layouts.
 */
export function isWideCodePoint(codePoint: number): boolean {
    return (
        codePoint >= 0x1100 && (
            codePoint <= 0x115f ||
            codePoint === 0x2329 ||
            codePoint === 0x232a ||
            (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
            (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
            (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
            (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
            (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
            (codePoint >= 0xff00 && codePoint <= 0xff60) ||
            (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
            (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
            (codePoint >= 0x1f680 && codePoint <= 0x1f6ff) ||
            (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
            (codePoint >= 0x20000 && codePoint <= 0x3fffd)
        )
    );
}

export function getDisplayWidth(value: string): number {
    const text = String(value ?? '');
    let width = 0;
    for (let index = 0; index < text.length;) {
        const ansi = ansiSequenceLength(text, index);
        if (ansi) {
            index += ansi;
            continue;
        }

        const codePoint = text.codePointAt(index);
        if (codePoint == null) {
            index += 1;
            continue;
        }

        width += codePointDisplayWidth(codePoint);
        index += codePoint > 0xffff ? 2 : 1;
    }
    return width;
}

/**
 * Slices to the longest prefix whose display width does not exceed `width`.
 * ANSI SGR sequences are preserved and, if truncated mid-style, reset.
 */
export function sliceByDisplayWidth(value: string, width: number): string {
    if (width <= 0 || !value) {
        return '';
    }
    const text = String(value);
    let used = 0;
    let result = '';
    let hasAnsi = false;
    let styleOpen = false;
    for (let index = 0; index < text.length;) {
        const ansi = ansiSequenceLength(text, index);
        if (ansi) {
            const sequence = text.slice(index, index + ansi);
            hasAnsi = true;
            styleOpen = sequence !== '\x1b[0m';
            result += sequence;
            index += ansi;
            continue;
        }

        const codePoint = text.codePointAt(index);
        if (codePoint == null) {
            index += 1;
            continue;
        }
        const charWidth = codePointDisplayWidth(codePoint);
        if (used + charWidth > width) {
            break;
        }
        const char = String.fromCodePoint(codePoint);
        result += char;
        used += charWidth;
        index += char.length;
    }
    if (hasAnsi && styleOpen && !result.endsWith('\x1b[0m')) {
        result += '\x1b[0m';
    }
    return result;
}

export function padByDisplayWidth(value: string, width: number): string {
    const text = String(value ?? '');
    const visibleWidth = getDisplayWidth(text);
    if (visibleWidth >= width) {
        return sliceByDisplayWidth(text, width);
    }
    return `${text}${' '.repeat(width - visibleWidth)}`;
}

export function fitByDisplayWidth(value: string, width: number): string {
    const text = String(value ?? '');
    const visibleWidth = getDisplayWidth(text);
    if (visibleWidth <= width) {
        return text;
    }
    if (width <= 3) {
        return sliceByDisplayWidth(text, width);
    }
    return `${sliceByDisplayWidth(text, width - 3)}...`;
}
