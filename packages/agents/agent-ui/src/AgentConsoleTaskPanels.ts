import { Attribute, Component, ReactiveEffect, reactive } from '@tsdi/components';
import { formatCompactNumber } from '@tsdi/core';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel, formatAgentKeymapActionLabel, formatAgentPanelLabel as panelLabel, formatAgentPanelStatusLabel as panelStatusLabel } from './agent-ui.i18n';
import { AgentConsoleTaskPanelDetailHost } from './AgentConsoleTaskPanelDetailHost';
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
@Component({
    selector: 'agent-console-tasks-panel',
    imports: [ListPanelComponent],
    template: `
    <list-panel :header="tasksSummaryLabel" :contextLines="backgroundTaskFeedLines" :hint="tasksHintLabel" :items="taskDisplayItems" :detailLines="selectedTaskDetailLines" :ariaLabel="accessibilityLabel" :showClose="false"></list-panel>
    `
})
export class AgentConsoleTasksPanelComponent extends AgentConsoleTaskPanelDetailHost {
    constructor(protected state: AgentConsoleSessionState, @Optional() protected translator?: TranslatorService) {
        super();
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get tasks(): AgentConsoleReviewTaskItem[] {
        return this.state.filteredReviewTaskChoices;
    }

    get planTodos(): AgentConsolePlanTodoItem[] {
        return this.state.planTodos;
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

    get backgroundTaskFeedLabel(): string {
        const tasks = this.state.filteredBackgroundTasks;
        if (!tasks.length) return '';
        const running = tasks.filter(task => task.status === 'running').length;
        const failed = tasks.filter(task => task.status === 'failed').length;
        const lines = tasks.slice(0, 8).map(task => {
            const marker = task.status === 'running' ? '>' : task.status === 'completed' ? 'x' : task.status === 'failed' ? '!' : '-';
            return `[${marker}] ${task.id} · ${task.goal} · ${task.sessionId}`;
        });
        const summary = `${panelLabel(this.translator, 'tasks', 'backgroundSummary', 'background {total} · running {running}', { total: tasks.length, running })}${failed ? ` · ${panelLabel(this.translator, 'tasks', 'backgroundFailed', 'failed {failed}', { failed })}` : ''}`;
        return [summary, ...lines].join('\n');
    }

    get backgroundTaskFeedLines(): string[] {
        const label = this.backgroundTaskFeedLabel;
        return label ? label.split('\n') : [];
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get taskItems(): Array<{ id: string; label: string; style: Record<string, string>; selected: string }> {
        if (!this.shouldShow) {
            return [];
        }
        const showSourceSession = new Set(this.tasks.map(task => String(task.sourceSessionId || '').trim()).filter(Boolean)).size > 1;
        return this.visibleTasks.map(task => {
            const taskRecord = this.state.taskRecords.find(item => item?.id === task.id);
            const retryOfTaskId = typeof task.retryOfTaskId === 'string' && task.retryOfTaskId
                ? task.retryOfTaskId
                : typeof taskRecord?.metadata?.retrySourceTaskId === 'string' && taskRecord.metadata.retrySourceTaskId
                    ? taskRecord.metadata.retrySourceTaskId
                    : typeof taskRecord?.metadata?.retryOfTaskId === 'string' && taskRecord.metadata.retryOfTaskId
                        ? taskRecord.metadata.retryOfTaskId
                        : '';
            const retryDepth = typeof task.retryDepth === 'number'
                ? task.retryDepth
                : typeof taskRecord?.metadata?.retrySequence === 'number'
                    ? taskRecord.metadata.retrySequence
                    : undefined;
            const indentation = typeof retryDepth === 'number' && retryDepth > 0
                ? `${'  '.repeat(Math.min(retryDepth, 6))}- `
                : '';
            const lineageTaskCount = typeof task.lineageTaskCount === 'number'
                ? task.lineageTaskCount
                : undefined;
            const meta = [
                showSourceSession && task.sourceSessionId ? panelLabel(this.translator, 'tasks', 'sourceSession', 'session {id}', { id: task.sourceSessionId }) : '',
                task.status || '',
                task.executionMode || '',
                typeof retryDepth === 'number' ? panelLabel(this.translator, 'tasks', 'retryMeta', 'retry {depth}', { depth: retryDepth }) : '',
                retryOfTaskId ? panelLabel(this.translator, 'tasks', 'from', 'from {id}', { id: retryOfTaskId }) : '',
                typeof lineageTaskCount === 'number' && lineageTaskCount > 1 ? panelLabel(this.translator, 'tasks', 'lineageMeta', 'lineage {count}', { count: lineageTaskCount }) : '',
                typeof task.workerCount === 'number' ? `${task.workerCount}w` : ''
            ].filter(Boolean).join(' · ');
            return {
                id: task.id,
                label: `${this.state.selectedReviewTaskId === task.id ? '›' : ' '} ${indentation}${task.id} · ${task.title}${meta ? ` (${meta})` : ''}`,
                style: this.listStyle,
                selected: String(this.state.selectedReviewTaskId === task.id)
            };
        });
    }

    get taskDisplayItems(): Array<{ id: string; label: string; style: Record<string, string> }> {
        const plan = this.planListLabel ? this.planListLabel.split('\n') : [];
        return [...plan.map((label, index) => ({ id: `plan-${index}`, label, style: this.listStyle })), ...this.taskItems];
    }

    get planListLabel(): string {
        if (!this.shouldShow || !this.shouldShowPlanTodos) {
            return '';
        }
        const sourceSessionId = String(this.state.planTodoSourceSessionId || '').trim();
        const sourcePrefix = sourceSessionId && sourceSessionId !== this.state.sessionId
            ? `${panelLabel(this.translator, 'tasks', 'sourceSession', 'session {id}', { id: sourceSessionId })} · `
            : '';
        if (!this.state.tasksFocused) {
            const active = this.planTodos.find(todo => todo.status === 'in_progress')
                || this.planTodos.find(todo => todo.status === 'pending');
            if (!active) {
                return '';
            }
            const blockedInfo = active.blockedBy?.length ? ` ${panelLabel(this.translator, 'tasks', 'blockedBy', 'blocked by {ids}', { ids: active.blockedBy.join(',') })}` : '';
            const ownerInfo = active.owner ? ` (${active.owner})` : '';
            return `${sourcePrefix}${panelLabel(this.translator, 'tasks', 'current', 'current {index}.', { index: this.planTodos.findIndex(todo => todo.id === active.id) + 1 })} [${this.todoStatusMark(active.status)}] ${active.content}${ownerInfo}${blockedInfo}`;
        }
        const filtered = this.state.filteredPlanTodos;
        const filterLabel = this.state.planTodoFilterLabel;
        const filterPrefix = filterLabel !== 'all' ? `[${filterLabel}] ` : '';
        const lines = filtered.map((todo, index) => {
            const marker = this.state.selectedPlanTodoIndex === index ? '›' : ' ';
            const hierarchy = todo.parentId ? '  ' : '';
            const blocked = todo.blockedBy?.length ? ` ← ${panelLabel(this.translator, 'tasks', 'blockedBy', 'blocked by {ids}', { ids: todo.blockedBy.join(',') })}` : '';
            const owner = todo.owner ? ` (${todo.owner})` : '';
            const elapsed = todo.elapsedMs ? ` ${this.state.formatElapsed(todo.elapsedMs)}` : '';
            const error = todo.status === 'failed' && todo.error ? ` ${panelLabel(this.translator, 'tasks', 'errorPrefix', 'err: {error}', { error: todo.error })}` : '';
            return `${marker}${hierarchy}${index + 1}. [${this.todoStatusMark(todo.status)}] ${todo.content}${owner}${elapsed}${blocked}${error}`;
        });
        const totalCount = this.planTodos.length;
        const activeCount = this.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress').length;
        const blockedCount = this.planTodos.filter(item => item.blockedBy && item.blockedBy.length > 0).length;
        const failedCount = this.planTodos.filter(item => item.status === 'failed').length;
        const labels = { ...DEFAULT_TIMELINE_LABELS, ...(this.state.consoleOptions.timelineLabels || {}) };
        const header = `${sourcePrefix}${filterPrefix}${labels.planLabel} ${totalCount} · ${labels.planActive} ${activeCount}${blockedCount ? ` · ${labels.planBlocked} ${blockedCount}` : ''}${failedCount ? ` · ${labels.planFailed} ${failedCount}` : ''}`;
        return [header, ...lines].join('\n');
    }

    get taskListLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const sections = [
            this.planListLabel,
            this.taskItems.length ? this.taskItems.map(item => item.label).join('\n') : ''
        ].filter(Boolean);
        return sections.join('\n');
    }

    get selectedTaskDetailLines(): string[] {
        const label = this.selectedTaskDetailLabel;
        return label ? label.split('\n') : [];
    }

    get visibleTaskStart(): number {
        const selectedIndex = Math.max(0, this.tasks.findIndex(item => item.id === this.state.selectedReviewTaskId));
        return resolveConsoleListWindow(
            this.tasks.length,
            selectedIndex,
            this.state.consoleOptions.sessionsVisibleItems
        ).start;
    }

    get visibleTasks(): AgentConsoleReviewTaskItem[] {
        return this.tasks.slice(
            this.visibleTaskStart,
            this.visibleTaskStart + this.state.consoleOptions.sessionsVisibleItems
        );
    }

    get tasksSummaryLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const projectLabel = String(this.state.projectLabel || '').trim();
        const projectSuffix = projectLabel ? ` · ${panelLabel(this.translator, 'tasks', 'projectSuffix', 'project {name}', { name: projectLabel })}` : '';
        if (this.shouldShowPlanTodos) {
            const activeCount = this.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress').length;
            const blockedCount = this.planTodos.filter(item => item.blockedBy && item.blockedBy.length > 0).length;
            const failedCount = this.planTodos.filter(item => item.status === 'failed').length;
            const scopeSuffix = this.state.planScope === 'thread' ? ` · ${panelLabel(this.translator, 'tasks', 'threadSuffix', 'thread')}` : '';
            const filterLabel = this.state.planTodoFilter !== 'all' ? ` · ${panelLabel(this.translator, 'tasks', 'filterSuffix', 'filter {filter}', { filter: this.state.planTodoFilterLabel })}` : '';
            const selectedSuffix = this.state.selectedPlanTodoIndex >= 0 ? ` · ${this.state.selectedPlanTodoIndex + 1}/${this.state.filteredPlanTodos.length}` : '';
            const labels = { ...DEFAULT_TIMELINE_LABELS, ...(this.state.consoleOptions.timelineLabels || {}) };
            return `${labels.planLabel} ${this.planTodos.length} · ${labels.planActive} ${activeCount}${blockedCount ? ` · ${labels.planBlocked} ${blockedCount}` : ''}${failedCount ? ` · ${labels.planFailed} ${failedCount}` : ''}${filterLabel}${selectedSuffix}${scopeSuffix}${projectSuffix}`;
        }
        const totalCount = this.state.reviewTaskChoices.length;
        const filteredCount = this.tasks.length;
        const sessionCount = new Set(this.state.reviewTaskChoices.map(task => String(task.sourceSessionId || '').trim()).filter(Boolean)).size;
        if (!totalCount) {
            return '';
        }
        const filterLabel = this.taskFilterLabel;
        if (!filteredCount) {
            return panelLabel(this.translator, 'tasks', 'summaryZero', 'tasks 0/{total} · {filter}', { total: totalCount, filter: filterLabel }) + projectSuffix;
        }
        const selectedIndex = Math.max(0, this.tasks.findIndex(item => item.id === this.state.selectedReviewTaskId));
        const sourceSuffix = sessionCount > 1 ? ` · ${panelLabel(this.translator, 'tasks', 'sessionsSuffix', 'sessions {count}', { count: sessionCount })}` : '';
        return panelLabel(this.translator, 'tasks', 'summary', 'tasks {filtered}/{total} · {filter} · {index}/{filtered}', { filtered: filteredCount, total: totalCount, filter: filterLabel, index: selectedIndex + 1 }) + sourceSuffix + projectSuffix;
    }

    /** Keeps plan state understandable when glyphs and color are unavailable. */
    get accessibilityLabel(): string {
        const summary = this.tasksSummaryLabel;
        if (!summary) {
            return panelLabel(this.translator, 'tasks', 'accessibilityTitle', 'Tasks and plan');
        }
        const active = this.planTodos.find(todo => todo.status === 'in_progress');
        const activeText = active ? panelLabel(this.translator, 'tasks', 'accessibilityActive', ' Current step: {content}.', { content: active.content }) : '';
        return panelLabel(this.translator, 'tasks', 'accessibility', 'Tasks and plan. {summary}.{active}', { summary, active: activeText });
    }

    get tasksHintLabel(): string {
        if (!this.shouldShow || !this.state.tasksFocused) {
            return '';
        }
        if (this.shouldShowPlanTodos) {
            const actions = [panelLabel(this.translator, 'tasks', 'escBack', 'esc back')];
            actions.push(panelLabel(this.translator, 'tasks', 'filter', 'f filter'));
            actions.push(panelLabel(this.translator, 'tasks', 'jumpBlocked', 'j jump blocked'));
            actions.push(panelLabel(this.translator, 'tasks', 'jumpFailed', 'k jump failed'));
            actions.push(panelLabel(this.translator, 'tasks', 'enterDetail', 'enter detail'));
            actions.push(panelLabel(this.translator, 'tasks', 'expand', 'e expand'));
            return `${panelLabel(this.translator, 'tasks', 'move', 'up/down move')}   ${actions.join('   ')}`;
        }
        const selected = this.state.selectedTask;
        const actions = [panelLabel(this.translator, 'tasks', 'enterReview', 'enter review')];
        if (selected && this.canCancelTask(selected)) {
            actions.push(panelLabel(this.translator, 'tasks', 'cancelX', 'x cancel'), panelLabel(this.translator, 'tasks', 'cancelEsc', 'esc cancel'));
        } else {
            actions.push(panelLabel(this.translator, 'tasks', 'esc', 'esc'));
        }
        if (selected && this.canRetryTask(selected)) {
            actions.push(panelLabel(this.translator, 'tasks', 'retry', 'r retry'));
        }
        if (selected && this.canRollbackTask(selected)) {
            actions.push(panelLabel(this.translator, 'tasks', 'rollback', 'b rollback'));
        }
        if (selected && this.canFocusLineage(selected)) {
            actions.push(panelLabel(this.translator, 'tasks', 'lineage', 'l lineage'));
        }
        actions.push(panelLabel(this.translator, 'tasks', 'failed', 'f failed'), panelLabel(this.translator, 'tasks', 'rollbackAll', 'v rollback'), panelLabel(this.translator, 'tasks', 'all', 'u all'));
        actions.push(panelLabel(this.translator, 'tasks', 'copy', 'y copy'));
        return `${panelLabel(this.translator, 'tasks', 'move', 'up/down move')}   ${panelLabel(this.translator, 'tasks', 'pageJump', 'pg jump')}   ${actions.join('   ')}`;
    }


}

