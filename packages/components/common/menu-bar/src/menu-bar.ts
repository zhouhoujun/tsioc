import { AfterViewInit, Attribute, Component, Computed, ElementRef, EventEmitter, OnDestroy, ViewChild, unwrapReactive } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean, nextUiId } from '../../src/ui';
import { OverlayManager } from '../../src/overlay-manager';
import {
    bindMenuBarDismiss,
    focusDomElement,
    menuButtonLabel,
    measurePopupLayout,
    measureSubmenuLayout,
    menuButtons,
    menuLevelButtons,
    openSubmenuElement,
    scheduleDomFocus
} from './menu-bar.dom';
import { menuAncestorPath, submenuBranchKeepsOpen, truncateMenuPath } from './menu-bar.submenu';
import { MenuTypeahead, menuTypeaheadIndex } from './menu-bar.typeahead';

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
    /** Checkbox/radio menu item semantics; default is a plain menuitem. */
    type?: 'checkbox' | 'radio';
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
    role: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
    ariaChecked: string;
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
        aria-label="{{ariaLabel || triggerTitle || label}}"
        @keydown="onMenuKeydown($event)">
        <button class="menu-bar-trigger" type="button" id="{{overlayId}}-trigger"
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
            aria-labelledby="{{overlayId}}-trigger" @scroll="onPopupScroll">
            <div [class]="'menu-bar-entry' + (entry.children.length ? ' has-submenu' : '')" v-for="entry in entries" trackBy="key" data-menu-key="{{entry.key}}"
                role="none"
                @mouseleave="leaveSubmenu(entry.id, $event)"
                @focusout="blurSubmenu(entry.id, $event)">
                <div class="menu-bar-separator" role="separator" v-if="entry.kind === 'separator'"></div>
                <div class="menu-bar-group-title" v-if="entry.kind === 'title'">{{entry.label}}</div>
                <button class="menu-bar-item {{entry.className}}" type="button" role="{{entry.role}}"
                    aria-checked="{{entry.ariaChecked}}" v-if="entry.kind === 'item'"
                    data-menu-id="{{entry.id}}" id="{{itemElementId(entry.id)}}"
                    [disabled]="entry.disabled"
                    aria-disabled="{{entry.disabled}}"
                    aria-haspopup="{{entry.children.length ? 'menu' : 'false'}}"
                    aria-expanded="{{entry.children.length ? submenuOpen(entry.id) : 'false'}}"
                    aria-controls="{{entry.children.length && submenuOpen(entry.id) ? submenuElementId(entry.id) : ''}}"
                    @click="choose(entry.id, $event)"
                    @mouseenter="previewSubmenu(entry, $event)"
                    @focus="previewSubmenu(entry, $event)">
                    <span class="menu-bar-item-icon" v-if="entry.icon"><icon [name]="entry.icon" [glyph]="entry.icon" size="sm"></icon></span>
                    <span class="menu-bar-item-label">{{entry.label}}</span>
                    <span class="menu-bar-item-shortcut" v-if="entry.shortcut">{{entry.shortcut}}</span>
                    <span class="menu-bar-item-check" v-if="entry.checked"><icon name="check" size="xs"></icon></span>
                    <span class="menu-bar-item-caret" v-if="entry.children.length"><icon name="caret-right" size="xs"></icon></span>
                </button>
            </div>
        </div>
        <div [class]="'menu-bar-submenu' + (submenuOpen(level.id) ? ' is-open' : '')"
            [style]="submenuStyle(level.id)" role="menu" data-submenu-id="{{level.id}}" id="{{submenuElementId(level.id)}}"
            aria-labelledby="{{itemElementId(level.id)}}"
            v-for="level in submenuLevels" trackBy="id"
            @mouseleave="leaveSubmenu(level.id, $event)">
            <div [class]="'menu-bar-entry' + (entry.children.length ? ' has-submenu' : '')"
                v-for="entry in level.items" trackBy="key" role="none"
                @mouseleave="leaveSubmenu(entry.id, $event)" @focusout="blurSubmenu(entry.id, $event)">
                <button class="menu-bar-item {{entry.className}}" type="button" role="{{entry.role}}"
                    aria-checked="{{entry.ariaChecked}}" data-menu-id="{{entry.id}}" id="{{itemElementId(entry.id)}}"
                    [disabled]="entry.disabled" aria-disabled="{{entry.disabled}}"
                    aria-haspopup="{{entry.children.length ? 'menu' : 'false'}}"
                    aria-expanded="{{entry.children.length ? submenuOpen(entry.id) : 'false'}}"
                    aria-controls="{{entry.children.length && submenuOpen(entry.id) ? submenuElementId(entry.id) : ''}}"
                    @click="choose(entry.id, $event)"
                    @mouseenter="previewSubmenu(entry, $event)"
                    @focus="previewSubmenu(entry, $event)">
                    <span class="menu-bar-item-icon" v-if="entry.icon"><icon [name]="entry.icon" [glyph]="entry.icon" size="sm"></icon></span>
                    <span class="menu-bar-item-label">{{entry.label}}</span>
                    <span class="menu-bar-item-shortcut" v-if="entry.shortcut">{{entry.shortcut}}</span>
                    <span class="menu-bar-item-check" v-if="entry.checked"><icon name="check" size="xs"></icon></span>
                    <span class="menu-bar-item-caret" v-if="entry.children.length"><icon name="caret-right" size="xs"></icon></span>
                </button>
            </div>
        </div>
    </div>`
})
export class MenuBarComponent implements AfterViewInit, OnDestroy {
    @Attribute() groups: MenuBarGroup[] = [];
    @Attribute() label = 'Menu';
    @Attribute() ariaLabel = '';
    @Attribute() icon = 'menu';
    @Attribute() caret = '▾';
    @Attribute() align: 'left' | 'right' = 'right';
    @Attribute() triggerTitle = '';
    @Attribute() disabled = false;
    @Attribute() selectAction?: (id: string) => void;
    @Attribute() openChange = new EventEmitter<boolean>();
    private _open = false;
    /** Id path of submenus pinned open by click (outer-most first). */
    activeSubmenuPath: string[] = [];
    /** Id path of the submenus previewed by hover/focus (outer-most first). */
    hoverSubmenuPath: string[] = [];
    private readonly typeahead = new MenuTypeahead();
    /** Measured viewport coordinates of each open flyout by parent id. */
    private submenuLayouts: Record<string, any> = {};
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
                entries.push(this.menuEntryView(item, `${groupIndex}-${itemIndex}-${item.id}`));
            });
        });
        return entries;
    }
    /** One flyout per open path level; arbitrary nesting needs no recursive template. */
    @Computed()
    get submenuLevels(): Array<{ id: string; items: MenuBarEntryView[] }> {
        const path = this.hoverSubmenuPath.length ? this.hoverSubmenuPath : this.activeSubmenuPath;
        return path.map(id => {
            const item = this.findItem(id);
            return {
                id,
                items: (item?.children || [])
                    .filter(child => child && child.id)
                    .map((child, index) => this.menuEntryView(child, `${id}-${index}-${child.id}`))
            };
        }).filter(level => level.items.length > 0);
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
            this.resetSubmenus();
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
        if (key.length === 1 && !event?.ctrlKey && !event?.metaKey && !event?.altKey) {
            const query = this.typeahead.push(key);
            const next = menuTypeaheadIndex(items.map(item => ({ label: menuButtonLabel(item) })), query, index);
            if (next >= 0) { event?.preventDefault?.(); focusDomElement(items[next]); }
            return;
        }
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
            const path = menuAncestorPath(this.groups, id).concat(id);
            this.activeSubmenuPath = path;
            this.hoverSubmenuPath = path;
            this.anchorSubmenu(id);
            const root = unwrapReactive(this.hostElement);
            scheduleDomFocus(this.ownerDocument(), () => {
                const submenu = openSubmenuElement(root, id);
                return submenu ? menuButtons(submenu)[0] : undefined;
            });
            return;
        }
        if (key === 'ArrowLeft') {
            const submenu = active?.closest?.('.menu-bar-submenu') as HTMLElement | undefined;
            if (!submenu?.classList.contains('is-open')) {
                return;
            }
            event?.preventDefault?.();
            const id = String(submenu.getAttribute('data-submenu-id') || '');
            this.activeSubmenuPath = id ? menuAncestorPath(this.groups, id) : [];
            this.hoverSubmenuPath = this.activeSubmenuPath;
            const parent = unwrapReactive(this.hostElement)
                ?.querySelector?.(`[data-menu-id="${id}"]`) as HTMLElement | undefined;
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
            const ancestors = menuAncestorPath(this.groups, id);
            const opening = !this.activeSubmenuPath.includes(id);
            this.activeSubmenuPath = opening ? ancestors.concat(id) : ancestors;
            this.hoverSubmenuPath = this.activeSubmenuPath;
            if (opening) {
                this.anchorSubmenu(id, event);
            }
            return;
        }
        this.close();
        this.selectAction?.(id);
    }
    close(returnFocus = true): void {
        const wasOpen = this._open;
        this.open = false;
        this.resetSubmenus();
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
    previewSubmenu(item: MenuBarEntryView, event?: Event): void {
        if (item.children?.length) {
            this.hoverSubmenu(item.id, event);
        }
    }
    hoverSubmenu(id: string, event?: Event): void {
        // ArrowLeft closes a flyout and returns focus to its parent; that
        // focus must not immediately preview (and reopen) the same flyout.
        if ((event as any)?.type === 'focus' && this.suppressFocusPreview) {
            this.suppressFocusPreview = false;
            return;
        }
        const path = menuAncestorPath(this.groups, id).concat(id);
        const unchanged = this.hoverSubmenuPath.length === path.length
            && path.every((value, index) => this.hoverSubmenuPath[index] === value);
        if (!unchanged) {
            if (this.activeSubmenuPath.length && this.activeSubmenuPath[0] !== path[0]) {
                this.activeSubmenuPath = [];
            }
            this.hoverSubmenuPath = path;
        }
        this.anchorSubmenu(id, event);
    }

    leaveSubmenu(id: string, event?: Event): void {
        if (event && submenuBranchKeepsOpen(this.groups, id, (event as any).relatedTarget)) {
            return;
        }
        this.hoverSubmenuPath = truncateMenuPath(this.hoverSubmenuPath, id);
    }

    /** Keep the flyout open while keyboard focus moves inside the same branch. */
    blurSubmenu(id: string, event?: Event): void {
        const next = (event as any)?.relatedTarget;
        const root = unwrapReactive((event as any)?.currentTarget);
        if (next && root?.contains?.(next)) {
            return;
        }
        this.leaveSubmenu(id, event);
    }

    submenuOpen(id: string): boolean {
        return this.activeSubmenuPath.includes(id) || this.hoverSubmenuPath.includes(id);
    }

    protected resetSubmenus(): void {
        this.activeSubmenuPath = [];
        this.hoverSubmenuPath = [];
    }

    /** Keep every visible flyout attached to its row while the popup scrolls. */
    onPopupScroll(): void {
        const root = unwrapReactive(this.hostElement);
        Array.from(new Set([...this.activeSubmenuPath, ...this.hoverSubmenuPath])).forEach(id => {
            const item = root?.querySelector?.(`[data-menu-id="${id}"]`);
            if (item) {
                this.anchorSubmenuElement(item);
            }
        });
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
        const node = unwrapReactive(target);
        const layout = measureSubmenuLayout(node);
        const id = String(node?.getAttribute?.('data-menu-id') || '');
        if (layout && id) {
            this.submenuLayouts = { ...this.submenuLayouts, [id]: layout };
        }
    }
    submenuStyle(id: string): string {
        const layout = this.submenuLayouts[id];
        if (!this.submenuOpen(id) || !layout) {
            return '';
        }
        const maxHeight = layout.maxHeight || 480;
        const horizontal = layout.side === 'left'
            ? `right: ${layout.right}px; left: auto;`
            : `left: ${layout.left}px; right: auto;`;
        const vertical = layout.above
            ? `bottom: ${layout.bottom}px; top: auto;`
            : `top: ${layout.top}px; bottom: auto;`;
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
    protected itemElementId(id: string): string { return `${this.overlayId}-item-${id}`; }
    protected submenuElementId(id: string): string { return `${this.overlayId}-submenu-${id}`; }
    protected menuEntryView(item: MenuBarItem, key: string): MenuBarEntryView {
        const children = (item.children || []).filter(child => child && child.id);
        return {
            ...this.entry('item', key),
            id: item.id,
            label: String(item.label || item.id),
            icon: String(item.icon || ''),
            shortcut: String(item.shortcut || ''),
            disabled: item.disabled === true,
            checked: item.checked === true,
            role: this.menuRole(item),
            ariaChecked: this.menuAriaChecked(item),
            className: this.itemClass(item, children.length > 0),
            children: children.map((child, index) => this.menuEntryView(child, `${key}-${index}-${child.id}`))
        };
    }
    protected menuRole(item: MenuBarItem): MenuBarEntryView['role'] {
        return item?.type === 'checkbox' ? 'menuitemcheckbox'
            : item?.type === 'radio' ? 'menuitemradio' : 'menuitem';
    }
    protected menuAriaChecked(item: MenuBarItem): string {
        return this.menuRole(item) === 'menuitem' ? '' : String(item?.checked === true);
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
            role: 'menuitem',
            ariaChecked: '',
            className: '',
            children: []
        };
    }
    protected findItem(id: string): MenuBarItem | undefined {
        const find = (items: MenuBarItem[]): MenuBarItem | undefined => {
            for (const item of items || []) {
                if (!item) { continue; }
                if (item.id === id) { return item; }
                const child = find(item.children || []);
                if (child) { return child; }
            }
            return undefined;
        };
        for (const group of this.groups || []) {
            const match = find(group?.items || []);
            if (match) { return match; }
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
