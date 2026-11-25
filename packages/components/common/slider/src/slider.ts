import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { normalizeBoolean } from '../../src/ui';
import { markElementRefRaw } from '../../src/raw-element';
import { installSliderStyles } from './slider.styles';

/**
 * Renderer-neutral slider (Ant Design Slider / MUI Slider).
 *
 * The track is painted with text glyphs, so the same filled/thumb/empty shape
 * appears in a browser and in a terminal. Keyboard handling is shared; hosts
 * that own pointer geometry can call `setValue` for drag/click input.
 */
@Component({
    selector: 'ui-slider',
    template: `
    <div class="ui-slider {{sliderClass}}" role="slider"
        aria-label="{{ariaLabel}}"
        aria-valuemin="{{min}}"
        aria-valuemax="{{max}}"
        aria-valuenow="{{currentValue}}"
        aria-valuetext="{{valueText}}"
        aria-orientation="horizontal"
        aria-disabled="{{disabled}}"
        tabindex="{{disabled ? -1 : 0}}"
        focusable="{{!disabled}}"
        @keydown="onKeydown($event)">
        <span class="ui-slider-label" v-if="label">{{label}}</span>
        <span class="ui-slider-track" aria-hidden="true"><span class="ui-slider-filled">{{filledText}}</span><span class="ui-slider-thumb">●</span><span class="ui-slider-rest">{{restText}}</span></span>
        <span class="ui-slider-value" v-if="showValue">{{valueText}}</span>
    </div>`
})
export class SliderComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installSliderStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() value: number | string = 0;
    @Attribute() min: number | string = 0;
    @Attribute() max: number | string = 100;
    @Attribute() step: number | string = 1;
    @Attribute() label = '';
    @Attribute() unit = '';
    @Attribute() ariaLabel = 'Slider';
    @Attribute() width: number | string = 10;
    @Attribute() className = '';
    @Attribute() changeAction?: (value: number) => void;

    private _disabled = false;
    private _showValue = true;

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get showValue(): boolean { return this._showValue; }
    set showValue(value: boolean | string) { this._showValue = normalizeBoolean(value, true); }

    get numericMin(): number {
        return this.number(this.min, 0);
    }

    get numericMax(): number {
        return Math.max(this.numericMin, this.number(this.max, 100));
    }

    get numericStep(): number {
        return Math.max(1e-9, Math.abs(this.number(this.step, 1)) || 1);
    }

    get trackWidth(): number {
        return Math.max(3, Math.min(80, Math.floor(this.number(this.width, 10)) || 10));
    }

    /** Clamp and snap to the configured step. */
    get currentValue(): number {
        return this.normalize(this.value);
    }

    get ratio(): number {
        const span = this.numericMax - this.numericMin;
        return span <= 0 ? 0 : Math.min(1, Math.max(0, (this.currentValue - this.numericMin) / span));
    }

    get filledCount(): number {
        const usable = this.trackWidth - 1;
        return Math.round(this.ratio * usable);
    }

    get filledText(): string {
        return '━'.repeat(this.filledCount);
    }

    get restText(): string {
        return '─'.repeat(Math.max(0, this.trackWidth - 1 - this.filledCount));
    }

    get valueText(): string {
        return `${this.formatNumber(this.currentValue)}${this.unit || ''}`;
    }

    get sliderClass(): string {
        return [
            this._disabled ? 'is-disabled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    setValue(next: number, emit = true): void {
        if (this._disabled) {
            return;
        }
        const value = this.normalize(next);
        if (value === this.currentValue) {
            return;
        }
        this.value = value;
        if (emit) {
            this.changeAction?.(value);
        }
    }

    onKeydown(event: any): void {
        if (this._disabled) {
            return;
        }
        const key = String(event?.key || '');
        const step = this.numericStep;
        const page = step * 10;
        let next: number | undefined;
        if (key === 'ArrowRight' || key === 'ArrowUp') {
            next = this.currentValue + step;
        } else if (key === 'ArrowLeft' || key === 'ArrowDown') {
            next = this.currentValue - step;
        } else if (key === 'PageUp') {
            next = this.currentValue + page;
        } else if (key === 'PageDown') {
            next = this.currentValue - page;
        } else if (key === 'Home') {
            next = this.numericMin;
        } else if (key === 'End') {
            next = this.numericMax;
        }
        if (next === undefined) {
            return;
        }
        event?.preventDefault?.();
        this.setValue(next);
    }

    protected normalize(value: unknown): number {
        const min = this.numericMin;
        const max = this.numericMax;
        const step = this.numericStep;
        const raw = Math.min(max, Math.max(min, this.number(value, min)));
        const snapped = min + Math.round((raw - min) / step) * step;
        return Number(Math.min(max, Math.max(min, snapped)).toFixed(6));
    }

    protected number(value: unknown, fallback: number): number {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    }

    protected formatNumber(value: number): string {
        return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
    }
}
