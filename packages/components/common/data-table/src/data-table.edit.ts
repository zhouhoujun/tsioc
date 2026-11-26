import { DataTableCell, DataTableRow, DataTableViewRow } from './data-table.types';

export interface DataTableEditHost {
    editable: boolean;
    editKey: string;
    editDraft: string;
    tableRows: DataTableRow[];
    editAction?: (row: DataTableRow, columnKey: string, value: string) => void;
}

export function isEditingCell(host: DataTableEditHost, cell: DataTableCell): boolean {
    return !!host.editKey && host.editKey === cell.key;
}

export function startCellEdit(host: DataTableEditHost, row: DataTableViewRow, cell: DataTableCell, root: any): void {
    if (!host.editable || !cell?.columnKey) {
        return;
    }
    host.editKey = cell.key;
    const raw = host.tableRows[row.index]?.[cell.columnKey];
    host.editDraft = raw == null ? '' : String(raw);
    void Promise.resolve().then(() => {
        const input = root?.querySelector?.(`[data-cell-key="${cell.key}"] .ui-data-table-edit`);
        input?.focus?.();
    });
}

export function commitCellEdit(host: DataTableEditHost, row: DataTableViewRow, cell: DataTableCell): void {
    if (!isEditingCell(host, cell)) {
        return;
    }
    const value = host.editDraft;
    host.editKey = '';
    host.editAction?.(host.tableRows[row.index], cell.columnKey!, value);
}

export function editCellKeydown(host: DataTableEditHost, event: any, row: DataTableViewRow, cell: DataTableCell): void {
    const key = String(event?.key || '');
    if (key === 'Enter') {
        event.preventDefault?.();
        event.stopPropagation?.();
        commitCellEdit(host, row, cell);
    } else if (key === 'Escape') {
        event.preventDefault?.();
        event.stopPropagation?.();
        host.editKey = '';
    }
}
