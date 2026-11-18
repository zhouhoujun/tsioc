import { Attribute, Component } from '@tsdi/components';
import { iconSizeFor, normalizeBoolean, normalizeSize, normalizeTone, UiSize, UiTone } from '../../src/ui';

export type BadgeVariant = 'solid' | 'subtle' | 'outline';

/**
 * Compact semantic label/pill. Use it for statuses, counts and filter chips.
 * When `action` is supplied the badge becomes a button-like control and exposes
 * `role="button"`; otherwise it stays a passive status label.
 */
@Component({
    selector: 'ui-badge',
    template: `
    <span class="ui-badge {{badgeClass}}"
        data-tone="{{tone}}"
        role="{{role}}"
        aria-pressed="{{active}}"
        aria-disabled="{{disabled}}"
        @click="activate">
        <span class="ui-badge-dot" v-if="dot" aria-hidden="true"></span>
        <icon v-if="icon" [name]="icon" [glyph]="iconGlyph || icon" [size]="iconSize"></icon>
        <span class="ui-badge-label" v-if="label">{{label}}</span>
        <v-content></v-content>
    </span>`
})
export class BadgeComponent {
    @Attribute() label = '';
    @Attribute() icon = '';
    @Attribute() iconGlyph = '';
    @Attribute() variant: BadgeVariant = 'subtle';
    @Attribute() className = '';
    @Attribute() action?: () => void;

    private _tone: UiTone = 'default';
    private _size: UiSize = 'sm';
    private _dot = false;
    private _active = false;
    private _disabled = false;

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value); }

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value, 'sm'); }

    /** Show a leading status dot (useful without any label). */
    @Attribute()
    get dot(): boolean { return this._dot; }
    set dot(value: boolean | string) { this._dot = normalizeBoolean(value); }

    @Attribute()
    get active(): boolean { return this._active; }
    set active(value: boolean | string) { this._active = normalizeBoolean(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    get role(): 'button' | 'status' {
        return this.action ? 'button' : 'status';
    }

    get iconSize(): 'xs' | 'sm' | 'md' | 'lg' {
        return iconSizeFor(this._size);
    }

    get badgeClass(): string {
        return [
            `is-${this._tone}`,
            `is-${this.variant}`,
            `is-${this._size}`,
            this._active ? 'is-active' : '',
            this._disabled ? 'is-disabled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    activate(): void {
        if (this._disabled || !this.action) {
            return;
        }
        this.action();
    }
}
