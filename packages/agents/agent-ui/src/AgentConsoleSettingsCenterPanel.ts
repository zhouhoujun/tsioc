import { Component } from '@tsdi/components';
import { getDisplayWidth } from '@tsdi/components/common';
import { BadgeModule } from '@tsdi/components/common/badge';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel } from './agent-ui.i18n';
import { AGENT_CONSOLE_SETTINGS_SECTIONS, settingsCenterLabel } from './AgentConsoleSettingsSchema';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { resolveAgentConsoleStripWindow } from './AgentConsoleStripWindow';
import type { AgentConsoleSettingsRow } from './AgentConsoleSettingsCenter';

interface AgentConsoleSettingsSectionEntry {
    id: string;
    label: string;
    active: boolean;
    last: boolean;
    /** Display width including the trailing separator. */
    width: number;
}

/**
 * Settings center panel: section header, search line, rows with value/scope/
 * effect badges and a key hint. Rendered by both the terminal and the HTML
 * renderer; the host owns navigation and applies the selected row.
 */
@Component({
    selector: 'agent-console-settings-center-panel',
    imports: [BadgeModule],
    template: `
    <div class="console-panel dialog-panel dialog-w-96 settings-center-panel" role="dialog" aria-label="{{title}}">
        <label class="dialog-close" data-cell-width="2" data-hover="fade" @click="close">✕</label>
        <label class="dialog-title settings-title">{{title}}</label>
        <label class="settings-meta">{{windowMeta}}</label>
        <label class="settings-sections">
            <span class="settings-section-scroll settings-section-scroll-back" role="button" v-show="sectionArrowsVisible" aria-label="{{sectionScrollBackTitle}}" aria-disabled="{{sectionScrollBackDisabled}}" data-disabled="{{sectionScrollBackDisabled}}" data-hover="fade" @click="scrollSectionsBack">‹</span>
            <span class="settings-section" v-for="entry in sectionEntries" data-hover="fade" aria-selected="{{entry.active}}" @click="pickSection(entry.id)">{{entry.active ? '[' + entry.label + ']' : entry.label}}<span class="settings-section-sep" v-if="!entry.last"> · </span></span>
            <span class="settings-section-scroll settings-section-scroll-forward" role="button" v-show="sectionArrowsVisible" aria-label="{{sectionScrollForwardTitle}}" aria-disabled="{{sectionScrollForwardDisabled}}" data-disabled="{{sectionScrollForwardDisabled}}" data-hover="fade" @click="scrollSectionsForward">›</span>
        </label>
        <label class="settings-query" v-if="query">{{query}}</label>
        <div class="settings-rows">
            <label class="settings-row" v-for="row in visibleRows" data-hover="fade" aria-selected="{{row.selected}}" @click="pick(row.id)">
                <span class="settings-label">{{row.label}}</span>
                <span class="settings-value" v-if="row.value">: {{row.value}}</span>
                <span class="settings-scope-sep" v-if="row.value"> · </span>
                <ui-badge class="settings-scope" :label="row.scope" tone="muted" variant="outline"></ui-badge>
                <span class="settings-effect" v-if="row.effect"> · {{row.effect}}</span>
            </label>
        </div>
        <label class="settings-empty" v-if="!rows.length">{{emptyLabel}}</label>
        <label class="settings-detail" v-if="selectedDescription">{{selectedDescription}}</label>
        <label class="dialog-hint settings-hint">{{hint}}</label>
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
    /** Clickable section strip so the page does not hide the other sections. */
    get sectionEntries(): Array<{ id: string; label: string; active: boolean; last: boolean }> {
        const entries = this.allSectionEntries();
        const window = this.sectionWindow;
        return entries.slice(window.start, window.end).map(({ id, label, active, last }) => ({ id, label, active, last }));
    }

    /** Overflow paging for the dialog section strip (terminal hosts have no scrollbars). */
    get sectionArrowsVisible(): boolean {
        return this.sectionOverflow;
    }

    get sectionScrollBackDisabled(): boolean {
        return !this.sectionWindow.canBack;
    }

    get sectionScrollForwardDisabled(): boolean {
        return !this.sectionWindow.canForward;
    }

    get sectionScrollBackTitle(): string {
        return formatAgentUiLabel(this.translator, 'agent.menu.settings.sectionScrollBack', 'Scroll sections left');
    }

    get sectionScrollForwardTitle(): string {
        return formatAgentUiLabel(this.translator, 'agent.menu.settings.sectionScrollForward', 'Scroll sections right');
    }

    scrollSectionsBack(): void {
        this.scrollSections(-1);
    }

    scrollSectionsForward(): void {
        this.scrollSections(1);
    }

    protected scrollSections(delta: number): void {
        const window = this.sectionWindow;
        if (delta < 0 && !window.canBack) {
            return;
        }
        if (delta > 0 && !window.canForward) {
            return;
        }
        this.state.settingsCenterSectionStart = delta > 0 ? window.end : window.backStart;
    }

    protected allSectionEntries(): AgentConsoleSettingsSectionEntry[] {
        const total = AGENT_CONSOLE_SETTINGS_SECTIONS.length;
        return AGENT_CONSOLE_SETTINGS_SECTIONS.map((section, index) => {
            const label = settingsCenterLabel(this.translator, section.labelKey, section.labelFallback);
            const active = section.id === this.state.settingsCenterSection;
            const last = index === total - 1;
            // `[label]` marks the active section; the ` · ` separator sits
            // inside the preceding entry's cells.
            const text = active ? `[${label}]` : label;
            return {
                id: section.id,
                label,
                active,
                last,
                width: getDisplayWidth(text) + (last ? 0 : 3)
            };
        });
    }

    /**
     * Terminal dialogs are fixed-width and have no scrollbar, so the section
     * strip pages left/right with arrows when its labels do not fit. Browser
     * hosts report no terminal columns and let the strip wrap.
     */
    protected get sectionWindow(): { start: number; end: number; canBack: boolean; canForward: boolean; backStart: number } {
        const entries = this.allSectionEntries();
        const all = { start: 0, end: entries.length, canBack: false, canForward: false, backStart: 0 };
        const columns = Math.floor(Number(this.state.tabStripColumns) || 0);
        if (columns <= 0 || !entries.length) {
            return all;
        }
        if (!this.sectionOverflow) {
            return all;
        }
        // Reserve one cell for each arrow so paging never shifts the labels.
        const budget = Math.max(8, this.sectionStripBudget - 2);
        const active = Math.max(0, entries.findIndex(entry => entry.active));
        return resolveAgentConsoleStripWindow({
            count: entries.length,
            widthOf: index => entries[index].width,
            active,
            budget,
            start: this.state.settingsCenterSectionStart
        });
    }

    protected get sectionOverflow(): boolean {
        const columns = Math.floor(Number(this.state.tabStripColumns) || 0);
        if (columns <= 0) {
            return false;
        }
        const total = this.allSectionEntries().reduce((sum, entry) => sum + entry.width, 0);
        return total > this.sectionStripBudget;
    }

    /** Dialog content width for the section labels (frame is capped at 96 columns). */
    protected get sectionStripBudget(): number {
        const columns = Math.floor(Number(this.state.tabStripColumns) || 0);
        if (columns <= 0) {
            return Number.MAX_SAFE_INTEGER;
        }
        return Math.max(18, Math.min(columns, 96) - 8);
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

    pickSection(id: string): void {
        void this.state.settingsCenterSectionPickAction?.(id as any);
    }

    pick(id: string): void {
        void this.state.settingsCenterPickAction?.(id);
    }

    close(): void {
        this.state.closeSettingsCenter();
    }
}
