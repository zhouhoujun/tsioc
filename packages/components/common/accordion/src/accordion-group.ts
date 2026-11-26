import { Attribute, Component } from '@tsdi/components';
import { AccordionComponent, AccordionItem } from './accordion';

export interface AccordionGroupItem {
    id: string;
    title: string;
    count?: number | string;
    items?: AccordionItem[];
    /** Initial state for this section (used when `multiple` is on). */
    expanded?: boolean;
    disabled?: boolean;
}

/**
 * Accordion group with single-open (default) or multiple-open behavior.
 *
 * Sections still render through {@link AccordionComponent}, so their keyboard,
 * ARIA and animation contracts stay identical; this container only coordinates
 * which section is expanded.
 */
@Component({
    selector: 'ui-accordion-group',
    imports: [AccordionComponent],
    template: `
    <div class="ui-accordion-group {{className}}" role="group" aria-label="{{ariaLabel}}">
        <ui-accordion v-for="item in items" trackBy="id" :title="item.title" :count="item.count"
            :items="item.items || []" :disabled="item.disabled || false"
            :size="size" :variant="variant" :expanded="isExpanded(item)"
            :toggleAction="toggleHandler(item)" :selectAction="selectHandler(item)"></ui-accordion>
    </div>`
})
export class AccordionGroupComponent {
    @Attribute() items: AccordionGroupItem[] = [];
    @Attribute() activeId = '';
    @Attribute() expandedIds: string[] = [];
    @Attribute() ariaLabel = 'Accordion';
    @Attribute() className = '';
    @Attribute() size: 'sm' | 'md' = 'md';
    @Attribute() variant: 'default' | 'plain' | 'card' = 'default';
    @Attribute() toggleAction?: (id: string, expanded: boolean) => void;
    @Attribute() selectAction?: (id: string, item: any) => void;

    private _multiple = false;

    @Attribute()
    get multiple(): boolean { return this._multiple; }
    set multiple(value: boolean | string) {
        this._multiple = value === '' || value === true || value === 'true';
    }

    isExpanded(item: AccordionGroupItem): boolean {
        if (!item) { return false; }
        return this._multiple
            ? (this.expandedIds || []).some(id => String(id) === String(item.id)) || item.expanded === true
            : String(this.activeId || '') === String(item.id);
    }

    toggleHandler(item: AccordionGroupItem): (expanded: boolean) => void {
        return expanded => this.toggle(item, expanded);
    }

    selectHandler(item: AccordionGroupItem): (value: any) => void {
        return value => this.selectAction?.(item.id, value);
    }

    toggle(item: AccordionGroupItem, expanded: boolean): void {
        if (!item) { return; }
        if (this._multiple) {
            const ids = new Set((this.expandedIds || []).map(String));
            expanded ? ids.add(String(item.id)) : ids.delete(String(item.id));
            this.expandedIds = [...ids];
        } else {
            this.activeId = expanded ? String(item.id) : '';
        }
        this.toggleAction?.(item.id, expanded);
    }
}
