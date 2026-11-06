import { Attribute, Component } from '@tsdi/components';

export interface CommonListEntry {
    id: string;
    label: string;
    value?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
}

export interface CommonListPage<T extends CommonListEntry = CommonListEntry> {
    items: T[];
    /** Whether a further page exists. Defaults to false for array results. */
    hasMore?: boolean;
    /** Cursor for the next page; defaults to the last item id. */
    nextCursor?: string;
}

export type CommonListLoader<T extends CommonListEntry = CommonListEntry> = (
    cursor?: string
) => Promise<CommonListPage<T> | T[]>;

function normalizePage<T extends CommonListEntry>(result: CommonListPage<T> | T[] | undefined): CommonListPage<T> & { hasMore: boolean } {
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
 * session selector) or bind it to {@link CommonListComponent}. Concurrent calls
 * are ignored and duplicate ids are dropped, so wheel/key bursts cannot enqueue
 * the same page twice.
 */
export class CommonListPager<T extends CommonListEntry = CommonListEntry> {
    items: T[] = [];
    cursor?: string;
    hasMore = true;
    loading = false;
    error = '';
    protected request = 0;

    constructor(protected readonly loader?: CommonListLoader<T>) {
    }

    reset(items: T[] = [], hasMore = true): void {
        this.request += 1;
        this.items = items.slice();
        this.cursor = this.items[this.items.length - 1]?.id;
        this.hasMore = hasMore;
        this.loading = false;
        this.error = '';
    }

    async loadMore(loader: CommonListLoader<T> | undefined = this.loader): Promise<boolean> {
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
    selector: 'common-list',
    template: `
    <div class="common-list" role="list" aria-label="{{ariaLabel}}">
        <div class="common-list-row {{item.className}}" role="listitem" v-for="item in items" @click="selectItem(item)">
            <span class="common-list-label">{{item.label}}</span>
            <span class="common-list-description" v-if="item.description"> {{item.description}}</span>
        </div>
        <label class="common-list-empty" v-show="!items.length && !loading">{{empty}}</label>
        <label class="common-list-loading" v-show="loading">{{loadingLabel}}</label>
        <label class="common-list-error" v-show="error">{{error}}</label>
        <button class="common-list-more" v-show="hasMore && !loading" @click="loadMore">{{moreLabel}}</button>
    </div>`
})
export class CommonListComponent {
    @Attribute() items: CommonListEntry[] = [];
    @Attribute() cursor?: string;
    @Attribute() hasMore = true;
    @Attribute() loading = false;
    @Attribute() error = '';
    @Attribute() empty = '';
    @Attribute() loadingLabel = 'Loading…';
    @Attribute() moreLabel = 'Load more';
    @Attribute() ariaLabel = 'List';
    @Attribute() loadPage?: CommonListLoader;
    @Attribute() selectAction?: (item: CommonListEntry) => void;

    /** Called by a renderer/scroll adapter when the last row becomes visible. */
    onReachEnd(): void {
        void this.loadMore();
    }

    async loadMore(): Promise<boolean> {
        if (!this.loadPage || this.loading || !this.hasMore) {
            return false;
        }
        this.loading = true;
        this.error = '';
        try {
            const page = normalizePage(await this.loadPage(this.cursor));
            const known = new Set(this.items.map(item => String(item.id)));
            const fresh = page.items.filter(item => item && !known.has(String(item.id)));
            if (fresh.length) {
                this.items = [...this.items, ...fresh];
            }
            this.cursor = page.nextCursor || this.items[this.items.length - 1]?.id;
            this.hasMore = page.hasMore;
            return fresh.length > 0;
        } catch (error) {
            this.error = error instanceof Error ? error.message : String(error);
            return false;
        } finally {
            this.loading = false;
        }
    }

    selectItem(item: CommonListEntry): void {
        if (item?.disabled) {
            return;
        }
        this.selectAction?.(item);
    }
}
