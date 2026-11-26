import { AnimationClock, Attribute, Component, OnDestroy } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { iconSizeFor, normalizeBoolean, normalizeSize, normalizeTone, UiSize, UiTone } from '../../src/ui';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonShape = 'default' | 'round' | 'circle';

/**
 * Renderer-neutral action button.
 *
 * The host owns the click behavior and visual skin; the component provides a
 * stable `ui-button` structure, semantic tone/size classes and accessible
 * disabled/loading/pressed state for both DOM and terminal surfaces.
 */
@Component({
    selector: 'ui-button',
    template: `
    <button class="console-button ui-button {{buttonClass}}"
        type="{{type}}"
        [disabled]="disabled || loading"
        aria-label="{{ariaLabel || label}}"
        aria-busy="{{loading}}"
        aria-pressed="{{pressed}}"
        @click="activate">
        <span class="ui-button-spinner" v-if="loading && spinner" aria-hidden="true">{{spinnerFrame}}</span>
        <icon v-if="icon && !(loading && spinner)" [class]="iconClass" [name]="icon" [glyph]="iconGlyph || icon" [size]="iconSize"></icon>
        <span class="ui-button-labels" v-if="label || (loading && loadingLabel)">
            <span class="ui-button-label {{loading && loadingLabel ? 'is-loading-ghost' : ''}}" aria-hidden="{{loading && !!loadingLabel}}">{{label}}</span>
            <span class="ui-button-label" v-if="loading && loadingLabel">{{loadingLabel}}</span>
        </span>
        <v-content></v-content>
    </button>`
})
export class ButtonComponent implements OnDestroy {
    constructor(@Optional() @Inject(AnimationClock) protected clock?: AnimationClock | null) { }

    onInit(): void {
        this.ready = true;
        this.syncSpinner();
    }

    onDestroy(): void {
        this.stopSpinner();
    }

    @Attribute() label = '';
    @Attribute() icon = '';
    @Attribute() iconGlyph = '';
    /** Extra class on the leading icon (host skins that space icons themselves). */
    @Attribute() iconClass = '';
    @Attribute() variant: ButtonVariant = 'ghost';
    @Attribute() type: 'button' | 'submit' | 'reset' = 'button';
    @Attribute() ariaLabel = '';
    @Attribute() loadingLabel = '';
    @Attribute() className = '';
    /** Animate a spinner while loading (shared AnimationClock; static in bare tests). */
    @Attribute()
    get spinner(): boolean { return this._spinner; }
    set spinner(value: boolean | string) { this._spinner = normalizeBoolean(value, true); this.syncSpinner(); }
    @Attribute() spinnerFrames: string[] = ['◐', '◓', '◑', '◒'];
    @Attribute() spinnerInterval = 100;
    @Attribute() action?: () => void;
    @Attribute() iconOnly = false;

    private _tone: UiTone = 'default';
    private _size: UiSize = 'md';
    private _disabled = false;
    private _loading = false;
    private _pressed = false;
    private _block = false;
    private _shape: ButtonShape = 'default';
    private _spinner = true;
    private spinnerIndex = 0;
    private spinnerTick = 0;
    private spinnerListening = false;
    private ready = false;

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value); }

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get loading(): boolean { return this._loading; }
    set loading(value: boolean | string) {
        this._loading = normalizeBoolean(value);
        this.syncSpinner();
    }

    /** Toggle-button state (`aria-pressed` plus the `is-pressed` class hook). */
    @Attribute()
    get pressed(): boolean { return this._pressed; }
    set pressed(value: boolean | string) { this._pressed = normalizeBoolean(value); }

    /** Stretch the button to the container width. */
    @Attribute()
    get block(): boolean { return this._block; }
    set block(value: boolean | string) { this._block = normalizeBoolean(value); }

    @Attribute()
    get shape(): ButtonShape { return this._shape; }
    set shape(value: string) {
        this._shape = value === 'round' || value === 'circle' ? value : 'default';
    }

    get iconSize(): 'xs' | 'sm' | 'md' | 'lg' {
        return iconSizeFor(this._size);
    }

    get spinnerFrame(): string {
        const frames = Array.isArray(this.spinnerFrames) && this.spinnerFrames.length
            ? this.spinnerFrames
            : ['◐'];
        return String(frames[this.spinnerIndex % frames.length] ?? '◐');
    }

    get buttonClass(): string {
        return [
            `is-${this._tone}`,
            `is-${this._size}`,
            `is-${this.variant}`,
            `is-shape-${this._shape}`,
            this.iconOnly ? 'is-icon-only' : '',
            this._block ? 'is-block' : '',
            this._pressed ? 'is-pressed' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    activate(): void {
        if (this._disabled || this._loading) {
            return;
        }
        this.action?.();
    }

    protected syncSpinner(): void {
        const shouldTick = this.ready && this._loading && this._spinner && !!this.clock;
        if (shouldTick && !this.spinnerListening) {
            this.listener ??= () => this.tickSpinner();
            this.clock?.subscribe(this.listener);
            this.spinnerListening = true;
        } else if (!shouldTick) {
            this.stopSpinner();
        }
    }

    protected tickSpinner(): void {
        if (!this._loading || !this._spinner) {
            return;
        }
        const now = Date.now();
        const interval = Math.max(16, Number(this.spinnerInterval) || 100);
        if (now - this.spinnerTick < interval) {
            return;
        }
        this.spinnerTick = now;
        this.spinnerIndex += 1;
    }

    protected stopSpinner(): void {
        if (!this.spinnerListening || !this.clock || !this.listener) {
            return;
        }
        this.clock.unsubscribe(this.listener);
        this.spinnerListening = false;
    }

    private listener?: () => void;
}
