import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { focusNth } from '../../src/focus';
import { markElementRefRaw } from '../../src/raw-element';
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
    /** Native tooltip; defaults to `label`. */
    title?: string;
    /** Accessible name; defaults to `label`/`title`. */
    ariaLabel?: string;
    /** Extra class for host-owned skins (for example `workflow-btn`). */
    className?: string;
    variant?: 'solid' | 'outline' | 'ghost';
}

interface ToolbarViewItem {
    key: string;
    index: number;
    kind: ToolbarKind;
    label: string;
    icon: string;
    iconGlyph: string;
    title: string;
    ariaLabel: string;
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
                tabindex="{{tabIndexFor(entry)}}"
                focusable="{{!entry.disabled}}"
                title="{{entry.title || entry.label || entry.ariaLabel}}"
                aria-label="{{entry.ariaLabel || entry.label || entry.title}}"
                aria-pressed="{{entry.active}}"
                @click="pick(entry)"
                @focus="focusEntry(entry)"
                @keydown="onKeydown(entry, $event)">
                <icon v-if="entry.icon" [name]="entry.icon" [glyph]="entry.iconGlyph || entry.icon" size="sm"></icon>
                <span class="ui-toolbar-label" v-if="entry.label">{{entry.label}}</span>
            </button>
        </span>
    </div>`
})
export class ToolbarComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Attribute() items: ToolbarItem[] = [];
    @Attribute() orientation: ToolbarOrientation = 'horizontal';
    @Attribute() ariaLabel = 'Toolbar';
    @Attribute() className = '';
    @Attribute() action?: (item: ToolbarItem, index: number) => void;
    private _compact = false;
    private rovingKey = '';

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
            const variant = item?.variant === 'solid' || item?.variant === 'outline' ? item.variant : '';
            return {
                key: String(item?.id ?? index),
                index,
                kind,
                label: String(item?.label ?? ''),
                icon: String(item?.icon ?? ''),
                iconGlyph: String(item?.iconGlyph ?? ''),
                title: String(item?.title ?? ''),
                ariaLabel: String(item?.ariaLabel ?? ''),
                disabled: item?.disabled === true,
                active: item?.active === true,
                className: [
                    'ui-toolbar-item',
                    `is-${normalizeTone(item?.tone)}`,
                    variant ? `is-${variant}` : '',
                    item?.active ? 'is-active' : '',
                    item?.danger ? 'is-danger' : '',
                    item?.disabled ? 'is-disabled' : '',
                    String(item?.className ?? '')
                ].filter(Boolean).join(' ')
            };
        });
    }

    protected get commandItems(): ToolbarViewItem[] {
        return this.viewItems.filter(entry => entry.kind === 'item');
    }

    protected get currentFocusKey(): string {
        const items = this.commandItems;
        const roving = items.find(entry => entry.key === this.rovingKey && !entry.disabled);
        if (roving) {
            return roving.key;
        }
        const active = items.find(entry => entry.active && !entry.disabled);
        return (active || items.find(entry => !entry.disabled))?.key || '';
    }

    tabIndexFor(entry: ToolbarViewItem): number {
        return entry.kind === 'item' && !entry.disabled && entry.key === this.currentFocusKey ? 0 : -1;
    }

    focusEntry(entry: ToolbarViewItem): void {
        if (entry?.kind === 'item' && !entry.disabled) {
            this.rovingKey = entry.key;
        }
    }

    onKeydown(entry: ToolbarViewItem, event: any): void {
        if (!entry || entry.kind !== 'item' || entry.disabled) {
            return;
        }
        const key = String(event?.key || '');
        const horizontal = this.orientation !== 'vertical';
        const previous = horizontal ? key === 'ArrowLeft' : key === 'ArrowUp';
        const next = horizontal ? key === 'ArrowRight' : key === 'ArrowDown';
        if (!previous && !next && key !== 'Home' && key !== 'End') {
            return;
        }
        event.preventDefault?.();
        const items = this.commandItems.filter(item => !item.disabled);
        if (!items.length) {
            return;
        }
        const index = items.findIndex(item => item.key === entry.key);
        let target = index;
        if (key === 'Home') {
            target = 0;
        } else if (key === 'End') {
            target = items.length - 1;
        } else {
            target = ((index < 0 ? 0 : index) + (next ? 1 : -1) + items.length) % items.length;
        }
        const item = items[target];
        this.rovingKey = item.key;
        const domIndex = this.commandItems.findIndex(command => command.key === item.key);
        focusNth(this.elementRef?.nativeElement, '.ui-toolbar-item', domIndex);
    }

    pick(entry: ToolbarViewItem): void {
        if (!entry || entry.disabled || entry.kind === 'separator') {
            return;
        }
        this.rovingKey = entry.key;
        this.action?.(this.items[entry.index], entry.index);
    }
}
