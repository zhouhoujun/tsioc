import { ScrollBox, ScrollBoxOptions } from '@tsdi/components/common';

/** Minimal scrollable-element shape (satisfied by HTMLElement and by test doubles). */
export interface ScrollableElementLike {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
}

/**
 * DOM counterpart of the console transcript scroll model: binds the
 * renderer-neutral {@link ScrollBox} (the same one the TUI surface uses) to a
 * scrollable DOM element so wheel/sticky-follow/new-item semantics are identical
 * across platforms. Units are element-local (pixels); ScrollBox is unit-agnostic.
 */
export class DomScrollBox {
    private readonly box: ScrollBox;

    constructor(private readonly element: ScrollableElementLike, options: ScrollBoxOptions = {}) {
        this.box = new ScrollBox({ stickyScroll: true, stickyStart: 'bottom', ...options });
    }

    /** Re-read the element metrics and re-apply the model's scroll position. */
    sync(): void {
        this.box.setMetrics(this.element.scrollHeight, this.element.clientHeight);
        this.apply();
    }

    wheel(delta: number): boolean {
        this.sync();
        const moved = this.box.scrollBy(delta);
        this.apply();
        return moved;
    }

    scrollToEdge(edge: 'start' | 'end'): boolean {
        this.sync();
        const moved = this.box.scrollToEdge(edge);
        this.apply();
        return moved;
    }

    get top(): number {
        return this.box.top;
    }

    get atBottom(): boolean {
        return this.box.atBottom;
    }

    get following(): boolean {
        return this.box.following;
    }

    get newItemCount(): number {
        return this.box.newItemCount;
    }

    noteNewItems(count = 1): number {
        return this.box.noteNewItems(count);
    }

    resumeFollow(): boolean {
        const moved = this.box.resumeFollow();
        this.apply();
        return moved;
    }

    private apply(): void {
        this.element.scrollTop = this.box.top;
    }
}
