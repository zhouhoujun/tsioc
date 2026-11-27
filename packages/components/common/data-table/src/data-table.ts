import { Attribute, Component, ElementRef, noReact } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { DataTableKeyboardController } from './data-table.keyboard';
import { DataTableResizeController } from './data-table.resize';
import { buildDataTableColumns, dataTableColumnState, dataTableColumnStyle, dataTableCellStyle } from './data-table.columns';
import { dataTableAriaSort, dataTableSortDirection, dataTableSortPriority, nextDataTableSorts, resolveDataTableSorts } from './data-table.sort';
import { buildDataTableRows } from './data-table.rows';
import { filterDataTableTreeEntries, flattenDataTableTree } from './data-table.tree';
import { commitCellEdit, editCellKeydown, isEditingCell, startCellEdit } from './data-table.edit';
import { normalizeBoolean } from '../../src/ui';
import { PaginationComponent } from '../../pagination/src/pagination';
import {
    DataTableCell,
    DataTableColumn,
    DataTableColumnState,
    DataTableRow,
    DataTableSort,
    DataTableSortDirection,
    DataTableSource,
    DataTableViewColumn,
    DataTableViewRow
} from './data-table.types';
import { DataTableVirtualWindow, resolveDataTableVirtualWindow } from './data-table.virtual';
import {
    dataTableClass,
    dataTableHeaderClass,
    filterDataTableRows,
    formatDataTableCell,
    hasActiveDataTableFilters,
    hasFilterableDataTableColumns,
    sortDataTableRowsBy
} from './data-table.view';
export * from './data-table.types';

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
    <div class="ui-data-table-scroll" @scroll="onScroll($event)">
    <div class="ui-data-table-content" role="table"
        aria-label="{{ariaLabel}}" aria-busy="{{loading}}" aria-rowcount="{{tableTotal}}">
        <div class="ui-data-table-caption" role="caption" v-if="caption">{{caption}}</div>
        <div class="ui-data-table-head {{headerClass}}" role="row">
            <span class="ui-data-table-cell ui-data-table-expand" role="columnheader" aria-hidden="true" v-if="expandable"></span>
            <span class="ui-data-table-cell ui-data-table-select" role="columnheader" v-if="selectable">
                <span class="ui-data-table-check" role="checkbox" aria-checked="{{selectionState}}"
                    aria-label="{{selectAllLabel}}" tabindex="0" focusable="true"
                    @click="toggleAll($event)" @keydown="selectAllKeydown($event)">
                    <span aria-hidden="true">{{selectionGlyph}}</span>
                </span>
            </span>
            <span class="{{column.headerClass}}"
                role="columnheader" aria-sort="{{ariaSortFor(column)}}"
                tabindex="{{column.sortable ? 0 : null}}" [style]="columnStyle(column)"
                v-for="column in viewColumns" trackBy="key"
                @click="sort(column)" @keydown="headerKeydown($event, column)">{{column.label}}<span
                    class="ui-data-table-sort" aria-hidden="true" v-if="column.sortGlyph">{{column.sortGlyph}}</span><span
                    class="ui-data-table-resizer" v-if="column.resizable"
                    @mousedown="startResize(column, $event)" @click="stopResizeClick($event)"></span></span>
        </div>
        <div class="ui-data-table-filter-row" role="row" v-if="hasFilterableColumns">
            <span class="ui-data-table-cell ui-data-table-expand" role="cell" aria-hidden="true" v-if="expandable"></span>
            <span class="ui-data-table-cell ui-data-table-select" role="cell" aria-hidden="true" v-if="selectable"></span>
            <span class="ui-data-table-cell ui-data-table-filter-cell" role="cell"
                v-for="column in viewColumns" trackBy="key">
                <input class="ui-data-table-filter" type="search" v-if="column.filterable"
                    value="{{(filters && filters[column.key]) || ''}}"
                    aria-label="{{column.label || column.key}}"
                    placeholder="{{column.label || column.key}}"
                    @input="filterColumn(column, $event)" />
            </span>
            <span class="ui-data-table-filter-clear-cell" role="cell" v-if="hasActiveFilters"><button class="ui-data-table-filter-clear" type="button" @click="clearFilters">{{clearFiltersLabel}}</button></span>
        </div>
        <div class="ui-data-table-spacer" v-if="virtual && virtualTopHeight" [style]="spacerStyle(virtualTopHeight)"></div>
        <div class="ui-data-table-row-group" v-for="row in viewRows" trackBy="key">
        <div class="ui-data-table-group-row" role="row" v-if="row.kind === 'group'">
            <span class="ui-data-table-group-label" role="cell">{{row.groupLabel}}</span>
        </div>
        <div class="{{row.className}}" role="row" aria-selected="{{row.selected}}"
            v-if="row.kind !== 'group'" data-row-key="{{row.key}}" @click="pick(row)">
            <span class="ui-data-table-cell ui-data-table-expand" role="cell" v-if="expandable">
                <span class="ui-data-table-expander" role="button" tabindex="0" focusable="true"
                    aria-expanded="{{rowExpanded(row)}}"
                    aria-label="{{rowExpanded(row) ? collapseLabel : expandLabel}}"
                    @click="toggleExpand(row, $event)" @keydown="expandKeydown($event, row)">
                    <span aria-hidden="true">{{rowExpanded(row) ? '▾' : '▸'}}</span>
                </span>
            </span>
            <span class="ui-data-table-cell ui-data-table-select" role="cell" v-if="selectable">
                <span class="ui-data-table-check" role="checkbox" aria-checked="{{rowChecked(row)}}"
                    aria-label="{{selectRowLabel}} {{row.index + 1}}" tabindex="0" focusable="true"
                    @click="toggleRow(row, $event)" @keydown="rowKeydown($event, row)">
                    <span aria-hidden="true">{{rowChecked(row) ? '✓' : ' '}}</span>
                </span>
            </span>
            <span class="{{cell.className}} {{isEditing(cell) ? 'is-editing' : ''}}" role="cell"
                data-cell-key="{{cell.key}}" tabindex="{{cellTabIndex(row, cell)}}"
                focusable="{{cellFocusable(cell)}}" v-for="cell in row.cells" trackBy="key"
                [style]="cellStyleFor(cell)" @click="focusCellOnly(row, cell, $event)"
                @focus="focusCellOnly(row, cell)" @keydown="onCellKeydown($event, row, cell)">
                <input class="ui-data-table-edit" v-if="isEditing(cell)" [value]="editDraft"
                    aria-invalid="{{!!editError}}" @input="editInput($event)"
                    @keydown="editKeydown($event, row, cell)" @blur="commitEdit(row, cell)" />
                <span class="ui-data-table-edit-error" role="alert" v-if="isEditing(cell) && editError">{{editError}}</span>
                <span class="ui-data-table-cell-text" v-else>{{cell.text}}</span>
            </span>
        </div>
        <div class="ui-data-table-detail-row" role="row" v-if="expandable && rowExpanded(row)">
            <span class="ui-data-table-cell ui-data-table-detail" role="cell">
                <span class="ui-data-table-detail-line" v-for="line in detailLinesFor(row)">{{line}}</span>
            </span>
        </div>
        </div>
        <div class="ui-data-table-spacer" v-if="virtual && virtualBottomHeight" [style]="spacerStyle(virtualBottomHeight)"></div>
        <div class="ui-data-table-error ui-data-table-empty" role="alert" v-if="asyncError">
            <span>{{asyncError || errorLabel}}</span>
            <button class="ui-data-table-retry ui-plain-button" type="button" @click="retry">{{retryLabel}}</button>
        </div>
        <div class="ui-data-table-loading" role="row" v-if="loading">{{loadingLabel}}</div>
        <div class="ui-data-table-empty" role="row" v-if="!loading && !viewRows.length">{{emptyLabel}}</div>
    </div>
    </div>
    <div class="ui-data-table-pager" v-if="pagination">
        <ui-pagination :total="tableTotal" :pageSize="pageSizeNumber" :page="currentPage"
            :ariaLabel="paginationLabel" :changeAction="pageHandler"></ui-pagination>
    </div>
    </div>`
})
export class DataTableComponent {
    constructor(@Optional() protected elementRef?: ElementRef) { markElementRefRaw(elementRef); }
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
    /** Opt-in cell editing; Enter/double-click starts, Enter commits, Escape cancels. */
    @Attribute()
    get editable(): boolean { return this._editable; }
    set editable(value: boolean | string) { this._editable = normalizeBoolean(value); }
    @Attribute() editAction?: (row: DataTableRow, columnKey: string, value: string) => void;
    @Attribute() editValidateAction?: (row: DataTableRow, columnKey: string, value: string) => string | undefined | Promise<string | undefined>;
    /** Optional row grouping label; group headers appear before each run. */
    @Attribute() groupBy?: (row: DataTableRow) => string;
    /** Render `rows` as a hierarchy; children are flattened below their parent. */
    @Attribute()
    get treeRows(): boolean { return this._treeRows; }
    set treeRows(value: boolean | string) { this._treeRows = normalizeBoolean(value); }
    @Attribute() treeChildren = 'children';
    @Attribute() selectionAction?: (keys: string[], rows: DataTableRow[]) => void;
    @Attribute() sortKey = '';
    @Attribute() sortDirection: DataTableSortDirection | '' = '';
    /** Controlled column order (keys first, remaining columns keep source order). */
    @Attribute() columnOrder: string[] = [];
    /** Controlled hidden column keys in addition to `DataTableColumn.hidden`. */
    @Attribute() hiddenColumns: string[] = [];
    /** Controlled column widths; pointer resizing updates this map. */
    @Attribute() columnWidths: Record<string, number> = {};
    /** Persistence hook after a resize gesture; hosts store `order/hidden/widths`. */
    @Attribute() columnChangeAction?: (state: DataTableColumnState) => void;
    /** Opt-in multi-column sorting; headers cycle asc -> desc -> none. */
    @Attribute()
    get multiSort(): boolean { return this._multiSort; }
    set multiSort(value: boolean | string) { this._multiSort = normalizeBoolean(value); }
    @Attribute() sorts: DataTableSort[] = [];
    @Attribute() sortsAction?: (sorts: DataTableSort[]) => void;
    /** Selected row keys for multi-select (`selectable`). */
    @Attribute() selectedKeys: Array<string | number> = [];
    @Attribute() selectAllLabel = 'Select all rows';
    @Attribute() selectRowLabel = 'Select row';
    /** Expandable rows with host-provided detail lines. */
    @Attribute() expandedKeys: Array<string | number> = [];
    @Attribute() expandLabel = 'Expand row';
    @Attribute() collapseLabel = 'Collapse row';
    @Attribute() expandAction?: (key: string, expanded: boolean, row: DataTableRow) => void;
    @Attribute() detailLines?: (row: DataTableRow, index: number) => string[];
    /** Built-in page footer (Ant Design Table pagination). */
    @Attribute() page: number | string = 1;
    @Attribute() pageSize: number | string = 10;
    @Attribute() paginationLabel = 'Table pagination';
    @Attribute() pageChangeAction?: (page: number) => void;
    /** Async/server data source; when set, page/sort changes reload from the host. */
    @Attribute() source?: DataTableSource;
    @Attribute() errorLabel = 'Failed to load table data';
    @Attribute() retryLabel = 'Retry';
    /** Per-column filter strings applied to local rows or sent to an async source. */
    @Attribute() filters: Record<string, string> = {};
    @Attribute() filterAction?: (filters: Record<string, string>) => void;
    @Attribute() clearFiltersLabel = 'Clear filters';
    /** Render only rows near the scroll viewport; hosts supply `scrollTop`/`viewportHeight`. */
    @Attribute() virtual = false;
    @Attribute() virtualRowHeight = 32;
    @Attribute() virtualOverscan = 2;
    @Attribute() scrollTop = 0;
    @Attribute() viewportHeight = 0;
    @Attribute() windowAction?: (start: number, end: number, total: number) => void;

    private _pagination = false;
    private _expandable = false;
    private _striped = false;
    private _bordered = false;
    private _dense = false;
    private _stickyHeader = false;
    private _loading = false;
    private _selectable = false;
    private _resizableColumns = false;
    private _keyboardNavigation = false;
    private _multiSort = false;
    private _treeRows = false;
    private _editable = false;
    editKey = '';
    editDraft = '';
    editError = '';
    private lastClickKey = '';
    private lastClickAt = 0;
    private keyboardController?: DataTableKeyboardController;
    private resizeController?: DataTableResizeController;
    protected get keyboardNav(): DataTableKeyboardController { return this.keyboardController ??= new DataTableKeyboardController(this); }
    protected get resizeControl(): DataTableResizeController {
        return this.resizeController ??= new DataTableResizeController({
            enabled: () => this._resizableColumns,
            getWidth: key => this.columnWidths[key],
            setWidth: (key, width) => { this.columnWidths = { ...this.columnWidths, [key]: width }; },
            end: () => this.columnChangeAction?.(this.columnState)
        });
    }
    private _asyncRows: DataTableRow[] = [];
    private _asyncTotal = 0;
    private _asyncError = '';
    private _asyncLoading = false;
    private asyncRequest = 0;
    private asyncAbort?: AbortController;
    private activeCellKey = '';

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
    get loading(): boolean { return this._loading || this._asyncLoading; }
    set loading(value: boolean | string) { this._loading = normalizeBoolean(value); }

    @Attribute()
    get selectable(): boolean { return this._selectable; }
    set selectable(value: boolean | string) { this._selectable = normalizeBoolean(value); }

    @Attribute()
    get pagination(): boolean { return this._pagination; }
    set pagination(value: boolean | string) { this._pagination = normalizeBoolean(value); }

    @Attribute()
    get expandable(): boolean { return this._expandable; }
    set expandable(value: boolean | string) { this._expandable = normalizeBoolean(value); }

    @Attribute()
    get resizableColumns(): boolean { return this._resizableColumns; }
    set resizableColumns(value: boolean | string) { this._resizableColumns = normalizeBoolean(value); }

    /** Opt-in grid keyboard navigation across data cells. */
    @Attribute()
    get keyboardNavigation(): boolean { return this._keyboardNavigation; }
    set keyboardNavigation(value: boolean | string) { this._keyboardNavigation = normalizeBoolean(value); }
    get pageSizeNumber(): number { return Math.max(1, Math.floor(Number(this.pageSize) || 10)); }
    get pageCount(): number { return Math.max(1, Math.ceil(this.tableTotal / this.pageSizeNumber)); }
    get currentPage(): number {
        const page = Math.floor(Number(this.page) || 1);
        return Math.max(1, Math.min(this.pageCount, page));
    }
    get pageHandler(): (page: number) => void { return page => this.goToPage(page); }

    goToPage(page: number): void {
        const next = Math.max(1, Math.min(this.pageCount, Math.floor(Number(page) || 1)));
        if (next === this.currentPage && Number(this.page) === next) {
            return;
        }
        this.page = next;
        this.pageChangeAction?.(next);
        if (this.source) {
            void this.reload();
        }
    }
    get tableClass(): string {
        return dataTableClass({
            striped: this._striped,
            bordered: this._bordered,
            dense: this._dense,
            sticky: this._stickyHeader,
            className: this.className
        });
    }
    get headerClass(): string {
        return dataTableHeaderClass(this._stickyHeader);
    }
    get viewColumns(): DataTableViewColumn[] {
        return buildDataTableColumns(
            this.columns,
            this.columnWidths,
            this._resizableColumns,
            column => dataTableSortDirection(this.activeSorts, column),
            this.columnOrder,
            this.hiddenColumns,
            column => this.multiSort ? dataTableSortPriority(this.activeSorts, column) : 0
        );
    }

    stopResizeClick(event?: Event): void { this.resizeControl.stopClick(event); }
    startResize(column: DataTableViewColumn, event?: any): void { this.resizeControl.start(column, event); }
    onInit(): void {
        if (this.source) {
            void this.reload();
        }
    }
    get tableRows(): DataTableRow[] {
        return this.source ? this._asyncRows : (Array.isArray(this.rows) ? this.rows : []);
    }
    get hasFilterableColumns(): boolean { return hasFilterableDataTableColumns(this.viewColumns); }
    get hasActiveFilters(): boolean { return hasActiveDataTableFilters(this.filters); }
    get tableTotal(): number {
        return this.source && this._asyncTotal > 0 ? this._asyncTotal : this.filteredEntries.length;
    }
    get treeEntries(): Array<{ row: DataTableRow; index: number; depth: number; parentKey: string }> {
        return this.treeRows
            ? flattenDataTableTree(this.rows, this.treeChildren, (row, index) => this.rowKeyOf(row, index))
            : [];
    }
    get sourceRows(): DataTableRow[] {
        return this.treeRows ? this.treeEntries.map(entry => entry.row) : this.tableRows;
    }
    get filteredEntries() {
        return this.treeRows
            ? filterDataTableTreeEntries(this.treeEntries, this.filters)
            : filterDataTableRows(this.tableRows, this.filters);
    }
    get columnState(): DataTableColumnState { return dataTableColumnState(this.columns, this.columnOrder, this.hiddenColumns, this.columnWidths); }

    /** Restore the declarative column layout and persist the reset. */
    resetColumnLayout(): DataTableColumnState {
        this.columnOrder = []; this.hiddenColumns = []; this.columnWidths = {};
        const state = this.columnState; this.columnChangeAction?.(state); return state;
    }
    get activeSorts(): DataTableSort[] {
        return resolveDataTableSorts(this.multiSort, this.sorts, this.sortKey, this.sortDirection);
    }
    get sortedEntries() {
        const sorts = this.activeSorts;
        return sorts.length ? sortDataTableRowsBy(this.filteredEntries, sorts) : this.filteredEntries;
    }
    get pageEntries() {
        const rows = this.sortedEntries;
        const size = this.pageSizeNumber;
        return this._pagination
            ? rows.slice((this.currentPage - 1) * size, this.currentPage * size)
            : rows;
    }
    get virtualWindow(): DataTableVirtualWindow {
        return resolveDataTableVirtualWindow({
            enabled: !!this.virtual,
            paginated: this._pagination,
            total: this.pageEntries.length,
            scrollTop: Number(this.scrollTop) || 0,
            viewportHeight: Number(this.viewportHeight) || 0,
            rowHeight: Number(this.virtualRowHeight) || 32,
            overscan: Number(this.virtualOverscan) || 0
        });
    }
    get windowEntries() {
        const window = this.virtualWindow;
        return this.pageEntries.slice(window.start, window.end);
    }
    get virtualTopHeight(): number {
        return this.virtualWindow.topHeight;
    }
    get virtualBottomHeight(): number {
        return this.virtualWindow.bottomHeight;
    }

    spacerStyle(height: number): Record<string, string> {
        return { height: `${height}px` };
    }

    onScroll(event: any): void {
        const target = event?.currentTarget;
        this.scrollTop = Number(target?.scrollTop) || 0;
        this.viewportHeight = Number(target?.clientHeight) || this.viewportHeight;
        const window = this.virtualWindow;
        this.windowAction?.(window.start, window.end, this.pageEntries.length);
    }
    filterColumn(column: DataTableViewColumn, event: any): void { this.setFilter(column.key, event?.target?.value); }

    setFilter(key: string, value: any): void {
        this.filters = { ...(this.filters || {}), [key]: String(value ?? '') };
        this.page = 1;
        this.filterAction?.(this.filters);
        if (this.source) {
            void this.reload();
        }
    }

    clearFilters(): void {
        if (!Object.keys(this.filters || {}).length) {
            return;
        }
        this.filters = {};
        this.page = 1;
        this.filterAction?.(this.filters);
        if (this.source) {
            void this.reload();
        }
    }
    get asyncError(): string {
        return this._asyncError;
    }

    async reload(): Promise<void> {
        const source = this.source;
        if (!source) {
            return;
        }
        this.asyncAbort?.abort();
        const aborter = new AbortController();
        // AbortController uses private fields; the reactive proxy would break
        // `abort()`/`signal` identity if it wrapped them.
        (aborter as any)[noReact] = true;
        (aborter.signal as any)[noReact] = true;
        this.asyncAbort = aborter;
        const request = ++this.asyncRequest;
        this._asyncLoading = true;
        this._asyncError = '';
        try {
            const page = await source({
                page: this.currentPage,
                pageSize: this.pageSizeNumber,
                ...(this.sortKey ? { sortKey: this.sortKey } : {}),
                ...(this.sortDirection ? { sortDirection: this.sortDirection } : {}),
                ...(this.multiSort && this.activeSorts.length ? { sorts: this.activeSorts } : {}),
                ...(Object.keys(this.filters || {}).length ? { filters: { ...this.filters } } : {})
            }, aborter.signal);
            if (request !== this.asyncRequest) {
                return;
            }
            this._asyncRows = Array.isArray(page?.rows) ? page.rows : [];
            this._asyncTotal = Number.isFinite(page?.total) ? Number(page.total) : this._asyncRows.length;
            this._asyncError = String(page?.error ?? '');
        } catch (error) {
            if (request !== this.asyncRequest) {
                return;
            }
            this._asyncRows = [];
            this._asyncTotal = 0;
            this._asyncError = error instanceof Error ? error.message : String(error);
        } finally {
            if (request === this.asyncRequest) {
                this._asyncLoading = false;
            }
        }
    }

    retry(): void {
        void this.reload();
    }

    onDestroy(): void {
        this.resizeController?.destroy();
    }
    columnStyle(column: DataTableViewColumn): Record<string, string> | undefined { return dataTableColumnStyle(this.columns, this.columnWidths, column); }
    cellStyleFor(cell: DataTableCell): Record<string, string> | undefined { return dataTableCellStyle(this.columns, this.columnWidths, this.viewColumns, cell); }

    cellFocusable(cell: DataTableCell): boolean { return this.keyboardNav.cellFocusable(cell); }

    cellTabIndex(row: DataTableViewRow, cell: DataTableCell): number {
        return this.keyboardNav.cellTabIndex(row, cell, this.activeCellKey);
    }
    focusCellOnly(row: DataTableViewRow, cell: DataTableCell, event?: any): void {
        const key = this.keyboardNav.focusCellOnly(row, cell);
        if (key) { this.activeCellKey = key; }
        if (!this._editable || !cell?.columnKey || event?.type !== 'click') { return; }
        const now = Date.now();
        if (this.lastClickKey === cell.key && now - this.lastClickAt < 400) {
            this.lastClickKey = '';
            this.startEdit(row, cell);
            return;
        }
        this.lastClickKey = cell.key;
        this.lastClickAt = now;
    }

    onCellKeydown(event: any, row: DataTableViewRow, cell: DataTableCell): void {
        if (this._editable && String(event?.key || '') === 'Enter') {
            event.preventDefault?.();
            this.startEdit(row, cell);
            return;
        }
        const target = this.keyboardNav.onKeydown(event, row, cell);
        if (target) { this.activeCellKey = target.key; this.focusCellNode(target.rowIndex, target.cellIndex); }
    }
    isEditing(cell: DataTableCell): boolean { return isEditingCell(this, cell); }
    startEdit(row: DataTableViewRow, cell: DataTableCell): void { startCellEdit(this, row, cell, this.elementRef?.nativeElement); }
    editInput(event: any): void { this.editDraft = String(event?.target?.value ?? ''); }
    commitEdit(row: DataTableViewRow, cell: DataTableCell): void { void commitCellEdit(this, row, cell); }
    cancelEdit(): void { this.editKey = ''; this.editError = ''; }
    editKeydown(event: any, row: DataTableViewRow, cell: DataTableCell): void { editCellKeydown(this, event, row, cell); }
    protected focusCellNode(rowIndex: number, cellIndex: number): void {
        const rows = this.elementRef?.nativeElement?.querySelectorAll?.('.ui-data-table-row');
        const cells = rows?.[rowIndex]?.querySelectorAll?.('.is-data-cell');
        cells?.[cellIndex]?.focus?.();
    }
    sort(column: DataTableViewColumn): void {
        if (!column.sortable) {
            return;
        }
        const key = column.sortKey || column.key;
        if (this.multiSort) {
            const sorts = nextDataTableSorts(this.activeSorts, key);
            this.sorts = sorts;
            this.sortsAction?.(sorts.map(item => ({ ...item })));
        } else {
            const direction: DataTableSortDirection = this.sortKey === key && this.sortDirection === 'asc' ? 'desc' : 'asc';
            this.sortKey = key;
            this.sortDirection = direction;
            this.sortAction?.(key, direction);
        }
        if (this.source) {
            void this.reload();
        }
    }

    /** `aria-sort` token for a header, honouring multi-sort priority. */
    ariaSortFor(column: DataTableViewColumn): string {
        return dataTableAriaSort(this.activeSorts, column);
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

    rowExpanded(row: DataTableViewRow): boolean {
        return (Array.isArray(this.expandedKeys) ? this.expandedKeys : []).some(key => String(key) === row.key);
    }

    detailLinesFor(row: DataTableViewRow): string[] {
        if (!this.detailLines) {
            return [];
        }
        const lines = this.detailLines(this.tableRows[row.index], row.index);
        return Array.isArray(lines) ? lines.map(line => String(line ?? '')) : [];
    }
    toggleExpand(row: DataTableViewRow, event?: Event): void {
        event?.stopPropagation?.();
        if (!this._expandable) {
            return;
        }
        const keys = (Array.isArray(this.expandedKeys) ? this.expandedKeys : []).map(String);
        const index = keys.indexOf(row.key);
        const expanded = index < 0;
        if (expanded) {
            keys.push(row.key);
        } else {
            keys.splice(index, 1);
        }
        this.expandedKeys = keys;
        this.expandAction?.(row.key, expanded, this.tableRows[row.index]);
    }
    expandKeydown(event: any, row: DataTableViewRow): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.toggleExpand(row, event);
        }
    }
    private rowKeys(): string[] {
        return this.tableRows.map((row, index) => this.rowKeyOf(row, index));
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
        const rows = this.tableRows
            .filter((row, index) => selected.has(this.rowKeyOf(row, index)));
        this.selectionAction?.(keys.slice(), rows);
    }
    get viewRows(): DataTableViewRow[] {
        return buildDataTableRows(
            this.windowEntries,
            this.viewColumns,
            this.selectedKeySet(),
            this.selectedKey,
            this.sourceRows,
            (row, index) => this.rowKeyOf(row, index),
            this.groupBy
        );
    }
    pick(row: DataTableViewRow): void {
        if (!this.rowAction) {
            return;
        }
        this.rowAction(this.sourceRows[row.index], row.index);
    }
}
