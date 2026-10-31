import { Attribute, Component } from '@tsdi/components';
import { Inject, Optional, token } from '@tsdi/ioc';

/** A renderer-neutral tab entry: the host owns meaning, the tab bar only paints it. */
export interface CommonTabItem {
    id: string;
    label: string;
    style?: Record<string, string>;
    /** Whether this tab shows its close affordance (defaults to true). */
    showClose?: boolean;
}

/** Everything the shared strip paints plus the actions a host wants to receive. */
export interface CommonTabBarSource {
    visible: boolean;
    items: CommonTabItem[];
    barStyle?: Record<string, string>;
    actionStyle?: Record<string, string>;
    showCreate?: boolean;
    createLabel?: string;
    closeLabel?: string;
    closeStyle?: Record<string, string>;
    select?(id: string): void;
    create?(): void;
    close?(id: string): void;
}

/** Domain-provided tab source (agent-ui supplies its session tabs through this token). */
export const COMMON_TAB_BAR_SOURCE = token<CommonTabBarSource>('COMMON_TAB_BAR_SOURCE');

/**
 * Shared tab strip used by console surfaces (agent-ui session tabs included).
 * The host supplies data through `COMMON_TAB_BAR_SOURCE`; no domain state lives
 * here so the DOM and terminal renderers paint the same structure.
 */
@Component({
    selector: 'common-tab-bar',
    template: `
    <p class="common-tab-bar" role="tablist" v-style="barStyle" v-show="visible">
        <span class="common-tab" role="tab" v-for="tab in items" v-style="tab.style" @click="select(tab.id)">
            <span class="common-tab-label" @click="select(tab.id)">{{tab.label}}</span><span class="common-tab-close" role="button" v-if="tab.showClose !== false" v-style="closeStyle" @click="close(tab.id)">{{closeLabel}}</span>
        </span>
        <span class="common-tab-new" role="button" v-style="actionStyle" v-show="showCreate" @click="create">{{createLabel}}</span>
    </p>
    `
})
export class CommonTabBarComponent {
    /** Direct source wins over the injected one (hosts without a provider). */
    @Attribute() source?: CommonTabBarSource;

    constructor(@Optional() @Inject(COMMON_TAB_BAR_SOURCE) private injectedSource?: CommonTabBarSource) {
    }

    protected get activeSource(): CommonTabBarSource | undefined {
        return this.source || this.injectedSource;
    }

    get visible(): boolean {
        return this.activeSource ? this.activeSource.visible : true;
    }

    get items(): CommonTabItem[] {
        return this.activeSource?.items || [];
    }

    get barStyle(): Record<string, string> {
        return this.activeSource?.barStyle || {};
    }

    get actionStyle(): Record<string, string> {
        return this.activeSource?.actionStyle || {};
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

    get closeStyle(): Record<string, string> {
        return this.activeSource?.closeStyle || {};
    }

    select(id: string): void {
        this.activeSource?.select?.(id);
    }

    create(): void {
        this.activeSource?.create?.();
    }

    close(id: string): void {
        this.activeSource?.close?.(id);
    }
}
