import { DataTableSort, DataTableSortDirection } from './data-table.types';

export interface DataTableSortColumn {
    key: string;
    sortKey?: string;
    sortable?: boolean;
}

const VALID = new Set<DataTableSortDirection>(['asc', 'desc']);

/** Effective criteria: explicit multi-sorts, otherwise the legacy single sort. */
export function resolveDataTableSorts(
    multiSort: boolean,
    sorts: DataTableSort[] | undefined,
    sortKey: string,
    sortDirection: DataTableSortDirection | ''
): DataTableSort[] {
    if (multiSort) {
        const active = (Array.isArray(sorts) ? sorts : []).filter(item =>
            item && item.key && VALID.has(item.direction));
        if (active.length) {
            return active.map(item => ({ key: String(item.key), direction: item.direction }));
        }
    }
    return sortKey && VALID.has(sortDirection as DataTableSortDirection)
        ? [{ key: String(sortKey), direction: sortDirection as DataTableSortDirection }]
        : [];
}

/** Cycle one column: absent -> asc -> desc -> removed. */
export function nextDataTableSorts(current: DataTableSort[], key: string): DataTableSort[] {
    const index = current.findIndex(item => item.key === key);
    if (index < 0) {
        return [...current, { key, direction: 'asc' }];
    }
    if (current[index].direction === 'asc') {
        return current.map((item, at) => at === index ? { ...item, direction: 'desc' } : { ...item });
    }
    return current.filter(item => item.key !== key).map(item => ({ ...item }));
}

export function dataTableSortFor(
    sorts: DataTableSort[],
    column: DataTableSortColumn
): DataTableSort | undefined {
    if (!column.sortable) {
        return undefined;
    }
    const key = column.sortKey || column.key;
    return sorts.find(item => item.key === key);
}

export function dataTableSortPriority(sorts: DataTableSort[], column: DataTableSortColumn): number {
    if (!column.sortable) {
        return 0;
    }
    const key = column.sortKey || column.key;
    const index = sorts.findIndex(item => item.key === key);
    return index < 0 ? 0 : index + 1;
}

export function dataTableSortDirection(
    sorts: DataTableSort[],
    column: DataTableSortColumn
): DataTableSortDirection | '' {
    return dataTableSortFor(sorts, column)?.direction || '';
}

/** `aria-sort` token for a column header. */
export function dataTableAriaSort(sorts: DataTableSort[], column: DataTableSortColumn): string {
    if (!column.sortable) {
        return 'none';
    }
    const direction = dataTableSortDirection(sorts, column);
    return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
}
