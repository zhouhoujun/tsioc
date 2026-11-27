import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean, normalizeSize, UiSize } from '../../src/ui';
import { ButtonComponent } from './button';
import { nextButtonGroupIndex } from './button-group';

export interface ToggleButtonOption {
    id: string;
    label: string;
    icon?: string;
    iconGlyph?: string;
    disabled?: boolean;
}

/** Single/multiple toggle group (MUI ToggleButtonGroup). */
@Component({
    selector: 'ui-toggle-button-group',
    imports: [ButtonComponent],
    template: `
    <div class="ui-toggle-button-group {{className}}" role="group" aria-label="{{ariaLabel}}"
        @keydown="onKeydown($event)">
        <ui-button v-for="item in items" trackBy="id" :label="item.label"
            :icon="item.icon || ''" :iconGlyph="item.iconGlyph || ''" :size="size"
            :disabled="item.disabled || false" :pressed="isSelected(item)"
            :tone="isSelected(item) ? 'accent' : 'default'"
            :variant="isSelected(item) ? 'solid' : 'outline'"
            :action="handler(item)"></ui-button>
    </div>`
})
export class ToggleButtonGroupComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Attribute() items: ToggleButtonOption[] = [];
    @Attribute() ariaLabel = 'Options';
    @Attribute() className = '';
    @Attribute() value = '';
    @Attribute() values: string[] = [];
    @Attribute() changeAction?: (value: string, selected: boolean, values: string[]) => void;

    private _multiple = false;
    private _size: UiSize = 'md';
    private _allowEmpty = true;

    @Attribute()
    get multiple(): boolean { return this._multiple; }
    set multiple(value: boolean | string) { this._multiple = normalizeBoolean(value); }

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get allowEmpty(): boolean { return this._allowEmpty; }
    set allowEmpty(value: boolean | string) { this._allowEmpty = normalizeBoolean(value, true); }

    isSelected(item: ToggleButtonOption): boolean {
        if (!item?.id) { return false; }
        return this._multiple
            ? (this.values || []).some(value => String(value) === String(item.id))
            : String(this.value || '') === String(item.id);
    }

    handler(item: ToggleButtonOption): () => void {
        return () => this.toggle(item);
    }

    toggle(item: ToggleButtonOption): void {
        if (!item?.id || item.disabled) { return; }
        const selected = this.isSelected(item);
        if (this._multiple) {
            const values = new Set((this.values || []).map(String));
            selected ? values.delete(String(item.id)) : values.add(String(item.id));
            this.values = [...values];
            this.changeAction?.(String(item.id), !selected, this.values);
            return;
        }
        const next = selected ? (this._allowEmpty ? '' : String(item.id)) : String(item.id);
        this.value = next;
        this.changeAction?.(String(item.id), !selected, next ? [next] : []);
    }

    onKeydown(event: any): void {
        const key = String(event?.key || '');
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
            return;
        }
        const root = this.elementRef?.nativeElement as HTMLElement | undefined;
        const buttons = Array.from(root?.querySelectorAll?.('.ui-button:not(:disabled)') || []) as HTMLElement[];
        if (!buttons.length) { return; }
        const active = root?.ownerDocument?.activeElement as HTMLElement | undefined;
        const next = nextButtonGroupIndex(buttons.indexOf(active as HTMLElement), buttons.length, key);
        event.preventDefault?.();
        buttons[next]?.focus?.();
    }
}
