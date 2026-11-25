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
