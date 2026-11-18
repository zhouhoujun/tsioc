import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean, normalizeTone, UiTone } from '../../src/ui';

export type ToolbarKind = 'item' | 'separator';
export type ToolbarOrientation = 'horizontal' | 'vertical';

export interface ToolbarItem {
    id?: string;
    label?: string;
    icon?: string;
    iconGlyph?: string;
    tone?: UiTone;
    kind?: ToolbarKind;
    disabled?: boolean;
    active?: boolean;
    danger?: boolean;
}

interface ToolbarViewItem {
    key: string;
    index: number;
    kind: ToolbarKind;
    label: string;
    icon: string;
    iconGlyph: string;
    disabled: boolean;
    active: boolean;
    className: string;
}

/**
 * Renderer-neutral action strip. Items are data, not projected markup, so the
 * same toolbar works in a browser toolbar and a terminal command rail.
 */
@Component({
    selector: 'ui-toolbar',
    template: `
    <div class="ui-toolbar {{toolbarClass}}" role="toolbar" aria-label="{{ariaLabel}}" aria-orientation="{{orientation}}">
        <span class="ui-toolbar-entry" v-for="entry in viewItems" trackBy="key">
            <span class="ui-toolbar-separator" role="separator"
                aria-orientation="{{orientation === 'horizontal' ? 'vertical' : 'horizontal'}}"
                v-if="entry.kind === 'separator'"></span>
            <button class="{{entry.className}}" type="button"
                v-if="entry.kind !== 'separator'"
                [disabled]="entry.disabled"
                aria-pressed="{{entry.active}}"
                @click="pick(entry)">
                <icon v-if="entry.icon" [name]="entry.icon" [glyph]="entry.iconGlyph || entry.icon" size="sm"></icon>
                <span class="ui-toolbar-label" v-if="entry.label">{{entry.label}}</span>
            </button>
        </span>
    </div>`
})
export class ToolbarComponent {
    @Attribute() items: ToolbarItem[] = [];
    @Attribute() orientation: ToolbarOrientation = 'horizontal';
    @Attribute() ariaLabel = 'Toolbar';
    @Attribute() className = '';
    @Attribute() action?: (item: ToolbarItem, index: number) => void;
    private _compact = false;

    @Attribute()
    get compact(): boolean { return this._compact; }
    set compact(value: boolean | string) { this._compact = normalizeBoolean(value); }

    get toolbarClass(): string {
        return [
            `is-${this.orientation}`,
            this._compact ? 'is-compact' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get viewItems(): ToolbarViewItem[] {
        return (Array.isArray(this.items) ? this.items : []).map((item, index) => {
            const kind: ToolbarKind = item?.kind === 'separator' ? 'separator' : 'item';
            return {
                key: String(item?.id ?? index),
                index,
                kind,
                label: String(item?.label ?? ''),
                icon: String(item?.icon ?? ''),
                iconGlyph: String(item?.iconGlyph ?? ''),
                disabled: item?.disabled === true,
                active: item?.active === true,
                className: [
                    'ui-toolbar-item',
                    `is-${normalizeTone(item?.tone)}`,
                    item?.active ? 'is-active' : '',
                    item?.danger ? 'is-danger' : '',
                    item?.disabled ? 'is-disabled' : ''
                ].filter(Boolean).join(' ')
            };
        });
    }

    pick(entry: ToolbarViewItem): void {
        if (!entry || entry.disabled || entry.kind === 'separator') {
            return;
        }
        this.action?.(this.items[entry.index], entry.index);
    }
}
