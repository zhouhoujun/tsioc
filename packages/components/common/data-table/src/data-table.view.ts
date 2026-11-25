import type { DataTableColumn, DataTableRow, DataTableSortDirection } from './data-table.types';

export interface IndexedDataTableRow {
    row: DataTableRow;
    /** Original index in the host-provided row set. */
    index: number;
}

/** Case-insensitive text/array match used by host-driven column filters. */
export function matchesDataTableFilter(value: any, filter: string): boolean {
    const needle = String(filter ?? '').trim().toLowerCase();
    if (!needle) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.some(item => String(item ?? '').toLowerCase().includes(needle));
    }
    if (value == null) {
        return false;
    }
    return String(value).toLowerCase().includes(needle);
}

/** Apply all non-empty column filters, preserving each row's original index. */
export function filterDataTableRows(rows: DataTableRow[], filters: Record<string, string> | undefined): IndexedDataTableRow[] {
    const active = Object.entries(filters ?? {})
        .filter(([, value]) => String(value ?? '').trim());
    const indexed = rows.map((row, index) => ({ row, index }));
    if (!active.length) {
        return indexed;
    }
    return indexed.filter(entry => active.every(([key, value]) => matchesDataTableFilter(entry.row?.[key], value)));
}

/** Stable sort by a column value; numbers compare numerically, others lexically. */
export function sortDataTableRows(
    entries: IndexedDataTableRow[],
    sortKey: string,
    direction: DataTableSortDirection
): IndexedDataTableRow[] {
    const factor = direction === 'asc' ? 1 : -1;
    return entries.slice().sort((left, right) => {
        const a = left.row?.[sortKey];
        const b = right.row?.[sortKey];
        if (a === b) return left.index - right.index;
        if (a == null) return 1;
        if (b == null) return -1;
        const result = typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a).localeCompare(String(b));
        return result * factor;
    });
}

/** Cell text, preferring a host `render` callback while keeping stable output. */
export function formatDataTableCell(column: DataTableColumn, row: DataTableRow, index: number): string {
    const raw = typeof column.render === 'function'
        ? column.render(row?.[column.key], row, index)
        : row?.[column.key];
    if (raw == null) {
        return '';
    }
    if (typeof raw === 'object') {
        try {
            return JSON.stringify(raw);
        } catch {
            return String(raw);
        }
    }
    return String(raw);
}


/** Display token width, falling back to 12ch for invalid values. */
export function dataTableColumnWidthToken(width: number | string | undefined): string {
    if (typeof width === 'number') {
        return `${Math.max(1, width)}px`;
    }
    const text = String(width ?? '').trim();
    return /^\d+(\.\d+)?(px|ch|em|rem|%)$/.test(text) ? text : '12ch';
}

/** Sticky offset contributed by prior fixed columns. */
export function dataTableFixedOffset(
    columns: DataTableColumn[],
    tokens: string[],
    index: number,
    fixed: 'left' | 'right'
): string {
    const parts: string[] = [];
    if (fixed === 'left') {
        for (let at = 0; at < index; at++) {
            if (columns[at].fixed === 'left') parts.push(tokens[at]);
        }
    } else {
        for (let at = index + 1; at < columns.length; at++) {
            if (columns[at].fixed === 'right') parts.push(tokens[at]);
        }
    }
    return parts.length ? `calc(${parts.join(' + ')})` : '0px';
}

/** Root class list; blank flags are dropped without allocating a Set. */
export function dataTableClass(options: {
    striped: boolean;
    bordered: boolean;
    dense: boolean;
    sticky: boolean;
    className: string;
}): string {
    return [
        options.striped ? 'is-striped' : '',
        options.bordered ? 'is-bordered' : '',
        options.dense ? 'is-dense' : '',
        options.sticky ? 'is-sticky' : '',
        options.className
    ].filter(Boolean).join(' ');
}

export function dataTableHeaderClass(sticky: boolean): string {
    return sticky ? 'is-sticky' : '';
}
