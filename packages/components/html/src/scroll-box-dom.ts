import { ScrollBox, ScrollBoxOptions } from '@tsdi/components/common';

/** Minimal scrollable-element shape (satisfied by HTMLElement and by test doubles). */
export interface ScrollableElementLike {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
}

/**
 * DOM counterpart of the console transcript scroll model. The browser owns the
 * native scroll position (scrollbar drag, native scroll), so this adapter keeps
 * the renderer-neutral {@link ScrollBox} as the source of truth for bottom/follow
 * decisions and new-item bookkeeping, and mirrors positions to and from the
 * element. Units are element-local (pixels); ScrollBox is unit-agnostic.
 */
export class DomScrollBox {
    private readonly box: ScrollBox;

    constructor(private readonly element: ScrollableElementLike, options: ScrollBoxOptions = {}) {
        this.box = new ScrollBox({ ...options, stickyScroll: false });
        this.sync();
    }

    /** Reflect content metrics + the element's current scroll position into the model, then apply. */
    sync(): void {
        this.syncToElement();
        this.apply();
    }

    wheel(delta: number): boolean {
        this.syncToElement();
        const moved = this.box.scrollBy(delta);
        this.apply();
        return moved;
    }

    scrollToEdge(edge: 'start' | 'end'): boolean {
        this.syncToElement();
        const moved = this.box.scrollToEdge(edge);
        this.apply();
        return moved;
    }

    scrollToBottom(): void {
        this.syncToElement();
        this.box.scrollToEdge('end');
        this.apply();
    }

    /** Pinned to the latest content (i.e. at the bottom). */
    get following(): boolean {
        return this.box.atBottom;
    }

    get top(): number {
        return this.box.top;
    }

    get atBottom(): boolean {
        return this.box.atBottom;
    }

    get newItemCount(): number {
        return this.box.newItemCount;
    }

    noteNewItems(count = 1): number {
        return this.box.noteNewItems(count);
    }

    /** Alias for scrollToBottom, kept for callers that think in follow terms. */
    resumeFollow(): boolean {
        const wasAtBottom = this.box.atBottom;
        this.scrollToBottom();
        return wasAtBottom;
    }

    private syncToElement(): void {
        this.box.setMetrics(this.element.scrollHeight, this.element.clientHeight);
        this.box.scrollTo(this.element.scrollTop);
    }

    private apply(): void {
        this.element.scrollTop = this.box.top;
    }
}
