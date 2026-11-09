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
import { buildAgentConsoleBrandBlock, type AgentConsoleBrandLine } from './AgentConsoleBrand';
import { AgentConsoleStatuslineField } from './AgentConsoleStatusline';
import { DEFAULT_TIMELINE_LABELS, resolveTimelineWindowLedger, TimelineWindowMode } from './AgentConsoleTimelineWindow';
import {
    DialogComponent,
    DetailPanelComponent,
    InputFieldComponent,
    ListPanelComponent,
    MessageRowComponent,
    SelectComponent,
    resolveEnterAction as resolveConsoleEnterAction,
    resolveListWindow as resolveConsoleListWindow,
    resolveSelectWindow as resolveConsoleSelectWindow
} from '@tsdi/components/common';
export * from './AgentConsoleMessagePanels';
export * from './AgentConsoleOverlayPanels';
export * from './AgentConsoleTaskPanels';
export * from './AgentConsoleResourcePanels';
export * from './AgentConsoleInputPanel';
export * from './AgentConsoleWorkingPanel';
@Component({
    selector: 'agent-console-brand-panel',
    template: `
    <div class="console-panel console-brand-panel">
        <label class="brand-line" data-role="{{line.role}}" v-for="line in brandLines">{{line.text}}</label>
    </div>
    `
})
export class AgentConsoleBrandPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }
    get brandLines(): AgentConsoleBrandLine[] {
        const width = Number(this.state.tabStripColumns) || Number(this.state.markdownContentWidth)
            || Number(this.state.consoleOptions.brandWidth) || 80;
        return buildAgentConsoleBrandBlock(width, this.state.title, this.state.model, this.state.workspace);
    }
}

@Component({
    selector: 'agent-console-status-panel',
    template: `
    <div class="console-panel console-status-panel" data-tone="{{statusTone}}" @mouseenter="onHoverEnter()" @mouseleave="onHoverLeave()">
        <label class="status-line" v-for="line in statusLines">{{line}}</label>
    </div>
    `
})
export class AgentConsoleStatusPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    onHoverEnter(): void {
        void this.state?.toggleHealthPopoverAction?.();
    }

    onHoverLeave(): void {
        this.state?.setHealthPopoverVisible(false);
    }

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get status(): string {
        return this.state.status;
    }

    get provider(): string {
        return this.state.provider;
    }

    get model(): string {
        return this.state.model;
    }

    get workspace(): string {
        return this.state.workspace;
    }

    // A text overlay repeats this text; keep the footer quiet while it is open.
    get notice(): string { return this.state.textOverlay || this.state.toasts?.length ? '' : this.state.notice; }

    get noticeLine(): string {
        return this.notice ? `note ${this.notice}` : '';
    }

    get statusSummary(): string {
        const lines: string[] = [];
        if (this.notice) {
            lines.push(this.notice);
        }
        if (this.state.contextPreparationSummary) {
            lines.push(this.state.contextPreparationSummary);
        }
        if (this.state.pendingApprovals.length) {
            const requests = this.state.pendingApprovals;
            const first = requests[0];
            const extra = requests.length > 1 ? ` (+${requests.length - 1})` : '';
            lines.push(formatAgentUiLabel(this.translator, 'agent.status.approvalRequired', `Approval required: ${first.toolName} (${first.id.slice(0, 8)})${extra}`, { tool: first.toolName, id: first.id.slice(0, 8), extra }));
        }
        return lines.join('\n');
    }

    get workspaceSummary(): string {
        return this.workspace || this.state.consoleOptions.emptyValueLabel;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.statusShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.statusTitle;
    }

    get valueStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get runningToolsLabel(): string {
        return this.state.runningTools.length ? this.state.runningTools.join(', ') : this.state.consoleOptions.noneValueLabel;
    }

    get lastErrorLabel(): string {
        return this.state.lastError || this.state.consoleOptions.noneValueLabel;
    }

    get statusTone(): 'error' | 'notice' | 'busy' | 'idle' {
        if (this.state.lastError) return 'error';
        if (this.notice) return 'notice';
        return this.state.status === 'running' || this.state.status === 'reasoning' ? 'busy' : 'idle';
    }

    get statusLines(): string[] {
        if (!this.shouldShow) {
            return [];
        }
        const lines: string[] = [];
        if (this.state.consoleOptions.showStatusline) {
            for (const field of this.state.statusline) {
                const line = this.statuslineFieldLine(field);
                if (line) {
                    lines.push(line);
                }
            }
        }
        lines.push(
            ...String(this.statusSummary || '')
                .split('\n')
                .map(line => line.trimEnd())
                .filter(Boolean)
        );
        return lines.slice(0, this.state.consoleOptions.statusVisibleLines);
    }

    protected statuslineFieldLine(field: AgentConsoleStatuslineField): string {
        switch (field) {
            case 'model': {
                const model = this.model || this.state.consoleOptions.noneValueLabel;
                return this.provider ? `model: ${this.provider}/${model}` : `model: ${model}`;
            }
            case 'context':
                return this.state.contextPreparationSummary ? `context: ${this.state.contextPreparationSummary}` : '';
            case 'git-branch':
                return this.state.gitBranch ? `git-branch: ${this.state.gitBranch}` : '';
            case 'tokens':
                return `tokens: ${formatCompactNumber(this.state.tokenUsage.totalTokens)}`;
            case 'session':
                return `session: ${this.state.sessionId}`;
            case 'workspace':
                return `workspace: ${this.workspace || this.state.consoleOptions.noneValueLabel}`;
            case 'agent':
                return this.state.title ? `agent: ${this.state.title}` : '';
            default:
                return '';
        }
    }

    get shouldShow(): boolean {
        return !!this.state.statusline.length || !!this.notice || !!this.state.pendingApprovals.length;
    }

    statusLineAt(index: number): string {
        return this.statusLines[index] || '';
    }

    get runningStyle() {
        return this.state.runningTools.length ? this.activeThemeStyles.statusBusyValue : this.activeThemeStyles.statusIdleValue;
    }

    get errorStyle() {
        return this.state.lastError ? this.activeThemeStyles.statusErrorValue : this.activeThemeStyles.statusLabel;
    }

    get noticeStyle() {
        return this.activeThemeStyles.statusNoticeValue;
    }

}

@Component({
    selector: 'agent-console-tool-runs-panel',
    imports: [ListPanelComponent],
    template: `
    <list-panel :header="toolRunsSummaryLabel" :hint="toolRunsHintLabel" :items="toolRunItems" :detailLines="selectedToolRunDetailLines" :showClose="false"></list-panel>
    `
})
export class AgentConsoleToolRunsPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get toolRuns(): AgentConsoleToolRun[] {
        return this.state.toolRuns;
    }

    get highlightedToolRun(): AgentConsoleToolRun | undefined {
        return this.state.highlightedToolRun;
    }

    get selectedToolRun(): AgentConsoleToolRun | undefined {
        return this.state.selectedToolRun;
    }

    get shellStyle() {
        return this.toolRuns.length ? this.activeThemeStyles.toolRunsShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.toolRunsTitle;
    }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get visibleToolRunStart(): number {
        const start = resolveConsoleListWindow(
            this.toolRuns.length,
            this.state.selectedToolRunIndex,
            this.state.consoleOptions.toolRunsVisibleItems
        ).start;
        return start;
    }

    get visibleToolRuns(): AgentConsoleToolRun[] {
        return this.toolRuns.slice(
            this.visibleToolRunStart,
            this.visibleToolRunStart + this.state.consoleOptions.toolRunsVisibleItems
        );
    }

    get toolRunItems(): Array<{ id: string; label: string; style: Record<string, string>; selected: string }> {
        if (!this.toolRuns.length) {
            return [];
        }
        const start = this.visibleToolRunStart;
        return this.visibleToolRuns.map((run, offset) => {
            const index = start + offset;
            const selected = index === this.state.selectedToolRunIndex;
            const duration = run.durationMs == null ? '' : ` ${run.durationMs}ms`;
            const attempt = run.attemptCount && run.attemptCount > 1 ? ` #${run.attemptCount}` : '';
            return {
                id: `tool-run-${index}`,
                label: `${selected ? '›' : ' '} ${run.name} [${panelStatusLabel(this.translator, 'toolRuns', run.status)}]${duration}${attempt}`,
                style: selected
                    ? this.activeThemeStyles.sessionsSelected
                    : this.activeThemeStyles.statusValue,
                selected: String(selected)
            };
        });
    }

    get toolRunLabels(): string[] {
        return this.toolRunItems.map(item => item.label);
    }

    get toolRunListLabel(): string {
        if (!this.toolRuns.length) {
            return '';
        }
        return this.toolRunLabels.join('\n');
    }

    get toolRunsSummaryLabel(): string {
        if (!this.toolRuns.length) {
            return '';
        }
        const running = this.toolRuns.filter(run => run.status === 'running').length;
        const parts = [panelLabel(this.translator, 'toolRuns', 'summary', 'tool runs {total}', { total: this.toolRuns.length })];
        if (running) {
            parts.push(panelLabel(this.translator, 'toolRuns', 'running', 'running {count}', { count: running }));
        }
        const selected = this.selectedToolRun;
        if (selected) {
            const duration = selected.durationMs != null ? ` ${selected.durationMs}ms` : '';
            parts.push(`${selected.name} ${panelStatusLabel(this.translator, 'toolRuns', selected.status)}${duration}`);
        }
        return parts.join(' · ');
    }

    get toolRunsHintLabel(): string {
        return this.state.toolRunsFocused ? this.state.consoleOptions.toolRunsHint : '';
    }

    get selectedToolRunDetailLabel(): string {
        const selected = this.selectedToolRun;
        if (!selected) {
            return '';
        }
        const lines: string[] = [];
        const attempt = selected.attemptCount && selected.attemptCount > 1 ? ` ${panelLabel(this.translator, 'toolRuns', 'attempt', 'attempt #{count}', { count: selected.attemptCount })}` : '';
        const duration = selected.durationMs != null ? ` ${panelLabel(this.translator, 'toolRuns', 'duration', 'duration {ms}ms', { ms: selected.durationMs })}` : '';
        lines.push(`${selected.name} [${panelStatusLabel(this.translator, 'toolRuns', selected.status)}]${duration}${attempt}`);
        if (selected.executionMode) {
            lines.push(panelLabel(this.translator, 'toolRuns', 'mode', 'mode {mode}', { mode: selected.executionMode }));
        }
        if (selected.inputSummary) {
            lines.push(panelLabel(this.translator, 'toolRuns', 'input', 'in {text}', { text: this.summarize(selected.inputSummary) }));
        }
        if (selected.outputSummary) {
            lines.push(panelLabel(this.translator, 'toolRuns', 'output', 'out {text}', { text: this.summarize(selected.outputSummary) }));
        }
        if (selected.error) {
            lines.push(panelLabel(this.translator, 'toolRuns', 'error', 'error {text}', { text: this.summarize(selected.error) }));
        }
        return lines.join('\n');
    }

    get selectedToolRunDetailLines(): string[] {
        const label = this.selectedToolRunDetailLabel;
        return label ? label.split('\n') : [];
    }

    protected summarize(value: string, maxLength?: number): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        const limit = maxLength ?? this.state?.consoleOptions?.toolRunSummaryMaxLength ?? 96;
        return text.length > limit ? `${text.slice(0, limit)}...` : text;
    }
}

export * from './AgentConsoleChromePanels';
