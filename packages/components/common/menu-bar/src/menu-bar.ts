import { AfterViewInit, Attribute, Component, Computed, ElementRef, EventEmitter, OnDestroy, ViewChild, unwrapReactive } from '@tsdi/components';
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
    selector: 'menu-bar, ui-menu-bar',
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
        <div class="menu-bar-popup" role="menu" v-show="open" [style]="popupStyle"
            @scroll="onPopupScroll">
            <div [class]="'menu-bar-entry' + (entry.children.length ? ' has-submenu' : '')" v-for="entry in entries" trackBy="key" data-menu-key="{{entry.key}}"
                @mouseleave="leaveSubmenu(entry.id)"
                @focusout="blurSubmenu(entry.id, $event)">
                <div class="menu-bar-separator" role="separator" v-if="entry.kind === 'separator'"></div>
                <div class="menu-bar-group-title" v-if="entry.kind === 'title'">{{entry.label}}</div>
                <button class="menu-bar-item {{entry.className}}" type="button" role="menuitem"
                    v-if="entry.kind === 'item'"
                    data-menu-id="{{entry.id}}"
                    [disabled]="entry.disabled"
                    aria-disabled="{{entry.disabled}}"
                    @click="choose(entry.id, $event)"
                    @mouseenter="hoverSubmenu(entry.id, $event)"
                    @focus="hoverSubmenu(entry.id, $event)">
                    <span class="menu-bar-item-icon" v-if="entry.icon"><icon [name]="entry.icon" [glyph]="entry.icon" size="sm"></icon></span>
                    <span class="menu-bar-item-label">{{entry.label}}</span>
                    <span class="menu-bar-item-shortcut" v-if="entry.shortcut">{{entry.shortcut}}</span>
                    <span class="menu-bar-item-check" v-if="entry.checked"><icon name="check" size="xs"></icon></span>
                    <span class="menu-bar-item-caret" v-if="entry.children.length"><icon name="caret-right" size="xs"></icon></span>
                </button>
                <div [class]="'menu-bar-submenu' + (submenuOpen(entry.id) ? ' is-open' : '')"
                    [style]="submenuStyle(entry.id)" role="menu" v-if="entry.children.length">
                    <button class="menu-bar-item" type="button" role="menuitem"
                        v-for="child in entry.children"
                        trackBy="id"
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
    @Attribute() openChange = new EventEmitter<boolean>();

    private _open = false;
    /** Id of the submenu parent currently expanded by click. */
    activeSubmenuKey = '';
    /** Id of the submenu parent currently previewed by hover/focus. */
    hoverSubmenuKey = '';
    /** Viewport coordinates of the open flyout (escapes the popup's clipping). */
    private submenuLeft = 0;
    private submenuTop = 0;
    private submenuMaxHeight = 0;
    /** Viewport budget for the scrollable popup, measured from the trigger. */
    private popupMaxHeight = 0;
    private popupAbove = false;
    private bound = false;
    private pointerHandler?: (event: any) => void;
    private keyHandler?: (event: any) => void;

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
        if (this._open) {
            this.anchorPopup();
        }
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
        if (next) {
            // The popup always exists (it is only hidden), so the trigger can
            // be measured immediately. Re-measure on the microtask as well in
            // case the menu opened during the first render pass.
            this.anchorPopup();
            void Promise.resolve().then(() => {
                if (this._open) {
                    this.anchorPopup();
                }
            });
        }
        this.openChange.emit(next);
    }

    get openText(): string {
        return this._open ? 'true' : 'false';
    }

    /** Flat render list derived from groups; keeps the template free of nested loops. */
    @Computed()
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
            this.hoverSubmenuKey = '';
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
            const opening = this.activeSubmenuKey !== id;
            if (opening) {
                this.anchorSubmenu(id, event);
                this.activeSubmenuKey = id;
            } else {
                this.activeSubmenuKey = '';
                this.hoverSubmenuKey = '';
            }
            return;
        }
        this.close();
        this.selectAction?.(id);
    }

    close(): void {
        this.open = false;
        this.activeSubmenuKey = '';
        this.hoverSubmenuKey = '';
    }

    /**
     * Preview a flyout as soon as the pointer (or keyboard focus) enters its
     * parent row. The popup is a scroll container, so the flyout must switch to
     * fixed coordinates before it becomes visible; otherwise it is clipped by
     * the popup's overflow box — which is exactly what happened once long menus
     * gained a scrollbar.
     */
    hoverSubmenu(id: string, event?: Event): void {
        if (this.activeSubmenuKey && this.activeSubmenuKey !== id) {
            this.activeSubmenuKey = '';
        }
        this.hoverSubmenuKey = id;
        this.anchorSubmenu(id, event);
    }

    leaveSubmenu(id: string): void {
        if (this.hoverSubmenuKey === id) {
            this.hoverSubmenuKey = '';
        }
    }

    /** Keep the flyout open while keyboard focus moves inside the same entry. */
    blurSubmenu(id: string, event?: Event): void {
        const next = (event as any)?.relatedTarget;
        const root = unwrapReactive((event as any)?.currentTarget);
        if (next && root?.contains?.(next)) {
            return;
        }
        this.leaveSubmenu(id);
    }

    submenuOpen(id: string): boolean {
        return this.activeSubmenuKey === id || this.hoverSubmenuKey === id;
    }

    /** Keep a visible flyout attached to its row while the popup scrolls. */
    onPopupScroll(): void {
        const id = this.activeSubmenuKey || this.hoverSubmenuKey;
        if (!id) {
            return;
        }
        const root = unwrapReactive(this.hostElement);
        const item = root?.querySelector?.(`[data-menu-id="${id}"]`);
        if (item) {
            this.anchorSubmenuElement(item);
        }
    }

    /**
     * Anchor the flyout with fixed coordinates. The popup is a scroll container,
     * so an absolutely positioned flyout outside its box is clipped; fixed
     * coordinates keep nested menus visible and clickable near the viewport edge.
     */
    anchorSubmenu(id: string, event?: Event): void {
        const target = unwrapReactive(event?.currentTarget as any);
        if (!target) {
            const root = unwrapReactive(this.hostElement);
            const item = root?.querySelector?.(`[data-menu-id="${id}"]`);
            if (!item) {
                return;
            }
            this.anchorSubmenuElement(item);
            return;
        }
        this.anchorSubmenuElement(target);
    }

    protected anchorSubmenuElement(target: any): void {
        target = unwrapReactive(target);
        const rect = target?.getBoundingClientRect?.();
        if (!rect) {
            return;
        }
        const win = target?.ownerDocument?.defaultView
            || (globalThis as { innerHeight?: number });
        const width = 240;
        const viewWidth = Number((win as any)?.innerWidth) || 1024;
        const viewHeight = Number((win as any)?.innerHeight) || 768;
        const left = rect.right + width + 8 > viewWidth
            ? Math.max(8, rect.left - width - 4)
            : rect.right + 4;
        const top = Math.max(8, Math.min(rect.top - 6, viewHeight - 160));
        this.submenuLeft = Math.round(left);
        this.submenuTop = Math.round(top);
        // Only let the flyout scroll when it would actually leave the viewport.
        this.submenuMaxHeight = Math.max(120, Math.round(viewHeight - top - 8));
    }

    submenuStyle(id: string): string {
        if (!this.submenuOpen(id)) {
            return '';
        }
        const maxHeight = this.submenuMaxHeight || 480;
        return `position: fixed; left: ${this.submenuLeft}px; top: ${this.submenuTop}px; `
            + `right: auto; max-height: ${maxHeight}px;`;
    }

    /**
     * Bound the popup by the space between the trigger and the viewport edge
     * instead of an arbitrary 60vh/480px cap. `max-height` alone never shows a
     * scrollbar while the content fits, so short menus stay scrollbar-free even
     * on small screens.
     */
    @Computed()
    get popupStyle(): string {
        if (!this._open) {
            return '';
        }
        const vertical = this.popupAbove
            ? 'top: auto; bottom: calc(100% + 6px);'
            : 'top: calc(100% + 6px); bottom: auto;';
        const maxHeight = Math.round(this.popupMaxHeight || 480);
        return `${vertical} max-height: ${maxHeight}px;`;
    }

    protected anchorPopup(): void {
        const root = unwrapReactive(this.hostElement);
        const trigger = root?.querySelector?.('.menu-bar-trigger');
        const rect = trigger?.getBoundingClientRect?.();
        const win = trigger?.ownerDocument?.defaultView
            || (globalThis as { innerHeight?: number });
        const viewHeight = Number((win as any)?.innerHeight) || 768;
        const margin = 12;
        // jsdom and non-layout hosts report a zero rect; fall back to the full
        // viewport so the CSS max-height still never creates a fixed cap.
        if (!rect || (!rect.height && !rect.top && !rect.bottom)) {
            this.popupAbove = false;
            this.popupMaxHeight = Math.max(160, viewHeight - margin * 2);
            return;
        }
        const below = viewHeight - rect.bottom - margin;
        const above = rect.top - margin;
        this.popupAbove = below < 240 && above > below;
        this.popupMaxHeight = Math.max(160, this.popupAbove ? above : below);
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
            const root = unwrapReactive(this.hostElement);
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
        return unwrapReactive(this.hostElement)?.ownerDocument
            || (globalThis as { document?: Document }).document;
    }

    protected get hostElement(): any {
        return unwrapReactive((this.menuRoot?.nativeElement || this.elementRef?.nativeElement) as any);
    }
}
