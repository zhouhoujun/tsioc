import { Attribute, Component } from '@tsdi/components';

export interface BreadcrumbItem {
    id?: string;
    label: string;
    disabled?: boolean;
}

interface BreadcrumbViewItem {
    key: string;
    label: string;
    index: number;
    last: boolean;
    disabled: boolean;
    ellipsis: boolean;
    className: string;
}

/**
 * Flat breadcrumb trail. `maxItems > 0` collapses the middle into a single
 * ellipsis node while always keeping the first and last items.
 */
@Component({
    selector: 'ui-breadcrumb',
    template: `
    <nav class="ui-breadcrumb {{breadcrumbClass}}" aria-label="{{ariaLabel}}">
        <span class="ui-breadcrumb-node" v-for="entry in viewItems" trackBy="key">
            <span class="ui-breadcrumb-item is-ellipsis"
                v-if="entry.ellipsis"
                aria-hidden="true">{{ellipsis}}</span>
            <span class="{{entry.className}}"
                v-if="!entry.ellipsis"
                role="link"
                aria-current="{{entry.last ? 'page' : ''}}"
                aria-disabled="{{entry.disabled}}"
                @click="pick(entry)">
                {{entry.label}}
            </span>
            <span class="ui-breadcrumb-separator" v-if="!entry.last" aria-hidden="true">{{separator}}</span>
        </span>
    </nav>`
})
export class BreadcrumbComponent {
    @Attribute() items: BreadcrumbItem[] = [];
    @Attribute() separator = '›';
    @Attribute() ellipsis = '…';
    @Attribute() ariaLabel = 'Breadcrumb';
    @Attribute() className = '';
    @Attribute() action?: (item: BreadcrumbItem, index: number) => void;
    private _maxItems = 0;

    @Attribute()
    get maxItems(): number { return this._maxItems; }
    set maxItems(value: number | string) {
        const count = Math.floor(Number(value));
        this._maxItems = Number.isFinite(count) && count > 0 ? count : 0;
    }

    get breadcrumbClass(): string {
        return this.className;
    }

    get viewItems(): BreadcrumbViewItem[] {
        const items = Array.isArray(this.items) ? this.items : [];
        const mapped = items.map((item, index) => this.viewItem(item, index, index === items.length - 1));
        if (!this._maxItems || items.length <= this._maxItems || this._maxItems < 3) {
            return mapped;
        }
        const head = mapped.slice(0, 1);
        const tail = mapped.slice(items.length - (this._maxItems - 2));
        return [
            ...head,
            {
                key: 'ellipsis',
                label: this.ellipsis,
                index: -1,
                last: false,
                disabled: true,
                ellipsis: true,
                className: 'ui-breadcrumb-item is-ellipsis'
            },
            ...tail
        ];
    }

    private viewItem(item: BreadcrumbItem, index: number, last: boolean): BreadcrumbViewItem {
        return {
            key: String(item?.id ?? index),
            label: String(item?.label ?? ''),
            index,
            last,
            disabled: item?.disabled === true,
            ellipsis: false,
            className: [
                'ui-breadcrumb-item',
                last ? 'is-current' : '',
                item?.disabled === true ? 'is-disabled' : ''
            ].filter(Boolean).join(' ')
        };
    }

    pick(entry: BreadcrumbViewItem): void {
        if (!entry || entry.disabled || entry.ellipsis) {
            return;
        }
        this.action?.(this.items[entry.index], entry.index);
    }
}
