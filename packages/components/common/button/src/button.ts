import { Attribute, Component } from '@tsdi/components';
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
        <icon v-if="icon" [class]="iconClass" [name]="icon" [glyph]="iconGlyph || icon" [size]="iconSize"></icon>
        <span class="ui-button-label" v-if="label">{{loading && loadingLabel ? loadingLabel : label}}</span>
        <v-content></v-content>
    </button>`
})
export class ButtonComponent {
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
    @Attribute() action?: () => void;
    @Attribute() iconOnly = false;

    private _tone: UiTone = 'default';
    private _size: UiSize = 'md';
    private _disabled = false;
    private _loading = false;
    private _pressed = false;
    private _block = false;
    private _shape: ButtonShape = 'default';

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
    set loading(value: boolean | string) { this._loading = normalizeBoolean(value); }

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
}
