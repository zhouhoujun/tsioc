import type { TranslatorService } from '@tsdi/i18n';
import type { AgentConsolePlanTodoItem, AgentConsoleReviewTaskItem, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';

/** Task panel summary/detail projection split from the view component. */
export abstract class AgentConsoleTaskPanelDetailHost {
    protected abstract state: AgentConsoleSessionState;
    protected abstract translator?: TranslatorService;
    protected abstract get tasks(): AgentConsoleReviewTaskItem[];

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
