import { Attribute, Component } from '@tsdi/components';
import { iconSizeFor, normalizeSize, normalizeTone, UiSize, UiTone } from '../../src/ui';

export type AvatarShape = 'circle' | 'square';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

/**
 * Compact person/entity avatar. Uses `src` when the renderer supports images;
 * otherwise the initials or icon fallback keeps the avatar meaningful.
 */
@Component({
    selector: 'ui-avatar',
    template: `
    <span class="ui-avatar {{avatarClass}}"
        data-tone="{{tone}}"
        data-status="{{status}}"
        role="img"
        aria-label="{{ariaLabel || label}}">
        <img class="ui-avatar-image" v-if="src" src="{{src}}" alt="{{label}}" />
        <span class="ui-avatar-text" v-if="!src && (label || initials)">{{initials}}</span>
        <icon class="ui-avatar-icon" v-if="!src && !label && icon" [name]="icon" [glyph]="iconGlyph || icon" [size]="iconSize"></icon>
        <span class="ui-avatar-status" v-if="status" aria-hidden="true"></span>
    </span>`
})
export class AvatarComponent {
    @Attribute() label = '';
    @Attribute() src = '';
    @Attribute() icon = '';
    @Attribute() iconGlyph = '';
    @Attribute() ariaLabel = '';
    @Attribute() className = '';
    @Attribute() shape: AvatarShape = 'circle';
    @Attribute() status: AvatarStatus | '' = '';

    private _size: UiSize = 'md';
    private _tone: UiTone = 'default';

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value); }

    get iconSize(): 'xs' | 'sm' | 'md' | 'lg' {
        return iconSizeFor(this._size);
    }

    get initials(): string {
        const label = String(this.label || '').trim();
        if (!label) {
            return '';
        }
        const parts = label.split(/\s+/).filter(Boolean);
        const text = parts.length > 1
            ? `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`
            : label.slice(0, 2);
        return text.toUpperCase();
    }

    get avatarClass(): string {
        return [
            `is-${this._size}`,
            `is-${this.shape}`,
            this.status ? `has-status is-${this.status}` : '',
            this.className
        ].filter(Boolean).join(' ');
    }
}
