/** Visible slice of a horizontally-overflowing strip (tabs, dialog sections). */
export interface AgentConsoleStripWindow {
    start: number;
    end: number;
    canBack: boolean;
    canForward: boolean;
    /** Start of the previous page (fill backwards from `start`). */
    backStart: number;
}

export interface AgentConsoleStripWindowOptions {
    count: number;
    /** Display width of the item at `index`, separators included. */
    widthOf(index: number): number;
    /** Active item; used to choose the page when the user has not paged. */
    active: number;
    /** Width available for items (overflow arrows excluded). */
    budget: number;
    /** Manual page start; negative/omitted follows the active item. */
    start?: number;
}

/**
 * Window a fixed-width strip around its active item, or around the page the
 * user paged to. Both the session tab strip and the settings dialog section
 * strip use this so terminal hosts page them the same way.
 */
export function resolveAgentConsoleStripWindow(options: AgentConsoleStripWindowOptions): AgentConsoleStripWindow {
    const count = Math.max(0, Math.floor(Number(options.count) || 0));
    if (!count) {
        return { start: 0, end: 0, canBack: false, canForward: false, backStart: 0 };
    }
    const widthOf = options.widthOf;
    const budget = Math.max(1, Math.floor(Number(options.budget) || 0));
    const fitEnd = (start: number): number => {
        let end = start;
        let used = 0;
        while (end < count && (end === start || used + widthOf(end) <= budget)) {
            used += widthOf(end);
            end += 1;
        }
        return Math.min(count, Math.max(start + 1, end));
    };
    const active = Math.max(0, Math.min(count - 1, Math.floor(Number(options.active) || 0)));
    const manual = options.start === undefined ? -1 : Math.floor(Number(options.start));
    const start = Number.isFinite(manual) && manual >= 0
        ? Math.min(count - 1, manual)
        : centeredStart(count, active, budget, widthOf, fitEnd);
    const end = fitEnd(start);
    return {
        start,
        end,
        canBack: start > 0,
        canForward: end < count,
        backStart: fitStartBack(count, start, budget, widthOf)
    };
}

/** Page that fits widest and stays closest to the active item. */
function centeredStart(
    count: number,
    active: number,
    budget: number,
    widthOf: (index: number) => number,
    fitEnd: (start: number) => number
): number {
    let best = Math.min(Math.max(0, active), Math.max(0, count - 1));
    let bestSize = 0;
    let bestDistance = Number.MAX_SAFE_INTEGER;
    for (let start = Math.max(0, active); start >= 0; start -= 1) {
        const end = fitEnd(start);
        if (end <= active) {
            continue;
        }
        const size = end - start;
        const distance = Math.abs((start + end - 1) / 2 - active);
        if (size > bestSize || (size === bestSize && distance < bestDistance)) {
            best = start;
            bestSize = size;
            bestDistance = distance;
        }
    }
    return best;
}

/**
 * Fill the previous page backwards from `end` so a short last page still pages
 * back to a full page instead of stepping one item at a time.
 */
function fitStartBack(
    count: number,
    end: number,
    budget: number,
    widthOf: (index: number) => number
): number {
    if (end <= 0) {
        return 0;
    }
    let start = Math.min(end, count);
    let used = 0;
    while (start > 0) {
        const width = widthOf(start - 1);
        if (start !== end && used + width > budget) {
            break;
        }
        used += width;
        start -= 1;
    }
    return start;
}
