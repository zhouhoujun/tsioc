import { Attribute, Component, ElementRef, OnDestroy } from '@tsdi/components';
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
        <span class="ui-toolbar-entry" v-for="entry in displayItems" trackBy="key">
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
                aria-pressed="{{entry.active}}" [draggable]="draggable"
                @dragstart="dragStart(entry, $event)" @dragover="dragOver($event)"
                @drop="dropOn(entry, $event)" @dragend="dragEnd()"
                @click="pick(entry)"
                @focus="focusEntry(entry)"
                @keydown="onKeydown(entry, $event)">
                <icon v-if="entry.icon" [name]="entry.icon" [glyph]="entry.iconGlyph || entry.icon" size="sm"></icon>
                <span class="ui-toolbar-label" v-if="entry.label">{{entry.label}}</span>
            </button>
        </span>
        <span class="ui-toolbar-entry ui-toolbar-overflow" v-if="hasOverflow">
            <button class="ui-toolbar-item ui-toolbar-overflow-trigger" type="button"
                tabindex="{{overflowTabIndex}}" focusable="true"
                aria-haspopup="menu" aria-expanded="{{overflowOpenState}}"
                aria-label="{{overflowLabel}}" title="{{overflowLabel}}"
                @click="toggleOverflow" @keydown="onOverflowKeydown($event)"
                @focus="focusOverflow()">{{overflowGlyph}}</button>
            <div class="ui-toolbar-overflow-menu" role="menu" v-if="overflowOpenState">
                <button class="{{item.className}} ui-toolbar-overflow-item" type="button" role="menuitem"
                    v-for="item in overflowItems" trackBy="key"
                    [disabled]="item.disabled" tabindex="0" focusable="{{!item.disabled}}"
                    [draggable]="draggable" @dragstart="dragStart(item, $event)"
                    @dragover="dragOver($event)" @drop="dropOn(item, $event)" @dragend="dragEnd()"
                    aria-label="{{item.ariaLabel || item.label || item.title}}"
                    @click="pickOverflow(item)" @keydown="onOverflowItemKeydown(item, $event)">
                    <icon v-if="item.icon" [name]="item.icon" [glyph]="item.iconGlyph || item.icon" size="sm"></icon>
                    <span class="ui-toolbar-label" v-if="item.label">{{item.label}}</span>
                </button>
            </div>
        </span>
    </div>`
})
export class ToolbarComponent implements OnDestroy {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Attribute() items: ToolbarItem[] = [];
    @Attribute() orientation: ToolbarOrientation = 'horizontal';
    @Attribute() ariaLabel = 'Toolbar';
    @Attribute() className = '';
    @Attribute() action?: (item: ToolbarItem, index: number) => void;
    @Attribute() reorderAction?: (items: ToolbarItem[], id: string, targetId: string) => void;
    /** Enable pointer drag reordering (DOM); terminal hosts use the move action API. */
    @Attribute()
    get draggable(): boolean { return this._draggable; }
    set draggable(value: boolean | string) { this._draggable = normalizeBoolean(value); }
    /** Measure the host width and derive maxVisible automatically (DOM only). */
    @Attribute()
    get autoOverflow(): boolean { return this._autoOverflow; }
    set autoOverflow(value: boolean | string) { this._autoOverflow = normalizeBoolean(value); }
    /** Collapse commands beyond this count into an overflow menu; 0 keeps all. */
    @Attribute() maxVisible: number | string = 0;
    @Attribute() overflowLabel = 'More';
    @Attribute() overflowGlyph = '…';
    private _compact = false;
    private _draggable = false;
    private _autoOverflow = false;
    private autoVisible = 0;
    private draggingKey = '';
    private resizeListener?: () => void;
    private rovingKey = '';
    private overflowOpen = false;
    protected readonly overflowKey = '__ui-toolbar-overflow__';

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

    get maxVisibleCount(): number {
        const explicit = Math.max(0, Math.floor(Number(this.maxVisible) || 0));
        if (this._autoOverflow && this.autoVisible > 0) {
            return explicit > 0 ? Math.min(explicit, this.autoVisible) : this.autoVisible;
        }
        return explicit;
    }

    get hasOverflow(): boolean {
        return this.maxVisibleCount > 0 && this.commandItems.length > this.maxVisibleCount;
    }

    protected get visibleCount(): number {
        return this.hasOverflow ? Math.max(0, this.maxVisibleCount - 1) : this.commandItems.length;
    }

    get visibleCommands(): ToolbarViewItem[] {
        return this.commandItems.slice(0, this.visibleCount);
    }

    get overflowItems(): ToolbarViewItem[] {
        return this.hasOverflow ? this.commandItems.slice(this.visibleCount) : [];
    }

    get overflowOpenState(): boolean {
        return this.overflowOpen && this.hasOverflow;
    }

    get displayItems(): ToolbarViewItem[] {
        const visible = new Set(this.visibleCommands.map(entry => entry.key));
        const items = this.viewItems.filter(entry => entry.kind === 'item' ? visible.has(entry.key) : true);
        while (items.length && items[0].kind === 'separator') { items.shift(); }
        while (items.length && items[items.length - 1].kind === 'separator') { items.pop(); }
        return items.filter((entry, index) => entry.kind !== 'separator' || items[index - 1]?.kind !== 'separator');
    }

    get overflowTabIndex(): number {
        return this.currentFocusKey === this.overflowKey ? 0 : -1;
    }

    protected get navigationItems(): ToolbarViewItem[] {
        return this.overflowOpenState ? this.overflowItems : this.visibleCommands;
    }

    protected get currentFocusKey(): string {
        const items = this.navigationItems;
        const keys = items.map(entry => entry.key);
        if (this.hasOverflow && !this.overflowOpenState) {
            keys.push(this.overflowKey);
        }
        if (keys.includes(this.rovingKey)) {
            const roving = items.find(entry => entry.key === this.rovingKey);
            if (!roving || !roving.disabled) {
                return this.rovingKey;
            }
        }
        const active = items.find(entry => entry.active && !entry.disabled);
        return (active || items.find(entry => !entry.disabled))?.key || (this.hasOverflow ? this.overflowKey : '');
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
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault?.();
            this.pick(entry);
            return;
        }
        const horizontal = this.orientation !== 'vertical';
        const previous = horizontal ? key === 'ArrowLeft' : key === 'ArrowUp';
        const next = horizontal ? key === 'ArrowRight' : key === 'ArrowDown';
        if (!previous && !next && key !== 'Home' && key !== 'End') {
            return;
        }
        event.preventDefault?.();
        const items = this.navigationItems.filter(item => !item.disabled);
        const keys = items.map(item => item.key);
        if (this.hasOverflow && !this.overflowOpenState) {
            keys.push(this.overflowKey);
        }
        if (!keys.length) {
            return;
        }
        const index = keys.indexOf(entry.key);
        let target = index;
        if (key === 'Home') {
            target = 0;
        } else if (key === 'End') {
            target = keys.length - 1;
        } else {
            target = ((index < 0 ? 0 : index) + (next ? 1 : -1) + keys.length) % keys.length;
        }
        const targetKey = keys[target];
        this.rovingKey = targetKey;
        this.focusKey(targetKey);
    }

    protected focusKey(key: string): void {
        if (key === this.overflowKey) {
            focusNth(this.elementRef?.nativeElement, '.ui-toolbar-overflow-trigger', 0);
            return;
        }
        const domIndex = this.displayItems
            .filter(item => item.kind === 'item')
            .findIndex(item => item.key === key);
        focusNth(this.elementRef?.nativeElement, '.ui-toolbar-item', domIndex);
    }

    focusOverflow(): void {
        this.rovingKey = this.overflowKey;
    }

    toggleOverflow(): void {
        this.overflowOpenState ? this.closeOverflow() : this.openOverflow();
    }

    openOverflow(): void {
        if (!this.hasOverflow) {
            return;
        }
        this.overflowOpen = true;
        const first = this.overflowItems.find(item => !item.disabled);
        if (first) {
            this.rovingKey = first.key;
        }
        void Promise.resolve().then(() => Promise.resolve()).then(() => this.focusOverflowItem(first?.key));
    }

    closeOverflow(): void {
        if (!this.overflowOpen) {
            return;
        }
        this.overflowOpen = false;
        this.rovingKey = this.overflowKey;
        void Promise.resolve().then(() => Promise.resolve()).then(() => this.focusKey(this.overflowKey));
    }

    protected focusOverflowItem(key?: string): void {
        if (!this.overflowOpenState || !key) {
            return;
        }
        const index = this.overflowItems.findIndex(item => item.key === key);
        focusNth(this.elementRef?.nativeElement, '.ui-toolbar-overflow-item', index);
    }

    onOverflowKeydown(event: any): void {
        const key = String(event?.key || '');
        if (key === 'Escape' && this.overflowOpenState) {
            event.preventDefault?.();
            this.closeOverflow();
            return;
        }
        if (key === 'ArrowDown' || key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault?.();
            this.openOverflow();
        }
    }

    onOverflowItemKeydown(entry: ToolbarViewItem, event: any): void {
        const key = String(event?.key || '');
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault?.();
            this.pickOverflow(entry);
            return;
        }
        if (key === 'Escape') {
            event.preventDefault?.();
            this.closeOverflow();
            return;
        }
        if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') {
            return;
        }
        event.preventDefault?.();
        const items = this.overflowItems.filter(item => !item.disabled);
        if (!items.length) {
            return;
        }
        const index = items.findIndex(item => item.key === entry.key);
        const target = key === 'Home' ? 0
            : key === 'End' ? items.length - 1
                : ((index < 0 ? 0 : index) + (key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        this.rovingKey = items[target].key;
        this.focusOverflowItem(items[target].key);
    }

    pickOverflow(entry: ToolbarViewItem): void {
        this.pick(entry);
        this.overflowOpen = false;
        this.rovingKey = this.overflowKey;
    }


    dragStart(entry: ToolbarViewItem, event?: any): void {
        this.draggingKey = entry.key;
        event?.dataTransfer?.setData?.('text/plain', entry.key);
        event?.preventDefault?.();
    }

    dragOver(event?: any): void { event?.preventDefault?.(); }

    dropOn(entry: ToolbarViewItem, event?: any): void {
        event?.preventDefault?.();
        const source = this.draggingKey;
        this.draggingKey = '';
        if (!source || source === entry.key || !this.reorderAction) { return; }
        const items = this.commandItems.slice();
        const from = items.findIndex(item => item.key === source);
        const to = items.findIndex(item => item.key === entry.key);
        if (from < 0 || to < 0) { return; }
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        const ordered = items.map(item => this.items[item.index]);
        let cursor = 0;
        const next = this.items.map(item => item?.kind === 'separator' ? item : ordered[cursor++] || item);
        this.reorderAction?.(next, source, entry.key);
    }

    dragEnd(): void { this.draggingKey = ''; }

    onAfterViewInit(): void {
        const host = this.elementRef?.nativeElement as any;
        const win = host?.ownerDocument?.defaultView;
        if (!win || !this._autoOverflow) { return; }
        this.resizeListener = () => this.syncAutoOverflow();
        win.addEventListener?.('resize', this.resizeListener);
        this.syncAutoOverflow();
    }

    syncAutoOverflow(): void {
        if (!this._autoOverflow) { return; }
        const host = this.elementRef?.nativeElement as any;
        const root = host?.querySelector?.('.ui-toolbar') || host;
        const width = Number(root?.clientWidth) || 0;
        if (!width) { this.autoVisible = 0; return; }
        const buttons = Array.from(root?.querySelectorAll?.('.ui-toolbar-entry > .ui-toolbar-item:not(.ui-toolbar-overflow-trigger)') || []) as HTMLElement[];
        let used = 0;
        let count = 0;
        for (const button of buttons) {
            const size = Number(button.getBoundingClientRect?.().width) || 28;
            if (used + size + 32 > width) { break; }
            used += size;
            count += 1;
        }
        this.autoVisible = count;
    }

    onDestroy(): void {
        const win = (this.elementRef?.nativeElement as any)?.ownerDocument?.defaultView;
        if (win && this.resizeListener) { win.removeEventListener?.('resize', this.resizeListener); }
        this.resizeListener = undefined;
    }

    pick(entry: ToolbarViewItem): void {
        if (!entry || entry.disabled || entry.kind === 'separator') {
            return;
        }
        this.rovingKey = entry.key;
        this.action?.(this.items[entry.index], entry.index);
    }
}
