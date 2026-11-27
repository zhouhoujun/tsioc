import { DataTableRow } from './data-table.types';
import { matchesDataTableFilter } from './data-table.view';

export interface DataTableTreeEntry {
    row: DataTableRow;
    index: number;
    depth: number;
    parentKey: string;
}

export function filterDataTableTreeEntries<T extends { row: DataTableRow }>(
    entries: T[],
    filters: Record<string, string> | undefined
): T[] {
    const active = Object.entries(filters || {}).filter(([, value]) => String(value ?? '').trim());
    return active.length
        ? entries.filter(entry => active.every(([key, value]) => matchesDataTableFilter(entry.row?.[key], value)))
        : entries;
}

/** Flatten a hierarchical row set for the table projection. */
export function flattenDataTableTree(
    rows: DataTableRow[],
    childrenKey: string,
    keyOf: (row: DataTableRow, index: number) => string,
    depth = 0,
    parentKey = '',
    output: DataTableTreeEntry[] = []
): DataTableTreeEntry[] {
    (Array.isArray(rows) ? rows : []).forEach(row => {
        if (!row) { return; }
        const index = output.length;
        const key = keyOf(row, index);
        output.push({ row, index, depth, parentKey });
        const children = row?.[childrenKey];
        if (Array.isArray(children) && children.length) {
            flattenDataTableTree(children, childrenKey, keyOf, depth + 1, key, output);
        }
    });
    return output;
}

/** Flattened tree rows for the table projection. */
export function dataTableTreeEntries(
    rows: DataTableRow[],
    treeRows: boolean | undefined,
    childrenKey: string,
    keyOf: (row: DataTableRow, index: number) => string
): DataTableTreeEntry[] {
    return treeRows ? flattenDataTableTree(rows, childrenKey, keyOf) : [];
}

/** Source rows after tree flattening (or the plain async/local rows). */
export function dataTableTreeSourceRows(
    treeRows: boolean | undefined,
    entries: DataTableTreeEntry[],
    tableRows: DataTableRow[]
): DataTableRow[] {
    return treeRows ? entries.map(entry => entry.row) : tableRows;
}
