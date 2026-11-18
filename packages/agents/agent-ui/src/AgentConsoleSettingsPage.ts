import { Component } from '@tsdi/components';
import { Module } from '@tsdi/ioc';
import { BadgeModule } from '@tsdi/components/common/badge';
import { ButtonModule } from '@tsdi/components/common/button';
import { CardModule } from '@tsdi/components/common/card';
import { EmptyStateModule } from '@tsdi/components/common/empty-state';
import { KbdModule } from '@tsdi/components/common/kbd';
import { SearchFieldModule } from '@tsdi/components/common/search-field';
import { SwitchModule } from '@tsdi/components/common/switch';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel } from './agent-ui.i18n';
import { AGENT_CONSOLE_SETTINGS_SECTIONS, settingsCenterLabel } from './AgentConsoleSettingsSchema';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleSettingsRow } from './AgentConsoleSettingsCenter';

interface AgentConsoleSettingsPageRow extends AgentConsoleSettingsRow {
    action: () => void;
    reset: () => void;
    toggle: () => void;
}

interface AgentConsoleSettingsPageSection {
    id: string;
    label: string;
    active: boolean;
    action: () => void;
}

/**
 * Web settings page: the same schema rows as the terminal settings center,
 * rendered as a full page with the shared `components/common` widgets.
 *
 * The console host mounts it only when `settingsPageOpen` is set (browser
 * sidebar / gear). It never opens in the terminal, so the TUI keeps its
 * composer-anchored overlay contract.
 */
@Component({
    selector: 'agent-console-settings-page',
    imports: [
        BadgeModule,
        ButtonModule,
        CardModule,
        EmptyStateModule,
        KbdModule,
        SearchFieldModule,
        SwitchModule
    ],
    template: `
    <div class="console-panel settings-page" role="dialog" aria-label="{{title}}" data-settings-page="true"
        v-show="open" @keydown="onKeydown($event)">
        <div class="settings-page-shell">
            <header class="settings-page-head">
                <div class="settings-page-heading">
                    <h2 class="settings-page-title">{{title}}</h2>
                    <p class="settings-page-meta" v-if="meta">{{meta}}</p>
                </div>
                <ui-button className="settings-page-close" icon="x" size="sm" variant="ghost"
                    :ariaLabel="closeLabel" :action="close"></ui-button>
            </header>
            <ui-search-field className="settings-page-search" :value="query"
                :placeholder="searchPlaceholder" :clearAction="clearQuery"
                :changeAction="onQuery"></ui-search-field>
            <nav class="settings-page-sections" aria-label="{{title}}">
                <ui-button v-for="section in pageSections" trackBy="id" size="sm"
                    :label="section.label" :action="section.action"
                    :variant="section.active ? 'solid' : 'ghost'"
                    :tone="section.active ? 'accent' : 'muted'"
                    :pressed="section.active" :ariaLabel="section.label"></ui-button>
            </nav>
            <div class="settings-page-grid">
                <ui-card v-for="row in pageRows" trackBy="id" :title="row.label"
                    :subtitle="row.description" :meta="row.effect">
                    <div class="settings-page-row" data-settings-row="{{row.id}}">
                        <span class="settings-page-value">{{row.value}}</span>
                        <span class="settings-page-controls">
                            <ui-switch v-if="row.kind === 'toggle'" :checked="row.checked"
                                :onLabel="onLabel" :offLabel="offLabel" :changeAction="row.toggle"></ui-switch>
                            <ui-button v-else :label="applyLabel" size="sm" variant="outline"
                                :action="row.action"></ui-button>
                            <ui-button v-if="row.canReset" :label="resetLabel" size="sm" variant="ghost"
                                :action="row.reset"></ui-button>
                            <ui-badge :label="row.scope" tone="muted" variant="outline"></ui-badge>
                        </span>
                    </div>
                </ui-card>
            </div>
            <ui-empty v-if="!pageRows.length" icon="search" :title="emptyLabel"
                :hint="emptyHint"></ui-empty>
            <footer class="settings-page-foot">
                <span class="settings-page-hint">{{hint}}</span>
                <ui-kbd :keys="['esc']"></ui-kbd>
            </footer>
        </div>
    </div>
    `
})
export class AgentConsoleSettingsPageComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
    }

    protected label(key: string, fallback: string, params?: Record<string, any>): string {
        return formatAgentUiLabel(this.translator, key, fallback, params);
    }

    get open(): boolean {
        return this.state.settingsPageOpen === true;
    }

    get title(): string {
        return this.state.settingsCenterTitle || this.label('agent.menu.settings.title', 'Settings');
    }

    get meta(): string {
        return this.state.settingsCenterMeta;
    }

    get hint(): string {
        return this.label('agent.menu.settings.pageHint', 'Changes save immediately');
    }

    get query(): string {
        return this.state.settingsCenterQuery || '';
    }

    get searchPlaceholder(): string {
        return this.label('agent.menu.settings.pageSearchPlaceholder', 'Search settings');
    }

    get closeLabel(): string {
        return this.label('agent.menu.settings.pageClose', 'Close settings');
    }

    get applyLabel(): string {
        return this.label('agent.menu.settings.pageApply', 'Open');
    }

    get resetLabel(): string {
        return this.label('agent.menu.settings.pageReset', 'Reset');
    }

    get emptyLabel(): string {
        return this.label('agent.menu.settings.emptyResults', 'No matching settings');
    }

    get emptyHint(): string {
        return this.label('agent.menu.settings.pageEmptyHint', 'Try another query or pick another section.');
    }

    get onLabel(): string {
        return this.label('agent.menu.settings.stateOn', 'on');
    }

    get offLabel(): string {
        return this.label('agent.menu.settings.stateOff', 'off');
    }

    get rows(): AgentConsoleSettingsRow[] {
        return this.state.settingsCenterRows || [];
    }

    get pageRows(): AgentConsoleSettingsPageRow[] {
        return this.rows.map(row => ({
            ...row,
            action: () => { void this.state.settingsPagePickAction?.(row.id); },
            reset: () => { void this.state.settingsPageResetAction?.(row.id); },
            toggle: () => { void this.state.settingsPagePickAction?.(row.id); }
        }));
    }

    get pageSections(): AgentConsoleSettingsPageSection[] {
        const active = this.state.settingsCenterSection;
        return AGENT_CONSOLE_SETTINGS_SECTIONS.map(section => ({
            id: section.id,
            label: settingsCenterLabel(this.translator, section.labelKey, section.labelFallback),
            active: section.id === active,
            action: () => { void this.state.settingsPageSectionAction?.(section.id); }
        }));
    }

    onQuery = (value: string): void => {
        this.state.settingsPageQueryAction?.(value || '');
    };

    clearQuery = (): void => {
        this.state.settingsPageQueryAction?.('');
    };

    close = (): void => {
        void this.state.settingsPageCloseAction?.();
    };

    onKeydown = (event: any): void => {
        if (String(event?.key || '') !== 'Escape') {
            return;
        }
        // Esc closes the page; the search field owns every other key.
        event?.preventDefault?.();
        this.close();
    };
}

/**
 * Declares the web settings page next to the shared primitives it renders.
 * Hosts (browser adapter/tests) mount this module in their own application so
 * the page never joins the terminal component tree.
 */
@Module({
    imports: [
        BadgeModule,
        ButtonModule,
        CardModule,
        EmptyStateModule,
        KbdModule,
        SearchFieldModule,
        SwitchModule
    ],
    declarations: [AgentConsoleSettingsPageComponent],
    exports: [AgentConsoleSettingsPageComponent]
})
export class AgentConsoleSettingsPageModule {}
