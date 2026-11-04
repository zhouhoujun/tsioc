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
@Component({
    selector: 'agent-console-tasks-panel',
    imports: [ListPanelComponent],
    template: `
    <common-list-panel :header="tasksSummaryLabel" :contextLines="backgroundTaskFeedLines" :hint="tasksHintLabel" :items="taskDisplayItems" :detailLines="selectedTaskDetailLines" :ariaLabel="accessibilityLabel" :showClose="false"></common-list-panel>
    `
})
export class AgentConsoleTasksPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
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

    get selectedTaskDetailLabel(): string {
        if (!this.shouldShow || !this.state.tasksFocused) {
            return '';
        }
        if (this.shouldShowPlanTodos) {
            const planDetail = this.state.selectedPlanTodoDetailLabel;
            if (planDetail) {
                return planDetail;
            }
            return this.projectSummaryDetail;
        }
        if (!this.state.selectedTask) {
            if (this.state.reviewTaskChoices.length && !this.tasks.length) {
                return panelLabel(this.translator, 'tasks', 'emptyFilter', 'No tasks matched filter {filter}.', { filter: this.taskFilterLabel });
            }
            return '';
        }
        const task = this.state.selectedTask;
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        const checkpointSummary = checkpoints.length
            ? panelLabel(this.translator, 'tasks', 'checkpointSummary', '{total} total · {available} available', { total: checkpoints.length, available: checkpoints.filter((entry: any) => entry?.status === 'available').length })
            : panelLabel(this.translator, 'tasks', 'checkpointNone', 'none');
        const rollback = task?.result?.rollback;
        const aggregate = task?.result?.aggregate;
        const retrySourceTaskId = typeof task?.metadata?.retrySourceTaskId === 'string' && task.metadata.retrySourceTaskId
            ? task.metadata.retrySourceTaskId
            : typeof task?.metadata?.retryOfTaskId === 'string' && task.metadata.retryOfTaskId
                ? task.metadata.retryOfTaskId
                : '';
        const retryWorkerIds = Array.isArray(task?.metadata?.retryOfWorkerIds)
            ? task.metadata.retryOfWorkerIds.filter((item: any) => typeof item === 'string' && item)
            : [];
        const carryForwardWorkerIds = Array.isArray(task?.metadata?.carryForwardWorkerIds)
            ? task.metadata.carryForwardWorkerIds.filter((item: any) => typeof item === 'string' && item)
            : [];
        const retryDepth = typeof task?.metadata?.retrySequence === 'number'
            ? task.metadata.retrySequence
            : undefined;
        const lineageTaskCount = this.state.reviewTaskChoices.find(item => item.id === task.id)?.lineageTaskCount;
        const rollbackMode = rollback?.mode ? ` (${rollback.mode})` : '';
        const rollbackLabel = rollback?.available === true
            ? panelLabel(this.translator, 'tasks', 'rollbackAvailableOption', 'available{mode}', { mode: rollbackMode })
            : rollback?.rolledBackAt
                ? panelLabel(this.translator, 'tasks', 'rollbackAppliedOption', 'applied{mode}', { mode: rollbackMode })
                : panelLabel(this.translator, 'tasks', 'rollbackUnavailableOption', 'unavailable');
        const workerStatus = aggregate ? panelLabel(this.translator, 'tasks', 'workerStatusLine', '{status} · {completed}/{total} completed', { status: aggregate.status, completed: aggregate.completedWorkers, total: aggregate.totalWorkers }) + (aggregate.failedWorkers ? panelLabel(this.translator, 'tasks', 'workerStatusFailed', ' · {count} failed', { count: aggregate.failedWorkers }) : '') : '';
        const isolatedFailureLabel = Array.isArray(aggregate?.isolatedFailures) && aggregate.isolatedFailures.length
            ? panelLabel(this.translator, 'tasks', 'workerFailuresLabel', 'worker failures {list}', { list: aggregate.isolatedFailures.slice(0, 2).map((failure: any) => `${failure.workerId}: ${failure.error}`).join(' · ') })
            : '';
        const parts = [
            this.projectSummaryDetail,
            panelLabel(this.translator, 'tasks', 'detailTitleLabel', 'title {value}', { value: task.title || task.id }),
            task?.sourceSessionId ? panelLabel(this.translator, 'tasks', 'detailSessionLabel', 'session {id}', { id: task.sourceSessionId }) : '',
            task.status ? panelLabel(this.translator, 'tasks', 'detailStatusLabel', 'status {status}', { status: task.status }) : '',
            task?.result?.executionMode || task?.metadata?.executionMode ? panelLabel(this.translator, 'tasks', 'detailModeLabel', 'mode {value}', { value: task?.result?.executionMode || task?.metadata?.executionMode }) : '',
            task?.planning?.summary ? panelLabel(this.translator, 'tasks', 'detailPlanLabel', 'plan {value}', { value: task.planning.summary }) : '',
            task?.goal ? panelLabel(this.translator, 'tasks', 'detailGoalLabel', 'goal {value}', { value: task.goal }) : '',
            panelLabel(this.translator, 'tasks', 'detailActionsLabel', 'actions {count}', { count: (task.actions || []).length }),
            panelLabel(this.translator, 'tasks', 'detailWorkersLabel', 'workers {count}', { count: Array.isArray(task?.result?.workers) ? task.result.workers.length : 0 }),
            retryDepth !== undefined ? panelLabel(this.translator, 'tasks', 'retryDepthLabel', 'retry depth {depth}', { depth: retryDepth }) : '',
            typeof lineageTaskCount === 'number' && lineageTaskCount > 1 ? panelLabel(this.translator, 'tasks', 'detailLineageTasksLabel', 'lineage tasks {count}', { count: lineageTaskCount }) : '',
            retrySourceTaskId ? panelLabel(this.translator, 'tasks', 'detailRetryLabel', 'retry {id}', { id: retrySourceTaskId }) : '',
            retryWorkerIds.length ? panelLabel(this.translator, 'tasks', 'retryWorkersLabel', 'retry workers {ids}', { ids: retryWorkerIds.join(', ') }) : '',
            carryForwardWorkerIds.length ? panelLabel(this.translator, 'tasks', 'detailCarryForwardLabel', 'carry forward {ids}', { ids: carryForwardWorkerIds.join(', ') }) : '',
            workerStatus ? panelLabel(this.translator, 'tasks', 'detailWorkerStatusLabel', 'worker status {value}', { value: workerStatus }) : '',
            isolatedFailureLabel,
            panelLabel(this.translator, 'tasks', 'detailRollbackLabel', 'rollback {value}', { value: rollbackLabel }),
            panelLabel(this.translator, 'tasks', 'detailCheckpointsLabel', 'checkpoints {summary}', { summary: checkpointSummary }),
            task?.result?.diff?.summary ? panelLabel(this.translator, 'tasks', 'detailDiffLabel', 'diff {summary}', { summary: task.result.diff.summary }) : ''
        ].filter(Boolean);

        const actionLines = (task.actions || []).map((action: any, index: number) => {
            const actionMeta = [
                action?.status || 'unknown',
                action?.tool || '',
                action?.workerId ? panelLabel(this.translator, 'tasks', 'actionWorker', 'worker {id}', { id: action.workerId }) : ''
            ].filter(Boolean).join(' · ');
            return `${index + 1}. ${action?.title || action?.id || panelLabel(this.translator, 'tasks', 'actionFallback', 'action')}${actionMeta ? ` (${actionMeta})` : ''}`;
        });

        return [...parts, ...actionLines].join('\n');
    }

    protected get projectSummaryDetail(): string {
        const summary = String(this.state.projectSummary || '').trim();
        if (!summary) return '';
        const limit = Math.max(1, this.state.consoleOptions.summaryMaxLength);
        return panelLabel(this.translator, 'tasks', 'summaryPrefix', 'summary {value}', { value: summary.length > limit ? `${summary.slice(0, limit - 1).trimEnd()}…` : summary });
    }

    get shouldShow(): boolean {
        return this.state.tasksFocused;
    }

    protected get shouldShowPlanTodos(): boolean {
        return this.state.hasActivePlanTodos();
    }

    protected get taskFilterLabel(): string {
        const filter = this.state.selectedTaskFilter;
        if (filter === 'lineage' && this.state.selectedTaskLineageRootId) return panelLabel(this.translator, 'tasks', 'filterLineageRoot', 'lineage {id}', { id: this.state.selectedTaskLineageRootId });
        const key = filter === 'failed' ? 'filterFailed' : filter === 'rollback' ? 'filterRollback' : filter === 'lineage' ? 'filterLineage' : 'filterAll';
        return panelLabel(this.translator, 'tasks', key, filter === 'lineage' ? 'lineage' : filter);
    }

    protected todoStatusMark(status: AgentConsolePlanTodoItem['status']): string {
        switch (status) {
            case 'completed':
                return 'x';
            case 'cancelled':
                return '-';
            case 'in_progress':
                return '>';
            default:
                return ' ';
        }
    }

    protected canCancelTask(task: any): boolean {
        const status = String(task?.status || '').trim();
        return status === 'planned' || status === 'running';
    }

    protected canRollbackTask(task: any): boolean {
        if (!task) {
            return false;
        }
        if (task?.result?.rollback?.available === true) {
            return true;
        }
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        return checkpoints.some((entry: any) => entry?.status === 'available');
    }

    protected canRetryTask(task: any): boolean {
        if (!task) {
            return false;
        }
        const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
        if (workers.some((worker: any) => worker?.status === 'failed')) {
            return true;
        }
        return Number(task?.result?.aggregate?.failedWorkers || 0) > 0;
    }

    protected canFocusLineage(task: any): boolean {
        if (!task) {
            return false;
        }
        const lineageTaskCount = this.state.reviewTaskChoices.find(item => item.id === task.id)?.lineageTaskCount;
        return Number(lineageTaskCount || 0) > 1;
    }
}

