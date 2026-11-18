import { Attribute, Component } from '@tsdi/components';
import { normalizeSize, normalizeTone, UiSize, UiTone } from '../../src/ui';

interface KbdViewKey {
    key: string;
    label: string;
    last: boolean;
}

/**
 * Keyboard shortcut hint (`Ctrl + K`). Renders `<kbd>` boxes in DOM and the
 * same text run in terminal hosts.
 */
@Component({
    selector: 'ui-kbd',
    template: `
    <span class="ui-kbd {{kbdClass}}" role="text" aria-label="{{ariaLabel || label}}">
        <span class="ui-kbd-node" v-for="entry in viewKeys" trackBy="key">
            <kbd class="ui-kbd-key">{{entry.label}}</kbd>
            <span class="ui-kbd-separator" aria-hidden="true" v-if="!entry.last">{{separator}}</span>
        </span>
    </span>`
})
export class KbdComponent {
    @Attribute() keys: string[] = [];
    @Attribute() separator = '+';
    @Attribute() label = '';
    @Attribute() ariaLabel = '';
    @Attribute() className = '';
    private _size: UiSize = 'sm';
    private _tone: UiTone = 'default';

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value, 'sm'); }

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value); }

    get kbdClass(): string {
        return [`is-${this._size}`, `is-${this._tone}`, this.className].filter(Boolean).join(' ');
    }

    get viewKeys(): KbdViewKey[] {
        const keys = Array.isArray(this.keys) ? this.keys : [];
        return keys.map((key, index) => ({
            key: String(index),
            label: String(key ?? ''),
            last: index === keys.length - 1
        }));
    }
}
