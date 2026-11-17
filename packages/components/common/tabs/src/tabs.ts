import {
    AfterViewInit,
    Attribute,
    Component,
    ContentChildren,
    ElementRef,
    QueryList,
    Renderer,
    ViewChild
} from '@tsdi/components';
import { Inject, Injector, Optional } from '@tsdi/ioc';
import { TAB_BAR_SOURCE, TabBarComponent, TabBarSource } from '../../tab-bar/src/tab-bar';
import { markElementRefRaw } from '../../src/raw-element';

/** Generic tabs source: the shared strip plus the pane that is currently shown. */
export type TabsSource = TabBarSource;

/**
 * Generic tabs: the shared {@link TabBarComponent} strip plus a pane container
 * that keeps every projected pane mounted. Selecting a tab only hides/shows
 * panes (`display`), so a pane never loses its component tree, scroll state or
 * rendered content on a switch.
 *
 * Usage:
 * ```html
 * <tabs [source]="tabsSource" activeId="session-a">
 *   <tab-pane data-tab-id="session-a">...</tab-pane>
 *   <tab-pane data-tab-id="session-b">...</tab-pane>
 * </tabs>
 * ```
 * Hosts that only need the strip (for example a console header) use
 * `<tabs strip-only>`.
 */
@Component({
    selector: 'tabs',
    imports: [TabBarComponent],
    template: `
    <div class="tabs" data-active-tab="{{syncKey}}">
        <tab-bar :source="barSource"></tab-bar>
        <div class="tabs-panes" #panes v-show="!stripOnly"><v-content select="tab-pane"></v-content></div>
    </div>`
})
export class TabsComponent implements AfterViewInit {
    @Attribute() source?: TabsSource;
    /** Render only the shared strip (the host owns the pane region). */
    @Attribute() stripOnly = false;
    @Attribute() activeId = '';

    @ViewChild('panes', ElementRef) panes?: ElementRef;
    /** Projected panes, resolved through the framework content-query index. */
    @ContentChildren('[data-tab-id]') paneRefs?: QueryList<ElementRef>;

    protected viewReady = false;

    constructor(
        @Optional() protected elementRef?: ElementRef,
        @Optional() @Inject(TAB_BAR_SOURCE) protected injectedSource?: TabBarSource,
        @Optional() protected injector?: Injector | null,
        @Optional() protected renderer?: Renderer | null
    ) {
        markElementRefRaw(elementRef);
    }

    protected resolvedSource?: TabBarSource;

    protected get activeSource(): TabBarSource | undefined {
        if (this.source) {
            return this.source;
        }
        // A component declared in an opt-in module can receive a module-scoped
        // token instance. Walk parent injectors to find the host/application
        // source, then fall back to the injected value.
        this.resolvedSource ??= this.findContextSource();
        return this.resolvedSource || this.injectedSource;
    }

    protected findContextSource(): TabBarSource | undefined {
        let current: Injector | null | undefined = this.injector;
        const seen = new Set<Injector>();
        while (current && !seen.has(current)) {
            seen.add(current);
            const source = current.get?.(TAB_BAR_SOURCE, null as unknown as TabBarSource);
            if (source) {
                return source;
            }
            try {
                current = current.getParent?.();
            } catch {
                current = undefined;
            }
        }
        return undefined;
    }

    get visible(): boolean {
        return this.activeSource ? this.activeSource.visible : false;
    }

    get items(): TabBarSource['items'] {
        return this.activeSource?.items || [];
    }

    select(id: string): void {
        this.activate(id);
    }

    create(): void {
        this.activeSource?.create?.();
    }

    close(id: string): void {
        this.activeSource?.close?.(id);
    }

    get barSource(): TabBarSource {
        const source = this.activeSource;
        if (!source) {
            return { visible: false, items: [] };
        }
        // Keep live getters (the host source may be a class instance with
        // prototype getters); a spread would snapshot missing properties.
        return {
            get visible() { return source.visible; },
            get items() { return source.items; },
            get showCreate() { return source.showCreate; },
            get createLabel() { return source.createLabel; },
            get closeLabel() { return source.closeLabel; },
            select: (id: string) => this.activate(id),
            create: () => source.create?.(),
            close: (id: string) => source.close?.(id)
        };
    }

    /** Active pane id: explicit attribute wins, then source semantics. */
    get currentId(): string {
        const explicit = String(this.activeId || '').trim();
        if (explicit) {
            return explicit;
        }
        const items = this.activeSource?.items || [];
        return String(items.find(item => item.active)?.id || items[0]?.id || '');
    }

    /**
     * Template-readable key. Reading it during render re-syncs pane visibility
     * after the host (or a keyboard shortcut) changed the active item.
     */
    get syncKey(): string {
        this.scheduleSync();
        return this.currentId;
    }

    activate(id: string): void {
        const key = String(id || '').trim();
        if (!key) {
            return;
        }
        this.activeId = key;
        this.activeSource?.select?.(key);
        this.scheduleSync();
    }

    onAfterViewInit(): void {
        this.viewReady = true;
        this.syncVisibility();
    }

    /** Keep every pane mounted; only the active pane is painted. */
    syncVisibility(): void {
        const active = this.currentId;
        const queryPanes = this.paneRefs?.toArray?.()
            .map(ref => (ref as any)?.nativeElement ?? ref)
            .filter(Boolean) as any[] | undefined;
        const container = this.panes?.nativeElement as any;
        const fallbackPanes = !queryPanes?.length && container && typeof container.querySelectorAll === 'function'
            ? container.querySelectorAll('[data-tab-id]') as ArrayLike<any> | null
            : null;
        const panes = queryPanes?.length
            ? queryPanes
            : (fallbackPanes ? Array.from(fallbackPanes) : []);
        panes.forEach((pane: any) => {
            const id = String(pane.getAttribute?.('data-tab-id') || '');
            const hidden = !!active && id !== active;
            if (this.renderer) {
                this.renderer.setStyle(pane, 'display', hidden ? 'none' : '');
            } else if (pane.style) {
                pane.style.display = hidden ? 'none' : '';
            } else {
                pane.setAttribute?.('style', hidden ? 'display: none' : '');
            }
        });
    }

    protected scheduleSync(): void {
        if (!this.viewReady) {
            return;
        }
        void Promise.resolve().then(() => this.syncVisibility());
    }
}
