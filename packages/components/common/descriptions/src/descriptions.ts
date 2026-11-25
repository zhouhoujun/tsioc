import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean, normalizeSize, normalizeTone, UiSize, UiTone } from '../../src/ui';
import { installDescriptionsStyles } from './descriptions.styles';

export interface DescriptionItem {
    key?: string;
    label: string;
    value: string;
    hint?: string;
    /** Browser grid span; terminal hosts keep one row per item. */
    span?: number;
    tone?: UiTone;
}

interface DescriptionViewItem {
    key: string;
    label: string;
    value: string;
    hint: string;
    tone: UiTone;
    style?: Record<string, string>;
}

/**
 * Read-only key/value detail list (Ant Design Descriptions / MUI DescriptionList).
 *
 * Both renderers paint `label: value` with the same item order. `columns`
 * arranges the browser grid; terminal hosts keep one item per line so the
 * content stays readable at any width.
 */
@Component({
    selector: 'ui-descriptions',
    template: `
    <div class="ui-descriptions {{descriptionsClass}}" role="list"
        aria-label="{{ariaLabel}}" [style]="rootStyle">
        <span class="ui-descriptions-item" role="listitem"
            data-tone="{{item.tone}}" [style]="item.style"
            v-for="item in horizontalItems" trackBy="key">
            <span class="ui-descriptions-label">{{item.label}}</span><span class="ui-descriptions-sep" aria-hidden="true">: </span><span class="ui-descriptions-value">{{item.value}}</span>
            <span class="ui-descriptions-hint" v-if="item.hint">{{item.hint}}</span>
        </span>
        <div class="ui-descriptions-item is-vertical" role="listitem"
            data-tone="{{item.tone}}" [style]="item.style"
            v-for="item in verticalItems" trackBy="key">
            <span class="ui-descriptions-label">{{item.label}}</span>
            <span class="ui-descriptions-value">{{item.value}}</span>
            <span class="ui-descriptions-hint" v-if="item.hint">{{item.hint}}</span>
        </div>
        <div class="ui-descriptions-empty" v-if="emptyLabel && !viewItems.length">{{emptyLabel}}</div>
    </div>`
})
export class DescriptionsComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installDescriptionsStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() items: DescriptionItem[] = [];
    @Attribute() ariaLabel = 'Details';
    @Attribute() emptyLabel = '';
    @Attribute() className = '';

    private _columns = 1;
    private _layout: 'horizontal' | 'vertical' = 'horizontal';
    private _size: UiSize = 'md';
    private _bordered = false;
    private _dense = false;

    @Attribute()
    get columns(): number { return this._columns; }
    set columns(value: number | string) {
        const next = Math.floor(Number(value));
        this._columns = Number.isFinite(next) ? Math.max(1, Math.min(6, next)) : 1;
    }

    @Attribute()
    get layout(): 'horizontal' | 'vertical' { return this._layout; }
    set layout(value: string) { this._layout = value === 'vertical' ? 'vertical' : 'horizontal'; }

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get bordered(): boolean { return this._bordered; }
    set bordered(value: boolean | string) { this._bordered = normalizeBoolean(value); }

    @Attribute()
    get dense(): boolean { return this._dense; }
    set dense(value: boolean | string) { this._dense = normalizeBoolean(value); }

    get descriptionsClass(): string {
        return [
            `is-${this._size}`,
            this._layout === 'vertical' ? 'is-vertical' : '',
            this._bordered ? 'is-bordered' : '',
            this._dense ? 'is-dense' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get rootStyle(): Record<string, string> {
        return { '--ui-descriptions-columns': String(this._columns) };
    }

    get horizontalItems(): DescriptionViewItem[] {
        return this._layout === 'vertical' ? [] : this.viewItems;
    }

    get verticalItems(): DescriptionViewItem[] {
        return this._layout === 'vertical' ? this.viewItems : [];
    }

    get viewItems(): DescriptionViewItem[] {
        return (Array.isArray(this.items) ? this.items : [])
            .filter(item => !!item)
            .map((item, index) => {
                const span = Math.floor(Number(item.span));
                return {
                    key: String(item.key ?? index),
                    label: String(item.label ?? ''),
                    value: String(item.value ?? ''),
                    hint: String(item.hint ?? ''),
                    tone: normalizeTone(item.tone),
                    style: Number.isFinite(span) && span > 1
                        ? { 'grid-column': `span ${span}` }
                        : undefined
                } as DescriptionViewItem;
            });
    }
}
