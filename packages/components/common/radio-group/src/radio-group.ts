import { Attribute, Component, Computed, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { normalizeBoolean } from '../../src/ui';
import { focusNth } from '../../src/focus';
import { markElementRefRaw } from '../../src/raw-element';

export interface RadioOption {
    id?: string;
    label: string;
    value: string;
    description?: string;
    disabled?: boolean;
}

interface RadioViewOption {
    key: string;
    index: number;
    label: string;
    description: string;
    checked: boolean;
    disabled: boolean;
    className: string;
}

/**
 * Renderer-neutral radio group. Uses semantic `role="radio"` rows so the
 * selected marker is visible in both DOM and terminal hosts.
 */
@Component({
    selector: 'ui-radio-group',
    template: `
    <div class="ui-radio-group {{groupClass}}" role="radiogroup" aria-label="{{ariaLabel}}">
        <span class="{{optionClass(option)}}" role="radio"
            aria-checked="{{isChecked(option)}}"
            aria-disabled="{{option.disabled}}"
            tabindex="{{tabIndexFor(option)}}"
            focusable="{{!option.disabled}}"
            v-for="option in viewOptions" trackBy="key"
            @click="choose(option)"
            @keydown="onKeydown(option, $event)">
            <span class="ui-radio-marker" aria-hidden="true">{{option.checked ? '(•)' : '( )'}}</span>
            <span class="ui-radio-copy">
                <span class="ui-radio-label">{{option.label}}</span>
                <span class="ui-radio-description" v-if="option.description">{{option.description}}</span>
            </span>
        </span>
    </div>`
})
export class RadioGroupComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Attribute() options: RadioOption[] = [];
    @Attribute() value = '';
    @Attribute() ariaLabel = 'Options';
    @Attribute() className = '';
    @Attribute() changeAction?: (value: string) => void;
    private _disabled = false;

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    get groupClass(): string {
        return [this._disabled ? 'is-disabled' : '', this.className].filter(Boolean).join(' ');
    }

    get viewOptions(): RadioViewOption[] {
        return (Array.isArray(this.options) ? this.options : []).map((option, index) => {
            const checked = this.value !== '' && String(option?.value ?? '') === String(this.value);
            const disabled = this._disabled || option?.disabled === true;
            return {
                key: String(option?.id ?? index),
                index,
                label: String(option?.label ?? ''),
                description: String(option?.description ?? ''),
                checked,
                disabled,
                className: [
                    'ui-radio-option',
                    checked ? 'is-checked' : '',
                    disabled ? 'is-disabled' : ''
                ].filter(Boolean).join(' ')
            };
        });
    }

    isChecked(option: RadioViewOption): boolean {
        return this.value !== '' && String(this.options[option.index]?.value ?? '') === String(this.value);
    }

    optionClass(option: RadioViewOption): string {
        return [
            'ui-radio-option',
            this.isChecked(option) ? 'is-checked' : '',
            option.disabled ? 'is-disabled' : ''
        ].filter(Boolean).join(' ');
    }

    /** Roving tabindex: only the selected (or first enabled) radio is tabbable. */
    tabIndexFor(option: RadioViewOption): number {
        if (!option || option.disabled) {
            return -1;
        }
        const options = this.viewOptions;
        const selected = options.find(entry => entry.checked && !entry.disabled);
        if (selected) {
            return selected.key === option.key ? 0 : -1;
        }
        const first = options.find(entry => !entry.disabled);
        return first && first.key === option.key ? 0 : -1;
    }

    choose(option: RadioViewOption): void {
        if (!option || option.disabled) {
            return;
        }
        focusNth(this.elementRef?.nativeElement, '.ui-radio-option', option.index);
        const value = String(this.options[option.index]?.value ?? '');
        if (value === String(this.value)) {
            return;
        }
        this.value = value;
        this.changeAction?.(this.value);
    }

    onKeydown(option: RadioViewOption, event: any): void {
        if (event?.key === ' ' || event?.key === 'Enter') {
            event?.preventDefault?.();
            this.choose(option);
            return;
        }
        if (event?.key === 'ArrowDown' || event?.key === 'ArrowRight') {
            event?.preventDefault?.();
            this.move(option.index, 1);
            return;
        }
        if (event?.key === 'ArrowUp' || event?.key === 'ArrowLeft') {
            event?.preventDefault?.();
            this.move(option.index, -1);
        }
    }

    private move(from: number, delta: number): void {
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
