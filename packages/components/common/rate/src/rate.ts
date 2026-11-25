import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean, normalizeSize, UiSize } from '../../src/ui';
import { installRateStyles } from './rate.styles';

interface RateStar {
    index: number;
    glyph: string;
}

/**
 * Star rating (Ant Design Rate / MUI Rating).
 *
 * Filled/empty characters are plain text, so the terminal and browser paint
 * the same value. `role="slider"` exposes the value; arrows/Home/End and click
 * share the same update path, and clicking the current value clears it when
 * `allowClear` is enabled.
 */
@Component({
    selector: 'ui-rate',
    template: `
    <span class="ui-rate {{rateClass}}" role="slider"
        aria-label="{{ariaLabel}}"
        aria-valuemin="0" aria-valuemax="{{countNumber}}"
        aria-valuenow="{{currentValue}}" aria-valuetext="{{valueText}}"
        aria-disabled="{{disabled}}" aria-readonly="{{readonly}}"
        tabindex="{{disabled || readonly ? -1 : 0}}"
        focusable="{{!disabled && !readonly}}"
        @keydown="onKeydown($event)">
        <span class="ui-rate-star {{star.index < currentValue ? 'is-filled' : ''}}"
            v-for="star in stars" trackBy="index" aria-hidden="true"
            @click="pick(star, $event)">{{star.glyph}}</span>
    </span>`
})
export class RateComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installRateStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() value: number | string = 0;
    @Attribute() count: number | string = 5;
    @Attribute() character = '★';
    @Attribute() emptyCharacter = '☆';
    @Attribute() ariaLabel = 'Rating';
    @Attribute() className = '';
    @Attribute() changeAction?: (value: number) => void;

    private _size: UiSize = 'md';
    private _disabled = false;
    private _readonly = false;
    private _allowClear = true;

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get readonly(): boolean { return this._readonly; }
    set readonly(value: boolean | string) { this._readonly = normalizeBoolean(value); }

    @Attribute()
    get allowClear(): boolean { return this._allowClear; }
    set allowClear(value: boolean | string) { this._allowClear = normalizeBoolean(value, true); }

    get countNumber(): number {
        return Math.max(1, Math.min(10, Math.floor(Number(this.count) || 5)));
    }

    get currentValue(): number {
        return Math.max(0, Math.min(this.countNumber, Math.floor(Number(this.value) || 0)));
    }

    get valueText(): string {
        return `${this.currentValue} / ${this.countNumber}`;
    }

    get rateClass(): string {
        return [
            `is-${this._size}`,
            this._disabled ? 'is-disabled' : '',
            this._readonly ? 'is-readonly' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get stars(): RateStar[] {
        const count = this.countNumber;
        return Array.from({ length: count }, (_value, index) => ({
            index,
            glyph: index < this.currentValue ? this.character : this.emptyCharacter
        }));
    }

    pick(star: RateStar, event?: Event): void {
        event?.stopPropagation?.();
        if (this._disabled || this._readonly) {
            return;
        }
        const next = star.index + 1;
        this.apply(next === this.currentValue && this._allowClear ? 0 : next);
    }

    onKeydown(event: any): void {
        if (this._disabled || this._readonly) {
            return;
        }
        const key = String(event?.key || '');
        let next: number | undefined;
        if (key === 'ArrowRight' || key === 'ArrowUp') {
            next = this.currentValue + 1;
        } else if (key === 'ArrowLeft' || key === 'ArrowDown') {
            next = this.currentValue - 1;
        } else if (key === 'Home') {
            next = 1;
        } else if (key === 'End') {
            next = this.countNumber;
        } else if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            next = this.currentValue > 0 && this._allowClear ? 0 : this.countNumber;
        }
        if (next === undefined) {
            return;
        }
        event?.preventDefault?.();
        this.apply(next);
    }

    protected apply(next: number): void {
        const value = Math.max(0, Math.min(this.countNumber, Math.floor(Number(next) || 0)));
        if (value === this.currentValue) {
            return;
        }
        this.value = value;
        this.changeAction?.(value);
    }
}
