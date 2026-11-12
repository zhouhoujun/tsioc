import { Attribute, Component } from '@tsdi/components';
import { Inject, Optional, token } from '@tsdi/ioc';

/** A renderer-neutral tab entry: the host owns meaning, the tab bar only paints it. */
export interface TabItem {
    id: string;
    label: string;
    /** Semantic selection state; renderers may use it for accessibility and skinning. */
    active?: boolean;
    /** Whether this tab shows its close affordance (defaults to true). */
    showClose?: boolean;
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
 */
@Component({
    selector: 'tab-bar',
    template: `
    <p class="tab-bar" role="tablist" v-show="visible">
        <span class="tab" role="tab" aria-selected="{{tab.active}}" data-disabled="{{tab.disabled}}" v-for="tab in items" @click="select(tab.id, $event)">
            <span class="tab-label" @click="select(tab.id, $event)">{{tab.label}}</span><span class="tab-close" role="button" v-if="tab.showClose !== false" data-cell-width="3" @click="closeTab(tab.id, $event)">{{closeLabel}}</span>
        </span>
        <span class="tab-new" role="button" v-show="showCreate" @click="create">{{createLabel}}</span>
    </p>
    `
})
export class TabBarComponent {
    /** Direct source wins over the injected one (hosts without a provider). */
    @Attribute() source?: TabBarSource;

    constructor(@Optional() @Inject(TAB_BAR_SOURCE) private injectedSource?: TabBarSource) {
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
}
