import { Attribute, Component, ReactiveEffect, reactive } from '@tsdi/components';
import { DialogComponent } from '@tsdi/components/common/dialog';
import { formatCompactNumber } from '@tsdi/core';
import {
    KeymapPanelComponent,
} from '@tsdi/components/common/keymap';
import {
    StatusListComponent,
} from '@tsdi/components/common/status-list';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel, formatAgentKeymapActionLabel, formatAgentPanelLabel as panelLabel, formatAgentPanelStatusLabel as panelStatusLabel } from './agent-ui.i18n';
import { formatAgentConsoleInputBadges } from './AgentConsoleInputBadges';
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
    buildBrandBlock as buildTerminalBrandBlock,
    resolveEnterAction as resolveConsoleEnterAction,
    resolveListWindow as resolveConsoleListWindow,
    resolveSelectWindow as resolveConsoleSelectWindow,
} from '@tsdi/components/common';
import {
    PanelComponent,
} from '@tsdi/components/common/panel';
import {
    ListComponent,
} from '@tsdi/components/common/list';
import { InputFieldComponent } from './AgentConsoleInputField';
import { MessageRowComponent } from './AgentConsoleMessageRow';

export * from './AgentConsoleMessagePanels';
export { AgentConsoleSelectPanelComponent } from './AgentConsoleSelectPanel';

@Component({
    selector: 'agent-console-activity-panel',
    template: `
    <div class="console-panel console-activity-panel">
        <label class="activity-item" data-kind="{{item.kindKey}}" v-for="item in activityItems">
            <span class="activity-kind">{{item.kind}}</span>
            <span class="activity-message">{{item.message}}</span>
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

    get activityItems(): Array<{ kind: string; message: string; kindKey: string; kindStyle: Record<string, string>; messageStyle: Record<string, string> }> {
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
            kindKey: activity.kind,
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

    activityAt(index: number): { kind: string; message: string; kindKey: string; kindStyle: Record<string, string>; messageStyle: Record<string, string> } | undefined {
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
    selector: 'agent-console-command-dialog-panel',
    imports: [DialogComponent],
    template: `
    <dialog-panel
        :title="dialogTitle"
        :lines="dialogView.lines"
        :lineActions="dialogView.actions"
        :lineOptionIndexes="dialogView.indexes"
        :hint="dialogHint"
        :ariaLabel="accessibilityLabel"
        :fullWidth="true"
        :maxHeight="'60vh'"
        @closeAction="closeMenu"></dialog-panel>
    `
})
export class AgentConsoleCommandDialogPanelComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
    }

    get menu(): AgentConsoleSelectMenu | undefined {
        return this.state.selectMenu;
    }

    get visibleOptionCount(): number {
        const configured = Number(this.state.consoleOptions.selectVisibleOptions) || 12;
        const maxRows = Number(this.state.maxOverlayVisibleLines) || 0;
        return maxRows > 0 ? Math.max(3, Math.min(configured, maxRows)) : configured;
    }

    get dialogTitle(): string {
        const menu = this.menu;
        return menu ? `${menu.title || ''}${menu.filter ? ` · ${menu.filter}` : ''}` : '';
    }

    get dialogLines(): string[] {
        return this.dialogView.lines;
    }

    get dialogView(): { lines: string[]; actions: Array<(() => void) | undefined>; indexes: Array<number | undefined> } {
        const menu = this.menu;
        if (!menu) {
            return { lines: [], actions: [], indexes: [] };
        }
        const lines: string[] = [];
        const actions: Array<(() => void) | undefined> = [];
        const indexes: Array<number | undefined> = [];
        const push = (line: string, action?: () => void, index?: number): void => {
            lines.push(line);
            actions.push(action);
            indexes.push(index);
        };
        const window = resolveConsoleSelectWindow(menu.options.length, menu.selectedIndex, this.visibleOptionCount);
        if (window.count < menu.options.length) {
            push(`${window.start + 1}-${window.start + window.count}/${menu.options.length}`);
        }
        if (!menu.options.length) {
            if (menu.filter) {
                // An empty dialog body looks broken; say the filter missed.
                push(panelLabel(this.translator, 'select', 'emptyFilter', 'No matches for "{filter}"', { filter: menu.filter }));
            }
            return { lines, actions, indexes };
        }
        let previousGroup = '';
        menu.options.slice(window.start, window.start + window.count).forEach((option, offset) => {
            const index = window.start + offset;
            const group = String(option.group || '');
            if (group && group !== previousGroup) {
                // Non-selectable recency header (opencode-style session groups).
                // It carries no action/index, so arrows and Enter skip it.
                push(`─ ${group} ─`);
            }
            previousGroup = group;
            const description = option.description ? `  ${option.description}` : '';
            push(
                `${index === menu.selectedIndex ? '›' : ' '} ${index + 1}. ${option.label}${description}`,
                () => { void this.selectOptionAt(index); },
                index
            );
        });
        const detail = this.state.selectedSelectMenuOption?.detail;
        if (typeof detail === 'string') {
            detail.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 6)
                .forEach(line => push(line));
        }
        return { lines, actions, indexes };
    }

    async selectOptionAt(index: number): Promise<void> {
        const option = this.menu?.options[index];
        if (!option) {
            return;
        }
        await this.state.confirmSelectMenu(option.value);
    }

    get dialogHint(): string {
        return this.menu?.hint || '';
    }

    get accessibilityLabel(): string {
        const menu = this.menu;
        if (!menu) {
            return 'Dialog';
        }
        return `${menu.title || 'Dialog'}. ${menu.options.length} options. Selected ${menu.selectedIndex + 1} of ${menu.options.length}.`;
    }

    async closeMenu(): Promise<void> {
        await this.state.cancelSelectMenu();
    }
}

@Component({
    selector: 'agent-console-which-key-panel',
    imports: [KeymapPanelComponent],
    template: `
    <keymap-panel
        :title="titleText"
        :hint="hintText"
        :grouped="isGrouped"
        :items="bindings"
        :groups="groupedBindings"></keymap-panel>
    `
})
export class AgentConsoleWhichKeyPanelComponent {
    private static readonly ACTION_GROUPS: Record<string, string> = {
        'new-session': 'Session', 'compact': 'Session', 'export': 'Session', 'undo': 'Session', 'redo': 'Session', 'sessions': 'Session', 'fork': 'Session', 'archive': 'Session',
        'theme': 'Display', 'timeline-mode': 'Display', 'toggle-thinking': 'Display', 'status': 'Display',
        'model': 'Model', 'archetypes': 'Model', 'model-favorite-toggle': 'Model', 'model-cycle-recent': 'Model', 'model-cycle-recent-back': 'Model', 'model-variant-cycle': 'Model',
        'thread-child-first': 'Thread', 'thread-cycle-next': 'Thread', 'thread-cycle-prev': 'Thread', 'thread-parent': 'Thread',
        'message-page-up': 'Navigate', 'message-page-down': 'Navigate', 'message-half-page-up': 'Navigate', 'message-half-page-down': 'Navigate', 'message-line-up': 'Navigate', 'message-line-down': 'Navigate', 'message-first': 'Navigate', 'message-last': 'Navigate', 'message-last-user': 'Navigate', 'message-prev-user': 'Navigate', 'message-next-user': 'Navigate',
        'copy': 'Edit', 'copy-draft': 'Edit', 'open-editor': 'Edit', 'stash-draft': 'Edit',
        'command-palette': 'UI', 'which-key-toggle': 'UI', 'which-key-layout-toggle': 'UI', 'which-key-pending-toggle': 'UI', 'status-health': 'UI', 'interrupt-turn': 'Control', 'queue-priority': 'Control'
    };

    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
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
}

@Component({
    selector: 'agent-console-health-popover',
    imports: [StatusListComponent],
    template: `
    <status-list :title="titleText" :hint="hintText" :items="statusItems"></status-list>
    `
})
export class AgentConsoleHealthPopoverComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
    }

    get items(): AgentConsoleHealthItem[] {
        return this.state.healthItems;
    }

    get statusItems(): Array<{ id: string; label: string; status: string; statusLabel: string; detail?: string }> {
        return this.items.map(item => ({
            id: item.id,
            label: item.label,
            status: item.status,
            statusLabel: this.statusLabel(item.status),
            detail: item.detail
        }));
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
}
