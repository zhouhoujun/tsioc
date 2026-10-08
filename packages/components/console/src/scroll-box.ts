export type ScrollBoxStickyStart = 'top' | 'bottom';

export interface ScrollBoxOptions {
    stickyScroll?: boolean;
    stickyStart?: ScrollBoxStickyStart;
    wheelStep?: number;
}

export interface ScrollBoxVisibleRange {
    start: number;
    count: number;
}

export const SCROLL_BOX_DEFAULT_WHEEL_STEP = 3;

function normalizeRows(value: number): number {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export class ScrollBox {
    private topRow = 0;
    private contentRows = 0;
    private viewportRows = 0;
    private sticky = false;
    private stickyAnchor?: ScrollBoxStickyStart;
    private manual = false;
    private newItems = 0;
    private readonly wheelStep: number;

    constructor(options: ScrollBoxOptions = {}) {
        this.sticky = options.stickyScroll === true;
        this.stickyAnchor = options.stickyStart;
        this.wheelStep = normalizeRows(options.wheelStep ?? SCROLL_BOX_DEFAULT_WHEEL_STEP) || SCROLL_BOX_DEFAULT_WHEEL_STEP;
    }

    get top(): number {
        return this.topRow;
    }

    get contentHeight(): number {
        return this.contentRows;
    }

    get viewportHeight(): number {
        return this.viewportRows;
    }

    get maxTop(): number {
        return Math.max(0, this.contentRows - this.viewportRows);
    }

    get atTop(): boolean {
        return this.topRow <= 0;
    }

    get atBottom(): boolean {
        return this.topRow >= this.maxTop;
    }

    get following(): boolean {
        return this.sticky && this.stickyAnchor === 'bottom' && !this.manual && this.atBottom;
    }

    get manualScroll(): boolean {
        return this.manual;
    }

    get newItemCount(): number {
        return this.newItems;
    }

    get stickyScroll(): boolean {
        return this.sticky;
    }

    get stickyStart(): ScrollBoxStickyStart | undefined {
        return this.stickyAnchor;
    }

    setSticky(enabled: boolean, start?: ScrollBoxStickyStart): void {
        this.sticky = enabled;
        this.stickyAnchor = start;
        this.applySticky(true);
    }

    setViewportHeight(rows: number): void {
        this.viewportRows = normalizeRows(rows);
        this.clampAndSettle();
    }

    setContentHeight(rows: number): void {
        this.contentRows = normalizeRows(rows);
        this.clampAndSettle();
    }

    setMetrics(contentRows: number, viewportRows: number): void {
        this.contentRows = normalizeRows(contentRows);
        this.viewportRows = normalizeRows(viewportRows);
        this.clampAndSettle();
    }

    scrollBy(deltaRows: number): boolean {
        const delta = Number.isFinite(deltaRows) ? Math.trunc(deltaRows) : 0;
        const next = Math.max(0, Math.min(this.maxTop, this.topRow + delta));
        if (next === this.topRow) {
            this.settleManualState();
            return false;
        }
        this.topRow = next;
        this.settleManualState();
        return true;
    }

    wheel(direction: 'up' | 'down'): boolean {
        return this.scrollBy(direction === 'up' ? -this.wheelStep : this.wheelStep);
    }

    scrollTo(top: number): boolean {
        const next = Math.max(0, Math.min(this.maxTop, Math.trunc(Number.isFinite(top) ? top : 0)));
        if (next === this.topRow) {
            this.settleManualState();
            return false;
        }
        this.topRow = next;
        this.settleManualState();
        return true;
    }

    scrollToEdge(edge: 'start' | 'end'): boolean {
        return this.scrollTo(edge === 'start' ? 0 : this.maxTop);
    }

    handleKey(key: 'up' | 'down' | 'pageup' | 'pagedown' | 'home' | 'end'): boolean {
        switch (key) {
            case 'up':
                return this.scrollBy(-this.step(5));
            case 'down':
                return this.scrollBy(this.step(5));
            case 'pageup':
                return this.scrollBy(-this.step(2));
            case 'pagedown':
                return this.scrollBy(this.step(2));
            case 'home':
                return this.scrollToEdge('start');
            case 'end':
                return this.scrollToEdge('end');
            default:
                return false;
        }
    }

    scrollChildIntoView(childTop: number, childHeight: number): boolean {
        const height = normalizeRows(childHeight);
        const start = Math.trunc(Number.isFinite(childTop) ? childTop : 0);
        if (height <= 0 || height >= this.viewportRows) {
            return false;
        }
        if (start < this.topRow) {
            return this.scrollTo(start);
        }
        const overflow = start + height - (this.topRow + this.viewportRows);
        return overflow > 0 ? this.scrollBy(overflow) : false;
    }

    noteNewItems(count = 1): number {
        const amount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
        if (!this.atBottom) {
            this.newItems += amount;
        }
        return this.newItems;
    }

    resumeFollow(): boolean {
        const wasManual = this.manual;
        this.manual = false;
        this.newItems = 0;
        const moved = this.applySticky(false);
        return moved || wasManual;
    }

    reset(): void {
        this.topRow = 0;
        this.contentRows = 0;
        this.viewportRows = 0;
        this.manual = false;
        this.newItems = 0;
    }

    resolveVisibleRange(): ScrollBoxVisibleRange {
        if (this.viewportRows <= 0 || this.topRow >= this.contentRows) {
            return { start: this.topRow, count: 0 };
        }
        return { start: this.topRow, count: Math.min(this.viewportRows, this.contentRows - this.topRow) };
    }

    isRowVisible(row: number): boolean {
        const range = this.resolveVisibleRange();
        return row >= range.start && row < range.start + range.count;
    }

    private step(divisor: number): number {
        return Math.max(1, Math.floor(this.viewportRows / divisor));
    }

    private clampAndSettle(): void {
        this.topRow = Math.max(0, Math.min(this.maxTop, this.topRow));
        if (this.sticky && !this.manual) {
            this.applySticky(false);
        }
        this.settleManualState();
    }

    private applySticky(resetManual: boolean): boolean {
        if (!this.sticky || !this.stickyAnchor) {
            return false;
        }
        if (resetManual) {
            this.manual = false;
        }
        if (this.manual) {
            return false;
        }
        const target = this.stickyAnchor === 'bottom' ? this.maxTop : 0;
        if (target === this.topRow) {
            return false;
        }
        this.topRow = target;
        return true;
    }

    private settleManualState(): void {
        if (this.atBottom) {
            this.newItems = 0;
            if (this.sticky) {
                this.manual = false;
            }
            return;
        }
        if (this.sticky && this.stickyAnchor === 'bottom') {
            this.manual = true;
        }
    }
}
