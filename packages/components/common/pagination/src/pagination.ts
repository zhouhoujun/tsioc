import { Attribute, Component } from '@tsdi/components';

interface PaginationViewItem {
    key: string;
    label: string;
    page: number;
    ellipsis: boolean;
    className: string;
}

/**
 * Page selector bar. `total` is the number of items (not pages); the component
 * derives the page count and can collapse the middle range into an ellipsis.
 */
@Component({
    selector: 'ui-pagination',
    template: `
    <nav class="ui-pagination {{paginationClass}}" role="navigation" aria-label="{{ariaLabel}}">
        <button class="ui-pagination-step" type="button"
            [disabled]="currentPage <= 1" aria-label="{{previousLabel}}"
            @click="go(currentPage - 1)">{{previousText}}</button>
        <span class="ui-pagination-pages">
            <span class="ui-pagination-node" v-for="entry in viewItems" trackBy="key">
                <span class="ui-pagination-ellipsis" v-if="entry.ellipsis" aria-hidden="true">{{ellipsis}}</span>
                <button class="{{entry.className}}" type="button" v-if="!entry.ellipsis"
                    aria-current="{{entry.page === currentPage ? 'page' : ''}}"
                    @click="go(entry.page)">{{entry.label}}</button>
            </span>
        </span>
        <button class="ui-pagination-step" type="button"
            [disabled]="currentPage >= totalPages" aria-label="{{nextLabel}}"
            @click="go(currentPage + 1)">{{nextText}}</button>
    </nav>`
})
export class PaginationComponent {
    @Attribute() page = 1;
    @Attribute() total = 0;
    @Attribute() pageSize = 10;
    @Attribute() maxButtons = 7;
    @Attribute() ariaLabel = 'Pagination';
    @Attribute() previousLabel = 'Previous page';
    @Attribute() nextLabel = 'Next page';
    @Attribute() previousText = '‹';
    @Attribute() nextText = '›';
    @Attribute() ellipsis = '…';
    @Attribute() className = '';
    @Attribute() changeAction?: (page: number) => void;

    get totalPages(): number {
        const size = Math.max(1, Math.floor(Number(this.pageSize) || 10));
        const total = Math.max(0, Math.floor(Number(this.total) || 0));
        return Math.max(1, Math.ceil(total / size));
    }

    get currentPage(): number {
        const page = Math.floor(Number(this.page) || 1);
        return Math.max(1, Math.min(this.totalPages, page));
    }

    get paginationClass(): string {
        return this.className;
    }

    get viewItems(): PaginationViewItem[] {
        const total = this.totalPages;
        const current = this.currentPage;
        const max = Math.max(3, Math.floor(Number(this.maxButtons) || 7));
        let pages: Array<number | 'ellipsis'>;
        if (total <= max) {
            pages = Array.from({ length: total }, (_value, index) => index + 1);
        } else {
            const siblings = Math.max(0, Math.floor((max - 3) / 2));
            const start = Math.max(2, current - siblings);
            const end = Math.min(total - 1, current + siblings);
            pages = [1];
            if (start > 2) {
                pages.push('ellipsis');
            }
            for (let page = start; page <= end; page++) {
                pages.push(page);
            }
            if (end < total - 1) {
                pages.push('ellipsis');
            }
            pages.push(total);
        }
        return pages.map((page, index) => {
            if (page === 'ellipsis') {
                return {
                    key: `ellipsis-${index}`,
                    label: this.ellipsis,
                    page: -1,
                    ellipsis: true,
                    className: 'ui-pagination-ellipsis'
                };
            }
            return {
                key: String(page),
                label: String(page),
                page,
                ellipsis: false,
                className: ['ui-pagination-page', page === current ? 'is-current' : ''].filter(Boolean).join(' ')
            };
        });
    }

    go(page: number): void {
        const next = Math.max(1, Math.min(this.totalPages, Math.floor(Number(page) || 1)));
        if (next === this.currentPage) {
            return;
        }
        this.page = next;
        this.changeAction?.(next);
    }
}
