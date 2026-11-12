import {
    AfterViewInit,
    Attribute,
    Component,
    ElementRef,
    PROJECTION_NODES,
    RNode,
    ViewChild
} from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TAB_BAR_SOURCE, TabBarComponent, TabBarSource } from '../../tab-bar/src/tab-bar';
import { markElementRefRaw } from '../../src/raw-element';

/** Generic tabs source: the shared strip plus the pane that is currently shown. */
export type TabsSource = TabBarSource;

interface ProjectionNode extends RNode {
    tagName?: string;
}

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
        <div class="tabs-panes" #panes v-show="!stripOnly"></div>
    </div>`
})
export class TabsComponent implements AfterViewInit {
    @Attribute() source?: TabsSource;
    /** Render only the shared strip (the host owns the pane region). */
    @Attribute() stripOnly = false;
    @Attribute() activeId = '';

    @ViewChild('panes', ElementRef) panes?: ElementRef;

    protected projected = false;

    constructor(
        @Optional() protected elementRef?: ElementRef,
        @Optional() @Inject(TAB_BAR_SOURCE) protected injectedSource?: TabBarSource,
        @Optional() @Inject(ApplicationContext) protected app?: ApplicationContext | null
    ) {
        markElementRefRaw(elementRef);
    }

    protected resolvedSource?: TabBarSource;

    protected get activeSource(): TabBarSource | undefined {
        if (this.source) {
            return this.source;
        }
        // A component declared in an opt-in module gets a module-scoped token
        // instance; the host's source lives on the application context. Prefer
        // the context source so both share the same session state.
        this.resolvedSource ??= this.app?.get?.(TAB_BAR_SOURCE) as TabBarSource | undefined;
        return this.resolvedSource || this.injectedSource;
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
        this.mountProjectedPanes();
        this.syncVisibility();
    }

    /** Move declarative `<tab-pane>` children into the pane container once. */
    mountProjectedPanes(): void {
        if (this.projected) {
            return;
        }
        const container = this.panes?.nativeElement as any;
        if (!container || typeof container.appendChild !== 'function') {
            return;
        }
        const host = container.closest?.('tabs') || container.parentElement || this.hostElement;
        const nodes: ProjectionNode[] = (host as any)?.[PROJECTION_NODES] || [];
        if (!nodes.length) {
            return;
        }
        nodes.forEach(node => {
            const tag = String(node.tagName || '').toLowerCase();
            if (tag && tag !== 'tab-pane' && !(node as any).getAttribute?.('data-tab-id')) {
                return;
            }
            if (!(node as any).getAttribute?.('data-tab-id')) {
                (node as any).setAttribute?.('data-tab-id', tag === 'tab-pane' ? '' : tag);
            }
            container.appendChild(node as any);
        });
        this.projected = true;
    }

    /** Keep every pane mounted; only the active pane is painted. */
    syncVisibility(): void {
        const container = this.panes?.nativeElement as any;
        if (!container || typeof container.querySelectorAll !== 'function') {
            return;
        }
        const active = this.currentId;
        container.querySelectorAll('[data-tab-id]')?.forEach?.((pane: any) => {
            const id = String(pane.getAttribute?.('data-tab-id') || '');
            const hidden = !!active && id !== active;
            const style = pane.style;
            if (style) {
                style.display = hidden ? 'none' : '';
            } else {
                pane.setAttribute?.('style', hidden ? 'display: none' : '');
            }
        });
    }

    protected scheduleSync(): void {
        if (this.projected) {
            void Promise.resolve().then(() => this.syncVisibility());
        }
    }

    protected get hostElement(): any {
        return this.elementRef?.nativeElement as any;
    }
}
