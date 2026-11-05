/**
 * Coding task orchestration handlers for AgentConsoleComponent.
 *
 * Extracted verbatim from the component (P199 batch B): every function keeps
 * the original logic and only receives its component dependencies through a
 * minimal structural context (`CodingTaskHandlerContext`).
 */

import type { AgentScheduler } from '@tsdi/agent';
import { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { fuzzyMatchAgentConsoleCommand } from './AgentConsoleKeymap';
import {
    formatAgentConsoleCommandArgumentTemplate,
    getAgentConsoleCommandDefinition,
    resolveAgentConsoleCommandDescription
} from './AgentConsoleCommandRegistry';
import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { loadProjectCodingTasks } from './AgentConsoleCodingTaskLoad';

// ── Coding task handler context ─────────────────────────────────────────────

export * from './AgentConsoleCodingTaskView';
import {
    resolveCodingTaskSessionId,
    captureTaskViewContext,
    isTaskViewContextCurrent,
    resolveFocusedCodingTask,
    describeCodingTaskRollback,
    describeCodingTaskCheckpointSummary,
    canCancelCodingTask,
    canRollbackCodingTask,
    canRetryCodingTask,
    resolveCodingTaskRetrySourceTaskId,
    buildCodingTaskLineageMetadata,
    buildCodingTaskChoice,
    orderCodingTasksByLineage,
    buildCodingTaskSelectOption
} from './AgentConsoleCodingTaskView';
export interface CodingTaskHandlerState {
    sessionId: string;
    reviewOpen: boolean;
    reviewTask?: Record<string, any> | null | undefined;
    tasksFocused: boolean;
    selectedTask?: Record<string, any> | null;
    selectedScheduledTask?: Record<string, any> | null;
    taskRecords: any[];
    consoleOptions: { selectHint?: string };

    setSessionsFocused(focused: boolean): void;
    setTasksFocused(focused: boolean): void;
    setJobsFocused(focused: boolean): void;
    setToolsFocused(focused: boolean): void;
    setApprovalsFocused(focused: boolean): void;
    closeMessageDetail(): void;
    openReview(task: Record<string, any>, payload: Record<string, any>): void;
    closeReview(): void;
    closeGitSnapshotDetail(): void;
    setNotice(message: string): void;
    setLastError(message: string): void;
    setTaskRecords(tasks: any[]): void;
    setReviewTasks(choices: any[]): void;
    setSelectedReviewTaskId(id: string): void;
    setSelectedScheduledTaskId(id: string): void;
    setScheduledTasks(tasks: any[]): void;
    setTasksCount(count: number): void;
}

export interface CodingTaskHandlerContext {
    translator?: AgentUiTranslator | null;
    state: CodingTaskHandlerState;
    transcriptNavigationController: { setFocused(focused: boolean): void };
    appRpc: { request(method: string, payload?: Record<string, any>, context?: any): Promise<any> } | null | undefined;
    scheduler: AgentScheduler | null;
    notify(message: string, duration?: number): void;
    select(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string): Promise<string | undefined>;
    getTaskViewContextVersion(): number;
    bumpTaskViewContextVersion(): number;
    getOpenReviewRequestId(): number;
    bumpOpenReviewRequestId(): number;
    resolveProjectSessionIdsFor(sessionId: string): string[];
    resolveThreadSessionIdsFor(sessionId?: string): string[];
    restoreReviewAnnotationsCacheFromDiskForScope(scope?: {
        cacheKey?: string;
        selectedTaskId?: string;
        sessionId?: string;
        requestId?: number;
    }): Promise<void>;
}

// ── Helper functions ────────────────────────────────────────────────────────

export async function loadCodingTasks(
    ctx: CodingTaskHandlerContext,
    sessionId = ctx.state.sessionId,
    sessionIds = ctx.resolveProjectSessionIdsFor(sessionId)
): Promise<any[]> {
    if (!ctx.appRpc) {
        if (sessionId === ctx.state.sessionId) {
            ctx.state.setTaskRecords([]);
            ctx.state.setReviewTasks([]);
        }
        return [];
    }
    const tasks = orderCodingTasksByLineage(
        (await loadProjectCodingTasks(ctx.appRpc!, sessionIds))
            .sort((left, right) => {
                const activityDelta = Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0);
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return String(left?.id || '').localeCompare(String(right?.id || ''));
            })
    );
    if (sessionId !== ctx.state.sessionId) {
        return tasks;
    }
    ctx.state.setTaskRecords(tasks);
    ctx.state.setReviewTasks(tasks.map((task: any) => buildCodingTaskChoice(task, tasks)));
    return tasks;
}
export async function selectCodingTask(ctx: CodingTaskHandlerContext, options: {
    title: string;
    unavailableNotice: string;
    emptyNotice: string;
    filter?: (task: any) => boolean;
    selectedTaskId?: string;
    sessionIds?: string[];
}): Promise<any | null> {
    if (!ctx.appRpc) {
        ctx.notify(options.unavailableNotice);
        return null;
    }
    const tasks = await loadCodingTasks(ctx, undefined, options.sessionIds);
    const filteredTasks = typeof options.filter === 'function'
        ? tasks.filter(task => options.filter!(task))
        : tasks;
    if (!filteredTasks.length) {
        ctx.notify(options.emptyNotice);
        return null;
    }
    const selectedIndex = Math.max(0, filteredTasks.findIndex(task => task?.id === options.selectedTaskId));
    const selectedTaskId = await ctx.select(
        options.title,
        filteredTasks.map((task: any) => buildCodingTaskSelectOption(task, filteredTasks, ctx.translator)),
        selectedIndex,
        ctx.state.consoleOptions.selectHint
    );
    if (!selectedTaskId) {
        return null;
    }
    return filteredTasks.find((task: any) => task.id === selectedTaskId) || null;
}

export async function openCodingTaskReview(
    ctx: CodingTaskHandlerContext,
    taskId: string,
    taskRecord?: Record<string, any> | null,
    options?: { returnFalseOnStale?: boolean }
): Promise<boolean> {
    const resolvedTaskId = String(taskId || '').trim();
    if (!resolvedTaskId) { ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewTaskId')); return false; }
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'));
        return false;
    }
    const taskViewContextVersion = ctx.bumpTaskViewContextVersion();
    const requestId = ctx.bumpOpenReviewRequestId();

    const resolvedTask = taskRecord ?? ctx.state.taskRecords.find(task => task?.id === resolvedTaskId) ?? null;
    const sessionId = resolveCodingTaskSessionId(ctx, resolvedTask);
    const [loadedTask, diffResult] = await Promise.all([
        resolvedTask ? Promise.resolve(resolvedTask) : ctx.appRpc.request('coding_task.get', { sessionId, taskId: resolvedTaskId }).then(result => result?.task ?? null),
        ctx.appRpc.request('coding_task.diff', { sessionId, taskId: resolvedTaskId })
    ]);
    if (requestId !== ctx.getOpenReviewRequestId() || taskViewContextVersion !== ctx.getTaskViewContextVersion()) {
        return options?.returnFalseOnStale ? false : true;
    }

    if (!loadedTask && !diffResult?.diff && !Array.isArray(diffResult?.workers)) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'codingTaskNotFound', { taskId: resolvedTaskId }));
        return false;
    }

    const reviewTask = loadedTask || {
        id: resolvedTaskId,
        title: resolvedTaskId,
        sourceSessionId: sessionId,
        status: 'unknown',
        metadata: {
            executionMode: diffResult?.executionMode ?? null
        }
    };

        ctx.state.setSessionsFocused(false);
        ctx.state.setTasksFocused(false);
        ctx.state.setJobsFocused(false);
        ctx.state.setToolsFocused(false);
        ctx.state.setApprovalsFocused(false);
        ctx.transcriptNavigationController.setFocused(false);
        ctx.state.closeMessageDetail();
        ctx.state.openReview(reviewTask, {
            diff: diffResult?.diff ?? null,
            workers: Array.isArray(diffResult?.workers) ? diffResult.workers : [],
            executionMode: diffResult?.executionMode ?? null
        });
        ctx.state.setNotice('');
        ctx.state.setLastError('');
    await ctx.restoreReviewAnnotationsCacheFromDiskForScope({
        cacheKey: `${String(reviewTask?.sourceSessionId || reviewTask?.sessionId || sessionId || '').trim()}:${resolvedTaskId}`.replace(/^:/, ''),
        selectedTaskId: resolvedTaskId,
        sessionId: String(reviewTask?.sourceSessionId || reviewTask?.sessionId || sessionId || '').trim(),
        requestId
    });
    return true;
}

export async function openCodingTaskReviewSelector(ctx: CodingTaskHandlerContext): Promise<boolean> {
    const selectedTask = await selectCodingTask(ctx, {
        title: panelLabel(ctx.translator, 'select', 'codingTasks', 'Coding tasks'),
        unavailableNotice: formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'),
        emptyNotice: formatAgentUiNotice(ctx.translator, 'codingTasksAvailable'),
        selectedTaskId: String(ctx.state.reviewTask?.id || ctx.state.selectedTask?.id || '').trim() || undefined
    });
    if (!selectedTask) {
        return true;
    }
    await openCodingTaskReview(ctx, selectedTask.id, selectedTask);
    return true;
}

export async function openThreadCodingTaskReviewSelector(ctx: CodingTaskHandlerContext): Promise<boolean> {
    const selectedTask = await selectCodingTask(ctx, {
        title: panelLabel(ctx.translator, 'select', 'codingTasksThread', 'Coding task thread'),
        unavailableNotice: formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'),
        emptyNotice: formatAgentUiNotice(ctx.translator, 'codingTasksThreadAvailable'),
        selectedTaskId: String(ctx.state.reviewTask?.id || ctx.state.selectedTask?.id || '').trim() || undefined,
        sessionIds: ctx.resolveThreadSessionIdsFor()
    });
    if (!selectedTask) {
        return true;
    }
    await openCodingTaskReview(ctx, selectedTask.id, selectedTask);
    return true;
}

export async function openCodingTaskInspector(ctx: CodingTaskHandlerContext, taskId?: string, options?: { returnFalseOnStale?: boolean }): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'taskInspectorUnavailable'));
        return true;
    }
    const taskViewContextVersion = ctx.bumpTaskViewContextVersion();
    const tasks = await loadCodingTasks(ctx);
    if (taskViewContextVersion !== ctx.getTaskViewContextVersion()) {
        return options?.returnFalseOnStale ? false : true;
    }
    if (!tasks.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'codingTasksAvailable'));
        return true;
    }
    const resolvedTaskId = String(taskId || '').trim();
    const preferredTaskId = String(ctx.state.reviewTask?.id || ctx.state.selectedTask?.id || '').trim();
    const selectedTaskId = resolvedTaskId && tasks.some((task: any) => task.id === resolvedTaskId)
        ? resolvedTaskId
        : preferredTaskId && tasks.some((task: any) => task.id === preferredTaskId)
            ? preferredTaskId
            : tasks[0].id;
        ctx.state.setSessionsFocused(false);
        ctx.state.setToolsFocused(false);
        ctx.state.setApprovalsFocused(false);
        ctx.state.setJobsFocused(false);
        ctx.transcriptNavigationController.setFocused(false);
        ctx.state.closeMessageDetail();
        ctx.state.closeReview();
        ctx.state.closeGitSnapshotDetail();
        ctx.state.setSelectedReviewTaskId(selectedTaskId);
        ctx.state.setTasksFocused(true);
        ctx.state.setNotice('');
        ctx.state.setLastError('');
    return true;
}

export async function rollbackCodingTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const fallbackTask = resolveFocusedCodingTask(ctx);
    const explicitTaskId = String(taskId || '').trim();
    let selectedTask = fallbackTask || null;
    let resolvedTaskId = explicitTaskId || String(fallbackTask?.id || '').trim();
    if (!resolvedTaskId || (!explicitTaskId && selectedTask && !canRollbackCodingTask(selectedTask))) {
        selectedTask = await selectCodingTask(ctx, {
            title: panelLabel(ctx.translator, 'tasks', 'rollbackSelectTitle', 'Rollback coding tasks'),
            unavailableNotice: panelLabel(ctx.translator, 'tasks', 'rollbackUnavailableApp', 'Rollback is unavailable without app RPC.'),
            emptyNotice: panelLabel(ctx.translator, 'tasks', 'noRollbackableTasks', 'No rollbackable coding tasks available.'),
            filter: (task: any) => canRollbackCodingTask(task),
            selectedTaskId: String(fallbackTask?.id || '').trim() || undefined
        });
        if (!selectedTask) {
            return true;
        }
        resolvedTaskId = String(selectedTask.id || '').trim();
    }
    if (!resolvedTaskId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'rollbackTaskId'));
        return true;
    }
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'rollbackUnavailableApp'));
        return true;
    }
    if (selectedTask && selectedTask.id === resolvedTaskId && !canRollbackCodingTask(selectedTask)) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'rollbackUnavailable', { resolvedTaskId: resolvedTaskId }));
        return true;
    }

    const sessionId = resolveCodingTaskSessionId(ctx, selectedTask);
    const taskViewContext = captureTaskViewContext(ctx);
    const result = await ctx.appRpc.request('coding_task.rollback', { sessionId, taskId: resolvedTaskId });
    if (result?.rolledBack !== true) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'rollbackFailed', { resolvedTaskId: resolvedTaskId }));
        return true;
    }
    if (!isTaskViewContextCurrent(ctx, taskViewContext)) {
        return true;
    }

    const opened = await openCodingTaskReview(ctx, resolvedTaskId, result?.task ?? null, { returnFalseOnStale: true });
    if (!opened || sessionId !== ctx.state.sessionId) {
        return true;
    }
    ctx.notify(formatAgentUiNotice(ctx.translator, 'rolledBack', { resolvedTaskId: resolvedTaskId }));
    return true;
}

export async function retryFailedCodingTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const fallbackTask = resolveFocusedCodingTask(ctx);
    const explicitTaskId = String(taskId || '').trim();
    let selectedTask = fallbackTask || null;
    let resolvedTaskId = explicitTaskId || String(fallbackTask?.id || '').trim();
    if (!resolvedTaskId || (!explicitTaskId && selectedTask && !canRetryCodingTask(selectedTask))) {
        selectedTask = await selectCodingTask(ctx, {
            title: panelLabel(ctx.translator, 'tasks', 'retrySelectTitle', 'Retry coding tasks'),
            unavailableNotice: panelLabel(ctx.translator, 'tasks', 'retryUnavailableApp', 'Retry is unavailable without app RPC.'),
            emptyNotice: panelLabel(ctx.translator, 'tasks', 'noRetryableTasks', 'No retryable coding tasks available.'),
            filter: (task: any) => canRetryCodingTask(task),
            selectedTaskId: String(fallbackTask?.id || '').trim() || undefined
        });
        if (!selectedTask) {
            return true;
        }
        resolvedTaskId = String(selectedTask.id || '').trim();
    }
    if (!resolvedTaskId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'retryTaskId'));
        return true;
    }
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'retryUnavailableApp'));
        return true;
    }
    if (selectedTask && selectedTask.id === resolvedTaskId && !canRetryCodingTask(selectedTask)) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'retryUnavailable', { resolvedTaskId: resolvedTaskId }));
        return true;
    }

    const sessionId = resolveCodingTaskSessionId(ctx, selectedTask);
    const taskViewContext = captureTaskViewContext(ctx);
    const result = await ctx.appRpc.request('coding_task.retry_failed', { sessionId, taskId: resolvedTaskId });
    if (result?.retried !== true || !result?.task?.id) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'retryFailedForTask', { resolvedTaskId: resolvedTaskId }));
        return true;
    }
    if (!isTaskViewContextCurrent(ctx, taskViewContext)) {
        return true;
    }

    const opened = await openCodingTaskReview(ctx, result.task.id, result.task, { returnFalseOnStale: true });
    if (!opened || sessionId !== ctx.state.sessionId) {
        return true;
    }
    ctx.notify(formatAgentUiNotice(ctx.translator, 'retriedFailedWorkers', { resolvedTaskId: resolvedTaskId, id: result.task.id }));
    return true;
}

export async function cancelCodingTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'cancelTaskId'));
        return true;
    }
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'cancelUnavailableApp'));
        return true;
    }
    const targetTask = ctx.state.selectedTask;
    if (targetTask && targetTask.id === resolvedTaskId && !canCancelCodingTask(targetTask)) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'cancelUnavailable', { resolvedTaskId: resolvedTaskId }));
        return true;
    }

    const sessionId = resolveCodingTaskSessionId(ctx, targetTask);
    const taskViewContext = captureTaskViewContext(ctx);
    const result = await ctx.appRpc.request('coding_task.cancel', { sessionId, taskId: resolvedTaskId });
    if (result?.cancelled !== true) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'cancelFailed', { resolvedTaskId: resolvedTaskId }));
        return true;
    }
    if (!isTaskViewContextCurrent(ctx, taskViewContext)) {
        return true;
    }

    const opened = await openCodingTaskInspector(ctx, resolvedTaskId, { returnFalseOnStale: true });
    if (!opened || sessionId !== ctx.state.sessionId) {
        return true;
    }
    ctx.notify(formatAgentUiNotice(ctx.translator, 'cancelledTask', { resolvedTaskId: resolvedTaskId }));
    return true;
}

// ── Scheduled tasks ─────────────────────────────────────────────────────────

export {
    refreshScheduledTasks,
    openScheduledJobsDashboard,
    toggleScheduledTask,
    pauseScheduledTask,
    resumeScheduledTask,
    cancelScheduledTask,
    recoverScheduledTask
} from './AgentConsoleScheduledTaskHandlers';
