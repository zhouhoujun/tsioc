import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { normalizeBoolean, normalizeSize, UiSize } from '../../src/ui';
import { focusNth } from '../../src/focus';
import { markElementRefRaw } from '../../src/raw-element';
import { installSegmentedStyles } from './segmented.styles';

export interface SegmentedOption {
    label: string;
    value: string;
    icon?: string;
    iconGlyph?: string;
    disabled?: boolean;
}

interface SegmentedViewOption {
    key: string;
    index: number;
    label: string;
    value: string;
    icon: string;
    iconGlyph: string;
    disabled: boolean;
}

/**
 * Renderer-neutral segmented control (Ant Design Segmented / MUI ToggleButtonGroup).
 *
 * The options share one visual row and one roving tab stop. Selections are
 * painted by the shared skin (`is-selected`) and announced through
 * `role="radiogroup"`/`role="radio"`; the terminal separator is hidden by the
 * browser skin, matching the data-table convention.
 */
@Component({
    selector: 'ui-segmented',
    template: `
    <div class="ui-segmented {{segmentedClass}}" role="radiogroup"
        aria-label="{{ariaLabel}}" aria-disabled="{{disabled}}">
        <span class="ui-segmented-node" v-for="(option, index) in viewOptions" trackBy="key">
            <span class="ui-segmented-sep" aria-hidden="true" v-if="index > 0">│</span>
            <span class="{{optionClass(option)}}" role="radio"
                aria-checked="{{isChecked(option)}}"
                aria-disabled="{{option.disabled}}"
                tabindex="{{tabIndexFor(option)}}"
                focusable="{{!option.disabled}}"
                @click="choose(option)"
                @keydown="onKeydown(option, $event)">
                <icon v-if="option.icon || option.iconGlyph"
                    [name]="option.icon" [glyph]="option.iconGlyph || option.icon" size="sm"></icon>
                <span class="ui-segmented-label">{{option.label}}</span>
            </span>
        </span>
    </div>`
})
export class SegmentedComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installSegmentedStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() options: SegmentedOption[] = [];
    @Attribute() value = '';
    @Attribute() ariaLabel = 'Segmented control';
    @Attribute() className = '';
    @Attribute() changeAction?: (value: string) => void;

    private _disabled = false;
    private _size: UiSize = 'md';

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    get segmentedClass(): string {
        return [
            `is-${this._size}`,
            this._disabled ? 'is-disabled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get viewOptions(): SegmentedViewOption[] {
        return (Array.isArray(this.options) ? this.options : []).map((option, index) => ({
            key: String(option?.value ?? index),
            index,
            label: String(option?.label ?? ''),
            value: String(option?.value ?? ''),
            icon: String(option?.icon ?? ''),
            iconGlyph: String(option?.iconGlyph ?? ''),
            disabled: this._disabled || option?.disabled === true
        }));
    }

    isChecked(option: SegmentedViewOption): boolean {
        return this.value !== '' && String(this.value) === option.value;
    }

    optionClass(option: SegmentedViewOption): string {
        return [
            'ui-segmented-item',
            this.isChecked(option) ? 'is-selected' : '',
            option.disabled ? 'is-disabled' : ''
        ].filter(Boolean).join(' ');
    }

    /** Roving tabindex: the selected (or first enabled) option is tabbable. */
    tabIndexFor(option: SegmentedViewOption): number {
        if (!option || option.disabled) {
            return -1;
        }
        const selected = this.viewOptions.find(entry => !entry.disabled && this.isChecked(entry));
        if (selected) {
            return selected.key === option.key ? 0 : -1;
        }
        const first = this.viewOptions.find(entry => !entry.disabled);
        return first && first.key === option.key ? 0 : -1;
    }

    choose(option: SegmentedViewOption): void {
        const current = this.currentOption(option);
        if (!current || current.disabled) {
            return;
        }
        focusNth(this.elementRef?.nativeElement, '.ui-segmented-item', current.index);
        const value = current.value;
        if (value === String(this.value)) {
            return;
        }
        this.value = value;
        this.changeAction?.(value);
    }

    onKeydown(option: SegmentedViewOption, event: any): void {
        const current = this.currentOption(option);
        if (!current) {
            return;
        }
        const key = String(event?.key || '');
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event?.preventDefault?.();
            this.choose(current);
            return;
        }
        if (key === 'ArrowRight' || key === 'ArrowDown') {
            event?.preventDefault?.();
            this.move(current.index, 1);
            return;
        }
        if (key === 'ArrowLeft' || key === 'ArrowUp') {
            event?.preventDefault?.();
            this.move(current.index, -1);
            return;
        }
        if (key === 'Home') {
            event?.preventDefault?.();
            this.move(-1, 1);
            return;
        }
        if (key === 'End') {
            event?.preventDefault?.();
            this.move(this.viewOptions.length, -1);
        }
    }

    /** v-for reuses rows; resolve the binding's option against current state. */
    protected currentOption(option: SegmentedViewOption): SegmentedViewOption | undefined {
        return option ? this.viewOptions[option.index] : undefined;
    }

    protected move(from: number, delta: number): void {
        const options = this.viewOptions;
        if (!options.length) {
            return;
        }
        for (let step = 1; step <= options.length; step++) {
            const index = (from + delta * step + options.length * 2) % options.length;
            if (!options[index].disabled) {
                this.choose(options[index]);
                return;
            }
        }
    }
}
