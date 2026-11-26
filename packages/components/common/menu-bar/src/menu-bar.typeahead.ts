export interface MenuTypeaheadEntry {
    label: string;
    disabled?: boolean;
}

/**
 * Keyboard type-ahead buffer for menus.
 *
 * A single printable character starts/extends the query; repeating one
 * character cycles through entries starting with it. The buffer expires after
 * a short idle gap so a later unrelated key starts a fresh search.
 */
export class MenuTypeahead {
    private buffer = '';
    private at = 0;

    constructor(private readonly timeout = 700) { }

    push(key: string, now: number = Date.now()): string {
        const char = String(key ?? '');
        if (char.length !== 1 || /\s/.test(char)) {
            return this.buffer;
        }
        const lower = char.toLocaleLowerCase();
        if (now - this.at > this.timeout) {
            this.buffer = '';
        }
        // Repeating `r r r` cycles matches instead of searching for "rrr".
        this.buffer = this.buffer && [...this.buffer].every(entry => entry === lower)
            ? lower
            : `${this.buffer}${lower}`;
        this.at = now;
        return this.buffer;
    }

    reset(): void {
        this.buffer = '';
        this.at = 0;
    }
}

/**
 * Find the next enabled entry starting with `query`, searching from `start`
 * (exclusive) and wrapping. Returns -1 when no entry matches.
 */
export function menuTypeaheadIndex(
    entries: readonly MenuTypeaheadEntry[],
    query: string,
    start: number
): number {
    const needle = String(query ?? '').toLocaleLowerCase();
    if (!needle || !entries.length) {
        return -1;
    }
    for (let offset = 1; offset <= entries.length; offset++) {
        const index = ((start + offset) % entries.length + entries.length) % entries.length;
        const entry = entries[index];
        if (entry && !entry.disabled && String(entry.label ?? '').toLocaleLowerCase().startsWith(needle)) {
            return index;
        }
    }
    return -1;
}
