import { AfterViewInit, Attribute, Component, ElementRef, NoReactive, OnDestroy, ViewChild } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';

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
    /**
     * Nested entries rendered as a flyout submenu. Hosts use this for grouped
     * choices such as themes without adding another application menu.
     */
    children?: MenuBarItem[];
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
    children: MenuBarEntryView[];
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
 * <menu-bar icon="menu" label="Menu" [groups]="groups" [selectAction]="select"></menu-bar>
 * ```
 */
@Component({
    selector: 'menu-bar',
    template: `
    <div #menuRoot class="menu-bar menu-bar-align-{{align}}" data-open="{{openText}}" role="menubar">
        <button class="menu-bar-trigger" type="button"
            aria-haspopup="menu"
            aria-label="{{triggerTitle || label}}"
            aria-expanded="{{openText}}"
            [title]="triggerTitle || label"
            [disabled]="disabled"
            @click="toggle">
            <span class="menu-bar-glyph" v-if="icon"><icon [name]="icon" [glyph]="icon" size="sm"></icon></span>
            <span class="menu-bar-label" v-if="label">{{label}}</span>
            <span class="menu-bar-caret" v-if="caret"><icon [name]="caret" [glyph]="caret" size="xs"></icon></span>
        </button>
        <div class="menu-bar-popup" role="menu" v-show="open">
            <div [class]="'menu-bar-entry' + (entry.children.length ? ' has-submenu' : '')" v-for="entry in entries" data-menu-key="{{entry.key}}">
                <div class="menu-bar-separator" role="separator" v-if="entry.kind === 'separator'"></div>
                <div class="menu-bar-group-title" v-if="entry.kind === 'title'">{{entry.label}}</div>
                <button class="menu-bar-item {{entry.className}}" type="button" role="menuitem"
                    v-if="entry.kind === 'item'"
                    data-menu-id="{{entry.id}}"
                    [disabled]="entry.disabled"
                    aria-disabled="{{entry.disabled}}"
                    @click="choose(entry.id, $event)">
                    <span class="menu-bar-item-icon" v-if="entry.icon"><icon [name]="entry.icon" [glyph]="entry.icon" size="sm"></icon></span>
                    <span class="menu-bar-item-label">{{entry.label}}</span>
                    <span class="menu-bar-item-shortcut" v-if="entry.shortcut">{{entry.shortcut}}</span>
                    <span class="menu-bar-item-check" v-if="entry.checked"><icon name="check" size="xs"></icon></span>
                    <span class="menu-bar-item-caret" v-if="entry.children.length"><icon name="caret-right" size="xs"></icon></span>
                </button>
                <div [class]="'menu-bar-submenu' + (activeSubmenuKey === entry.id ? ' is-open' : '')" role="menu" v-if="entry.children.length">
                    <button class="menu-bar-item" type="button" role="menuitem"
                        v-for="child in entry.children"
                        data-menu-id="{{child.id}}"
                        [disabled]="child.disabled"
                        [class]="child.className"
                        aria-disabled="{{child.disabled}}"
                        @click="choose(child.id, $event)">
                        <span class="menu-bar-item-icon" v-if="child.icon"><icon [name]="child.icon" [glyph]="child.icon" size="sm"></icon></span>
                        <span class="menu-bar-item-label">{{child.label}}</span>
                        <span class="menu-bar-item-shortcut" v-if="child.shortcut">{{child.shortcut}}</span>
                        <span class="menu-bar-item-check" v-if="child.checked"><icon name="check" size="xs"></icon></span>
                    </button>
                </div>
            </div>
        </div>
    </div>`
})
export class MenuBarComponent implements AfterViewInit, OnDestroy {
    @Attribute() groups: MenuBarGroup[] = [];
    @Attribute() label = 'Menu';
    @Attribute() icon = 'menu';
    @Attribute() caret = '▾';
    @Attribute() align: 'left' | 'right' = 'right';
    @Attribute() triggerTitle = '';
    @Attribute() disabled = false;
    @Attribute() selectAction?: (id: string) => void;
    @Attribute() openChange?: (open: boolean) => void;

    private _open = false;
    /** Id of the submenu parent currently expanded by click. */
    activeSubmenuKey = '';
    private bound = false;
    private pointerHandler?: (event: any) => void;
    private keyHandler?: (event: any) => void;
    /**
     * `groups` is usually rebuilt only when host data changes. The flattened
     * entry list is cached per groups instance so an unrelated parent rerender
     * does not recreate every menu row.
     */
    @NoReactive() private entriesCache?: { groups: MenuBarGroup[]; entries: MenuBarEntryView[] };

    /**
     * The component host's injected `ElementRef` can point at the outer host
     * page in nested templates, so document click containment uses the menu's
     * own root element captured from the view instead.
     */
    @ViewChild('menuRoot', ElementRef) menuRoot?: ElementRef;

    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onAfterViewInit(): void {
        markElementRefRaw(this.menuRoot);
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
        const cache = this.entriesCache;
        if (cache && cache.groups === groups) {
            return cache.entries;
        }
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
                const children = (item.children || [])
                    .filter(child => child && child.id)
                    .map((child, childIndex) => ({
                        ...this.entry('item', `${groupIndex}-${itemIndex}-${childIndex}-${child.id}`),
                        id: child.id,
                        label: String(child.label || child.id),
                        icon: String(child.icon || ''),
                        shortcut: String(child.shortcut || ''),
                        disabled: child.disabled === true,
                        checked: child.checked === true,
                        className: this.itemClass(child)
                    }));
                entries.push({
                    ...this.entry('item', `${groupIndex}-${itemIndex}-${item.id}`),
                    id: item.id,
                    label: String(item.label || item.id),
                    icon: String(item.icon || ''),
                    shortcut: String(item.shortcut || ''),
                    disabled: item.disabled === true,
                    checked: item.checked === true,
                    className: this.itemClass(item, children.length > 0),
                    children
                });
            });
        });
        this.entriesCache = { groups, entries };
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
        if (!this._open) {
            this.activeSubmenuKey = '';
        }
    }

    choose(id: string, event?: Event): void {
        const item = this.findItem(id);
        if (!item || item.disabled) {
            return;
        }
        event?.stopPropagation?.();
        if (item.children?.length) {
            // Click toggles the flyout; hover-only submenus are unusable on
            // touch/keyboard and can vanish while crossing the 2px gap.
            this.activeSubmenuKey = this.activeSubmenuKey === id ? '' : id;
            return;
        }
        this.close();
        this.selectAction?.(id);
    }

    close(): void {
        this.open = false;
        this.activeSubmenuKey = '';
    }

    protected itemClass(item: MenuBarItem, hasChildren = false): string {
        const classes = [];
        if (item.danger) {
            classes.push('is-danger');
        }
        if (item.checked) {
            classes.push('is-checked');
        }
        if (hasChildren) {
            classes.push('has-submenu');
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
            className: '',
            children: []
        };
    }

    protected findItem(id: string): MenuBarItem | undefined {
        for (const group of this.groups || []) {
            for (const item of group?.items || []) {
                if (!item) {
                    continue;
                }
                if (item.id === id) {
                    return item;
                }
                const child = (item.children || []).find(entry => entry?.id === id);
                if (child) {
                    return child;
                }
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
        return (this.menuRoot?.nativeElement || this.elementRef?.nativeElement) as any;
    }
}
