export interface DataTableVirtualOptions {
    enabled: boolean;
    paginated: boolean;
    total: number;
    scrollTop: number;
    viewportHeight: number;
    rowHeight: number;
    overscan: number;
}

export interface DataTableVirtualWindow {
    start: number;
    end: number;
    rowHeight: number;
    topHeight: number;
    bottomHeight: number;
}

/**
 * Compute the rendered row window. Hosts drive `scrollTop`/`viewportHeight`;
 * pagination disables virtualization because pages already bound the row set.
 */
export function resolveDataTableVirtualWindow(options: DataTableVirtualOptions): DataTableVirtualWindow {
    const total = Math.max(0, Math.floor(Number(options.total) || 0));
    const rowHeight = Math.max(1, Number(options.rowHeight) || 32);
    if (!options.enabled || options.paginated || !Number(options.viewportHeight)) {
        return { start: 0, end: total, rowHeight, topHeight: 0, bottomHeight: 0 };
    }
    const overscan = Math.max(0, Number(options.overscan) || 0);
    const start = Math.max(0, Math.floor(Number(options.scrollTop) / rowHeight) - overscan);
    const count = Math.ceil(Number(options.viewportHeight) / rowHeight) + overscan * 2;
    const end = Math.min(total, start + count);
    return {
        start,
        end,
        rowHeight,
        topHeight: start * rowHeight,
        bottomHeight: (total - end) * rowHeight
    };
}
