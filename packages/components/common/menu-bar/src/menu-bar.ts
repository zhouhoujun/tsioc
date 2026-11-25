import { AfterViewInit, Attribute, Component, Computed, ElementRef, EventEmitter, OnDestroy, ViewChild, unwrapReactive } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean, nextUiId } from '../../src/ui';
import { OverlayManager } from '../../src/overlay-manager';
import {
    bindMenuBarDismiss,
    focusDomElement,
    measurePopupLayout,
    measureSubmenuLayout,
    menuButtons,
    menuLevelButtons,
    openSubmenuElement,
    scheduleDomFocus
} from './menu-bar.dom';

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
    <div #menuRoot class="menu-bar menu-bar-align-{{align}}" data-open="{{openText}}" role="menubar"
        @keydown="onMenuKeydown($event)">
        <button class="menu-bar-trigger" type="button"
            aria-haspopup="menu"
            aria-label="{{triggerTitle || label}}"
            aria-expanded="{{openText}}"
            [title]="triggerTitle || label"
            [disabled]="disabled"
            @click="toggle"
            @keydown="onTriggerKeydown($event)">
            <span class="menu-bar-glyph" v-if="icon"><icon [name]="icon" [glyph]="icon" size="sm"></icon></span>
            <span class="menu-bar-label" v-if="label">{{label}}</span>
            <span class="menu-bar-caret" v-if="caret"><icon [name]="caret" [glyph]="caret" size="xs"></icon></span>
        </button>
        <div class="menu-bar-popup" role="menu" v-show="open" [style]="popupStyle"
            @scroll="onPopupScroll">
            <div [class]="'menu-bar-entry' + (entry.children.length ? ' has-submenu' : '')" v-for="entry in entries" trackBy="key" data-menu-key="{{entry.key}}"
                role="none"
                @mouseleave="leaveSubmenu(entry.id)"
                @focusout="blurSubmenu(entry.id, $event)">
                <div class="menu-bar-separator" role="separator" v-if="entry.kind === 'separator'"></div>
                <div class="menu-bar-group-title" v-if="entry.kind === 'title'">{{entry.label}}</div>
                <button class="menu-bar-item {{entry.className}}" type="button" role="menuitem"
                    v-if="entry.kind === 'item'"
                    data-menu-id="{{entry.id}}"
                    [disabled]="entry.disabled"
                    aria-disabled="{{entry.disabled}}"
                    aria-haspopup="{{entry.children.length ? 'menu' : 'false'}}"
                    aria-expanded="{{entry.children.length ? submenuOpen(entry.id) : 'false'}}"
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
    private submenuRight = 0;
    private submenuSide: 'left' | 'right' = 'right';
    private submenuTop = 0;
    private submenuBottom = 0;
    private submenuAbove = false;
    private submenuMaxHeight = 0;
    /** Viewport budget for the scrollable popup, measured from the trigger. */
    private popupMaxHeight = 0;
    private popupAbove = false;
    private unbindDismiss?: () => void;
    private suppressFocusPreview = false;
    protected readonly overlayId = nextUiId('menu-bar');
    private _overlayEnabled = false;
    private overlayRegistered = false;

    /**
     * The component host's injected `ElementRef` can point at the outer host
     * page in nested templates, so document click containment uses the menu's
     * own root element captured from the view instead.
     */
    @ViewChild('menuRoot', ElementRef) menuRoot?: ElementRef;

    constructor(@Optional() protected elementRef?: ElementRef, @Optional() @Inject(OverlayManager) private overlays?: OverlayManager | null) {
        markElementRefRaw(elementRef);
    }

    /** Opt-in: register the open menu in the shared overlay stack. */
    @Attribute()
    get overlayEnabled(): boolean { return this._overlayEnabled; }
    set overlayEnabled(value: boolean | string) {
        const next = normalizeBoolean(value);
        if (next === this._overlayEnabled) {
            return;
        }
        this._overlayEnabled = next;
        this.syncOverlay();
    }

    /** Return false / reject to keep the menu open (host dirty check). */
    @Attribute() beforeCloseAction?: () => boolean | Promise<boolean>;

    protected syncOverlay(): void {
        if (this._open && this._overlayEnabled) {
            if (!this.overlayRegistered) {
                this.overlayRegistered = this.overlays?.register({
                    id: this.overlayId,
                    kind: 'menu',
                    beforeClose: () => this.beforeCloseAction?.() ?? true,
                    close: reason => this.close(reason === 'escape')
                }) ?? false;
            }
            return;
        }
        if (this.overlayRegistered) {
            this.overlayRegistered = false;
            this.overlays?.close(this.overlayId);
        }
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
        this.syncOverlay();
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
        if (this.overlayRegistered) {
            this.overlayRegistered = false;
            this.overlays?.close(this.overlayId);
        }
    }

    toggle(): void {
        if (this.disabled) {
            return;
        }
        this.open = !this._open;
        if (!this._open) {
            this.activeSubmenuKey = '';
            this.hoverSubmenuKey = '';
            return;
        }
        // Opening moves keyboard focus into the menu, matching native menubars.
        scheduleDomFocus(this.ownerDocument(), () => this.menuItemNode(0));
    }

    /** ArrowDown/ArrowUp on the trigger opens the menu and focuses its first item. */
    onTriggerKeydown(event: any): void {
        if (this.disabled) {
            return;
        }
        const key = String(event?.key || '');
        if (key !== 'ArrowDown' && key !== 'ArrowUp') {
            return;
        }
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (!this._open) {
            this.open = true;
        }
        scheduleDomFocus(this.ownerDocument(), () => this.menuItemNode(key === 'ArrowUp' ? -1 : 0));
    }

    /**
     * Roving focus inside the open menu: Arrow keys, Home/End, ArrowRight into
     * a flyout and ArrowLeft back to its parent. Escape is handled at the
     * document level so it works no matter which item has focus.
     */
    onMenuKeydown(event: any): void {
        if (!this._open) {
            return;
        }
        const key = String(event?.key || '');
        const items = this.menuLevelItems();
        if (!items.length) {
            return;
        }
        const doc = this.ownerDocument();
        const active = doc?.activeElement as HTMLElement | undefined;
        const index = items.indexOf(active as HTMLElement);
        if (key === 'ArrowDown' || key === 'ArrowUp') {
            event?.preventDefault?.();
            const step = key === 'ArrowDown' ? 1 : -1;
            const next = index < 0
                ? (step > 0 ? 0 : items.length - 1)
                : (index + step + items.length) % items.length;
            focusDomElement(items[next]);
            return;
        }
        if (key === 'Home' || key === 'End') {
            event?.preventDefault?.();
            focusDomElement(key === 'Home' ? items[0] : items[items.length - 1]);
            return;
        }
        if (key === 'ArrowRight') {
            const current = (index >= 0 ? items[index] : undefined);
            if (current?.getAttribute?.('aria-haspopup') !== 'menu') {
                return;
            }
            event?.preventDefault?.();
            const id = String(current.getAttribute('data-menu-id') || '');
            if (!id) {
                return;
            }
            this.activeSubmenuKey = id;
            this.hoverSubmenuKey = id;
            this.anchorSubmenu(id);
            scheduleDomFocus(this.ownerDocument(), () => this.openSubmenuItems()[0]);
            return;
        }
        if (key === 'ArrowLeft') {
            const submenu = active?.closest?.('.menu-bar-submenu') as HTMLElement | undefined;
            if (!submenu?.classList.contains('is-open')) {
                return;
            }
            event?.preventDefault?.();
            // The flyout is wrapped by structural containers, so walk back to
            // the owning entry and take its first item button (the parent).
            const entry = active?.closest?.('.menu-bar-entry') as HTMLElement | undefined;
            const parent = entry?.querySelector?.('.menu-bar-item') as HTMLElement | undefined;
            this.activeSubmenuKey = '';
            this.hoverSubmenuKey = '';
            if (parent) {
                this.suppressFocusPreview = true;
                focusDomElement(parent);
                void Promise.resolve().then(() => { this.suppressFocusPreview = false; });
            }
            return;
        }
    }

    /**
     * Enabled items at the current roving level: the top-level bar, or the
     * direct children of the open flyout when focus is already inside it.
     * Focus-previewing a parent must not pull ArrowDown into its flyout;
     * ArrowRight is the explicit way in.
     */
    protected menuLevelItems(): HTMLElement[] {
        return menuLevelButtons(unwrapReactive(this.hostElement), this.ownerDocument());
    }

    /** Direct child buttons of the currently open flyout. */
    protected openSubmenuItems(): HTMLElement[] {
        const submenu = openSubmenuElement(unwrapReactive(this.hostElement));
        return submenu ? menuButtons(submenu) : [];
    }

    protected menuItemNode(offset: number): HTMLElement | undefined {
        const items = this.menuLevelItems();
        if (!items.length) {
            return undefined;
        }
        return items[Math.max(0, Math.min(items.length - 1, offset))];
    }

    protected focusTrigger(): void {
        const trigger = unwrapReactive(this.hostElement)?.querySelector?.('.menu-bar-trigger') as HTMLElement | undefined;
        focusDomElement(trigger);
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

    close(returnFocus = true): void {
        const wasOpen = this._open;
        this.open = false;
        this.activeSubmenuKey = '';
        this.hoverSubmenuKey = '';
        if (wasOpen && returnFocus) {
            // A chosen command or Escape hands focus back to the trigger; an
            // outside click keeps focus where the pointer landed.
            void Promise.resolve().then(() => this.focusTrigger());
        }
    }

    /**
     * Preview a flyout as soon as the pointer (or keyboard focus) enters its
     * parent row. The popup is a scroll container, so the flyout must switch to
     * fixed coordinates before it becomes visible; otherwise it is clipped by
     * the popup's overflow box — which is exactly what happened once long menus
     * gained a scrollbar.
     */
    hoverSubmenu(id: string, event?: Event): void {
        // ArrowLeft closes a flyout and returns focus to its parent; that
        // focus must not immediately preview (and reopen) the same flyout.
        if ((event as any)?.type === 'focus' && this.suppressFocusPreview) {
            this.suppressFocusPreview = false;
            return;
        }
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
        const layout = measureSubmenuLayout(unwrapReactive(target));
        if (!layout) {
            return;
        }
        this.submenuSide = layout.side;
        this.submenuLeft = layout.left;
        this.submenuRight = layout.right;
        this.submenuTop = layout.top;
        this.submenuBottom = layout.bottom;
        this.submenuAbove = layout.above;
        this.submenuMaxHeight = layout.maxHeight;
    }

    submenuStyle(id: string): string {
        if (!this.submenuOpen(id)) {
            return '';
        }
        const maxHeight = this.submenuMaxHeight || 480;
        const horizontal = this.submenuSide === 'left'
            ? `right: ${this.submenuRight}px; left: auto;`
            : `left: ${this.submenuLeft}px; right: auto;`;
        const vertical = this.submenuAbove
            ? `bottom: ${this.submenuBottom}px; top: auto;`
            : `top: ${this.submenuTop}px; bottom: auto;`;
        return `position: fixed; ${horizontal} ${vertical} max-height: ${maxHeight}px;`;
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
        const layout = measurePopupLayout(trigger);
        this.popupAbove = layout.above;
        this.popupMaxHeight = layout.maxHeight;
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
        if (this.unbindDismiss) {
            return;
        }
        this.unbindDismiss = bindMenuBarDismiss(this.ownerDocument(), {
            isOpen: () => this._open,
            root: () => unwrapReactive(this.hostElement),
            outside: () => {
                if (this.overlayRegistered) {
                    if (this.overlays?.isTop(this.overlayId)) {
                        void this.overlays.outside();
                    }
                    return;
                }
                this.close(false);
            },
            escape: () => {
                if (this.overlayRegistered) {
                    if (this.overlays?.isTop(this.overlayId)) {
                        void this.overlays.escape();
                    }
                    return;
                }
                this.close();
            }
        });
    }

    protected unbindDocument(): void {
        this.unbindDismiss?.();
        this.unbindDismiss = undefined;
    }

    protected ownerDocument(): any {
        return unwrapReactive(this.hostElement)?.ownerDocument
            || (globalThis as { document?: Document }).document;
    }

    protected get hostElement(): any {
        return unwrapReactive((this.menuRoot?.nativeElement || this.elementRef?.nativeElement) as any);
    }
}
