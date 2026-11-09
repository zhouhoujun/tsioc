import { Attribute, Component, ReactiveEffect, reactive } from '@tsdi/components';
import { formatCompactNumber } from '@tsdi/core';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel, formatAgentKeymapActionLabel, formatAgentPanelLabel as panelLabel, formatAgentPanelStatusLabel as panelStatusLabel } from './agent-ui.i18n';
import { formatAgentConsoleInputBadges } from './AgentConsoleInputBadges';
import { formatAgentMessageDetailSummary } from './AgentConsoleMessageDetailMeta';
import { formatScheduledTaskDetailLines } from './AgentConsoleScheduledTaskFormat';
import { formatSessionAge } from './AgentConsoleFormatters';
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
@Component({
    selector: 'agent-console-sessions-panel',
    imports: [ListPanelComponent],
    template: `
    <list-panel :header="sessionsSummaryLabel" :items="sessionItems" :showClose="false"></list-panel>
    `
})
export class AgentConsoleSessionsPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get sessions(): AgentConsoleSessionItem[] {
        return this.state.navFilteredSessions;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.sessionsShell : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.sessionsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get sessionItems(): Array<{ id: string; label: string; style: Record<string, string> }> {
        if (!this.shouldShow) {
            return [];
        }
        const rows: Array<{ id: string; label: string; style: Record<string, string>; selected: string; className?: string }> = [];
        // The picker is project-scoped by default: only disambiguate workspaces
        // when the visible rows actually span more than one.
        const multiWorkspace = new Set(this.sessions.map(session => String(session.workspace || '')).filter(Boolean)).size > 1;
        let previousProjectKey = '';
        for (const session of this.visibleSessions) {
            const projectKey = String(session.projectKey || '').trim();
            if (projectKey && projectKey !== previousProjectKey) {
                rows.push({
                    id: `${projectKey}::header`,
                    label: this.projectHeaderLabel(session),
                    style: this.activeThemeStyles.sessionsAccent,
                    selected: 'false',
                    className: 'list-panel-section'
                });
            }
            const current = session.current ? ` [${panelLabel(this.translator, 'sessions', 'current', 'current')}]` : '';
            const selected = this.state.selectedSessionId === session.id;
            const marker = selected ? '›' : ' ';
            const count = Number(session.messageCount) > 0 ? ` (${session.messageCount})` : '';
            const workspace = multiWorkspace ? this.workspaceLabel(session.workspace) : '';
            const workspacePrefix = workspace ? `[${workspace}] ` : '';
            const name = this.sessionRowTitle(session);
            const pinned = session.pinned ? ' 📌' : '';
            rows.push({
                id: session.id,
                label: `${marker} ${workspacePrefix}${name}${formatSessionAge(session.updatedAt)}${current}${count}${pinned}`,
                style: selected
                    ? this.activeThemeStyles.sessionsSelected
                    : this.activeThemeStyles.statusValue,
                selected: String(selected)
            });
            previousProjectKey = projectKey;
        }
        return rows;
    }

    get visibleSessionStart(): number {
        const selectedIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.state.selectedSessionId));
        return resolveConsoleListWindow(
            this.sessions.length,
            selectedIndex,
            this.state.consoleOptions.sessionsVisibleItems
        ).start;
    }

    get visibleSessions(): AgentConsoleSessionItem[] {
        return this.sessions.slice(
            this.visibleSessionStart,
            this.visibleSessionStart + this.state.consoleOptions.sessionsVisibleItems
        );
    }

    get sessionsSummaryLabel(): string {
        if (!this.shouldShow) return '';
        if (!this.sessions.length) return panelLabel(this.translator, 'sessions', 'emptyFilter', 'no sessions match "{filter}"', { filter: this.state.navFilter.text || '' });
        const selectedIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.state.selectedSessionId));
        const filter = String(this.state.navFilter?.text || '').trim();
        const summary = panelLabel(this.translator, 'sessions', 'summary', 'sessions {total} · {index}/{total}', { total: this.sessions.length, index: selectedIndex + 1 });
        return filter ? `${summary} · ${filter}` : summary;
    }

    get shouldShow(): boolean {
        return this.state.sessionsFocused;
    }

    sessionAt(index: number): { id: string; label: string; style: Record<string, string> } | undefined {
        return this.sessionItems[index];
    }

    sessionLabelAt(index: number): string {
        return this.sessionAt(index)?.label || '';
    }

    sessionStyleAt(index: number): Record<string, string> {
        return this.sessionAt(index)?.style || {};
    }

    /** Prefer the title, then the first request: never an opaque id when we can do better. */
    protected sessionRowTitle(session: AgentConsoleSessionItem): string {
        const candidate = [session.title, session.focusSummary, session.rootRequest, session.summary]
            .map(value => String(value || '').replace(/\s+/g, ' ').trim())
            .find(value => value && value !== session.id);
        if (!candidate) {
            return session.id;
        }
        return candidate.length > 36 ? `${candidate.slice(0, 35)}…` : candidate;
    }

    protected workspaceLabel(workspace?: string): string {
        const text = String(workspace || '').trim();
        if (!text) {
            return '';
        }
        return basenameAgentPath(text) || text;
    }

    protected projectHeaderLabel(session: AgentConsoleSessionItem): string {
        const label = String(session.projectLabel || session.projectId || session.workspace || session.primaryThreadId || '').trim();
        const displayLabel = this.workspaceLabel(label) || label || session.id;
        const count = Math.max(1, Number(session.projectSessionCount || 0));
        return panelLabel(this.translator, 'sessions', count === 1 ? 'projectOne' : 'projectMany', count === 1 ? 'project {name} · {count} session' : 'project {name} · {count} sessions', { name: displayLabel, count });
    }
}

@Component({
    selector: 'agent-console-jobs-panel',
    imports: [ListPanelComponent],
    template: `
    <list-panel :header="jobsSummaryLabel" :hint="jobsHintLabel" :items="jobItems" :detailLines="selectedJobDetailLines" :showClose="false"></list-panel>
    `
})
export class AgentConsoleJobsPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get jobs(): ScheduledAgentTask[] {
        return this.state.scheduledTasks;
    }

    get shellStyle() {
        return this.shouldShow ? resolveSectionFrameStyle(this.activeThemeStyles.toolsShell) : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.toolsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get jobItems(): Array<{ id: string; label: string; style: Record<string, string>; selected: string }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.visibleJobs.map(job => {
            const summary = [
                job.scheduleType ? panelStatusLabel(this.translator, 'jobs', job.scheduleType) : panelLabel(this.translator, 'jobs', 'statusOnce', 'once'),
                job.paused ? panelLabel(this.translator, 'jobs', 'statusPaused', 'paused') : '',
                job.running ? panelLabel(this.translator, 'jobs', 'statusRunning', 'running') : '',
                job.cancelled ? panelLabel(this.translator, 'jobs', 'statusCancelled', 'cancelled') : ''
            ].filter(Boolean).join(' · ');
            const prompt = this.summarize(job.prompt);
            return {
                id: job.id,
                style: this.listStyle,
                selected: String(this.state.selectedScheduledTaskId === job.id),
                label: `${this.state.selectedScheduledTaskId === job.id ? '›' : ' '} ${job.id} · ${prompt}${summary ? ` (${summary})` : ''}`
            };
        });
    }

    get jobListLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        if (!this.jobs.length) {
            return panelLabel(this.translator, 'jobs', 'empty', 'no scheduled jobs');
        }
        return this.jobItems.map(item => item.label).join('\n');
    }

    get jobListLines(): string[] {
        const label = this.jobListLabel;
        return label ? label.split('\n') : [];
    }

    get selectedJobDetailLines(): string[] {
        const label = this.selectedJobDetailLabel;
        return label ? label.split('\n') : [];
    }

    get visibleJobStart(): number {
        const selectedIndex = Math.max(0, this.jobs.findIndex(item => item.id === this.state.selectedScheduledTaskId));
        return resolveConsoleListWindow(
            this.jobs.length,
            selectedIndex,
            this.state.consoleOptions.sessionsVisibleItems
        ).start;
    }

    get visibleJobs(): ScheduledAgentTask[] {
        return this.jobs.slice(
            this.visibleJobStart,
            this.visibleJobStart + this.state.consoleOptions.sessionsVisibleItems
        );
    }

    get jobsSummaryLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        if (!this.jobs.length) {
            return panelLabel(this.translator, 'jobs', 'summaryZero', 'jobs 0');
        }
        const selectedIndex = Math.max(0, this.jobs.findIndex(item => item.id === this.state.selectedScheduledTaskId));
        return panelLabel(this.translator, 'jobs', 'summary', 'jobs {total} · {index}/{total}', { total: this.jobs.length, index: selectedIndex + 1 });
    }

    get jobsHintLabel(): string {
        if (!this.shouldShow || !this.state.jobsFocused) {
            return '';
        }
        if (!this.jobs.length) {
            return panelLabel(this.translator, 'jobs', 'emptyHint', 'no scheduled jobs   use schedulePrompt');
        }
        return panelLabel(this.translator, 'jobs', 'hint', 'up/down move   pg jump   enter toggle pause/resume   x cancel   r recover   y copy   esc');
    }

    get selectedJobDetailLabel(): string {
        if (!this.shouldShow || !this.state.selectedScheduledTask) {
            return '';
        }
        return formatScheduledTaskDetailLines(this.state.selectedScheduledTask, this.translator).join('\n');
    }

    get shouldShow(): boolean {
        return this.state.jobsFocused;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }
}

export { AgentConsoleApprovalsPanelComponent } from './AgentConsoleApprovalPanel';
@Component({
    selector: 'agent-console-tools-panel',
    imports: [ListPanelComponent],
    template: `
    <list-panel :header="toolsSummaryLabel" :hint="toolsHintLabel" :items="toolItems" :detailLines="selectedToolDetailLines" :showClose="false"></list-panel>
    `
})
export class AgentConsoleToolsPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get tools(): AgentConsoleToolItem[] {
        return this.state.tools;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.toolsShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.toolsTitle;
    }

    get accentStyle() {
        return this.activeThemeStyles.toolsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get toolItems(): Array<{ name: string; label: string; style: Record<string, string>; selected: string }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.visibleTools.map(tool => {
            const selected = this.state.selectedToolName === tool.name;
            return {
                name: tool.name,
                label: `${selected ? '›' : ' '} ${tool.name}${tool.active ? '' : formatToolPanelInactiveSuffix(this.translator)}${tool.toolset ? ` (${tool.toolset})` : ''}`,
                style: selected
                    ? this.activeThemeStyles.sessionsSelected
                    : this.activeThemeStyles.statusValue,
                selected: String(selected)
            };
        });
    }

    get toolLabels(): string[] {
        return this.toolItems.map(item => item.label);
    }

    get toolListLabel(): string {
        if (!this.shouldShow || !this.toolItems.length) {
            return '';
        }
        return this.toolLabels.join('\n');
    }

    get toolsSummary(): string {
        return this.toolLabels.join(' | ');
    }

    get visibleToolStart(): number {
        const selectedIndex = Math.max(0, this.tools.findIndex(item => item.name === this.state.selectedToolName));
        return resolveConsoleListWindow(
            this.tools.length,
            selectedIndex,
            this.state.consoleOptions.toolsVisibleItems
        ).start;
    }

    get visibleTools(): AgentConsoleToolItem[] {
        return this.tools.slice(
            this.visibleToolStart,
            this.visibleToolStart + this.state.consoleOptions.toolsVisibleItems
        );
    }

    get toolsSummaryLabel(): string {
        if (!this.shouldShow || !this.tools.length) {
            return '';
        }
        const selectedIndex = Math.max(0, this.tools.findIndex(item => item.name === this.state.selectedToolName));
        return formatToolPanelTitle(this.translator, this.tools.length, selectedIndex + 1);
    }

    get toolsHintLabel(): string {
        if (!this.shouldShow || !this.tools.length || !this.state.toolsFocused) {
            return '';
        }
        return this.state.consoleOptions.toolsHint;
    }

    get selectedToolDetailLabel(): string {
        if (!this.shouldShow || !this.state.selectedTool) {
            return '';
        }
        const tool = this.state.selectedTool;
        const latestRun = this.state.toolRuns.find(run => run.name === tool.name);
        const lines = [formatToolPanelStatus(this.translator, tool)];
        if (latestRun) {
            const summary = latestRun.outputSummary || latestRun.inputSummary || latestRun.message || latestRun.error || '';
            const duration = latestRun.durationMs != null ? ` ${latestRun.durationMs}ms` : '';
            lines.push(formatToolPanelLastRun(this.translator, latestRun.status, duration, this.summarize(summary || latestRun.name)));
        }
        return lines.join('\n');
    }

    get selectedToolDetailLines(): string[] {
        const label = this.selectedToolDetailLabel;
        return label ? label.split('\n') : [];
    }

    get shouldShow(): boolean {
        return this.state.toolsFocused;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }
}

