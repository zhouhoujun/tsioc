import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';

export type DataTableAlign = 'left' | 'center' | 'right';

export type DataTableSortDirection = 'asc' | 'desc';

export interface DataTableColumn {
    key: string;
    label?: string;
    align?: DataTableAlign;
    width?: number | string;
    hidden?: boolean;
    /** Sort this column when its header is activated. */
    sortable?: boolean;
    /** Value key used for sorting when it differs from `key`. */
    sortKey?: string;
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
    headerClass: string;
    align: DataTableAlign;
    style?: Record<string, string>;
    sortable: boolean;
    sortKey?: string;
    ariaSort: 'ascending' | 'descending' | 'none';
}

interface DataTableViewRow {
    key: string;
    index: number;
    cells: DataTableCell[];
    className: string;
    selected: boolean;
}

/**
 * Semantic data table. Cells stay structured for DOM hosts; a visible `│`
 * separator is rendered between cells for terminal hosts and hidden by the
 * default `installUiStyles` skin in the browser.
 */
@Component({
    selector: 'ui-data-table',
    template: `
    <div class="ui-data-table {{tableClass}}" role="table"
        aria-label="{{ariaLabel}}" aria-busy="{{loading}}" aria-rowcount="{{rows.length}}">
        <div class="ui-data-table-caption" role="caption" v-if="caption">{{caption}}</div>
        <div class="ui-data-table-head {{headerClass}}" role="row">
            <span class="ui-data-table-cell is-{{column.align || 'left'}} {{headerClassFor(column)}}"
                role="columnheader" aria-sort="{{ariaSortFor(column)}}"
                tabindex="{{column.sortable ? 0 : null}}" [style]="column.style"
                v-for="column in viewColumns" trackBy="key"
                @click="sort(column)" @keydown="headerKeydown($event, column)">{{column.label}}</span>
        </div>
        <div class="{{row.className}}" role="row" aria-selected="{{row.selected}}"
            v-for="row in viewRows" trackBy="key"
            @click="pick(row)">
            <span class="{{cell.className}}" role="cell"
                v-for="cell in row.cells" trackBy="key">{{cell.text}}</span>
        </div>
        <div class="ui-data-table-loading" role="row" v-if="loading">{{loadingLabel}}</div>
        <div class="ui-data-table-empty" role="row" v-if="!loading && !viewRows.length">{{emptyLabel}}</div>
    </div>`
})
export class DataTableComponent {
    @Attribute() columns: DataTableColumn[] = [];
    @Attribute() rows: DataTableRow[] = [];
    @Attribute() rowKey: string | ((row: DataTableRow, index: number) => string | number) = 'id';
    @Attribute() selectedKey = '';
    @Attribute() emptyLabel = '';
    @Attribute() loadingLabel = 'Loading…';
    @Attribute() caption = '';
    @Attribute() ariaLabel = 'Table';
    @Attribute() className = '';
    @Attribute() sortAction?: (key: string, direction: DataTableSortDirection) => void;
    @Attribute() rowAction?: (row: DataTableRow, index: number) => void;
    @Attribute() sortKey = '';
    @Attribute() sortDirection: DataTableSortDirection | '' = '';

    private _striped = false;
    private _bordered = false;
    private _dense = false;
    private _stickyHeader = false;
    private _loading = false;

    @Attribute()
    get striped(): boolean { return this._striped; }
    set striped(value: boolean | string) { this._striped = normalizeBoolean(value); }

    @Attribute()
    get bordered(): boolean { return this._bordered; }
    set bordered(value: boolean | string) { this._bordered = normalizeBoolean(value); }

    @Attribute()
    get dense(): boolean { return this._dense; }
    set dense(value: boolean | string) { this._dense = normalizeBoolean(value); }

    @Attribute()
    get stickyHeader(): boolean { return this._stickyHeader; }
    set stickyHeader(value: boolean | string) { this._stickyHeader = normalizeBoolean(value); }

    @Attribute()
    get loading(): boolean { return this._loading; }
    set loading(value: boolean | string) { this._loading = normalizeBoolean(value); }

    get tableClass(): string {
        return [
            this._striped ? 'is-striped' : '',
            this._bordered ? 'is-bordered' : '',
            this._dense ? 'is-dense' : '',
            this._stickyHeader ? 'is-sticky' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get headerClass(): string {
        return this._stickyHeader ? 'is-sticky' : '';
    }

    get viewColumns(): DataTableViewColumn[] {
        return (Array.isArray(this.columns) ? this.columns : [])
            .filter(column => column && !column.hidden)
            .map(column => {
                const key = String(column.key);
                const sortable = column.sortable === true;
                const sorted = sortable && this.sortKey === (column.sortKey || key);
                return {
                    key,
                    label: String(column.label ?? column.key),
                    className: `ui-data-table-cell is-${column.align || 'left'}`,
                    headerClass: [
                        'ui-data-table-cell',
                        `is-${column.align || 'left'}`,
                        sortable ? 'ui-data-table-sortable' : '',
                        sorted ? `is-sorted-${this.sortDirection || 'none'}` : ''
                    ].filter(Boolean).join(' '),
                    align: column.align || 'left',
                    style: column.width == null ? undefined : { width: typeof column.width === 'number' ? `${column.width}px` : String(column.width) },
                    sortable,
                    sortKey: column.sortKey || key,
                    ariaSort: sorted && this.sortDirection === 'asc'
                        ? 'ascending'
                        : sorted && this.sortDirection === 'desc'
                            ? 'descending'
                            : 'none'
                } as DataTableViewColumn;
            });
    }

    ariaSortFor(column: DataTableViewColumn): string {
        if (!column.sortable || this.sortKey !== (column.sortKey || column.key) || !this.sortDirection) {
            return 'none';
        }
        return this.sortDirection === 'asc' ? 'ascending' : 'descending';
    }

    headerClassFor(column: DataTableViewColumn): string {
        if (!column.sortable) {
            return '';
        }
        const classes = ['ui-data-table-sortable'];
        if (this.sortKey === (column.sortKey || column.key) && this.sortDirection) {
            classes.push(`is-sorted-${this.sortDirection}`);
        }
        return classes.join(' ');
    }

    sort(column: DataTableViewColumn): void {
        if (!column.sortable) {
            return;
        }
        const key = column.sortKey || column.key;
        const direction: DataTableSortDirection = this.sortKey === key && this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.sortKey = key;
        this.sortDirection = direction;
        this.sortAction?.(key, direction);
    }

    headerKeydown(event: any, column: DataTableViewColumn): void {
        if (!column.sortable) {
            return;
        }
        const key = event?.key;
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault?.();
            this.sort(column);
        }
    }

    get viewRows(): DataTableViewRow[] {
        const columns = this.viewColumns;
        const sortColumn = this.sortDirection
            ? columns.find(column => column.sortable && this.sortKey === (column.sortKey || column.key))
            : undefined;
        const rows = (Array.isArray(this.rows) ? this.rows : [])
            .map((row, index) => ({ row, index }));
        if (sortColumn) {
            const direction = this.sortDirection === 'asc' ? 1 : -1;
            rows.sort((left, right) => {
                const sortKey = sortColumn.sortKey || sortColumn.key;
                const a = left.row?.[sortKey];
                const b = right.row?.[sortKey];
                if (a === b) return left.index - right.index;
                if (a == null) return 1;
                if (b == null) return -1;
                const result = typeof a === 'number' && typeof b === 'number'
                    ? a - b
                    : String(a).localeCompare(String(b));
                return result * direction;
            });
        }
        return rows.map(({ row, index }) => {
            const key = String(typeof this.rowKey === 'function' ? this.rowKey(row, index) : ((row && row[this.rowKey as string]) ?? index));
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
                className: ['ui-data-table-row', selected ? 'is-selected' : ''].filter(Boolean).join(' '),
                selected
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
