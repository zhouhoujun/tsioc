import { DataTableCell, DataTableViewRow } from './data-table.types';

/** Component surface required by the grid keyboard controller. */
export interface DataTableKeyboardHost {
    keyboardNavigation: boolean;
    expandable: boolean;
    selectable: boolean;
    readonly viewRows: DataTableViewRow[];
    pick(row: DataTableViewRow): void;
    toggleExpand(row: DataTableViewRow, event?: Event): void;
    toggleRow(row: DataTableViewRow, event?: Event): void;
}

export interface DataTableCellTarget {
    rowIndex: number;
    cellIndex: number;
    key: string;
}

/**
 * Roving grid navigation for opt-in `keyboardNavigation`. Kept separate from
 * the component so column/row rendering and navigation can evolve independently.
 */
export class DataTableKeyboardController {
    constructor(private readonly host: DataTableKeyboardHost) { }

    cellFocusable(cell: DataTableCell): boolean {
        return !!this.host.keyboardNavigation && !!cell.columnKey;
    }

    cellTabIndex(row: DataTableViewRow, cell: DataTableCell, activeKey: string): number {
        if (!this.host.keyboardNavigation || !cell.columnKey) {
            return -1;
        }
        const active = activeKey || this.firstDataCellKey();
        return active === cell.key ? 0 : -1;
    }

    focusCellOnly(row: DataTableViewRow, cell: DataTableCell): string | undefined {
        return this.host.keyboardNavigation && cell.columnKey ? cell.key : undefined;
    }

    onKeydown(event: any, row: DataTableViewRow, cell: DataTableCell): DataTableCellTarget | undefined {
        if (!this.host.keyboardNavigation || !cell.columnKey) {
            return undefined;
        }
        const key = String(event?.key || '');
        if (key === 'Enter') {
            event.preventDefault?.();
            if (this.host.expandable) {
                this.host.toggleExpand(row, event);
            } else {
                this.host.pick(row);
            }
            return undefined;
        }
        if (key === ' ' || key === 'Spacebar') {
            event.preventDefault?.();
            if (this.host.selectable) {
                this.host.toggleRow(row, event);
            } else {
                this.host.pick(row);
            }
            return undefined;
        }
        const rows = this.host.viewRows;
        const rowIndex = rows.findIndex(entry => entry.key === row.key);
        const cells = row.cells.filter(entry => !!entry.columnKey);
        const cellIndex = cells.findIndex(entry => entry.key === cell.key);
        if (rowIndex < 0 || cellIndex < 0) {
            return undefined;
        }
        let nextRow = rowIndex;
        let nextCell = cellIndex;
        if (key === 'ArrowDown') {
            nextRow = Math.min(rows.length - 1, rowIndex + 1);
        } else if (key === 'ArrowUp') {
            nextRow = Math.max(0, rowIndex - 1);
        } else if (key === 'ArrowRight') {
            nextCell = Math.min(cells.length - 1, cellIndex + 1);
        } else if (key === 'ArrowLeft') {
            nextCell = Math.max(0, cellIndex - 1);
        } else if (key === 'Home') {
            nextCell = 0;
        } else if (key === 'End') {
            nextCell = cells.length - 1;
        } else if (key === 'PageDown') {
            nextRow = Math.min(rows.length - 1, rowIndex + 5);
        } else if (key === 'PageUp') {
            nextRow = Math.max(0, rowIndex - 5);
        } else {
            return undefined;
        }
        event.preventDefault?.();
        const targetRow = rows[nextRow];
        const targetCell = targetRow?.cells.filter(entry => !!entry.columnKey)[nextCell];
        if (!targetCell) {
            return undefined;
        }
        return { rowIndex: nextRow, cellIndex: nextCell, key: targetCell.key };
    }

    private firstDataCellKey(): string {
        for (const row of this.host.viewRows) {
            const cell = row.cells.find(entry => !!entry.columnKey);
            if (cell) {
                return cell.key;
            }
        }
        return '';
    }
}
