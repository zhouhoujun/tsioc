const ANSI_SGR_SEQUENCE = /^\x1b\[[0-9;]*m/;

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
            (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
            (codePoint >= 0x20000 && codePoint <= 0x3fffd)
        )
    );
}

function matchAnsiSequence(value: string, index: number): string | null {
    if (value.charCodeAt(index) !== 0x1b) {
        return null;
    }
    const match = value.slice(index).match(ANSI_SGR_SEQUENCE);
    return match?.[0] ?? null;
}

export function getDisplayWidth(value: string): number {
    let width = 0;
    for (let index = 0; index < value.length;) {
        const ansi = matchAnsiSequence(value, index);
        if (ansi) {
            index += ansi.length;
            continue;
        }

        const codePoint = value.codePointAt(index);
        if (codePoint == null) {
            index += 1;
            continue;
        }
        if (
            codePoint === 0 ||
            codePoint === 0x200b ||
            codePoint === 0x200c ||
            codePoint === 0x200d ||
            (codePoint >= 0x0300 && codePoint <= 0x036f) ||
            (codePoint >= 0xfe00 && codePoint <= 0xfe0f)
        ) {
            index += codePoint > 0xffff ? 2 : 1;
            continue;
        }

        width += isWideCodePoint(codePoint) ? 2 : 1;
        index += codePoint > 0xffff ? 2 : 1;
    }
    return width;
}

export function sliceByDisplayWidth(value: string, width: number): string {
    if (width <= 0 || !value) {
        return '';
    }
    let used = 0;
    let result = '';
    let hasAnsi = false;
    let styleOpen = false;
    for (let index = 0; index < value.length;) {
        const ansi = matchAnsiSequence(value, index);
        if (ansi) {
            hasAnsi = true;
            styleOpen = ansi !== '\x1b[0m';
            result += ansi;
            index += ansi.length;
            continue;
        }

        const codePoint = value.codePointAt(index);
        if (codePoint == null) {
            index += 1;
            continue;
        }
        const char = String.fromCodePoint(codePoint);
        const charWidth = getDisplayWidth(char);
        if (used + charWidth > width) {
            break;
        }
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
    const visibleWidth = getDisplayWidth(value);
    if (visibleWidth >= width) {
        return sliceByDisplayWidth(value, width);
    }
    return `${value}${' '.repeat(width - visibleWidth)}`;
}

export function fitByDisplayWidth(value: string, width: number): string {
    const visibleWidth = getDisplayWidth(value);
    if (visibleWidth <= width) {
        return value;
    }
    if (width <= 3) {
        return sliceByDisplayWidth(value, width);
    }
    return `${sliceByDisplayWidth(value, width - 3)}...`;
}
