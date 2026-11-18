import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';

export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn {
    key: string;
    label?: string;
    align?: DataTableAlign;
    width?: number | string;
    hidden?: boolean;
}

export type DataTableRow = Record<string, any>;

interface DataTableCell {
    key: string;
    text: string;
    className: string;
}

interface DataTableViewColumn {
    key: string;
    label: string;
    className: string;
    style?: Record<string, string>;
}

interface DataTableViewRow {
    key: string;
    index: number;
    cells: DataTableCell[];
    className: string;
}

/**
 * Semantic data table. Cells stay structured for DOM hosts; a visible `│`
 * separator is rendered between cells for terminal hosts and hidden by the
 * default `installUiStyles` skin in the browser.
 */
@Component({
    selector: 'ui-data-table',
    template: `
    <div class="ui-data-table {{tableClass}}" role="table" aria-label="{{ariaLabel}}">
        <div class="ui-data-table-head" role="row">
            <span class="{{column.className}}" role="columnheader" [style]="column.style"
                v-for="column in viewColumns" trackBy="key">{{column.label}}</span>
        </div>
        <div class="{{row.className}}" role="row"
            v-for="row in viewRows" trackBy="key"
            @click="pick(row)">
            <span class="{{cell.className}}" role="cell"
                v-for="cell in row.cells" trackBy="key">{{cell.text}}</span>
        </div>
        <div class="ui-data-table-empty" role="row" v-if="!viewRows.length">{{emptyLabel}}</div>
    </div>`
})
export class DataTableComponent {
    @Attribute() columns: DataTableColumn[] = [];
    @Attribute() rows: DataTableRow[] = [];
    @Attribute() rowKey = 'id';
    @Attribute() selectedKey = '';
    @Attribute() emptyLabel = '';
    @Attribute() ariaLabel = 'Table';
    @Attribute() className = '';
    @Attribute() rowAction?: (row: DataTableRow, index: number) => void;

    private _striped = false;
    private _bordered = false;
    private _dense = false;

    @Attribute()
    get striped(): boolean { return this._striped; }
    set striped(value: boolean | string) { this._striped = normalizeBoolean(value); }

    @Attribute()
    get bordered(): boolean { return this._bordered; }
    set bordered(value: boolean | string) { this._bordered = normalizeBoolean(value); }

    @Attribute()
    get dense(): boolean { return this._dense; }
    set dense(value: boolean | string) { this._dense = normalizeBoolean(value); }

    get tableClass(): string {
        return [
            this._striped ? 'is-striped' : '',
            this._bordered ? 'is-bordered' : '',
            this._dense ? 'is-dense' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get viewColumns(): DataTableViewColumn[] {
        return (Array.isArray(this.columns) ? this.columns : [])
            .filter(column => column && !column.hidden)
            .map(column => ({
                key: String(column.key),
                label: String(column.label ?? column.key),
                className: `ui-data-table-cell is-${column.align || 'left'}`,
                style: column.width == null ? undefined : { width: typeof column.width === 'number' ? `${column.width}px` : String(column.width) }
            }));
    }

    get viewRows(): DataTableViewRow[] {
        const columns = this.viewColumns;
        const rows = Array.isArray(this.rows) ? this.rows : [];
        return rows.map((row, index) => {
            const key = String((row && row[this.rowKey]) ?? index);
            const selected = !!this.selectedKey && String(this.selectedKey) === key;
            const cells: DataTableCell[] = [];
            columns.forEach((column, columnIndex) => {
                cells.push({
                    key: `${key}-${column.key}`,
                    text: this.formatCell(row?.[column.key]),
                    className: column.className
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
                className: ['ui-data-table-row', selected ? 'is-selected' : ''].filter(Boolean).join(' ')
            };
        });
    }

    pick(row: DataTableViewRow): void {
        if (!this.rowAction) {
            return;
        }
        this.rowAction(this.rows[row.index], row.index);
    }

    private formatCell(value: any): string {
        if (value == null) {
            return '';
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return String(value);
    }
}
