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
    for (let index = 0; index < text.length; index += 1) {
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
            continue;
        }
        if (char === '\t') continue;
        if (char === '\u007f' || char === '\b') {
            if (nextCursor > 0) {
                nextValue = `${nextValue.slice(0, nextCursor - 1)}${nextValue.slice(nextCursor)}`;
                nextCursor -= 1;
            }
            continue;
        }
        if (char === '\u001b') {
            const sequence3 = text.slice(index, index + 3);
            const sequence4 = text.slice(index, index + 4);
            if (sequence3 === '\u001b[D') nextCursor = Math.max(0, nextCursor - 1);
            else if (sequence3 === '\u001b[C') nextCursor = Math.min(nextValue.length, nextCursor + 1);
            else if (sequence3 === '\u001b[H') nextCursor = 0;
            else if (sequence3 === '\u001b[F') nextCursor = nextValue.length;
            else if (sequence4 === '\u001b[3~') {
                if (nextCursor < nextValue.length) {
                    nextValue = `${nextValue.slice(0, nextCursor)}${nextValue.slice(nextCursor + 1)}`;
                }
                index += 3;
                continue;
            } else {
                continue;
            }
            index += 2;
            continue;
        }
        if (char < ' ') continue;
        nextValue = `${nextValue.slice(0, nextCursor)}${char}${nextValue.slice(nextCursor)}`;
        nextCursor += char.length;
    }
    return { value: nextValue, cursor: nextCursor, shouldSubmit, shouldConfirmSelection };
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
