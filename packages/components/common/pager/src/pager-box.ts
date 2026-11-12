import { ScrollBox, ScrollBoxOptions, ScrollBoxVisibleRange } from './scroll-box';

/** One find hit inside the pager content. */
export interface PagerMatch {
    /** 0-based content row. */
    row: number;
    /** 0-based column of the match within the row. */
    column: number;
    /** Match length in characters. */
    length: number;
}

export interface PagerSearchOptions {
    /** Case-sensitive matching (default false). */
    caseSensitive?: boolean;
}

export type PagerBoxOptions = ScrollBoxOptions;

/**
 * Renderer-neutral full-history pager: a searchable, scrollable window over a
 * flat list of already-rendered lines.
 *
 * It composes {@link ScrollBox} for row scrolling/visibility and adds find
 * matches + match navigation. Platform surfaces (TUI / DOM) own key + wheel
 * routing and line painting; this model owns the row window and find semantics,
 * so both platforms page identically. It carries no presentation or agent
 * business state — callers feed it lines and read back the visible window.
 */
export class PagerBox {
    private lines: string[] = [];
    private readonly scroll: ScrollBox;
    private currentQuery = '';
    private caseSensitive = false;
    private matches: PagerMatch[] = [];
    private currentIndex = -1;
    private active = false;
    constructor(options: PagerBoxOptions = {}) {
        this.scroll = new ScrollBox({ stickyScroll: false, ...options });
    }

    /** The pager occupies the screen (callers may render it full-height). */
    open(): void {
        this.active = true;
    }

    /** Leave the pager; content and scroll position are preserved for re-open. */
    close(): void {
        this.active = false;
        this.clearQuery();
    }

    get isOpen(): boolean {
        return this.active;
    }

    setContent(lines: readonly string[]): void {
        this.lines = Array.isArray(lines) ? lines.map(line => String(line ?? '')) : [];
        this.scroll.setContentHeight(this.lines.length);
        this.recomputeMatches();
        if (this.matches.length && this.currentIndex >= this.matches.length) {
            this.currentIndex = this.matches.length - 1;
        }
    }

    get contentLines(): readonly string[] {
        return this.lines;
    }

    get contentHeight(): number {
        return this.lines.length;
    }

    setViewportHeight(rows: number): void {
        this.scroll.setViewportHeight(rows);
    }

    get viewportHeight(): number {
        return this.scroll.viewportHeight;
    }

    get top(): number {
        return this.scroll.top;
    }

    get maxTop(): number {
        return this.scroll.maxTop;
    }

    get atTop(): boolean {
        return this.scroll.atTop;
    }

    get atBottom(): boolean {
        return this.scroll.atBottom;
    }

    scrollBy(deltaRows: number): boolean {
        return this.scroll.scrollBy(deltaRows);
    }

    scrollTo(row: number): boolean {
        return this.scroll.scrollTo(row);
    }

    scrollToEdge(edge: 'start' | 'end'): boolean {
        return this.scroll.scrollToEdge(edge);
    }

    handleKey(key: 'up' | 'down' | 'pageup' | 'pagedown' | 'home' | 'end'): boolean {
        return this.scroll.handleKey(key);
    }

    wheel(direction: 'up' | 'down'): boolean {
        return this.scroll.wheel(direction);
    }

    scrollMatchIntoView(row: number): boolean {
        return this.scroll.scrollChildIntoView(row, 1);
    }

    get query(): string {
        return this.currentQuery;
    }

    get matchCount(): number {
        return this.matches.length;
    }

    get currentMatchIndex(): number {
        return this.currentIndex;
    }

    get currentMatch(): PagerMatch | undefined {
        return this.currentIndex >= 0 ? this.matches[this.currentIndex] : undefined;
    }

    get allMatches(): readonly PagerMatch[] {
        return this.matches;
    }

    /** Matches on a single content row (for per-line highlighting). */
    matchesAtRow(row: number): PagerMatch[] {
        return this.matches.filter(match => match.row === row);
    }

    /**
     * Run a find; returns the match count. The first match (if any) becomes
     * current and is scrolled into view.
     */
    search(query: string, options: PagerSearchOptions = {}): number {
        this.currentQuery = String(query ?? '');
        if (options.caseSensitive !== undefined) {
            this.caseSensitive = options.caseSensitive === true;
        }
        this.recomputeMatches();
        this.currentIndex = this.matches.length ? 0 : -1;
        this.scrollToCurrentMatch();
        return this.matches.length;
    }

    clearQuery(): void {
        this.currentQuery = '';
        this.matches = [];
        this.currentIndex = -1;
    }

    nextMatch(): boolean {
        if (!this.matches.length) {
            return false;
        }
        this.currentIndex = (this.currentIndex + 1) % this.matches.length;
        this.scrollToCurrentMatch();
        return true;
    }

    prevMatch(): boolean {
        if (!this.matches.length) {
            return false;
        }
        this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
        this.scrollToCurrentMatch();
        return true;
    }

    visibleRange(): ScrollBoxVisibleRange {
        return this.scroll.resolveVisibleRange();
    }

    visibleLines(): string[] {
        const range = this.scroll.resolveVisibleRange();
        return this.lines.slice(range.start, range.start + range.count);
    }

    isRowVisible(row: number): boolean {
        return this.scroll.isRowVisible(row);
    }

    private scrollToCurrentMatch(): void {
        const match = this.currentMatch;
        if (match) {
            this.scroll.scrollChildIntoView(match.row, 1);
        }
    }

    private recomputeMatches(): void {
        if (!this.currentQuery) {
            this.matches = [];
            return;
        }
        const needle = this.caseSensitive ? this.currentQuery : this.currentQuery.toLowerCase();
        if (!needle.length) {
            this.matches = [];
            return;
        }
        const found: PagerMatch[] = [];
        this.lines.forEach((line, row) => {
            const haystack = this.caseSensitive ? line : line.toLowerCase();
            let from = 0;
            for (;;) {
                const column = haystack.indexOf(needle, from);
                if (column < 0) {
                    break;
                }
                found.push({ row, column, length: needle.length });
                from = column + Math.max(1, needle.length);
            }
        });
        this.matches = found;
    }
}
