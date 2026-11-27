import { DataTableCell, DataTableRow, DataTableViewRow } from './data-table.types';

export interface DataTableEditHost {
    editable: boolean;
    editKey: string;
    editDraft: string;
    tableRows: DataTableRow[];
    editAction?: (row: DataTableRow, columnKey: string, value: string) => void;
    editValidateAction?: (row: DataTableRow, columnKey: string, value: string) => string | undefined | Promise<string | undefined>;
    editError: string;
}

export function isEditingCell(host: DataTableEditHost, cell: DataTableCell): boolean {
    return !!host.editKey && host.editKey === cell.key;
}

export function startCellEdit(host: DataTableEditHost, row: DataTableViewRow, cell: DataTableCell, root: any): void {
    if (!host.editable || !cell?.columnKey) {
        return;
    }
    host.editKey = cell.key;
    host.editError = '';
    const raw = host.tableRows[row.index]?.[cell.columnKey];
    host.editDraft = raw == null ? '' : String(raw);
    void Promise.resolve().then(() => {
        const input = root?.querySelector?.(`[data-cell-key="${cell.key}"] .ui-data-table-edit`);
        input?.focus?.();
    });
}

export async function commitCellEdit(host: DataTableEditHost, row: DataTableViewRow, cell: DataTableCell): Promise<void> {
    if (!isEditingCell(host, cell)) {
        return;
    }
    const value = host.editDraft;
    const raw = host.tableRows[row.index];
    if (host.editValidateAction) {
        const error = await host.editValidateAction(raw, cell.columnKey!, value);
        if (error) {
            host.editError = String(error);
            return;
        }
    }
    host.editKey = '';
    host.editError = '';
    host.editAction?.(raw, cell.columnKey!, value);
}

export function editCellKeydown(host: DataTableEditHost, event: any, row: DataTableViewRow, cell: DataTableCell): void {
    const key = String(event?.key || '');
    if (key === 'Enter') {
        event.preventDefault?.();
        event.stopPropagation?.();
        void commitCellEdit(host, row, cell);
    } else if (key === 'Escape') {
        event.preventDefault?.();
        event.stopPropagation?.();
        host.editKey = '';
        host.editError = '';
    }
}
