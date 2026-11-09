import { Attribute, Component, ElementRef, OnDestroy } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from './raw-element';

/** One actionable entry in a {@link MenuBarComponent} dropdown. */
export interface MenuBarItem {
    id: string;
    label: string;
    /**
     * Optional glyph rendered before the label. Hosts choose the glyph so the
     * component never hard-codes product icons.
     */
    icon?: string;
    /** Optional keyboard hint (for example `Ctrl+Z`). */
    shortcut?: string;
    disabled?: boolean;
    checked?: boolean;
    danger?: boolean;
}

/**
 * A named section of menu entries. Groups are separated visually; labels are
 * optional so hosts can either mimic a flat Node-RED style menu or a grouped
 * application menu.
 */
export interface MenuBarGroup {
    label?: string;
    items: MenuBarItem[];
}

interface MenuBarEntryView {
    kind: 'item' | 'separator' | 'title';
    key: string;
    id: string;
    label: string;
    icon: string;
    shortcut: string;
    disabled: boolean;
    checked: boolean;
    className: string;
}

/**
 * Renderer-neutral menu dropdown.
 *
 * The component owns only presentation and interaction state: hosts provide the
 * groups and receive the selected id. It is used by the workflow designer demo
 * as a Node-RED style application menu and can equally drive a browser or a
 * console surface.
 *
 * Usage:
 * ```html
 * <menu-bar icon="☰" label="Menu" [groups]="groups" [selectAction]="select"></menu-bar>
 * ```
 */
@Component({
    selector: 'menu-bar',
    template: `
    <div class="menu-bar menu-bar-align-{{align}}" data-open="{{openText}}" role="menubar">
        <button class="menu-bar-trigger" type="button"
            aria-haspopup="menu"
            aria-label="{{triggerTitle || label}}"
            aria-expanded="{{openText}}"
            [title]="triggerTitle || label"
            [disabled]="disabled"
            @click="toggle">
            <span class="menu-bar-glyph" v-if="icon">{{icon}}</span>
            <span class="menu-bar-label" v-if="label">{{label}}</span>
            <span class="menu-bar-caret" v-if="caret">{{caret}}</span>
        </button>
        <div class="menu-bar-popup" role="menu" v-show="open">
            <div class="menu-bar-entry" v-for="entry in entries" data-menu-key="{{entry.key}}">
                <div class="menu-bar-separator" role="separator" v-if="entry.kind === 'separator'"></div>
                <div class="menu-bar-group-title" v-if="entry.kind === 'title'">{{entry.label}}</div>
                <button class="menu-bar-item {{entry.className}}" type="button" role="menuitem"
                    v-if="entry.kind === 'item'"
                    data-menu-id="{{entry.id}}"
                    [disabled]="entry.disabled"
                    aria-disabled="{{entry.disabled}}"
                    @click="choose(entry.id, $event)">
                    <span class="menu-bar-item-icon" v-if="entry.icon">{{entry.icon}}</span>
                    <span class="menu-bar-item-label">{{entry.label}}</span>
                    <span class="menu-bar-item-shortcut" v-if="entry.shortcut">{{entry.shortcut}}</span>
                    <span class="menu-bar-item-check" v-if="entry.checked">✓</span>
                </button>
            </div>
        </div>
    </div>`
})
export class MenuBarComponent implements OnDestroy {
    @Attribute() groups: MenuBarGroup[] = [];
    @Attribute() label = 'Menu';
    @Attribute() icon = '☰';
    @Attribute() caret = '▾';
    @Attribute() align: 'left' | 'right' = 'right';
    @Attribute() triggerTitle = '';
    @Attribute() disabled = false;
    @Attribute() selectAction?: (id: string) => void;
    @Attribute() openChange?: (open: boolean) => void;

    private _open = false;
    private bound = false;
    private pointerHandler?: (event: any) => void;
    private keyHandler?: (event: any) => void;

    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Attribute()
    get open(): boolean {
        return this._open;
    }
    set open(value: boolean | string) {
        const next = value === '' || value === true || value === 'true';
        if (next === this._open) {
            return;
        }
        this._open = next;
        this.openChange?.(next);
    }

    get openText(): string {
        return this._open ? 'true' : 'false';
    }

    /** Flat render list derived from groups; keeps the template free of nested loops. */
    get entries(): MenuBarEntryView[] {
        const groups = Array.isArray(this.groups) ? this.groups : [];
        const entries: MenuBarEntryView[] = [];
        groups.forEach((group, groupIndex) => {
            if (!group) {
                return;
            }
            if (groupIndex > 0) {
                entries.push(this.entry('separator', `sep-${groupIndex}`));
            }
            if (group.label) {
                entries.push({
                    ...this.entry('title', `title-${groupIndex}`),
                    label: String(group.label)
                });
            }
            (group.items || []).forEach((item, itemIndex) => {
                if (!item || !item.id) {
                    return;
                }
                entries.push({
                    ...this.entry('item', `${groupIndex}-${itemIndex}-${item.id}`),
                    id: item.id,
                    label: String(item.label || item.id),
                    icon: String(item.icon || ''),
                    shortcut: String(item.shortcut || ''),
                    disabled: item.disabled === true,
                    checked: item.checked === true,
                    className: this.itemClass(item)
                });
            });
        });
        return entries;
    }

    onInit(): void {
        this.bindDocument();
    }

    onDestroy(): void {
        this.unbindDocument();
    }

    toggle(): void {
        if (this.disabled) {
            return;
        }
        this.open = !this._open;
    }

    choose(id: string, event?: Event): void {
        const item = this.findItem(id);
        if (!item || item.disabled) {
            return;
        }
        event?.stopPropagation?.();
        this.close();
        this.selectAction?.(id);
    }

    close(): void {
        this.open = false;
    }

    protected itemClass(item: MenuBarItem): string {
        const classes = [];
        if (item.danger) {
            classes.push('is-danger');
        }
        if (item.checked) {
            classes.push('is-checked');
        }
        return classes.join(' ');
    }

    protected entry(kind: MenuBarEntryView['kind'], key: string): MenuBarEntryView {
        return {
            kind,
            key,
            id: '',
            label: '',
            icon: '',
            shortcut: '',
            disabled: false,
            checked: false,
            className: ''
        };
    }

    protected findItem(id: string): MenuBarItem | undefined {
        for (const group of this.groups || []) {
            const item = (group?.items || []).find(entry => entry?.id === id);
            if (item) {
                return item;
            }
        }
        return undefined;
    }

    protected bindDocument(): void {
        if (this.bound) {
            return;
        }
        const doc = this.ownerDocument();
        if (!doc || typeof doc.addEventListener !== 'function') {
            return;
        }
        this.pointerHandler = event => {
            if (!this._open) {
                return;
            }
            const root = this.hostElement;
            const target = event?.target as any;
            if (root && target && typeof root.contains === 'function' && root.contains(target)) {
                return;
            }
            this.close();
        };
        this.keyHandler = event => {
            if (!this._open || event?.key !== 'Escape') {
                return;
            }
            event.preventDefault?.();
            event.stopPropagation?.();
            this.close();
        };
        doc.addEventListener('mousedown', this.pointerHandler, true);
        doc.addEventListener('keydown', this.keyHandler, true);
        this.bound = true;
    }

    protected unbindDocument(): void {
        const doc = this.ownerDocument();
        if (doc && typeof doc.removeEventListener === 'function') {
            if (this.pointerHandler) {
                doc.removeEventListener('mousedown', this.pointerHandler, true);
            }
            if (this.keyHandler) {
                doc.removeEventListener('keydown', this.keyHandler, true);
            }
        }
        this.pointerHandler = undefined;
        this.keyHandler = undefined;
        this.bound = false;
    }

    protected ownerDocument(): any {
        return (this.hostElement as any)?.ownerDocument
            || (globalThis as { document?: Document }).document;
    }

    protected get hostElement(): any {
        return this.elementRef?.nativeElement as any;
    }
}
