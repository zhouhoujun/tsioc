import { AfterViewInit, Attribute, Component, ElementRef, ViewChild, unwrapReactive } from '@tsdi/components';
import { Inject, Optional, token } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { installTabBarStyles } from './tab-bar.styles';

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
    /** Glyphs painted by the overflow controls (defaults keep the strip's width). */
    scrollBackLabel?: string;
    scrollForwardLabel?: string;
    /** Accessible names for the overflow controls. */
    scrollBackTitle?: string;
    scrollForwardTitle?: string;
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
    template: `
    <p class="tab-bar" role="tablist" v-show="visible" #strip>
        <span class="tab-scroll tab-scroll-back" role="button" aria-label="{{scrollBackTitle}}" aria-disabled="{{scrollBackDisabled}}" data-disabled="{{scrollBackDisabled}}" v-show="arrowsVisible" @click="scrollBack($event)">{{scrollBackLabel}}</span>
        <span class="tab" role="tab" aria-selected="{{tab.active}}" data-disabled="{{tab.disabled}}" data-hover-group="true" v-for="tab in items" trackBy="id" @click="select(tab.id, $event)">
            <span class="tab-label" @click="select(tab.id, $event)">{{tab.label}}</span><span class="tab-close" role="button" v-if="tab.showClose !== false" data-close-mode="{{tab.showClose === 'hover' ? 'hover' : 'always'}}" data-hover-reveal="{{tab.showClose === 'hover'}}" data-cell-width="2" @click="closeTab(tab.id, $event)">{{closeLabel}}</span>
        </span>
        <span class="tab-scroll tab-scroll-forward" role="button" aria-label="{{scrollForwardTitle}}" aria-disabled="{{scrollForwardDisabled}}" data-disabled="{{scrollForwardDisabled}}" v-show="arrowsVisible" @click="scrollForward($event)">{{scrollForwardLabel}}</span>
        <span class="tab-new" role="button" v-show="showCreate" @click="create">{{createLabel}}</span>
    </p>
    `
})
export class TabBarComponent implements AfterViewInit {
    /** Direct source wins over the injected one (hosts without a provider). */
    @Attribute() source?: TabBarSource;

    @ViewChild('strip', ElementRef) strip?: ElementRef;

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

    get arrowsVisible(): boolean {
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
        // The close affordance is nested inside the clickable tab. DOM events
        // bubble from ✕ to the tab, which would select a tab that is closing
        // (and reopen it). Ignore those bubbled clicks; the close handler also
        // stops propagation for hosts that support it.
        const target = event?.target as { closest?: (selector: string) => unknown } | null | undefined;
        if (target?.closest?.('.tab-close')) {
            return;
        }
        this.activeSource?.select?.(id);
    }

    closeTab(id: string, event?: Event): void {
        event?.stopPropagation?.();
        this.close(id);
    }

    create(): void {
        this.activeSource?.create?.();
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
