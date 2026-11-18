export interface ScrollbarThumb {
    /** First cell occupied by the thumb. */
    start: number;
    /** Number of cells occupied by the thumb. */
    size: number;
    /** Whether the content is larger than the viewport. */
    scrollable: boolean;
    /** Maximum valid offset (`total - visible`). */
    maxOffset: number;
}

/**
 * Resolve a scrollbar thumb for a track of `length` cells.
 *
 * This is renderer-neutral math shared by the DOM and TUI scrollbar; terminal
 * hosts draw the cells as text (`█`/`░`) while DOM hosts can style them.
 */
export function resolveScrollbarThumb(
    offset: number,
    visible: number,
    total: number,
    length: number,
    minThumb = 1
): ScrollbarThumb {
    const track = Math.max(1, Math.floor(Number(length) || 1));
    const totalCount = Math.max(0, Math.floor(Number(total) || 0));
    const visibleCount = Math.max(0, Math.min(totalCount, Math.floor(Number(visible) || 0)));
    const maxOffset = Math.max(0, totalCount - visibleCount);
    if (!totalCount || maxOffset === 0) {
        return { start: 0, size: track, scrollable: false, maxOffset: 0 };
    }
    const size = Math.max(1, Math.min(track, Math.round((visibleCount / totalCount) * track), track));
    const minimum = Math.max(1, Math.min(track, Math.floor(Number(minThumb) || 1)));
    const thumbSize = Math.max(minimum, size);
    const maxStart = Math.max(0, track - thumbSize);
    const position = Math.max(0, Math.min(maxOffset, Math.floor(Number(offset) || 0)));
    const start = maxStart === 0 ? 0 : Math.round((position / maxOffset) * maxStart);
    return { start, size: thumbSize, scrollable: true, maxOffset };
}
