import { DataTableCell, DataTableColumn, DataTableSortDirection, DataTableViewColumn } from './data-table.types';
import { dataTableColumnWidthToken, dataTableFixedOffset } from './data-table.view';

/** Build the rendered column projection (widths, sticky offsets, sort state). */
export function buildDataTableColumns(
    columns: DataTableColumn[],
    widths: Record<string, number>,
    resizableColumns: boolean,
    sortDirection: (column: DataTableColumn) => DataTableSortDirection | ''
): DataTableViewColumn[] {
    const raw = (Array.isArray(columns) ? columns : []).filter(column => column && !column.hidden);
    const tokens = raw.map(column => dataTableColumnWidthToken(widths[String(column.key)] ?? column.width));
    return raw.map((column, index) => {
        const key = String(column.key);
        const sortable = column.sortable === true;
        const direction = sortable ? sortDirection(column) : '';
        const fixed = column.fixed === 'left' || column.fixed === 'right' ? column.fixed : undefined;
        const width = widths[key] ?? column.width;
        const widthStyle = width == null
            ? undefined
            : { width: typeof width === 'number' ? `${width}px` : String(width) };
        const stickyStyle = fixed
            ? { '--ui-sticky-offset': dataTableFixedOffset(raw, tokens, index, fixed) }
            : undefined;
        const fixedClass = fixed ? `is-fixed-${fixed}` : '';
        const baseClass = [
            'ui-data-table-cell',
            `is-${column.align || 'left'}`,
            fixedClass
        ].filter(Boolean).join(' ');
        return {
            key,
            label: String(column.label ?? column.key),
            className: baseClass,
            cellClass: baseClass,
            cellStyle: stickyStyle,
            headerClass: [
                baseClass,
                sortable ? 'ui-data-table-sortable' : '',
                direction ? `is-sorted-${direction}` : ''
            ].filter(Boolean).join(' '),
            align: column.align || 'left',
            style: { ...(widthStyle || {}), ...(stickyStyle || {}) } as Record<string, string> | undefined,
            sortable,
            sortKey: column.sortKey || key,
            filterable: column.filterable === true,
            render: column.render,
            resizable: resizableColumns && column.resizable !== false
        } as DataTableViewColumn;
    });
}

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
