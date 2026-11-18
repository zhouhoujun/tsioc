import { Component } from '@tsdi/components';
import { BadgeModule } from '@tsdi/components/common/badge';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel } from './agent-ui.i18n';
import { AGENT_CONSOLE_SETTINGS_SECTIONS, settingsCenterLabel } from './AgentConsoleSettingsSchema';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleSettingsRow } from './AgentConsoleSettingsCenter';

/**
 * Settings center panel: section header, search line, rows with value/scope/
 * effect badges and a key hint. Rendered by both the terminal and the HTML
 * renderer; the host owns navigation and applies the selected row.
 */
@Component({
    selector: 'agent-console-settings-center-panel',
    imports: [BadgeModule],
    template: `
    <div class="console-panel settings-center-panel" role="dialog" aria-label="{{title}}">
        <label class="dialog-close" data-cell-width="2" @click="close">✕</label>
        <label class="settings-title">{{title}}</label>
        <label class="settings-meta">{{windowMeta}}</label>
        <label class="settings-sections">{{sectionStrip}}</label>
        <label class="settings-query" v-if="query">{{query}}</label>
        <div class="settings-rows">
            <label class="settings-row" v-for="row in visibleRows" aria-selected="{{row.selected}}" @click="pick(row.id)">
                <span class="settings-label">{{row.label}}</span>
                <span class="settings-value" v-if="row.value">: {{row.value}}</span>
                <ui-badge class="settings-scope" :label="row.scope" tone="muted" variant="outline"></ui-badge>
                <span class="settings-effect" v-if="row.effect"> · {{row.effect}}</span>
            </label>
        </div>
        <label class="settings-empty" v-if="!rows.length">{{emptyLabel}}</label>
        <label class="settings-detail" v-if="selectedDescription">{{selectedDescription}}</label>
        <label class="settings-hint">{{hint}}</label>
    </div>
    `
})
export class AgentConsoleSettingsCenterPanelComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {}

    get title(): string { return this.state.settingsCenterTitle; }
    get hint(): string { return this.state.settingsCenterHint; }
    /** Compact section list so the page does not hide the other sections. */
    get sectionStrip(): string {
        return AGENT_CONSOLE_SETTINGS_SECTIONS
            .map(section => {
                const label = settingsCenterLabel(this.translator, section.labelKey, section.labelFallback);
                return section.id === this.state.settingsCenterSection ? `[${label}]` : label;
            })
            .join(' · ');
    }

    get query(): string { return this.state.settingsCenterQuery ? `/${this.state.settingsCenterQuery}` : ''; }
    get rows(): AgentConsoleSettingsRow[] { return this.state.settingsCenterRows || []; }
    get emptyLabel(): string {
        return formatAgentUiLabel(this.translator, 'agent.menu.settings.emptyResults', 'No matching settings');
    }

    get windowMeta(): string {
        const rows = this.rows;
        if (!rows.length) {
            return this.state.settingsCenterMeta;
        }
        const size = Math.max(4, Number(this.state.consoleOptions?.settingsCenterVisibleRows) || 12);
        const start = Math.max(0, Math.min(rows.length - size, this.state.settingsCenterIndex - Math.floor(size / 2)));
        const end = Math.min(rows.length, start + size);
        return `${this.state.settingsCenterMeta} · ${start + 1}-${end}/${rows.length}`;
    }

    get visibleRows(): AgentConsoleSettingsRow[] {
        const rows = this.rows;
        const size = Math.max(4, Number(this.state.consoleOptions?.settingsCenterVisibleRows) || 12);
        if (rows.length <= size) {
            return rows;
        }
        const start = Math.max(0, Math.min(rows.length - size, this.state.settingsCenterIndex - Math.floor(size / 2)));
        return rows.slice(start, start + size);
    }

    get selectedDescription(): string {
        return this.rows[this.state.settingsCenterIndex]?.description || '';
    }

    pick(id: string): void {
        void this.state.settingsCenterPickAction?.(id);
    }

    close(): void {
        this.state.closeSettingsCenter();
    }
}
