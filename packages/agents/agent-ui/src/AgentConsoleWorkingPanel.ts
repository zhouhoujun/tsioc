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
export * from './AgentConsoleOverlayPanels';
export * from './AgentConsoleTaskPanels';
export * from './AgentConsoleResourcePanels';
export * from './AgentConsoleInputPanel';
@Component({
    selector: 'agent-console-working-panel',
    template: `
    <div class="console-panel console-working-panel" v-style="shellStyle">
        <label class="working-line" v-style="workingLineStyle">
            <span class="working-scan" render-region="agent-working-animation"><span class="working-scan-char {{char.delayClass}}" v-for="char in workingChars">{{char.text}}</span></span>
            <span v-style="labelStyle"> (<span elapsed-time :started-at="state.turnStartedAt" :active="shouldShow"></span> • {{interruptHint}}){{workingDetail}}<span v-show="hasTokenUsage"> · {{totalTokens | number-format}} tokens</span></span>
        </label>
    </div>
    `
})
export class AgentConsoleWorkingPanelComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() tokenUsage: AgentConsoleTokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    };

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.workingShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.workingTitle;
    }

    get lineStyle() {
        return this.activeThemeStyles.workingValue;
    }

    get workingLineStyle(): Record<string, string> {
        return {
            ...this.activeThemeStyles.workingValue,
            // Keep the status bar visually separated from the transcript.
            padding: '1em 1ch 1em'
        };
    }

    get labelStyle() {
        return this.activeThemeStyles.workingLabel;
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

    get statsStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get qualityStyle() {
        return this.activeThemeStyles.statusNoticeValue;
    }

    get promptTokens(): number {
        return this.state.tokenUsage.promptTokens;
    }

    get completionTokens(): number {
        return this.state.tokenUsage.completionTokens;
    }

    get totalTokens(): number {
        return this.state.turnTokenUsage.totalTokens;
    }

    get hasTokenUsage(): boolean {
        return this.totalTokens > 0;
    }

    get messagesCount(): number {
        return this.state.messages.length;
    }

    get toolsCount(): number {
        return this.state.tools.length;
    }

    get toolRunsCount(): number {
        return this.state.toolRuns.length;
    }

    get activitiesCount(): number {
        return this.state.activities.length;
    }

    get tasksCount(): number {
        return this.state.tasksCount;
    }

    get shouldShow(): boolean {
        return this.hasWorkingState;
    }

    get workingDetail(): string {
        if (!this.hasWorkingState) {
            return '';
        }
        const translate = (key: string, params?: Record<string, any>, fallback?: string) =>
            this.translator?.translate(key, params) || fallback || key;
        const parts = [] as string[];
        if (this.state.runningTools.length) {
            const background = this.state.runningTools.filter(tool => this.isTerminalTool(tool)).length;
            if (background) {
                parts.push(translate('agent.turn.backgroundRunning', { count: background }, `${background} background terminal${background === 1 ? '' : 's'} running`));
                parts.push(translate('agent.turn.backgroundView', undefined, '/ps to view'));
                parts.push(translate('agent.turn.backgroundStop', undefined, '/ps stop to close'));
            } else {
                parts.push(this.runningLabel);
            }
        } else {
            const activePlan = this.state.planTodos.find(todo => todo.status === 'in_progress')
                || this.state.planTodos.find(todo => todo.status === 'pending');
            if (activePlan) {
                const index = this.state.planTodos.indexOf(activePlan) + 1;
                const labels = { ...DEFAULT_TIMELINE_LABELS, ...(this.state.consoleOptions.timelineLabels || {}) };
                parts.push(`${labels.planLabel} ${index}/${this.state.planTodos.length}: ${activePlan.content}`);
            }
            const latest = [...this.state.activities].reverse().find(activity =>
                activity.kind !== 'model' && activity.kind !== 'turn'
            );
            if (!activePlan) {
                parts.push(this.state.status === 'reasoning'
                    ? (this.translator?.translate('agent.turn.reasoning') || 'Reasoning')
                    : (latest?.message || this.translator?.translate('agent.turn.preparing') || 'Preparing the response'));
            }
        }
        if (this.state.consoleOptions.workingPresentation === 'dashboard') {
            const dashboard = this.dashboardCountersLabel;
            if (dashboard) {
                parts.push(dashboard);
            }
        }
        return ` ${parts.join(' · ')}`;
    }

    get interruptHint(): string {
        return this.translator?.translate('agent.turn.interruptHint') || 'esc to interrupt';
    }

    protected get hasWorkingState(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    get toolRunProgressBar(): string {
        const runs = this.state.toolRuns.filter(r => r.status === 'running');
        if (!runs.length) {
            return '';
        }
        return runs.map(run => {
            const name = run.name.length > 12 ? run.name.slice(0, 12) + '…' : run.name;
            const attempt = run.attemptCount && run.attemptCount > 1 ? ` #${run.attemptCount}` : '';
            const barWidth = 8;
            const filled = run.attemptCount ? Math.min(Math.ceil(run.attemptCount / 3 * barWidth), barWidth) : 1;
            const empty = barWidth - filled;
            const bar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
            return `${bar} ${name}${attempt}`;
        }).join(' ');
    }

    get workingLabel(): string {
        return this.animatedLabel;
    }

    get animatedLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return `• ${this.translator?.translate('agent.turn.working') || 'Working'}`;
    }

    get workingChars(): Array<{ text: string; delayClass: string }> {
        // CSS keyframes own the sweep; the delay class only staggers the same
        // animation across characters so no directive timer is involved.
        return Array.from(this.animatedLabel).map((text, index) => ({
            text,
            delayClass: `working-delay-${index % 16}`
        }));
    }

    get dashboardCountersLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const activeTasks = this.activeDashboardTaskCount;
        const totalTasks = this.totalDashboardTaskCount;
        const runningJobs = this.state.scheduledTasks.filter(task => task.running).length;
        const activeApprovals = this.state.pendingApprovals.length;
        const activeTools = this.state.runningTools.length;
        const translate = (key: string, params: Record<string, any>, fallback: string) =>
            this.translator?.translate(key, params) || fallback;
        return [
            activeApprovals > 0 ? translate('agent.dashboard.approvals', { count: formatCompactNumber(activeApprovals) }, `approvals ${formatCompactNumber(activeApprovals)}`) : '',
            this.state.scheduledTasks.length > 0 ? translate('agent.dashboard.jobs', {
                running: formatCompactNumber(runningJobs),
                total: formatCompactNumber(this.state.scheduledTasks.length)
            }, `jobs ${formatCompactNumber(runningJobs)}/${formatCompactNumber(this.state.scheduledTasks.length)}`) : '',
            totalTasks > 0 ? translate('agent.dashboard.tasks', {
                active: formatCompactNumber(activeTasks),
                total: formatCompactNumber(totalTasks)
            }, `tasks ${formatCompactNumber(activeTasks)}/${formatCompactNumber(totalTasks)}`) : '',
            activeTools > 0 ? translate('agent.dashboard.tools', { count: formatCompactNumber(activeTools) }, `tools ${formatCompactNumber(activeTools)}`) : ''
        ].filter(Boolean).join(' · ');
    }

    get dashboardStatsLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const runs = this.state.toolRuns;
        if (!runs.length) {
            return '';
        }
        const completed = runs.filter(run => run.status !== 'running');
        const running = runs.length - completed.length;
        const success = completed.filter(run => run.status === 'success').length;
        const failed = completed.length - success;
        const durations = completed
            .map(run => run.durationMs)
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
        const avgDuration = durations.length
            ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
            : 0;
        const successRate = completed.length ? Math.round((success / completed.length) * 100) : 0;
        return [
            runs.length > 0 ? `runs ${runs.length}` : '',
            success > 0 ? `ok ${success}` : '',
            failed > 0 ? `fail ${failed}` : '',
            running > 0 ? `running ${running}` : '',
            completed.length > 0 ? `success ${successRate}%` : '',
            durations.length > 0 ? `avg ${avgDuration}ms` : ''
        ].filter(Boolean).join(' · ');
    }

    get dashboardQualityLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.summaryQualityDigest ? `${panelLabel(this.translator, 'dashboard', 'quality', 'quality')} · ${this.state.summaryQualityDigest}` : '';
    }

    get dashboardUsageLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.usageDigest ? `${panelLabel(this.translator, 'dashboard', 'usage', 'usage')} · ${this.state.usageDigest}` : '';
    }

    get dashboardCompactionLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.compactionDigest ? `${panelLabel(this.translator, 'dashboard', 'compaction', 'compaction')} · ${this.state.compactionDigest}` : '';
    }

    get dashboardTurnDiagnosticsLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.turnDiagnosticsDigest ? `${panelLabel(this.translator, 'dashboard', 'diagnostics', 'diagnostics')} · ${this.state.turnDiagnosticsDigest}` : '';
    }

    get dashboardDetailLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const lines: string[] = [];
        if (this.state.contextPreparationSummary) {
            lines.push(this.state.contextPreparationSummary);
        }
        if (this.state.projectSummary) {
            lines.push(`project summary ${this.summarize(this.state.projectSummary)}`);
        }
        if (this.state.notice) {
            lines.push(`notice ${this.summarize(this.state.notice)}`);
        }
        if (this.state.lastError) {
            lines.push(`error ${this.summarize(this.state.lastError)}`);
        }
        const runningToolRuns = this.state.toolRuns.filter(r => r.status === 'running');
        if (runningToolRuns.length) {
            for (const run of runningToolRuns.slice(0, 2)) {
                const attempt = run.attemptCount && run.attemptCount > 1 ? ` #${run.attemptCount}` : '';
                const summary = run.inputSummary || run.message || run.name;
                lines.push(`▶ ${run.name}${attempt} · ${this.summarize(summary)}`);
            }
        }
        const latestToolRun = this.state.toolRuns.find(r => r.status !== 'running') || this.state.toolRuns[0];
        if (latestToolRun && !runningToolRuns.includes(latestToolRun)) {
            const summary = latestToolRun.outputSummary || latestToolRun.inputSummary || latestToolRun.message || latestToolRun.error || latestToolRun.name;
            lines.push(`tool ${latestToolRun.name} ${latestToolRun.status}${latestToolRun.durationMs != null ? ` ${latestToolRun.durationMs}ms` : ''} · ${this.summarize(summary)}`);
        }
        const latestJob = this.latestScheduledTask();
        if (latestJob) {
            lines.push(`job ${latestJob.id} · ${latestJob.running ? 'running' : latestJob.paused ? 'paused' : 'idle'}`);
        }
        const latestApproval = this.state.pendingApprovals[this.state.pendingApprovals.length - 1];
        if (latestApproval) {
            lines.push(`approval ${latestApproval.toolName} · ${this.summarize(latestApproval.reason)}`);
        }
        const latestTask = this.latestReviewTask();
        if (latestTask && !this.hasActivePlanTodos) {
            lines.push(`task ${latestTask.id} · ${this.summarize(latestTask.title)} · ${latestTask.status || 'idle'}`);
        }
        return lines.join(' · ');
    }

    protected get totalDashboardTaskCount(): number {
        return this.hasActivePlanTodos ? this.state.planTodos.length : this.state.reviewTaskChoices.length;
    }

    protected get activeDashboardTaskCount(): number {
        if (this.hasActivePlanTodos) {
            return this.state.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress').length;
        }
        return this.state.reviewTaskChoices.filter(task => this.isActiveReviewTask(task)).length;
    }

    protected get hasActivePlanTodos(): boolean {
        return this.state.planTodos.some(item => item.status === 'pending' || item.status === 'in_progress');
    }

    protected latestScheduledTask(): ScheduledAgentTask | undefined {
        return this.state.scheduledTasks
            .slice()
            .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0];
    }

    protected latestReviewTask(): AgentConsoleReviewTaskItem | undefined {
        return this.state.reviewTaskChoices
            .slice()
            .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0];
    }

    protected isActiveReviewTask(task?: AgentConsoleReviewTaskItem | null): boolean {
        const status = String(task?.status || '').trim().toLowerCase();
        return status === 'planned' || status === 'running';
    }

    protected workspaceLabel(workspace?: string): string {
        const text = String(workspace || '').trim();
        if (!text) {
            return '';
        }
        const segments = text.split(/[\\/]/).filter(Boolean);
        return segments[segments.length - 1] || text;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }

    protected lastElapsedSeconds = -1;
    protected lastElapsedLabel = '0s';

    get elapsedLabel(): string {
        const startedAt = this.state.turnStartedAt;
        if (!startedAt) {
            return '0s';
        }
        const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        if (totalSeconds === this.lastElapsedSeconds) {
            return this.lastElapsedLabel;
        }
        this.lastElapsedSeconds = totalSeconds;
        if (totalSeconds < 60) {
            this.lastElapsedLabel = `${totalSeconds}s`;
        } else {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            this.lastElapsedLabel = `${minutes}m ${seconds}s`;
        }
        return this.lastElapsedLabel;
    }

    get runningLabel(): string {
        const count = this.state.runningTools.length;
        if (!count) {
            return this.translator?.translate('agent.turn.working') || 'Working';
        }
        if (count === 1 && this.isTerminalTool(this.state.runningTools[0])) {
            return this.translator?.translate('agent.turn.backgroundCommand') || 'Running a background command';
        }
        return this.translator?.translate('agent.turn.toolsRunning', { count }) || `Running ${count} operations`;
    }

    protected isTerminalTool(toolName: string): boolean {
        return /terminal|process|shell|exec|command/i.test(String(toolName || ''));
    }
}

