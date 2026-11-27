import { AfterViewInit, Attribute, Component, OnDestroy, QueryList, ViewChildren } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { resolveSelectWindow as resolveConsoleSelectWindow } from '@tsdi/components/common';
import { SelectComponent } from '@tsdi/components/common/select';
import { SearchListComponent, SearchListItem } from '@tsdi/components/common/search-list';
import { formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';
import { AgentConsoleSelectMenu, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleTheme, defaultAgentConsoleTheme } from './AgentConsoleTheme';
import { isAgentConsoleSuggestionMenu } from './AgentConsoleSuggestions';

@Component({
    selector: 'agent-console-select-panel',
    imports: [SelectComponent, SearchListComponent],
    template: `
        <div class="select-panel-root">
        <div v-if="menuIsSearchList" class="console-panel select-list select-palette"
            role="dialog" aria-label="{{accessibilityLabel}}">
            <div class="select-shell {{menuIsSuggestion ? 'select-suggestions' : 'select-card'}}">
                <label class="dialog-close" data-cell-width="2" @click="closeMenu">✕</label>
                <label class="select-title" v-if="menuTitleText">{{menuTitleText}}</label>
                <label class="select-meta" v-if="paletteMeta">{{paletteMeta}}</label>
                <ui-search-list :items="paletteItems" :selectedId="paletteSelectedId" :showInput="false"
                    rowLayout="inline" :ariaLabel="accessibilityLabel" :maxVisible="0"></ui-search-list>
                <label class="select-detail" v-for="line in menuDetailLines">{{line}}</label>
                <label class="select-hint" v-if="menuHintText">{{menuHintText}}</label>
            </div>
        </div>
        <select-list v-else
            :options="menuOptions"
            :widthTitle="menuWidthTitle"
            :widthOptions="menuWidthOptions"
            :selectedIndex="menuSelectedIndex"
            :visibleCount="visibleOptionCount"
            :title="menuTitleText"
            :hint="menuHintText"
            :meta="menuMetaText"
            :detailLines="menuDetailLines"
            :emptyText="menuEmptyText"
            :fitContent="menuFitContent"
            :suggestion="menuIsSuggestion"
            :accessibilityLabel="accessibilityLabel"
            @selectAction="selectOption"
            @closeAction="closeMenu"
            @keydownAction="onKeydown"></select-list>
        </div>
    `
})
export class AgentConsoleSelectPanelComponent implements AfterViewInit, OnDestroy {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() selectAction?: (value: string) => Promise<void>;

    @ViewChildren(SearchListComponent) paletteLists?: QueryList<SearchListComponent>;
    private paletteSubscription?: { unsubscribe(): void };

    onAfterViewInit(): void {
        this.paletteSubscription = this.paletteLists?.changes.subscribe(() => this.wirePaletteList());
        this.wirePaletteList();
    }

    onDestroy(): void {
        this.paletteSubscription?.unsubscribe();
        this.paletteSubscription = undefined;
    }

    protected wirePaletteList(): void {
        const list = this.paletteLists?.first;
        if (!list) {
            return;
        }
        list.selectAction = item => { void this.selectOption(item.id); };
        list.activeChangeAction = item => {
            const menu = this.menu;
            if (!menu || !item) {
                return;
            }
            const index = menu.options.findIndex(option => option.value === item.id);
            if (index >= 0) {
                menu.selectedIndex = index;
            }
        };
    }

    get menuIsPalette(): boolean {
        return this.menu?.kind === 'palette';
    }

    /** Palette and inline slash/mention suggestions share the search-list rows. */
    get menuIsSearchList(): boolean {
        return this.menuIsPalette || this.menuIsSuggestion;
    }

    get paletteItems(): SearchListItem[] {
        const menu = this.menu;
        if (!menu) {
            return [];
        }
        const window = resolveConsoleSelectWindow(menu.options.length, menu.selectedIndex, this.visibleOptionCount);
        return menu.options.slice(window.start, window.start + window.count).map(option => ({
            id: option.value,
            label: option.label,
            description: option.description
        }));
    }

    get paletteSelectedId(): string {
        const menu = this.menu;
        return menu?.options?.[menu.selectedIndex]?.value || '';
    }

    get paletteMeta(): string {
        return this.menuMetaText;
    }

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get menu(): AgentConsoleSelectMenu | undefined {
        return this.state.selectMenu;
    }

    // Blocking menus show their question/title and key hint; inline
    // suggestions keep the composer clean.
    get menuTitleText(): string {
        const menu = this.menu;
        if (!menu || isAgentConsoleSuggestionMenu(menu)) return '';
        // The filter is language-neutral user text, so it rides on the title
        // instead of adding another localized "filter:" label.
        return `${menu.title || ''}${menu.filter ? ` · ${menu.filter}` : ''}`;
    }

    get menuHintText(): string { const menu = this.menu; return !menu || isAgentConsoleSuggestionMenu(menu) ? '' : (menu.hint || ''); }

    /** Blocking menus share the composer width (AGENTS overlay contract); suggestions too. */
    get menuFitContent(): boolean { return false; }

    /** Only the inline slash/mention palette keeps the composer rails. */
    get menuIsSuggestion(): boolean { return !!this.menu && isAgentConsoleSuggestionMenu(this.menu); }

    get menuMetaText(): string { const menu = this.menu; if (!menu || isAgentConsoleSuggestionMenu(menu)) return ''; const window = resolveConsoleSelectWindow(menu.options.length, menu.selectedIndex, this.visibleOptionCount); return window.count < menu.options.length ? `${window.start + 1}-${window.start + window.count}/${menu.options.length}` : ''; }

    /** A live filter can legitimately match zero rows; say so instead of an empty card. */
    get menuEmptyText(): string {
        const menu = this.menu;
        if (!menu || !menu.filter || menu.options.length || isAgentConsoleSuggestionMenu(menu)) {
            return '';
        }
        return panelLabel(this.translator, 'select', 'emptyFilter', 'No matches for "{filter}"', { filter: menu.filter });
    }

    async closeMenu(): Promise<void> { await this.state.cancelSelectMenu(); }

    /** Unfiltered width inputs: typing a filter must not resize the card. */
    get menuWidthTitle(): string { const menu = this.menu; return !menu || isAgentConsoleSuggestionMenu(menu) ? '' : (menu.title || ''); }

    get menuWidthOptions(): Array<{ label: string; value: string; description?: string }> {
        return (this.menu?.allOptions || this.menu?.options || []).map(option => ({
            label: option.label,
            value: option.value,
            description: option.description || ''
        }));
    }

    get menuOptions(): Array<{ label: string; value: string; description?: string }> {
        return (this.menu?.options || []).map(option => ({
            label: option.label,
            value: option.value,
            description: option.description || ''
        }));
    }

    get menuDetailLines(): string[] {
        const detail = this.state.selectedSelectMenuOption?.detail;
        if (typeof detail !== 'string') {
            return [];
        }
        const cap = Math.max(1, this.state.consoleOptions.selectDetailVisibleLines || 6);
        return detail.split('\n').map(line => line.trim()).filter(Boolean).slice(0, cap);
    }

    /** Compatibility projection for hosts/tests that inspect the select core payload. */
    get menuDetailLinesJson(): string {
        const lines = this.menuDetailLines;
        return lines.length ? JSON.stringify(lines) : '';
    }

    get menuSelectedIndex(): number {
        return this.menu?.selectedIndex ?? 0;
    }

    get visibleOptionCount(): number {
        const configured = Number(this.state.consoleOptions.selectVisibleOptions) || 12;
        // Short terminals cannot fit the card above the composer; window the
        // options to the rows the overlay can actually show.
        const maxRows = Number(this.state.maxOverlayVisibleLines) || 0;
        return maxRows > 0 ? Math.max(3, Math.min(configured, maxRows)) : configured;
    }

    get accessibilityLabel(): string {
        if (!this.menu) {
            return 'Selection menu';
        }
        return `${this.menu.title || 'Selection menu'}. ${this.menu.options.length} options. Selected ${this.menu.selectedIndex + 1} of ${this.menu.options.length}.`;
    }

    async selectOptionAt(index: number): Promise<void> {
        const option = this.menu?.options[index];
        if (!option) {
            return;
        }
        await this.selectOption(option.value);
    }

    async selectOption(value: string): Promise<void> {
        await (this.selectAction || this.state.confirmSelectMenu.bind(this.state))(value);
    }

    async onKeydown(event: KeyboardEvent): Promise<void> {
        const menu = this.menu;
        if (!menu) {
            return;
        }
        const blocking = !isAgentConsoleSuggestionMenu(menu);
        const key = String(event.key || '');
        let handled = false;
        if (blocking && key.length === 1) {
            handled = this.state.focusLayers.handleMenuInput(key, key);
        } else if (blocking && key === 'Backspace') {
            handled = this.state.focusLayers.handleMenuInput('backspace', '\b');
        }
        if (!handled && this.state.focusLayers.handleSelectKey(key)) {
            handled = true;
        }
        if (handled) {
            event.preventDefault?.();
        }
    }
}
