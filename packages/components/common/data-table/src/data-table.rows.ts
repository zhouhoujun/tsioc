import {
    DataTableCell,
    DataTableRow,
    DataTableViewColumn,
    DataTableViewRow
} from './data-table.types';
import { IndexedDataTableRow, formatDataTableCell } from './data-table.view';

/** Build the rendered row window: cells, separators and selection flags. */
export function buildDataTableRows(
    entries: IndexedDataTableRow[],
    columns: DataTableViewColumn[],
    selectedKeys: Set<string>,
    selectedKey: string,
    rows: DataTableRow[],
    rowKeyOf: (row: DataTableRow, index: number) => string,
    groupBy?: (row: DataTableRow) => string
): DataTableViewRow[] {
    const rendered = entries.map(({ row, index }) => {
        const key = rowKeyOf(rows[index], index);
        const checked = selectedKeys.has(key);
        const selected = (!!selectedKey && String(selectedKey) === key) || checked;
        const cells: DataTableCell[] = [];
        columns.forEach((column, columnIndex) => {
            cells.push({
                key: `${key}-${column.key}`,
                columnKey: column.key,
                text: formatDataTableCell(column, row, index),
                className: `${column.cellClass} is-data-cell`,
                style: column.cellStyle
            });
            if (columnIndex < columns.length - 1) {
                cells.push({
                    key: `${key}-sep-${columnIndex}`,
                    text: '│',
                    className: 'ui-data-table-sep'
                });
            }
        });
        return {
            key,
            index,
            cells,
            className: ['ui-data-table-row', selected ? 'is-selected' : ''].filter(Boolean).join(' '),
            selected,
            checked,
            kind: 'row' as const
        };
    });
    if (!groupBy) {
        return rendered;
    }
    const grouped: DataTableViewRow[] = [];
    let previous = '';
    rendered.forEach(row => {
        const label = String(groupBy(rows[row.index]) ?? '');
        if (label !== previous) {
            grouped.push({
                key: `group-${row.index}-${label}`,
                index: -1,
                cells: [],
                className: 'ui-data-table-group-row',
                selected: false,
                checked: false,
                kind: 'group',
                groupLabel: label
            });
            previous = label;
        }
        grouped.push(row);
    });
    return grouped;
}
