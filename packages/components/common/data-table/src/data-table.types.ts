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
    /** Keep the column sticky at the left/right edge (browser skin). */
    fixed?: 'left' | 'right';
    /** Opt this column into pointer resizing; defaults to on when enabled. */
    resizable?: boolean;
}

export type DataTableRow = Record<string, any>;

export interface DataTableCell {
    key: string;
    columnKey?: string;
    text: string;
    className: string;
    style?: Record<string, string>;
}

export interface DataTableViewColumn {
    key: string;
    label: string;
    className: string;
    headerClass: string;
    cellClass: string;
    align: DataTableAlign;
    style?: Record<string, string>;
    cellStyle?: Record<string, string>;
    sortable: boolean;
    sortKey?: string;
    resizable: boolean;
    ariaSort: 'ascending' | 'descending' | 'none';
}

export interface DataTableViewRow {
    key: string;
    index: number;
    cells: DataTableCell[];
    className: string;
    selected: boolean;
    checked: boolean;
}

export interface DataTablePageRequest {
    page: number;
    pageSize: number;
    sortKey?: string;
    sortDirection?: DataTableSortDirection;
}

export interface DataTablePage {
    rows: DataTableRow[];
    total?: number;
    error?: string;
}

export type DataTableSource = (request: DataTablePageRequest, signal: AbortSignal) => Promise<DataTablePage>;
