import { Attribute, Component, ReactiveEffect, reactive } from '@tsdi/components';
import { formatCompactNumber } from '@tsdi/core';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel, formatAgentKeymapActionLabel, formatAgentPanelLabel as panelLabel, formatAgentPanelStatusLabel as panelStatusLabel } from './agent-ui.i18n';
import { formatAgentConsoleInputBadges } from './AgentConsoleInputBadges';
import { formatAgentMessageDetailSummary } from './AgentConsoleMessageDetailMeta';
import { formatScheduledTaskDetailLines } from './AgentConsoleScheduledTaskFormat';
import { formatSessionAge, formatSessionHint } from './AgentConsoleFormatters';
import { formatReviewHeaderMeta, formatReviewSelectionMeta, formatReviewStatsMeta } from './AgentConsoleReviewPanelFormat';
import { resolveMessageRowOffset } from './AgentConsoleTranscriptLayout';
import { AgentMessage, basenameAgentPath, ScheduledAgentTask } from '@tsdi/agent';
import {
    AgentConsoleActivity,
    AgentConsoleHealthItem,
    AgentConsoleHealthStatus,
    AgentConsolePlanTodoItem,
    AgentConsoleReviewWorker,
    AgentConsoleReviewTaskItem,
    AgentConsoleSessionItem,
    AgentConsoleSelectMenu,
    AgentConsoleSessionState,
    AgentConsoleTokenUsage,
    AgentConsoleToolItem,
    AgentConsoleToolRun,
    AgentConsoleCommandOutputEntry
} from './AgentConsoleSessionState';
import { isAgentConsoleSuggestionMenu } from './AgentConsoleSuggestions';
import { formatToolPanelInactiveSuffix, formatToolPanelLastRun, formatToolPanelStatus, formatToolPanelTitle } from './AgentConsoleToolPanelText';
import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownTone,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import {
    AgentConsoleRenderedLine,
    AgentConsoleRenderedMessageItem,
    renderAgentConsoleMessageItems,
    AgentConsoleMessageRendererRegistry,
    resolveAgentConsoleMarkdownToneStyle
} from './AgentConsoleMessageRenderers';
import { AgentConsoleMessageOutletDirective } from './AgentConsoleMessageOutlet';
import {
    AgentConsoleTheme,
    AgentConsoleThemeStyles,
    defaultAgentConsoleTheme,
    styleTextToObject
} from './AgentConsoleTheme';
import { DIALOG_CLOSE_STYLE, menuShellStyle, resolvePanelThemeStyles, resolveSectionFrameStyle } from './AgentConsolePanelStyles';
import { AgentConsoleStatuslineField } from './AgentConsoleStatusline';
import { DEFAULT_TIMELINE_LABELS, resolveTimelineWindowLedger, TimelineWindowMode } from './AgentConsoleTimelineWindow';
import {
    buildCommonBrandBlock as buildTerminalBrandBlock,
    DialogComponent,
    DetailPanelComponent,
    InputFieldComponent,
    ListPanelComponent,
    MessageRowComponent,
    SelectComponent,
    resolveCommonEnterAction as resolveConsoleEnterAction,
    resolveCommonListWindow as resolveConsoleListWindow,
    resolveCommonSelectWindow as resolveConsoleSelectWindow
} from '@tsdi/components/common';
export * from './AgentConsoleMessagePanels';
@Component({
    selector: 'agent-console-activity-panel',
    template: `
    <div class="console-panel console-activity-panel" [style]="shellStyle">
        <label class="activity-item" v-for="item in activityItems">
            <span [style]="item.kindStyle">{{item.kind}}</span>
            <span [style]="item.messageStyle">{{item.message}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleActivityPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get activities(): AgentConsoleActivity[] {
        return this.state.visibleActivities;
    }

    get shellStyle() {
        return this.shouldShow ? styleTextToObject(this.activeTheme.activityShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.activityTitle);
    }

    get activityItems(): Array<{ kind: string; message: string; kindStyle: Record<string, string>; messageStyle: Record<string, string> }> {
        if (!this.shouldShow) {
            return [];
        }
        const compact = this.activities.reduce<Array<AgentConsoleActivity & { repeatCount: number }>>((items, activity) => {
            const previous = items[items.length - 1];
            if (previous?.kind === activity.kind && this.normalizedMessage(previous.message) === this.normalizedMessage(activity.message)) {
                previous.repeatCount += 1;
                previous.createdAt = activity.createdAt;
                return items;
            }
            items.push({ ...activity, repeatCount: 1 });
            return items;
        }, []);
        return compact.slice(-this.state.consoleOptions.activityVisibleItems).map(activity => ({
            kind: `${this.activityKindLabel(activity.kind)} `,
            message: `${this.summarize(activity.message)}${activity.repeatCount > 1 ? ` ×${activity.repeatCount}` : ''}`,
            kindStyle: this.activityKindStyle(activity.kind),
            messageStyle: this.activityMessageStyle(activity.kind)
        }));
    }

    protected activityKindStyle(kind: AgentConsoleActivity['kind']): Record<string, string> {
        if (kind === 'error') {
            return styleTextToObject(this.activeTheme.statusErrorLabel);
        }
        if (kind === 'rollback') {
            return styleTextToObject(this.activeTheme.statusNoticeLabel);
        }
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    protected activityMessageStyle(kind: AgentConsoleActivity['kind']): Record<string, string> {
        if (kind === 'error') {
            return styleTextToObject(this.activeTheme.statusErrorValue);
        }
        if (kind === 'model') {
            return styleTextToObject(this.activeTheme.statusLabel);
        }
        return styleTextToObject(this.activeTheme.statusValue);
    }

    protected activityKindLabel(kind: string): string {
        switch (kind) {
            case 'tool': return '›';
            case 'model': return '·';
            case 'error': return 'error:';
            case 'rollback': return '<';
            default: return '·';
        }
    }

    get shouldShow(): boolean {
        return this.activities.length > 0;
    }

    get activityLabels(): string[] {
        return this.activityItems.map(item => `${item.kind}${item.message}`);
    }

    get activitiesSummary(): string {
        return this.activityLabels.join(' | ');
    }

    activityAt(index: number): { kind: string; message: string; kindStyle: Record<string, string>; messageStyle: Record<string, string> } | undefined {
        return this.activityItems[index];
    }

    activityKindAt(index: number): string {
        return this.activityAt(index)?.kind || '';
    }

    activityMessageAt(index: number): string {
        return this.activityAt(index)?.message || '';
    }

    activityKindStyleAt(index: number): Record<string, string> {
        return this.activityAt(index)?.kindStyle || {};
    }

    activityMessageStyleAt(index: number): Record<string, string> {
        return this.activityAt(index)?.messageStyle || {};
    }

    protected summarize(value: string): string {
        const text = this.normalizedMessage(value);
        return text.length > this.state.consoleOptions.summaryMaxLength
            ? `${text.slice(0, Math.max(1, this.state.consoleOptions.summaryMaxLength - 1)).trimEnd()}…`
            : text;
    }

    protected normalizedMessage(value: string): string {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }
}

@Component({
    selector: 'agent-console-select-panel',
    imports: [SelectComponent],
    template: `
        <common-select
            :options="menuOptions"
            :selectedIndex="menuSelectedIndex"
            :visibleCount="visibleOptionCount"
            :title="menuTitleText"
            :hint="menuHintText"
            :meta="menuMetaText"
            :detailLines="menuDetailLines"
            :accessibilityLabel="accessibilityLabel"
            @selectAction="selectOption"
            @closeAction="closeMenu"
            @keydownAction="onKeydown"></common-select>
    `
})
export class AgentConsoleSelectPanelComponent {
    constructor(
        private state: AgentConsoleSessionState
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() selectAction?: (value: string) => Promise<void>;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get menu(): AgentConsoleSelectMenu | undefined {
        return this.state.selectMenu;
    }

    // Blocking menus show their question/title and key hint; inline
    // suggestions keep the composer clean.
    get menuTitleText(): string { const menu = this.menu; return !menu || isAgentConsoleSuggestionMenu(menu) ? '' : (menu.title || ''); }

    get menuHintText(): string { const menu = this.menu; return !menu || isAgentConsoleSuggestionMenu(menu) ? '' : (menu.hint || ''); }

    get menuMetaText(): string { const menu = this.menu; if (!menu || isAgentConsoleSuggestionMenu(menu)) return ''; const window = resolveConsoleSelectWindow(menu.options.length, menu.selectedIndex, this.visibleOptionCount); return window.count < menu.options.length ? `${window.start + 1}-${window.start + window.count}/${menu.options.length}` : ''; }

    closeMenu = async (): Promise<void> => { await this.state.cancelSelectMenu(); };

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
        return this.state.consoleOptions.selectVisibleOptions;
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

    selectOption = async (value: string): Promise<void> => {
        await (this.selectAction || this.state.confirmSelectMenu.bind(this.state))(value);
    };

    onKeydown = async (event: KeyboardEvent): Promise<void> => {
        if (!this.menu) {
            return;
        }
        if (this.state.focusLayers.handleSelectKey(event.key)) {
            event.preventDefault?.();
        }
    };
}

@Component({
    selector: 'agent-console-which-key-panel',
    template: `
    <div class="console-panel console-which-key-panel" [style]="shellStyle">
        <label class="which-key-title" [style]="titleStyle">{{titleText}}</label>
        <template v-if="isGrouped">
            <template v-for="group in groupedBindings">
                <label class="which-key-group-header" [style]="groupHeaderStyle">{{group.label}}</label>
                <label class="which-key-row" [style]="rowStyle" v-for="binding in group.items">
                    <span [style]="keyStyle">{{binding.key}}</span>
                    <span [style]="actionStyle"> {{binding.label || binding.action}}</span>
                </label>
            </template>
        </template>
        <template v-else>
            <label class="which-key-row" [style]="rowStyle" v-for="binding in bindings">
                <span [style]="keyStyle">{{binding.key}}</span>
                <span [style]="actionStyle"> {{binding.label || binding.action}}</span>
            </label>
        </template>
        <label class="which-key-hint" [style]="hintStyle">{{hintText}}</label>
    </div>
    `
})
export class AgentConsoleWhichKeyPanelComponent {
    private static readonly ACTION_GROUPS: Record<string, string> = {
        'new-session': 'Session', 'compact': 'Session', 'export': 'Session', 'undo': 'Session', 'redo': 'Session', 'sessions': 'Session', 'fork': 'Session', 'archive': 'Session',
        'theme': 'Display', 'timeline-mode': 'Display', 'toggle-thinking': 'Display', 'status': 'Display',
        'model': 'Model', 'archetypes': 'Model', 'model-favorite-toggle': 'Model', 'model-cycle-recent': 'Model', 'model-cycle-recent-back': 'Model', 'model-variant-cycle': 'Model',
        'thread-child-first': 'Thread', 'thread-cycle-next': 'Thread', 'thread-cycle-prev': 'Thread', 'thread-parent': 'Thread',
        'message-page-up': 'Navigate', 'message-page-down': 'Navigate', 'message-half-page-up': 'Navigate', 'message-half-page-down': 'Navigate', 'message-line-up': 'Navigate', 'message-line-down': 'Navigate', 'message-first': 'Navigate', 'message-last': 'Navigate', 'message-last-user': 'Navigate',
        'copy': 'Edit', 'copy-draft': 'Edit', 'open-editor': 'Edit', 'stash-draft': 'Edit',
        'command-palette': 'UI', 'which-key-toggle': 'UI', 'which-key-layout-toggle': 'UI', 'which-key-pending-toggle': 'UI', 'status-health': 'UI', 'interrupt-turn': 'Control'
    };

    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
    }

    get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || defaultAgentConsoleTheme;
    }

    get bindings(): Array<{ key: string; action: string; label: string }> {
        return this.state.whichKeyBindings.map(binding => ({ ...binding, label: formatAgentKeymapActionLabel(this.translator, binding.action) }));
    }

    get bindingCount(): string {
        return String(this.bindings.length);
    }

    get isGrouped(): boolean {
        return this.state.whichKeyLayout === 'grouped';
    }

    get groupedBindings(): Array<{ label: string; items: Array<{ key: string; action: string; label: string }> }> {
        const groups = new Map<string, Array<{ key: string; action: string; label: string }>>();
        for (const b of this.bindings) {
            const label = AgentConsoleWhichKeyPanelComponent.ACTION_GROUPS[b.action] || 'Other';
            let arr = groups.get(label);
            if (!arr) { arr = []; groups.set(label, arr); }
            arr.push(b);
        }
        return Array.from(groups.entries()).map(([label, items]) => ({ label: panelLabel(this.translator, 'keymap', `group${label}`, label), items }));
    }

    get titleText(): string {
        const total = this.bindingCount;
        const page = this.state.whichKeyPage;
        const layout = this.state.whichKeyLayout;
        const filter = this.state.whichKeyFilterCustom ? panelLabel(this.translator, 'keymap', 'custom', ' [custom]') : '';
        const pageStr = page > 0 ? panelLabel(this.translator, 'keymap', 'page', ' p{page}', { page: page + 1 }) : '';
        const layoutIcon = layout === 'grouped' ? panelLabel(this.translator, 'keymap', 'layoutGrouped', ' grouped') : '';
        return panelLabel(this.translator, 'keymap', 'title', 'Keymap ({total}){layout}{custom}{page}', { total, layout: layoutIcon, custom: filter, page: pageStr });
    }

    get hintText(): string {
        const hints = [panelLabel(this.translator, 'keymap', 'close', 'Esc close')];
        if (this.state.whichKeyPage > 0) hints.push(panelLabel(this.translator, 'keymap', 'previous', 'p prev'));
        hints.push(panelLabel(this.translator, 'keymap', 'next', 'n next'));
        hints.push(panelLabel(this.translator, 'keymap', 'layout', 'L layout'));
        hints.push(panelLabel(this.translator, 'keymap', 'filter', 'F filter'));
        return hints.join(' · ');
    }

    get groupHeaderStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get shellStyle() {
        return styleTextToObject(this.activeTheme.selectShell);
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get rowStyle() {
        return styleTextToObject(this.activeTheme.selectOption);
    }

    get keyStyle() {
        return styleTextToObject(this.activeTheme.selectOptionActive);
    }

    get actionStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }
}

@Component({
    selector: 'agent-console-health-popover',
    template: `
    <div class="console-panel console-health-popover" [style]="shellStyle">
        <label class="health-title" [style]="titleStyle">{{titleText}}</label>
        <label class="health-row" [style]="rowStyle" v-for="item in items">
            <span [style]="statusStyle(item.status)">{{statusLabel(item.status)}}</span>
            <span [style]="labelStyle"> {{item.label}}</span>
            <span [style]="detailStyle"> {{item.detail}}</span>
        </label>
        <label class="health-hint" [style]="hintStyle">{{hintText}}</label>
    </div>
    `
})
export class AgentConsoleHealthPopoverComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
    }

    get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || defaultAgentConsoleTheme;
    }

    get items(): AgentConsoleHealthItem[] {
        return this.state.healthItems;
    }

    get titleText(): string {
        return panelLabel(this.translator, 'health', 'title', 'Health ({count})', { count: this.items.length });
    }

    get hintText(): string {
        return panelLabel(this.translator, 'health', 'hint', 'Ctrl+X H to toggle · hover to refresh');
    }

    statusLabel(status: AgentConsoleHealthStatus): string {
        const key = status === 'ok' ? 'statusOk' : status === 'warn' ? 'statusWarn' : status === 'error' ? 'statusError' : 'statusUnknown';
        return panelLabel(this.translator, 'health', key, status);
    }

    statusStyle(status: AgentConsoleHealthStatus) {
        const style = status === 'ok'
            ? this.activeTheme.statusIdleValue
            : status === 'warn'
                ? this.activeTheme.statusNoticeValue
                : status === 'error'
                    ? this.activeTheme.statusErrorValue
                    : this.activeTheme.statusValue;
        return styleTextToObject(style);
    }

    get shellStyle() {
        return styleTextToObject(this.activeTheme.selectShell);
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get rowStyle() {
        return styleTextToObject(this.activeTheme.selectOption);
    }

    get labelStyle() {
        return styleTextToObject(this.activeTheme.selectOptionActive);
    }

    get detailStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }
}
