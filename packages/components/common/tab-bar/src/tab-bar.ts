import { AfterViewInit, Attribute, Component, ElementRef, ViewChild, unwrapReactive } from '@tsdi/components';
import { Inject, Optional, token } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { nextUiId } from '../../src/ui';
import { installTabBarStyles } from './tab-bar.styles';
import { TabContextMenuComponent } from './tab-context-menu';
import { positionTabOverflowMenu } from './tab-bar.overflow';
import { contextTab, dropTab, startTabDrag } from './tab-bar.reorder';

/** A renderer-neutral tab entry: the host owns meaning, the tab bar only paints it. */
export interface TabItem {
    id: string;
    label: string;
    /** Semantic selection state; renderers may use it for accessibility and skinning. */
    active?: boolean;
    /** Whether this tab shows its close affordance (defaults to true).
     *  `'hover'` reserves the cells and reveals the glyph only while its tab
     *  is hovered; DOM hosts use CSS, terminal hosts paint it at hover time. */
    showClose?: boolean | 'hover';
    /** Non-interactive marker (e.g. the `…` overflow indicator). */
    disabled?: boolean;
    /** Stable tab element id (Tabs sets this for aria-controls/labelledby). */
    elementId?: string;
    /** Controlled tabpanel id. */
    controls?: string;
}

/** Everything the shared strip paints plus the actions a host wants to receive. */
export interface TabBarSource {
    visible: boolean;
    items: TabItem[];
    showCreate?: boolean;
    createLabel?: string;
    closeLabel?: string;
    /**
     * Host-windowed strip (terminal): `items` already holds only the visible
     * slice, and the host reports/executes the overflow navigation. DOM hosts
     * leave this unset so the strip scrolls itself.
     */
    windowed?: boolean;
    canScrollBack?: boolean;
    canScrollForward?: boolean;
    scrollBack?(): void;
    scrollForward?(): void;
    /** `menu` (default) shows one "more" control; `scroll` keeps paging arrows. */
    overflowMode?: 'menu' | 'scroll';
    /** All tabs for the overflow menu; terminal hosts that window `items` set this. */
    overflowItems?: TabItem[];
    overflowLabel?: string;
    overflowTitle?: string;
    /** Glyphs painted by the scroll-mode controls (defaults keep the strip's width). */
    scrollBackLabel?: string;
    scrollForwardLabel?: string;
    /** Accessible names for the scroll-mode controls. */
    scrollBackTitle?: string;
    scrollForwardTitle?: string;
    /** Accessible name prefix for a tab's close affordance. */
    closeTabTitle?: string;
    /** Automatic activates on arrow; manual focuses and waits for Enter/Space. */
    activationMode?: 'automatic' | 'manual';
    select?(id: string): void;
    create?(): void;
    close?(id: string): void;
}

/** Domain-provided tab source (agent-ui supplies its session tabs through this token). */
export const TAB_BAR_SOURCE = token<TabBarSource>('TAB_BAR_SOURCE');

/**
 * Shared tab strip used by console surfaces (agent-ui session tabs included).
 * The host supplies data through `TAB_BAR_SOURCE`; no domain state lives
 * here so the DOM and terminal renderers paint the same structure.
 *
 * Overflow is left/right switchable like common tabs components: hosts that
 * window their own items (the terminal) drive the arrows through the source,
 * DOM hosts get native strip scrolling with the arrows pinned in view.
 */
@Component({
    selector: 'tab-bar, ui-tab-bar',
    imports: [TabContextMenuComponent],
    template: `
    <p class="tab-bar" role="tablist" aria-orientation="horizontal" v-show="visible" #strip>
        <span class="tab-scroll tab-scroll-back" role="button" focusable="true" tabindex="0" aria-label="{{scrollBackTitle}}" aria-disabled="{{scrollBackDisabled}}" data-disabled="{{scrollBackDisabled}}" v-if="overflowMode === 'scroll'" v-show="arrowsVisible" @click="scrollBack($event)" @keydown="onScrollKeydown($event, 'back')">{{scrollBackLabel}}</span>
        <span class="tab" role="tab" id="{{tabElementId(tab)}}" aria-selected="{{tab.active}}"
            aria-controls="{{tab.controls || ''}}" tabindex="{{tabIndexFor(tab, index)}}"
            focusable="{{!tab.disabled}}" data-disabled="{{tab.disabled}}" data-hover-group="true"
            v-for="(tab, index) in items" trackBy="id"
            draggable="true" @dragstart="dragStart(tab, $event)" @dragover="dragOver($event)"
            @drop="dropOn(tab, $event)" @dragend="dragEnd()" @contextmenu="contextMenu(tab, $event)"
            @click="select(tab.id, $event)" @focus="focusOnly(tab)"
            @keydown="onTabKeydown($event, tab, index)">
            <span class="tab-label" @click="select(tab.id, $event)">{{tab.label}}</span><span class="tab-close" role="button" tabindex="{{closeTabIndex(tab)}}" focusable="true" aria-label="{{closeTabLabel(tab)}}" v-if="tab.showClose !== false" data-close-mode="{{tab.showClose === 'hover' ? 'hover' : 'always'}}" data-hover-reveal="{{tab.showClose === 'hover'}}" data-cell-width="2" @click="closeTab(tab.id, $event)" @keydown="onCloseKeydown($event, tab.id)">{{closeLabel}}</span>
        </span>
        <span class="tab-scroll tab-scroll-forward" role="button" focusable="true" tabindex="0" aria-label="{{scrollForwardTitle}}" aria-disabled="{{scrollForwardDisabled}}" data-disabled="{{scrollForwardDisabled}}" v-if="overflowMode === 'scroll'" v-show="arrowsVisible" @click="scrollForward($event)" @keydown="onScrollKeydown($event, 'forward')">{{scrollForwardLabel}}</span>
        <span class="tab-overflow" role="button" focusable="true" tabindex="0" v-if="overflowMenuVisible"
            aria-haspopup="menu" aria-expanded="{{overflowMenuOpen}}" aria-label="{{overflowTitle}}"
            data-hover-group="true" @click="toggleOverflowMenu($event)"
            @keydown="onOverflowKeydown($event)">{{overflowLabel}}</span>
        <span class="tab-overflow-menu" role="menu" v-if="overflowMenuOpen" [style]="overflowMenuStyle">
            <span class="tab-overflow-item" role="menuitem" tabindex="0" focusable="true"
                aria-current="{{item.active}}" v-for="item in overflowMenuItems" trackBy="id"
                @click="pickOverflow(item.id, $event)"
                @keydown="onOverflowItemKeydown($event, item)">{{item.label}}</span>
        </span>
        <span class="tab-new" role="button" focusable="true" tabindex="0" v-show="showCreate" @click="create" @keydown="onCreateKeydown($event)">{{createLabel}}</span>
        <ui-tab-context-menu :visible="contextMenuOpen" :x="contextX" :y="contextY"
            :tabId="contextTabId" :actionAction="runTabContext" :closeAction="closeTabMenu"></ui-tab-context-menu>
    </p>
    `
})
export class TabBarComponent implements AfterViewInit {
    /** Direct source wins over the injected one (hosts without a provider). */
    @Attribute() source?: TabBarSource;
    @ViewChild('strip', ElementRef) strip?: ElementRef;
    /** Manual mode focuses without activating until Enter/Space. */
    @Attribute() activationMode: 'automatic' | 'manual' = 'automatic';
    /** Reorder callback: receives the new id order plus moved/target ids. */
    @Attribute() reorderAction?: (ids: string[], id: string, targetId: string) => void;
    /** Host-defined tab context menu (right-click/long-press); use a Popover/Menu. */
    @Attribute() contextAction?: (id: string, event: Event) => void;
    /** DOM strips report their own overflow (terminal strips leave these false). */
    protected domOverflow = false;
    protected domBack = false;
    protected domForward = false;
    protected stripElement?: HTMLElement;
    protected overflowHost?: HTMLElement;
    protected stripScrollListener?: () => void;
    protected stripMutationObserver?: { disconnect(): void } | null;
    protected stripResizeObserver?: { disconnect(): void } | null;
    protected windowResizeListener?: () => void;
    protected overflowSyncScheduled = false;
    protected readonly uid = nextUiId('ui-tab-bar');
    private focusedKey = '';
    protected overflowMenuOpen = false;
    protected overflowMenuStyle: Record<string, string> = {};
    protected overflowDismiss?: () => void;
    draggingId = '';
    contextMenuOpen = false;
    contextTabId = '';
    contextX = 0;
    contextY = 0;
    constructor(
        @Optional() protected elementRef?: ElementRef,
        @Optional() @Inject(TAB_BAR_SOURCE) private injectedSource?: TabBarSource
    ) {
        markElementRefRaw(elementRef);
    }
    onAfterViewInit(): void {
        // The common strip owns its skin: every DOM host (workflow tabs,
        // admin, web console) gets the same look without installing it.
        installTabBarStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
        // The template ref is resolved after the constructor, so mark its
        // native node raw here; proxying a DOM node breaks its layout getters.
        markElementRefRaw(this.strip);
        this.bindDomOverflow();
    }
    onDestroy(): void {
        this.unbindOverflowDismiss();
        const host = this.overflowHost;
        if (host && this.stripScrollListener) {
            host.removeEventListener?.('scroll', this.stripScrollListener, { capture: true } as EventListenerOptions);
        }
        this.stripMutationObserver?.disconnect();
        this.stripResizeObserver?.disconnect();
        const win = (host?.ownerDocument as { defaultView?: Window } | undefined)?.defaultView;
        if (win && this.windowResizeListener) {
            win.removeEventListener?.('resize', this.windowResizeListener);
        }
        this.stripElement = undefined;
        this.overflowHost = undefined;
        this.stripScrollListener = undefined;
        this.stripMutationObserver = null;
        this.stripResizeObserver = null;
        this.windowResizeListener = undefined;
    }
    protected get activeSource(): TabBarSource | undefined {
        return this.source || this.injectedSource;
    }
    get visible(): boolean {
        return this.activeSource ? this.activeSource.visible : true;
    }
    get items(): TabItem[] {
        return this.activeSource?.items || [];
    }
    get showCreate(): boolean {
        return this.activeSource ? this.activeSource.showCreate !== false : true;
    }
    get createLabel(): string {
        return this.activeSource?.createLabel || '+';
    }
    get closeLabel(): string {
        return this.activeSource?.closeLabel || '✕';
    }
    get closeTabTitle(): string {
        return this.activeSource?.closeTabTitle || 'Close tab';
    }
    get mode(): 'automatic' | 'manual' {
        return this.activeSource?.activationMode || this.activationMode;
    }
    tabElementId(tab: TabItem): string {
        return tab?.elementId || `${this.uid}-${String(tab?.id || 'tab').replace(/[^A-Za-z0-9_-]+/g, '-')}`;
    }
    closeTabLabel(tab: TabItem): string {
        return `${this.closeTabTitle} ${tab?.label || ''}`.trim();
    }
    /** Hidden hover-only close affordances stay out of the Tab order. */
    closeTabIndex(tab: TabItem): number {
        return tab?.showClose === 'hover' && !tab.active ? -1 : 0;
    }
    focusOnly(tab: TabItem): void {
        if (tab && !tab.disabled) {
            this.focusedKey = tab.id;
        }
    }
    /** Terminal hosts window `items` themselves; DOM hosts scroll the strip. */
    get hostWindowed(): boolean {
        return !!this.activeSource?.windowed;
    }
    get scrollBackLabel(): string {
        return this.activeSource?.scrollBackLabel || ' ‹ ';
    }
    get scrollForwardLabel(): string {
        return this.activeSource?.scrollForwardLabel || ' › ';
    }
    get scrollBackTitle(): string {
        return this.activeSource?.scrollBackTitle || 'Previous tabs';
    }
    get scrollForwardTitle(): string {
        return this.activeSource?.scrollForwardTitle || 'Next tabs';
    }
    get overflowMode(): 'menu' | 'scroll' {
        return this.activeSource?.overflowMode === 'scroll' ? 'scroll' : 'menu';
    }
    get overflowMenuItems(): TabItem[] {
        const explicit = this.activeSource?.overflowItems;
        if (Array.isArray(explicit) && explicit.length) {
            return explicit;
        }
        return this.hostWindowed ? [] : this.items;
    }
    get overflowMenuVisible(): boolean {
        if (this.overflowMode !== 'menu' || !this.overflowMenuItems.length) {
            return false;
        }
        return this.hostWindowed
            ? this.scrollBackEnabled || this.scrollForwardEnabled
            : this.domOverflow;
    }
    get overflowLabel(): string {
        return this.activeSource?.overflowLabel || ' … ';
    }
    get overflowTitle(): string {
        return this.activeSource?.overflowTitle || 'More tabs';
    }
    get arrowsVisible(): boolean {
        if (this.overflowMode !== 'scroll') {
            return false;
        }
        return this.hostWindowed ? this.scrollBackEnabled || this.scrollForwardEnabled : this.domOverflow;
    }
    get scrollBackDisabled(): boolean {
        return this.hostWindowed ? !this.scrollBackEnabled : !this.domBack;
    }
    get scrollForwardDisabled(): boolean {
        return this.hostWindowed ? !this.scrollForwardEnabled : !this.domForward;
    }
    protected get scrollBackEnabled(): boolean {
        return !!this.activeSource?.canScrollBack;
    }
    protected get scrollForwardEnabled(): boolean {
        return !!this.activeSource?.canScrollForward;
    }
    select(id: string, event?: Event): void {
        if (!id) {
            return;
        }
        if ((this.activeSource?.items || []).some(item => item.id === id && item.disabled)) {
            return;
        }
        this.closeOverflowMenu(false);
        // The close affordance is nested inside the clickable tab. DOM events
        // bubble from ✕ to the tab, which would select a tab that is closing
        // (and reopen it). Ignore those bubbled clicks; the close handler also
        // stops propagation for hosts that support it.
        const target = event?.target as { closest?: (selector: string) => unknown } | null | undefined;
        if (target?.closest?.('.tab-close')) {
            return;
        }
        this.focusedKey = id;
        this.activeSource?.select?.(id);
    }
    closeTab(id: string, event?: Event): void {
        event?.stopPropagation?.();
        this.close(id);
        this.focusAfterClose();
    }
    /** Keyboard activation for the nested close affordance. */
    onCloseKeydown(event: any, id: string): void {
        if (!this.isActivationKey(event)) { return; }
        event.preventDefault?.(); event.stopPropagation?.(); this.closeTab(id, event);
    }
    /** Keep keyboard focus inside the strip after a tab disappears. */
    protected focusAfterClose(): void {
        void Promise.resolve().then(() => Promise.resolve()).then(() => {
            const items = this.items;
            const target = items.find(item => item.active && !item.disabled) ?? items.find(item => !item.disabled);
            this.focusedKey = target?.id || '';
            if (target) { this.focusTab(items.indexOf(target)); }
        });
    }
    /**
     * Roving tabindex: exactly one enabled tab is in the tab order. The active
     * tab wins; when no item is active the first enabled tab holds focus.
     */
    tabIndexFor(tab: TabItem, index: number): number {
        if (!tab || tab.disabled) {
            return -1;
        }
        const items = this.items;
        if (this.focusedKey && items.some(item => item?.id === this.focusedKey && !item.disabled)) {
            return tab.id === this.focusedKey ? 0 : -1;
        }
        if (tab.active) {
            return 0;
        }
        if (items.some(item => item?.active && !item.disabled)) {
            return -1;
        }
        return items.findIndex(item => item && !item.disabled) === index ? 0 : -1;
    }
    /** Arrow/Home/End navigation, Enter/Space activation and Delete-to-close. */
    onTabKeydown(event: any, tab: TabItem, index: number): void {
        if (!tab) {
            return;
        }
        const key = String(event?.key || '');
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event?.preventDefault?.();
            this.select(tab.id, event);
            return;
        }
        if ((key === 'Delete' || key === 'Backspace') && tab.showClose !== false) {
            event?.preventDefault?.();
            this.closeTab(tab.id, event);
            return;
        }
        if (event?.altKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
            const ids = this.items.map(item => item.id);
            const from = ids.indexOf(tab.id);
            const to = from + (key === 'ArrowRight' ? 1 : -1);
            if (from >= 0 && to >= 0 && to < ids.length) {
                event.preventDefault?.();
                [ids[from], ids[to]] = [ids[to], ids[from]];
                this.focusedKey = tab.id;
                this.reorderAction?.(ids, tab.id, this.items[to]?.id || '');
                void Promise.resolve().then(() => this.focusTab(to));
            }
            return;
        }
        let targetIndex = -1;
        if (key === 'ArrowRight' || key === 'ArrowDown') {
            targetIndex = this.nextEnabledTab(index, 1);
        } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
            targetIndex = this.nextEnabledTab(index, -1);
        } else if (key === 'Home') {
            targetIndex = this.nextEnabledTab(-1, 1);
        } else if (key === 'End') {
            targetIndex = this.nextEnabledTab(this.items.length, -1);
        }
        if (targetIndex < 0) {
            return;
        }
        event?.preventDefault?.();
        const target = this.items[targetIndex];
        this.focusedKey = target.id;
        if (this.mode === 'automatic') {
            this.select(target.id, event);
        }
        // The host may replace the strip data on select; move focus after the
        // reactive DOM update so the new node (not the stale one) is focused.
        const focus = () => this.focusTab(targetIndex);
        if (typeof queueMicrotask === 'function') {
            queueMicrotask(focus);
        } else {
            focus();
        }
    }
    protected nextEnabledTab(from: number, step: 1 | -1): number {
        const items = this.items;
        if (!items.length) {
            return -1;
        }
        for (let offset = 1; offset <= items.length; offset++) {
            const index = ((from + step * offset) % items.length + items.length) % items.length;
            if (items[index] && !items[index].disabled) {
                return index;
            }
        }
        return -1;
    }
    protected focusTab(index: number): void {
        const strip = this.strip?.nativeElement as { querySelectorAll?: (selector: string) => ArrayLike<HTMLElement> } | undefined;
        const tabs = strip?.querySelectorAll?.('.tab');
        const node = tabs?.[index];
        node?.focus?.();
        try {
            node?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        } catch {
            // Terminal renderers do not implement scrollIntoView.
        }
    }
    toggleOverflowMenu(event?: Event): void {
        event?.stopPropagation?.(); this.overflowMenuOpen ? this.closeOverflowMenu() : this.openOverflowMenu();
    }
    openOverflowMenu(): void {
        if (!this.overflowMenuVisible || this.overflowMenuOpen) {
            return;
        }
        this.overflowMenuOpen = true;
        this.placeOverflowMenu();
        this.bindOverflowDismiss();
        void Promise.resolve().then(() => {
            this.placeOverflowMenu(true);
            this.focusOverflowItem(0);
        });
    }
    closeOverflowMenu(restoreFocus = true): void {
        if (!this.overflowMenuOpen) {
            return;
        }
        this.overflowMenuOpen = false;
        this.overflowMenuStyle = {};
        this.unbindOverflowDismiss();
        if (restoreFocus) {
            void Promise.resolve().then(() => this.focusOverflowTrigger());
        }
    }
    /** Anchor the menu outside the scrolling strip (see the helper module). */
    protected placeOverflowMenu(measure = false): void {
        const style = positionTabOverflowMenu(this.resolveStripElement(), measure);
        if (style) {
            this.overflowMenuStyle = style;
        }
    }
    protected focusOverflowTrigger(): void {
        (this.resolveStripElement()?.querySelector?.('.tab-overflow') as HTMLElement | null | undefined)?.focus?.();
    }
    protected focusOverflowItem(index: number): void {
        const items = this.resolveStripElement()?.querySelectorAll?.('.tab-overflow-item') as ArrayLike<HTMLElement> | undefined;
        items?.[Math.max(0, index)]?.focus?.();
    }
    onOverflowKeydown(event: any): void {
        const key = String(event?.key || '');
        if (key === 'Escape') {
            this.closeOverflowMenu();
            return;
        }
        if (this.isActivationKey(event) || key === 'ArrowDown') {
            event.preventDefault?.();
            this.openOverflowMenu();
        }
    }
    onOverflowItemKeydown(event: any, item: TabItem): void {
        const key = String(event?.key || '');
        if (key === 'Escape') {
            event.preventDefault?.();
            this.closeOverflowMenu();
            return;
        }
        if (this.isActivationKey(event)) {
            event.preventDefault?.();
            this.pickOverflow(item.id, event);
            return;
        }
        if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') {
            return;
        }
        event.preventDefault?.();
        const items = this.overflowMenuItems.filter(entry => !entry.disabled);
        if (!items.length) {
            return;
        }
        const current = items.findIndex(entry => entry.id === item.id);
        const index = key === 'Home' ? 0
            : key === 'End' ? items.length - 1
                : ((current < 0 ? 0 : current) + (key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        this.focusOverflowItem(this.overflowMenuItems.findIndex(entry => entry.id === items[index].id));
    }
    pickOverflow(id: string, event?: Event): void {
        event?.stopPropagation?.();
        const target = String(id || '');
        if (!target) {
            return;
        }
        this.closeOverflowMenu(false);
        this.select(target, event);
        void Promise.resolve().then(() => {
            const index = this.items.findIndex(item => item.id === target && !item.disabled);
            if (index >= 0) {
                this.focusTab(index);
            } else {
                this.focusOverflowTrigger();
            }
        });
    }
    protected bindOverflowDismiss(): void {
        this.unbindOverflowDismiss();
        const host = this.elementRef?.nativeElement as HTMLElement | undefined;
        const doc = host?.ownerDocument;
        if (!host || typeof doc?.addEventListener !== 'function') {
            return;
        }
        const pointer = (event: any) => {
            const target = event?.target;
            if (host.contains?.(target)) {
                return;
            }
            this.closeOverflowMenu(false);
        };
        doc.addEventListener('mousedown', pointer, true);
        this.overflowDismiss = () => doc.removeEventListener?.('mousedown', pointer, true);
    }
    protected unbindOverflowDismiss(): void {
        this.overflowDismiss?.();
        this.overflowDismiss = undefined;
    }
    dragStart(tab: TabItem, event?: any): void { startTabDrag(this, tab, event); }
    dragOver(event?: any): void { if (this.draggingId) { event?.preventDefault?.(); } }
    dropOn(tab: TabItem, event?: any): void { dropTab(this, tab, event); }
    dragEnd(): void { this.draggingId = ''; }
    contextMenu(tab: TabItem, event?: any): void {
        if (this.contextAction) { contextTab(this, tab, event); return; }
        event?.preventDefault?.();
        this.contextTabId = tab?.id || '';
        this.contextX = Number(event?.clientX ?? 0) || 8;
        this.contextY = Number(event?.clientY ?? 0) || 8;
        this.contextMenuOpen = true;
    }
    closeTabMenu(): void { this.contextMenuOpen = false; }
    runTabContext(action: string, id: string): void {
        const target = id || this.contextTabId;
        const ids = this.items.map(item => item.id);
        const index = ids.indexOf(target);
        if (action === 'close') {
            this.close(target);
        } else if (action === 'closeOthers') {
            ids.filter(item => item !== target).forEach(item => this.close(item));
        } else if (action === 'closeRight') {
            ids.slice(index + 1).forEach(item => this.close(item));
        }
        this.closeTabMenu();
    }
    create(): void {
        this.closeOverflowMenu(false);
        this.activeSource?.create?.();
    }
    onCreateKeydown(event: any): void {
        if (!this.isActivationKey(event)) { return; }
        event.preventDefault?.(); this.create();
    }
    onScrollKeydown(event: any, direction: 'back' | 'forward'): void {
        if (!this.isActivationKey(event)) { return; }
        event.preventDefault?.(); direction === 'back' ? this.scrollBack(event) : this.scrollForward(event);
    }
    protected isActivationKey(event: any): boolean {
        return ['Enter', ' ', 'Spacebar'].includes(String(event?.key || ''));
    }

    close(id: string): void {
        this.activeSource?.close?.(id);
    }

    /** Scroll back one page of tabs (host-windowed) or one strip page (DOM). */
    scrollBack(event?: Event): void {
        event?.stopPropagation?.();
        if (this.hostWindowed) {
            if (this.scrollBackEnabled) {
                this.activeSource?.scrollBack?.();
            }
            return;
        }
        this.scrollStrip(-this.domScrollStep());
    }

    /** Scroll forward one page of tabs (host-windowed) or one strip page (DOM). */
    scrollForward(event?: Event): void {
        event?.stopPropagation?.();
        if (this.hostWindowed) {
            if (this.scrollForwardEnabled) {
                this.activeSource?.scrollForward?.();
            }
            return;
        }
        this.scrollStrip(this.domScrollStep());
    }

    protected domScrollStep(): number {
        const width = Number((this.resolveStripElement() as { clientWidth?: number } | undefined)?.clientWidth) || 0;
        return Math.max(60, Math.floor(width * 0.7));
    }

    protected scrollStrip(delta: number): void {
        const el = this.resolveStripElement();
        if (!el) {
            return;
        }
        const current = Number((el as { scrollLeft?: number }).scrollLeft) || 0;
        (el as { scrollLeft?: number }).scrollLeft = Math.max(0, current + delta);
        this.syncDomOverflow();
    }

    /**
     * Resolve the scrolling strip lazily: the template root node can be
     * replaced by a re-render, and the host element is the stable observation
     * point for scroll/mutation events.
     */
    protected resolveStripElement(): HTMLElement | undefined {
        const host = this.elementRef?.nativeElement as HTMLElement | undefined;
        const found = host?.querySelector?.('.tab-bar') as HTMLElement | null | undefined;
        const node = found ?? (this.strip?.nativeElement as HTMLElement | undefined);
        const el = unwrapReactive<HTMLElement>(node);
        if (el !== this.stripElement) {
            this.stripElement = el;
        }
        return el;
    }

    /** Bind DOM overflow measurement; terminal hosts have no scroll metrics. */
    protected bindDomOverflow(): void {
        const host = this.elementRef?.nativeElement as HTMLElement | undefined;
        if (!host || typeof host.addEventListener !== 'function') {
            return;
        }
        if (typeof (host as { clientWidth?: unknown }).clientWidth !== 'number') {
            // Terminal element: the host reports overflow through the source.
            return;
        }
        this.overflowHost = host;
        this.stripScrollListener = () => this.scheduleOverflowSync();
        // Capture catches the strip's scroll event without owning its node;
        // a re-render can replace the strip while the host stays stable.
        host.addEventListener('scroll', this.stripScrollListener, { capture: true, passive: true } as AddEventListenerOptions);
        const MutationObserverCtor = (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver;
        if (typeof MutationObserverCtor === 'function') {
            const observer = new MutationObserverCtor(() => this.scheduleOverflowSync());
            observer.observe(host, { childList: true, subtree: true, characterData: true });
            this.stripMutationObserver = observer;
        }
        const ResizeObserverCtor = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
        if (typeof ResizeObserverCtor === 'function') {
            const observer = new ResizeObserverCtor(() => this.scheduleOverflowSync());
            observer.observe(host);
            this.stripResizeObserver = observer;
        }
        const win = (host.ownerDocument as { defaultView?: Window } | undefined)?.defaultView;
        if (win && typeof win.addEventListener === 'function') {
            this.windowResizeListener = () => this.scheduleOverflowSync();
            win.addEventListener('resize', this.windowResizeListener);
        }
        this.scheduleOverflowSync();
    }

    protected scheduleOverflowSync(): void {
        if (this.overflowSyncScheduled) {
            return;
        }
        this.overflowSyncScheduled = true;
        void Promise.resolve().then(() => {
            this.overflowSyncScheduled = false;
            this.syncDomOverflow();
        });
    }

    /**
     * Re-measure the DOM strip. Public so hosts/tests can force a measurement
     * after laying out a strip whose size changed without a resize event.
     */
    syncDomOverflow(): void {
        const el = this.resolveStripElement();
        if (!el) {
            return;
        }
        const scrollWidth = Number((el as { scrollWidth?: number }).scrollWidth) || 0;
        const clientWidth = Number((el as { clientWidth?: number }).clientWidth) || 0;
        const overflow = scrollWidth - clientWidth > 1;
        const left = Math.max(0, Number((el as { scrollLeft?: number }).scrollLeft) || 0);
        const canBack = overflow && left > 1;
        const canForward = overflow && left < scrollWidth - clientWidth - 1;
        if (this.domOverflow !== overflow) {
            this.domOverflow = overflow;
        }
        if (this.domBack !== canBack) {
            this.domBack = canBack;
        }
        if (this.domForward !== canForward) {
            this.domForward = canForward;
        }
    }
}
