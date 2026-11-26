import { Attribute, Component } from '@tsdi/components';
import { iconSizeFor, normalizeBoolean, normalizeSize, normalizeTone, UiSize, UiTone } from '../../src/ui';

/** Link-styled action button (Ant Design Button href / MUI Link). */
@Component({
    selector: 'ui-link-button',
    template: `
    <a class="console-button ui-button {{buttonClass}}" [href]="href"
        target="{{target || null}}" aria-label="{{ariaLabel || label}}"
        aria-disabled="{{disabled}}" aria-pressed="{{pressed}}"
        tabindex="{{disabled ? -1 : 0}}" @click="activate($event)">
        <icon v-if="icon" [class]="iconClass" [name]="icon" [glyph]="iconGlyph || icon" [size]="iconSize"></icon>
        <span class="ui-button-label" v-if="label">{{label}}</span>
        <v-content></v-content>
    </a>`
})
export class LinkButtonComponent {
    @Attribute() label = '';
    @Attribute() icon = '';
    @Attribute() iconGlyph = '';
    @Attribute() iconClass = '';
    @Attribute() href = '';
    @Attribute() target = '';
    @Attribute() ariaLabel = '';
    @Attribute() action?: () => void;

    private _tone: UiTone = 'default';
    private _size: UiSize = 'md';
    private _variant: 'solid' | 'outline' | 'ghost' = 'ghost';
    private _shape: 'default' | 'round' | 'circle' = 'default';
    private _disabled = false;
    private _pressed = false;
    private _iconOnly = false;
    private _block = false;

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value); }

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get variant(): 'solid' | 'outline' | 'ghost' { return this._variant; }
    set variant(value: string) { this._variant = value === 'solid' || value === 'outline' ? value : 'ghost'; }

    @Attribute()
    get shape(): 'default' | 'round' | 'circle' { return this._shape; }
    set shape(value: string) { this._shape = value === 'round' || value === 'circle' ? value : 'default'; }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get pressed(): boolean { return this._pressed; }
    set pressed(value: boolean | string) { this._pressed = normalizeBoolean(value); }

    @Attribute()
    get iconOnly(): boolean { return this._iconOnly; }
    set iconOnly(value: boolean | string) { this._iconOnly = normalizeBoolean(value); }

    @Attribute()
    get block(): boolean { return this._block; }
    set block(value: boolean | string) { this._block = normalizeBoolean(value); }

    get iconSize(): 'xs' | 'sm' | 'md' | 'lg' { return iconSizeFor(this._size); }

    get buttonClass(): string {
        return [
            `is-${this._tone}`, `is-${this._size}`, `is-${this._variant}`,
            `is-shape-${this._shape}`, this._iconOnly ? 'is-icon-only' : '',
            this._block ? 'is-block' : '', this._pressed ? 'is-pressed' : ''
        ].filter(Boolean).join(' ');
    }

    activate(event?: any): void {
        if (this._disabled) {
            event?.preventDefault?.();
            return;
        }
        this.action?.();
    }
}
