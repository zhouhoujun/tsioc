import { Attribute, Component, Computed } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';

/** One rendered row of a {@link ListComponent}. */
export interface ListItem {
    id: string;
    label: string;
    value?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
    /** Selected row state for panel-style lists (`aria-selected`). */
    selected?: boolean | string;
}

/** @deprecated Use {@link ListItem}. */
export type ListEntry = ListItem;

export interface ListPage<T extends { id: string } = ListItem> {
    items: T[];
    /** Whether a further page exists. Defaults to false for array results. */
    hasMore?: boolean;
    /** Cursor for the next page; defaults to the last item id. */
    nextCursor?: string;
}

export type ListLoader<T extends { id: string } = ListItem> = (
    cursor?: string
) => Promise<ListPage<T> | T[]>;

/** Loads the page *before* the current window (scrolling up / older history). */
export type ListPreviousLoader<T extends { id: string } = ListItem> = (
    cursor?: string
) => Promise<ListPage<T> | T[]>;

function normalizePage<T extends { id: string }>(result: ListPage<T> | T[] | undefined): ListPage<T> & { hasMore: boolean } {
    if (Array.isArray(result)) {
        return { items: result, hasMore: false };
    }
    return {
        items: Array.isArray(result?.items) ? result!.items : [],
        hasMore: result?.hasMore === true,
        nextCursor: result?.nextCursor
    };
}

/**
 * Renderer-neutral paged list state. Hosts can own it directly (for example a
 * session selector) or bind it to {@link ListComponent}. Concurrent calls
 * are ignored and duplicate ids are dropped, so wheel/key bursts cannot enqueue
 * the same page twice.
 */
export class ListPager<T extends { id: string } = ListItem> {
    items: T[] = [];
    cursor?: string;
    hasMore = true;
    /** Cursor for the page before the current window (older history). */
    previousCursor?: string;
    hasPrevious = false;
    loading = false;
    error = '';
    protected request = 0;

    constructor(protected readonly loader?: ListLoader<T>) {
    }

    reset(items: T[] = [], hasMore = true, hasPrevious = false): void {
        this.request += 1;
        this.items = items.slice();
        this.cursor = this.items[this.items.length - 1]?.id;
        this.hasMore = hasMore;
        this.previousCursor = this.items[0]?.id;
        this.hasPrevious = hasPrevious;
        this.loading = false;
        this.error = '';
    }

    async loadMore(loader: ListLoader<T> | undefined = this.loader): Promise<boolean> {
        if (!loader || this.loading || !this.hasMore) {
            return false;
        }
        const request = ++this.request;
        this.loading = true;
        this.error = '';
        try {
            const page = normalizePage(await loader(this.cursor));
            if (request !== this.request) {
                return false;
            }
            const known = new Set(this.items.map(item => String(item.id)));
            const fresh = page.items.filter(item => item && !known.has(String(item.id)));
            if (fresh.length) {
                this.items = [...this.items, ...fresh];
            }
            this.cursor = page.nextCursor || this.items[this.items.length - 1]?.id;
            this.hasMore = page.hasMore;
            return fresh.length > 0;
        } catch (error) {
            if (request === this.request) {
                this.error = error instanceof Error ? error.message : String(error);
            }
            return false;
        } finally {
            if (request === this.request) {
                this.loading = false;
            }
        }
    }

    /**
     * Load one older page and prepend it. `ListPage.hasMore` describes whether
     * another page exists *before* the returned page, mirroring `loadMore`.
     */
    async loadPrevious(loader: ListPreviousLoader<T> | undefined = this.loader): Promise<boolean> {
        if (!loader || this.loading || !this.hasPrevious) {
            return false;
        }
        const request = ++this.request;
        this.loading = true;
        this.error = '';
        try {
            const page = normalizePage(await loader(this.previousCursor));
            if (request !== this.request) {
                return false;
            }
            const known = new Set(this.items.map(item => String(item.id)));
            const fresh = page.items.filter(item => item && !known.has(String(item.id)));
            if (fresh.length) {
                this.items = [...fresh, ...this.items];
            }
            this.previousCursor = page.nextCursor || this.items[0]?.id;
            this.hasPrevious = page.hasMore;
            return fresh.length > 0;
        } catch (error) {
            if (request === this.request) {
                this.error = error instanceof Error ? error.message : String(error);
            }
            return false;
        } finally {
            if (request === this.request) {
                this.loading = false;
            }
        }
    }
}

/**
 * Shared list surface with paged, windowed drawing. TUI and DOM renderers own
 * spacing, while paging semantics (cursor, dedupe, hasMore, loading) stay
 * identical. `visibleItems` bounds how many rows are painted, so a huge loaded
 * list only draws one window; call `onReachEnd()` / `onReachStart()` from a
 * viewport/scroll boundary (or let the user click the load buttons).
 */
@Component({
    selector: 'list, ui-list',
    template: `
    <div class="console-panel list-panel {{panelClass}}" role="dialog" aria-label="{{ariaLabel}}" aria-activedescendant="{{activeOptionId}}">
        <label class="dialog-close" role="button" tabindex="0" focusable="true"
            aria-label="{{closeTitle}}" data-cell-width="2" v-show="showClose"
            @click="close" @keydown="closeKeydown($event)">{{closeLabel}}</label>
        <label class="list-panel-header" v-show="header">{{header}}</label>
        <label class="list-panel-title" v-show="title">{{title}}</label>
        <label class="list-panel-meta" v-show="context">{{context}}</label>
        <label class="list-panel-meta" v-show="meta">{{meta}}</label>
        <label class="list-panel-context" v-for="line in contextLines">{{line}}</label>
        <div class="list" role="listbox" aria-label="{{listLabel || ariaLabel}}"
            aria-busy="{{loading}}" aria-activedescendant="{{activeOptionId}}"
            [style]="scrollStyle">
            <label class="list-more list-previous" role="button" tabindex="0" focusable="true"
                v-show="hasPrevious || windowStart > 0" @click="onReachStart"
                @keydown="olderKeydown($event)">{{olderLabel}}</label>
            <div id="{{item.id}}" class="list-row {{item.className}}" role="option" aria-selected="{{item.selected === true || item.selected === 'true' ? 'true' : 'false'}}" v-for="item in renderedItems" trackBy="id" @click="selectItem(item)">
                <span class="list-label">{{item.label}}</span>
                <span class="list-description" v-if="item.description"> {{item.description}}</span>
            </div>
            <label class="list-empty" v-show="!items.length && !loading">{{emptyLabel}}</label>
            <label class="list-loading" v-show="loading" aria-live="polite">{{loadingLabel}}</label>
            <label class="list-error" role="alert" v-show="error">{{error}}</label>
            <button class="list-more" v-show="hasMore && !loading && atWindowEnd" @click="loadMore">{{moreLabel}}</button>
        </div>
        <ui-scrollbar v-if="showScrollbar && windowed" orientation="horizontal"
            :offset="windowStart" :visible="visibleItems" :total="items.length"
            :length="scrollbarLength" :ariaLabel="'List scrollbar'"></ui-scrollbar>
        <label class="list-panel-detail" v-for="line in detailLines">{{line}}</label>
        <label class="list-panel-hint" v-show="hint">{{hint}}</label>
        <label class="list-panel-hint" v-show="secondaryHint">{{secondaryHint}}</label>
    </div>`
})
export class ListComponent {
    @Attribute() items: ListItem[] = [];
    /** Browser-side viewport guard; empty disables the inline scroll box. */
    @Attribute() maxHeight = '60vh';
    @Attribute() cursor?: string;
    @Attribute() hasMore = true;
    @Attribute() loading = false;
    @Attribute() error = '';
    @Attribute() emptyLabel = '';
    /** @deprecated Use `emptyLabel`. */
    @Attribute()
    get empty(): string { return this.emptyLabel; }
    set empty(value: string) { this.emptyLabel = String(value ?? ''); }
    @Attribute() loadingLabel = 'Loading…';
    @Attribute() moreLabel = 'Load more';
    @Attribute() olderLabel = 'Load older';
    @Attribute() ariaLabel = 'List';
    @Attribute() loadPage?: ListLoader;
    @Attribute() loadPreviousPage?: ListPreviousLoader;
    @Attribute() selectAction?: (item: ListItem) => void;
    @Attribute() selectValueAction?: (value: string) => void;
    @Attribute() closeAction?: () => void;
    @Attribute() closeLabel = '✕';
    @Attribute() closeTitle = 'Close';
    @Attribute() showClose = false;
    /** Panel chrome shared with inspector/list surfaces. */
    @Attribute() panelClass = '';
    @Attribute() header = '';
    @Attribute() title = '';
    @Attribute() context = '';
    @Attribute() meta = '';
    @Attribute() contextLines: string[] = [];
    @Attribute() hint = '';
    @Attribute() secondaryHint = '';
    @Attribute() listLabel = '';
    @Attribute() activeOptionId = '';
    @Attribute() detailLines: string[] = [];
    /** Load the first page when the component mounts empty. */
    @Attribute() autoLoad = false;
    /** Rows painted at once; 0 paints the whole loaded list. */
    @Attribute() visibleItems = 0;
    /** Render a horizontal TUI-friendly scrollbar when the list is windowed. */
    @Attribute() scrollbarLength = 16;
    /** Index of the first painted row inside `items`. */
    @Attribute() windowOffset = 0;
    @Attribute() hasPrevious = false;
    @Attribute() previousCursor?: string;
    protected readonly pager = new ListPager<ListItem>();
    private _showScrollbar = false;

    @Attribute()
    get showScrollbar(): boolean { return this._showScrollbar; }
    set showScrollbar(value: boolean | string) { this._showScrollbar = normalizeBoolean(value); }

    get windowed(): boolean {
        const size = Math.floor(Number(this.visibleItems) || 0);
        return size > 0 && this.items.length > size;
    }

    onInit(): void {
        if (this.autoLoad && !this.items.length && this.loadPage) {
            void this.loadMore();
        }
    }

    get scrollStyle(): Record<string, string> {
        return this.maxHeight
            ? {
                'max-height': String(this.maxHeight),
                'overflow-y': 'auto',
                'overscroll-behavior': 'contain'
            }
            : {};
    }

    /** Index of the first painted row after clamping to the loaded items. */
    @Computed()
    get windowStart(): number {
        const size = Math.floor(Number(this.visibleItems) || 0);
        if (size <= 0) {
            return 0;
        }
        const max = Math.max(0, this.items.length - size);
        return Math.max(0, Math.min(Math.floor(Number(this.windowOffset) || 0), max));
    }

    /** Whether the painted window reaches the last loaded row. */
    @Computed()
    get atWindowEnd(): boolean {
        const size = Math.floor(Number(this.visibleItems) || 0);
        return size <= 0 || this.windowStart + size >= this.items.length;
    }

    /** Rows painted for the current window (large data never paints at once). */
    @Computed()
    get renderedItems(): ListItem[] {
        const size = Math.floor(Number(this.visibleItems) || 0);
        if (size <= 0) {
            return this.items;
        }
        const start = this.windowStart;
        return this.items.slice(start, start + size);
    }

    /** Called by a renderer/scroll adapter when the last row becomes visible. */
    onReachEnd(): void {
        const size = Math.floor(Number(this.visibleItems) || 0);
        if (size > 0 && this.windowStart + size < this.items.length) {
            this.windowOffset = this.windowStart + size;
            return;
        }
        void this.loadMore();
    }

    /** Called by a renderer/scroll adapter when the first row becomes visible. */
    onReachStart(): void {
        const size = Math.floor(Number(this.visibleItems) || 0);
        if (size > 0 && this.windowStart > 0) {
            this.windowOffset = Math.max(0, this.windowStart - size);
            return;
        }
        void this.loadPrevious();
    }

    async loadMore(): Promise<boolean> {
        if (!this.loadPage || this.loading || !this.hasMore) {
            return false;
        }
        // The component is a thin reactive projection of the shared pager:
        // cursor/hasMore/loading/dedupe stay identical to timeline paging.
        this.pager.items = this.items;
        this.pager.cursor = this.cursor;
        this.pager.hasMore = this.hasMore;
        this.pager.previousCursor = this.previousCursor;
        this.pager.hasPrevious = this.hasPrevious;
        this.loading = true;
        this.error = '';
        try {
            const changed = await this.pager.loadMore(cursor => this.loadPage!(cursor));
            this.items = this.pager.items;
            this.cursor = this.pager.cursor;
            this.hasMore = this.pager.hasMore;
            this.hasPrevious = this.pager.hasPrevious;
            this.previousCursor = this.pager.previousCursor;
            this.error = this.pager.error;
            return changed;
        } finally {
            this.loading = this.pager.loading;
        }
    }

    async loadPrevious(): Promise<boolean> {
        if (!this.loadPreviousPage || this.loading || !this.hasPrevious) {
            return false;
        }
        this.pager.items = this.items;
        this.pager.cursor = this.cursor;
        this.pager.hasMore = this.hasMore;
        this.pager.previousCursor = this.previousCursor;
        this.pager.hasPrevious = this.hasPrevious;
        this.loading = true;
        this.error = '';
        try {
            const changed = await this.pager.loadPrevious(cursor => this.loadPreviousPage!(cursor));
            this.items = this.pager.items;
            this.cursor = this.pager.cursor;
            this.hasMore = this.pager.hasMore;
            this.hasPrevious = this.pager.hasPrevious;
            this.previousCursor = this.pager.previousCursor;
            this.error = this.pager.error;
            // The freshly prepended page is the previous window: paint it.
            this.windowOffset = 0;
            return changed;
        } finally {
            this.loading = this.pager.loading;
        }
    }

    selectItem(item: ListItem): void {
        if (item?.disabled) {
            return;
        }
        this.selectAction?.(item);
        this.selectValueAction?.(item.value ?? item.id);
    }

    closeKeydown(event: any): void { this.activateKey(event, () => this.close()); }
    olderKeydown(event: any): void { this.activateKey(event, () => this.onReachStart()); }
    protected activateKey(event: any, run: () => void): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            run();
        }
    }

    close(): void {
        this.closeAction?.();
    }
}
