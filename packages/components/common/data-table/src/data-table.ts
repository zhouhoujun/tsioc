import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';
import { PaginationComponent } from '../../pagination/src/pagination';

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
    checked: boolean;
}

/**
 * Semantic data table. Cells stay structured for DOM hosts; a visible `│`
 * separator is rendered between cells for terminal hosts and hidden by the
 * default `installUiStyles` skin in the browser.
 */
@Component({
    selector: 'ui-data-table',
    imports: [PaginationComponent],
    template: `
    <div class="ui-data-table {{tableClass}}">
    <div class="ui-data-table-content" role="table"
        aria-label="{{ariaLabel}}" aria-busy="{{loading}}" aria-rowcount="{{rows.length}}">
        <div class="ui-data-table-caption" role="caption" v-if="caption">{{caption}}</div>
        <div class="ui-data-table-head {{headerClass}}" role="row">
            <span class="ui-data-table-cell ui-data-table-select" role="columnheader" v-if="selectable">
                <span class="ui-data-table-check" role="checkbox" aria-checked="{{selectionState}}"
                    aria-label="{{selectAllLabel}}" tabindex="0" focusable="true"
                    @click="toggleAll($event)" @keydown="selectAllKeydown($event)">
                    <span aria-hidden="true">{{selectionGlyph}}</span>
                </span>
            </span>
            <span class="ui-data-table-cell is-{{column.align || 'left'}} {{headerClassFor(column)}}"
                role="columnheader" aria-sort="{{ariaSortFor(column)}}"
                tabindex="{{column.sortable ? 0 : null}}" [style]="column.style"
                v-for="column in viewColumns" trackBy="key"
                @click="sort(column)" @keydown="headerKeydown($event, column)">{{column.label}}</span>
        </div>
        <div class="{{row.className}}" role="row" aria-selected="{{row.selected}}"
            v-for="row in viewRows" trackBy="key"
            @click="pick(row)">
            <span class="ui-data-table-cell ui-data-table-select" role="cell" v-if="selectable">
                <span class="ui-data-table-check" role="checkbox" aria-checked="{{rowChecked(row)}}"
                    aria-label="{{selectRowLabel}} {{row.index + 1}}" tabindex="0" focusable="true"
                    @click="toggleRow(row, $event)" @keydown="rowKeydown($event, row)">
                    <span aria-hidden="true">{{rowChecked(row) ? '✓' : ' '}}</span>
                </span>
            </span>
            <span class="{{cell.className}}" role="cell"
                v-for="cell in row.cells" trackBy="key">{{cell.text}}</span>
        </div>
        <div class="ui-data-table-loading" role="row" v-if="loading">{{loadingLabel}}</div>
        <div class="ui-data-table-empty" role="row" v-if="!loading && !viewRows.length">{{emptyLabel}}</div>
    </div>
    <div class="ui-data-table-pager" v-if="pagination">
        <ui-pagination :total="rows.length" :pageSize="pageSizeNumber" :page="currentPage"
            :ariaLabel="paginationLabel" :changeAction="pageHandler"></ui-pagination>
    </div>
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
    @Attribute() selectionAction?: (keys: string[], rows: DataTableRow[]) => void;
    @Attribute() sortKey = '';
    @Attribute() sortDirection: DataTableSortDirection | '' = '';
    /** Selected row keys for multi-select (`selectable`). */
    @Attribute() selectedKeys: Array<string | number> = [];
    @Attribute() selectAllLabel = 'Select all rows';
    @Attribute() selectRowLabel = 'Select row';
    /** Built-in page footer (Ant Design Table pagination). */
    @Attribute() page: number | string = 1;
    @Attribute() pageSize: number | string = 10;
    @Attribute() paginationLabel = 'Table pagination';
    @Attribute() pageChangeAction?: (page: number) => void;

    private _pagination = false;
    private _striped = false;
    private _bordered = false;
    private _dense = false;
    private _stickyHeader = false;
    private _loading = false;
    private _selectable = false;

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

    @Attribute()
    get selectable(): boolean { return this._selectable; }
    set selectable(value: boolean | string) { this._selectable = normalizeBoolean(value); }

    @Attribute()
    get pagination(): boolean { return this._pagination; }
    set pagination(value: boolean | string) { this._pagination = normalizeBoolean(value); }

    get pageSizeNumber(): number {
        return Math.max(1, Math.floor(Number(this.pageSize) || 10));
    }

    get pageCount(): number {
        const total = Array.isArray(this.rows) ? this.rows.length : 0;
        return Math.max(1, Math.ceil(total / this.pageSizeNumber));
    }

    get currentPage(): number {
        const page = Math.floor(Number(this.page) || 1);
        return Math.max(1, Math.min(this.pageCount, page));
    }

    get pageHandler(): (page: number) => void {
        return page => this.goToPage(page);
    }

    goToPage(page: number): void {
        const next = Math.max(1, Math.min(this.pageCount, Math.floor(Number(page) || 1)));
        if (next === this.currentPage && Number(this.page) === next) {
            return;
        }
        this.page = next;
        this.pageChangeAction?.(next);
    }

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

    private rowKeys(): string[] {
        return (Array.isArray(this.rows) ? this.rows : []).map((row, index) => this.rowKeyOf(row, index));
    }

    private rowKeyOf(row: DataTableRow, index: number): string {
        return String(typeof this.rowKey === 'function'
            ? this.rowKey(row, index)
            : ((row && row[this.rowKey as string]) ?? index));
    }

    private selectedKeySet(): Set<string> {
        return new Set((Array.isArray(this.selectedKeys) ? this.selectedKeys : []).map(key => String(key)));
    }

    /** Tri-state header checkbox state for the current row set. */
    get selectionState(): 'true' | 'false' | 'mixed' {
        const keys = this.rowKeys();
        if (!keys.length) {
            return 'false';
        }
        const selected = this.selectedKeySet();
        const count = keys.filter(key => selected.has(key)).length;
        if (count === 0) {
            return 'false';
        }
        return count === keys.length ? 'true' : 'mixed';
    }

    get selectionGlyph(): string {
        const state = this.selectionState;
        return state === 'true' ? '✓' : state === 'mixed' ? '-' : ' ';
    }

    rowChecked(row: DataTableViewRow): boolean {
        return this.selectedKeySet().has(row.key);
    }

    toggleRow(row: DataTableViewRow, event?: Event): void {
        event?.stopPropagation?.();
        if (!this._selectable) {
            return;
        }
        const keys = Array.from(this.selectedKeySet());
        const index = keys.indexOf(row.key);
        if (index >= 0) {
            keys.splice(index, 1);
        } else {
            keys.push(row.key);
        }
        this.commitSelection(keys);
    }

    toggleAll(event?: Event): void {
        event?.stopPropagation?.();
        if (!this._selectable) {
            return;
        }
        const keys = Array.from(this.selectedKeySet());
        const allKeys = this.rowKeys();
        const allSelected = allKeys.length > 0 && allKeys.every(key => keys.includes(key));
        const next = allSelected
            ? keys.filter(key => !allKeys.includes(key))
            : Array.from(new Set([...keys, ...allKeys]));
        this.commitSelection(next);
    }

    rowKeydown(event: any, row: DataTableViewRow): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.toggleRow(row, event);
        }
    }

    selectAllKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.toggleAll(event);
        }
    }

    private commitSelection(keys: string[]): void {
        this.selectedKeys = keys;
        const selected = new Set(keys);
        const rows = (Array.isArray(this.rows) ? this.rows : [])
            .filter((row, index) => selected.has(this.rowKeyOf(row, index)));
        this.selectionAction?.(keys.slice(), rows);
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
        const selectedKeys = this.selectedKeySet();
        const size = this.pageSizeNumber;
        const visible = this._pagination
            ? rows.slice((this.currentPage - 1) * size, this.currentPage * size)
            : rows;
        return visible.map(({ row, index }) => {
            const key = this.rowKeyOf(row, index);
            const checked = selectedKeys.has(key);
            const selected = (!!this.selectedKey && String(this.selectedKey) === key) || checked;
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
                selected,
                checked
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
