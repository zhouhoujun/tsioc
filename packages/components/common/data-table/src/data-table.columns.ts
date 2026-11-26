import { DataTableCell, DataTableColumn, DataTableViewColumn } from './data-table.types';

/** Effective width/style for a rendered column (header + cells). */
export function dataTableColumnStyle(
    columns: DataTableColumn[],
    widths: Record<string, number>,
    column: DataTableViewColumn
): Record<string, string> | undefined {
    const raw = (Array.isArray(columns) ? columns : [])
        .find(entry => String(entry?.key) === column.key);
    const width = widths[column.key] ?? raw?.width;
    const style = { ...(column.style || {}) };
    if (width == null) {
        delete style.width;
    } else {
        style.width = typeof width === 'number' ? `${width}px` : String(width);
    }
    return style;
}

export function dataTableCellStyle(
    columns: DataTableColumn[],
    widths: Record<string, number>,
    viewColumns: DataTableViewColumn[],
    cell: DataTableCell
): Record<string, string> | undefined {
    const column = viewColumns.find(entry => entry.key === cell.columnKey);
    return column ? dataTableColumnStyle(columns, widths, column) : cell.style;
}
