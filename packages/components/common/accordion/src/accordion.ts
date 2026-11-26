import { Attribute, Component, EventEmitter } from '@tsdi/components';
import { nextUiId, normalizeBoolean } from '../../src/ui';

/** One row rendered inside an {@link AccordionComponent} section. */
export interface AccordionItem {
    id: string;
    label: string;
    description?: string;
    /** Icon name for the shared icon directive. */
    icon?: string;
    /** Glyph fallback when no icon name resolves. */
    iconGlyph?: string;
    badge?: string | number;
    className?: string;
    /** Extra class on the leading icon wrapper. */
    iconClassName?: string;
    /** Extra attributes for the row (for example `data-node-type`). */
    attrs?: Record<string, string>;
    /** Extra attributes for the icon wrapper. */
    iconAttrs?: Record<string, string>;
    disabled?: boolean;
    /** Host payload passed back through select/drag callbacks. */
    value?: any;
}

interface AccordionViewItem extends AccordionItem {
    rowClass: string;
}

/**
 * Generic collapsible section with optional icon rows.
 *
 * The header is a real button (`aria-expanded` reflects the state), rows are
 * data-driven (`items`) so renderers stay identical, and the body remains
 * mounted while collapsed so host widgets keep their DOM/terminal state. A
 * `<v-content>` outlet is kept for static host content.
 *
 * ```html
 * <ui-accordion title="HTTP" :count="4" :items="rows"
 *     :selectAction="open" :expanded="open" (expandedChange)="open = $event">
 * </ui-accordion>
 * ```
 */
@Component({
    selector: 'ui-accordion',
    template: `
    <section class="{{accordionClass}}" data-expanded="{{expandedText}}">
        <button class="ui-accordion-header" type="button" data-plain="true"
            id="{{headerElementId}}"
            aria-expanded="{{expandedText}}"
            aria-controls="{{bodyElementId}}"
            aria-label="{{ariaLabel || title}}"
            [title]="title"
            [disabled]="disabled"
            @click="toggle" @keydown="onKeydown($event)">
            <span class="ui-accordion-caret" aria-hidden="true">▸</span>
            <span class="ui-accordion-title">{{title}}</span>
            <span class="ui-accordion-count" v-if="hasCount">{{count}}</span>
        </button>
        <div class="ui-accordion-body" id="{{bodyElementId}}"
            role="region" aria-labelledby="{{headerElementId}}"
            aria-hidden="{{!expanded}}" v-show="expanded">
            <div class="{{item.rowClass}}" v-for="item in viewItems" trackBy="id"
                v-bind="item.attrs"
                [draggable]="draggable"
                @click="select(item)"
                @dragstart="dragStart($event, item)">
                <span class="ui-accordion-item-icon {{item.iconClassName}}" v-if="item.icon || item.iconGlyph"
                    v-bind="item.iconAttrs">
                    <icon [name]="item.icon" [glyph]="item.iconGlyph || item.icon" size="sm"></icon>
                </span>
                <span class="ui-accordion-item-text">
                    <span class="ui-accordion-item-label">{{item.label}}</span>
                    <span class="ui-accordion-item-description" v-if="item.description">{{item.description}}</span>
                </span>
                <span class="ui-accordion-item-badge" v-if="hasBadge(item)">{{item.badge}}</span>
            </div>
            <v-content></v-content>
        </div>
    </section>`
})
export class AccordionComponent {
    @Attribute() title = '';
    @Attribute() ariaLabel = '';
    @Attribute() count: number | string = '';
    @Attribute() items: AccordionItem[] = [];
    @Attribute() className = '';
    @Attribute() selectAction?: (item: any) => void;
    /** Row dragstart; receives `item.value` when provided. */
    @Attribute() dragStartAction?: (event: any, item: any) => void;

    protected readonly uid = nextUiId('ui-accordion');

    private _disabled = false;
    private _controlled = false;
    private _draggable = false;
    private _expanded = true;

    /** Rows are draggable and forward dragstart through `dragStartAction`. */
    @Attribute()
    get draggable(): boolean { return this._draggable; }
    set draggable(value: boolean | string) { this._draggable = normalizeBoolean(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    /**
     * Host-controlled mode: clicking only emits; the host must update
     * `expanded`. Palette groups use this so a no-op toggle (for example while
     * filtering) cannot desynchronise the shared section from host state.
     */
    @Attribute()
    get controlled(): boolean { return this._controlled; }
    set controlled(value: boolean | string) { this._controlled = normalizeBoolean(value); }

    /** Emits the next state when the user toggles the header. */
    @Attribute() expandedChange = new EventEmitter<boolean>();
    /** Callback form for hosts that do not use the event emitter. */
    @Attribute() toggleAction?: (expanded: boolean) => void;

    @Attribute()
    get expanded(): boolean { return this._expanded; }
    set expanded(value: boolean | string) { this._expanded = normalizeBoolean(value, true); }

    get expandedText(): string {
        return this._expanded ? 'true' : 'false';
    }

    get headerElementId(): string {
        return `${this.uid}-header`;
    }

    get bodyElementId(): string {
        return `${this.uid}-body`;
    }

    get hasCount(): boolean {
        return this.count !== undefined && this.count !== null && String(this.count) !== '';
    }

    get viewItems(): AccordionViewItem[] {
        const items: AccordionViewItem[] = [];
        for (const item of Array.isArray(this.items) ? this.items : []) {
            if (!item) {
                continue;
            }
            items.push({
                ...item,
                rowClass: [
                    'ui-accordion-item',
                    item.className,
                    item.disabled ? 'is-disabled' : ''
                ].filter(Boolean).join(' ')
            });
        }
        return items;
    }

    get accordionClass(): string {
        return [
            'ui-accordion',
            this._expanded ? 'is-expanded' : 'is-collapsed',
            this._disabled ? 'is-disabled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    hasBadge(item: AccordionItem): boolean {
        return item.badge !== undefined && item.badge !== null && String(item.badge) !== '';
    }

    select(item: AccordionItem): void {
        if (!item || item.disabled) {
            return;
        }
        this.selectAction?.(item.value ?? item);
    }

    dragStart(event: any, item: AccordionItem): void {
        if (!item || item.disabled) {
            return;
        }
        this.dragStartAction?.(event, item.value ?? item);
    }

    onKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.toggle();
        }
    }

    toggle(): void {
        if (this._disabled) {
            return;
        }
        const next = !this._expanded;
        if (!this._controlled) {
            this._expanded = next;
        }
        this.toggleAction?.(next);
        this.expandedChange.emit(next);
    }
}
