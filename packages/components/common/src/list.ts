import { Attribute, Component } from '@tsdi/components';

export interface ListEntry {
    id: string;
    label: string;
    value?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
}

export interface ListPage<T extends { id: string } = ListEntry> {
    items: T[];
    /** Whether a further page exists. Defaults to false for array results. */
    hasMore?: boolean;
    /** Cursor for the next page; defaults to the last item id. */
    nextCursor?: string;
}

export type ListLoader<T extends { id: string } = ListEntry> = (
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
export class ListPager<T extends { id: string } = ListEntry> {
    items: T[] = [];
    cursor?: string;
    hasMore = true;
    loading = false;
    error = '';
    protected request = 0;

    constructor(protected readonly loader?: ListLoader<T>) {
    }

    reset(items: T[] = [], hasMore = true): void {
        this.request += 1;
        this.items = items.slice();
        this.cursor = this.items[this.items.length - 1]?.id;
        this.hasMore = hasMore;
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
}

/**
 * Shared list surface with a load-more row. TUI and DOM renderers own spacing,
 * while paging semantics (cursor, dedupe, hasMore, loading) stay identical.
 * Call `onReachEnd()` from a viewport/scroll boundary, or let the user click the
 * load-more button.
 */
@Component({
    selector: 'list',
    template: `
    <div class="list" role="list" aria-label="{{ariaLabel}}">
        <div class="list-row {{item.className}}" role="listitem" v-for="item in items" @click="selectItem(item)">
            <span class="list-label">{{item.label}}</span>
            <span class="list-description" v-if="item.description"> {{item.description}}</span>
        </div>
        <label class="list-empty" v-show="!items.length && !loading">{{empty}}</label>
        <label class="list-loading" v-show="loading">{{loadingLabel}}</label>
        <label class="list-error" v-show="error">{{error}}</label>
        <button class="list-more" v-show="hasMore && !loading" @click="loadMore">{{moreLabel}}</button>
    </div>`
})
export class ListComponent {
    @Attribute() items: ListEntry[] = [];
    @Attribute() cursor?: string;
    @Attribute() hasMore = true;
    @Attribute() loading = false;
    @Attribute() error = '';
    @Attribute() empty = '';
    @Attribute() loadingLabel = 'Loading…';
    @Attribute() moreLabel = 'Load more';
    @Attribute() ariaLabel = 'List';
    @Attribute() loadPage?: ListLoader;
    @Attribute() selectAction?: (item: ListEntry) => void;
    /** Load the first page when the component mounts empty. */
    @Attribute() autoLoad = false;
    protected readonly pager = new ListPager<ListEntry>();

    onInit(): void {
        if (this.autoLoad && !this.items.length && this.loadPage) {
            void this.loadMore();
        }
    }

    /** Called by a renderer/scroll adapter when the last row becomes visible. */
    onReachEnd(): void {
        void this.loadMore();
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
        this.loading = true;
        this.error = '';
        try {
            const changed = await this.pager.loadMore(cursor => this.loadPage!(cursor));
            this.items = this.pager.items;
            this.cursor = this.pager.cursor;
            this.hasMore = this.pager.hasMore;
            this.error = this.pager.error;
            return changed;
        } finally {
            this.loading = this.pager.loading;
        }
    }

    selectItem(item: ListEntry): void {
        if (item?.disabled) {
            return;
        }
        this.selectAction?.(item);
    }
}
