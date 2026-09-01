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
import { AGENT_CONSOLE_OVERLAY_HINTS, AGENT_CONSOLE_OVERLAY_TITLES } from './AgentConsoleOverlayPresenter';

// ── Coding task handler context ─────────────────────────────────────────────

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
    setMessagesFocused(focused: boolean): void;
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
    state: CodingTaskHandlerState;
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

export function resolveCodingTaskSessionId(ctx: CodingTaskHandlerContext, task?: Record<string, any> | null): string {
    const sessionId = String(task?.sourceSessionId || task?.sessionId || '').trim();
    return sessionId || ctx.state.sessionId;
}

export function captureTaskViewContext(ctx: CodingTaskHandlerContext): { sessionId: string; version: number } {
    return {
        sessionId: ctx.state.sessionId,
        version: ctx.getTaskViewContextVersion()
    };
}

export function isTaskViewContextCurrent(ctx: CodingTaskHandlerContext, context: { sessionId: string; version: number }): boolean {
    return context.sessionId === ctx.state.sessionId && context.version === ctx.getTaskViewContextVersion();
}

export function resolveFocusedCodingTask(ctx: CodingTaskHandlerContext): Record<string, any> | null {
    if (ctx.state.reviewOpen && ctx.state.reviewTask) {
        return ctx.state.reviewTask;
    }
    if (ctx.state.tasksFocused && ctx.state.selectedTask) {
        return ctx.state.selectedTask;
    }
    return null;
}

// ── Coding task inspection / selection ───────────────────────────────────────

export function describeCodingTaskRollback(task: any): string {
    const rollback = task?.result?.rollback;
    if (rollback?.available === true) {
        return rollback.mode ? `rollback ready (${rollback.mode})` : 'rollback ready';
    }
    if (rollback?.rolledBackAt) {
        return rollback.mode ? `rolled back (${rollback.mode})` : 'rolled back';
    }
    const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
    const availableCheckpoint = checkpoints.find((entry: any) => entry?.status === 'available');
    if (availableCheckpoint) {
        return availableCheckpoint.mode ? `rollback ready (${availableCheckpoint.mode})` : 'rollback ready';
    }
    return 'rollback unavailable';
}

export function describeCodingTaskCheckpointSummary(task: any): string | undefined {
    const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
    if (!checkpoints.length) {
        return undefined;
    }
    const available = checkpoints.filter((entry: any) => entry?.status === 'available').length;
    const applied = checkpoints.filter((entry: any) => entry?.status === 'applied').length;
    const invalidated = checkpoints.filter((entry: any) => entry?.status === 'invalidated').length;
    return `${checkpoints.length} total · ${available} available · ${applied} applied · ${invalidated} invalidated`;
}

export function canCancelCodingTask(task: any): boolean {
    const status = String(task?.status || '').trim();
    return status === 'planned' || status === 'running';
}

export function canRollbackCodingTask(task: any): boolean {
    if (!task) {
        return false;
    }
    if (task?.result?.rollback?.available === true) {
        return true;
    }
    const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
    return checkpoints.some((entry: any) => entry?.status === 'available');
}

export function canRetryCodingTask(task: any): boolean {
    if (!task) {
        return false;
    }
    const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
    if (workers.some((worker: any) => worker?.status === 'failed')) {
        return true;
    }
    return Number(task?.result?.aggregate?.failedWorkers || 0) > 0;
}

export function resolveCodingTaskRetrySourceTaskId(task: any): string | undefined {
    const value = task?.retryOfTaskId || task?.metadata?.retrySourceTaskId || task?.metadata?.retryOfTaskId;
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function buildCodingTaskLineageMetadata(task: any, tasks: any[]): {
    retryOfTaskId?: string;
    lineageRootTaskId: string;
    retryDepth?: number;
    lineageTaskCount: number;
} {
    const taskId = String(task?.id || '').trim();
    const retryOfTaskId = resolveCodingTaskRetrySourceTaskId(task);
    const taskById = new Map<string, any>(tasks
        .filter(item => typeof item?.id === 'string' && item.id.trim())
        .map(item => [String(item.id).trim(), item]));
    const seen = new Set<string>();
    let lineageRootTaskId = taskId;
    let retryDepth = 0;
    let currentRetrySource = retryOfTaskId;
    while (currentRetrySource && !seen.has(currentRetrySource)) {
        seen.add(currentRetrySource);
        lineageRootTaskId = currentRetrySource;
        retryDepth += 1;
        const nextTask = taskById.get(currentRetrySource);
        currentRetrySource = nextTask ? resolveCodingTaskRetrySourceTaskId(nextTask) : undefined;
    }
    const lineageTaskCount = tasks.filter(item => {
        const itemId = String(item?.id || '').trim();
        if (!itemId) {
            return false;
        }
        if (itemId === lineageRootTaskId) {
            return true;
        }
        const source = resolveCodingTaskRetrySourceTaskId(item);
        if (!source) {
            return false;
        }
        const itemSeen = new Set<string>();
        let current: string | undefined = source;
        while (current && !itemSeen.has(current)) {
            if (current === lineageRootTaskId) {
                return true;
            }
            itemSeen.add(current);
            const nextTask = taskById.get(current);
            current = nextTask ? resolveCodingTaskRetrySourceTaskId(nextTask) : undefined;
        }
        return false;
    }).length || 1;
    return {
        ...(retryOfTaskId ? { retryOfTaskId } : {}),
        lineageRootTaskId: lineageRootTaskId || taskId,
        ...(retryDepth > 0 ? { retryDepth } : {}),
        lineageTaskCount
    };
}

export function buildCodingTaskChoice(task: any, tasks: any[] = []) {
    const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
    const rollback = task?.result?.rollback;
    const lineage = buildCodingTaskLineageMetadata(task, tasks.length ? tasks : [task]);
    return {
        id: task.id,
        title: String(task.title || task.id),
        sourceSessionId: String(task?.sourceSessionId || task?.sessionId || '').trim() || undefined,
        status: task.status,
        executionMode: task?.result?.executionMode ?? task?.metadata?.executionMode ?? null,
        workerCount: workers.length,
        rollbackAvailable: canRollbackCodingTask(task),
        rollbackMode: rollback?.mode,
        checkpointSummary: describeCodingTaskCheckpointSummary(task),
        retryOfTaskId: lineage.retryOfTaskId,
        lineageRootTaskId: lineage.lineageRootTaskId,
        retryDepth: lineage.retryDepth,
        lineageTaskCount: lineage.lineageTaskCount,
        updatedAt: task.updatedAt,
        detail: task?.result?.diff?.summary || task?.planning?.summary || task?.goal
    };
}

export function orderCodingTasksByLineage(tasks: any[]): any[] {
    const tasksById = new Map<string, any>(tasks
        .filter(task => typeof task?.id === 'string' && task.id.trim())
        .map(task => [String(task.id).trim(), task]));
    const childrenByParent = new Map<string, any[]>();
    const roots: any[] = [];

    for (const task of tasks) {
        const parentId = resolveCodingTaskRetrySourceTaskId(task);
        if (!parentId || !tasksById.has(parentId)) {
            roots.push(task);
            continue;
        }
        const siblings = childrenByParent.get(parentId) || [];
        siblings.push(task);
        childrenByParent.set(parentId, siblings);
    }

    const compareByUpdatedAt = (left: any, right: any) => {
        const activityDelta = Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0);
        if (activityDelta !== 0) {
            return activityDelta;
        }
        return String(left?.id || '').localeCompare(String(right?.id || ''));
    };
    const computeFamilyUpdatedAt = (task: any, seen = new Set<string>()): number => {
        const taskId = String(task?.id || '').trim();
        if (!taskId || seen.has(taskId)) {
            return Number(task?.updatedAt || 0);
        }
        seen.add(taskId);
        const childMax = (childrenByParent.get(taskId) || [])
            .reduce((max, child) => Math.max(max, computeFamilyUpdatedAt(child, new Set(seen))), 0);
        return Math.max(Number(task?.updatedAt || 0), childMax);
    };

    roots.sort((left, right) => {
        const activityDelta = computeFamilyUpdatedAt(right) - computeFamilyUpdatedAt(left);
        if (activityDelta !== 0) {
            return activityDelta;
        }
        return compareByUpdatedAt(left, right);
    });
    for (const siblings of childrenByParent.values()) {
        siblings.sort(compareByUpdatedAt);
    }

    const ordered: any[] = [];
    const visited = new Set<string>();
    const visit = (task: any) => {
        const taskId = String(task?.id || '').trim();
        if (!taskId || visited.has(taskId)) {
            return;
        }
        visited.add(taskId);
        ordered.push(task);
        for (const child of childrenByParent.get(taskId) || []) {
            visit(child);
        }
    };

    for (const root of roots) {
        visit(root);
    }
    const remaining = tasks.filter(task => !visited.has(String(task?.id || '')?.trim())).sort(compareByUpdatedAt);
    for (const task of remaining) {
        visit(task);
    }
    return ordered;
}

export function buildCodingTaskSelectOption(task: any, tasks: any[] = []): AgentConsoleSelectOption {
    const choice = buildCodingTaskChoice(task, tasks);
    const lineageSegments = choice.retryOfTaskId
        ? [
            `retry ${typeof choice.retryDepth === 'number' ? choice.retryDepth : 1}`,
            `from ${choice.retryOfTaskId}`
        ]
        : ['root'];
    if (typeof choice.lineageTaskCount === 'number') {
        lineageSegments.push(`lineage ${choice.lineageTaskCount}`);
    }
    return {
        label: `${choice.id} · ${choice.title}`,
        value: choice.id,
        description: [
            ...lineageSegments,
            choice.sourceSessionId ? `session ${choice.sourceSessionId}` : '',
            choice.status,
            choice.executionMode,
            `${choice.workerCount || 0} worker${choice.workerCount === 1 ? '' : 's'}`,
            describeCodingTaskRollback(task)
        ].filter(Boolean).join(' · ') || 'review',
        detail: [
            `Task: ${choice.id}`,
            `Title: ${choice.title}`,
            choice.sourceSessionId ? `Session: ${choice.sourceSessionId}` : '',
            choice.status ? `Status: ${choice.status}` : '',
            choice.executionMode ? `Mode: ${choice.executionMode}` : '',
            choice.retryOfTaskId ? `Retry Of: ${choice.retryOfTaskId}` : '',
            choice.lineageRootTaskId ? `Lineage Root: ${choice.lineageRootTaskId}` : '',
            typeof choice.retryDepth === 'number' ? `Retry Depth: ${choice.retryDepth}` : '',
            typeof choice.lineageTaskCount === 'number' && choice.lineageTaskCount > 1 ? `Lineage Tasks: ${choice.lineageTaskCount}` : '',
            `Workers: ${choice.workerCount || 0}`,
            `Rollback: ${describeCodingTaskRollback(task)}`,
            choice.checkpointSummary ? `Checkpoints: ${choice.checkpointSummary}` : '',
            task?.result?.diff?.summary ? `Diff: ${task.result.diff.summary}` : '',
            task?.planning?.summary ? `Plan: ${task.planning.summary}` : '',
            task?.goal ? `Goal: ${task.goal}` : ''
        ].filter(Boolean).join('\n')
    };
}

// ── Async operations ────────────────────────────────────────────────────────

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
    const responses = await Promise.allSettled(sessionIds.map(async sid => {
        const result = await ctx.appRpc!.request('coding_task.list', { sessionId: sid });
        const tasks = Array.isArray(result?.tasks) ? result.tasks : [];
        return tasks.map((task: any) => ({
            ...task,
            sourceSessionId: sid
        }));
    }));
    const tasks = orderCodingTasksByLineage(
        responses
            .flatMap(result => result.status === 'fulfilled' ? result.value : [])
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
        filteredTasks.map((task: any) => buildCodingTaskSelectOption(task, filteredTasks)),
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
    if (!resolvedTaskId) {
        ctx.notify('Review task id is required.');
        return false;
    }
    if (!ctx.appRpc) {
        ctx.notify('Review is unavailable without app RPC.');
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
        ctx.notify(`Coding task "${resolvedTaskId}" was not found.`);
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
        ctx.state.setMessagesFocused(false);
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
        title: AGENT_CONSOLE_OVERLAY_TITLES.codingTasks,
        unavailableNotice: 'Review is unavailable without app RPC.',
        emptyNotice: 'No coding tasks available.',
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
        title: AGENT_CONSOLE_OVERLAY_TITLES.codingTasksThread,
        unavailableNotice: 'Review is unavailable without app RPC.',
        emptyNotice: 'No coding tasks available in this thread.',
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
        ctx.notify('Task inspector is unavailable without app RPC.');
        return true;
    }
    const taskViewContextVersion = ctx.bumpTaskViewContextVersion();
    const tasks = await loadCodingTasks(ctx);
    if (taskViewContextVersion !== ctx.getTaskViewContextVersion()) {
        return options?.returnFalseOnStale ? false : true;
    }
    if (!tasks.length) {
        ctx.notify('No coding tasks available.');
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
        ctx.state.setMessagesFocused(false);
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
            title: 'Rollback coding tasks',
            unavailableNotice: 'Rollback is unavailable without app RPC.',
            emptyNotice: 'No rollbackable coding tasks available.',
            filter: (task: any) => canRollbackCodingTask(task),
            selectedTaskId: String(fallbackTask?.id || '').trim() || undefined
        });
        if (!selectedTask) {
            return true;
        }
        resolvedTaskId = String(selectedTask.id || '').trim();
    }
    if (!resolvedTaskId) {
        ctx.notify('Rollback task id is required.');
        return true;
    }
    if (!ctx.appRpc) {
        ctx.notify('Rollback is unavailable without app RPC.');
        return true;
    }
    if (selectedTask && selectedTask.id === resolvedTaskId && !canRollbackCodingTask(selectedTask)) {
        ctx.notify(`Rollback is unavailable for ${resolvedTaskId}.`);
        return true;
    }

    const sessionId = resolveCodingTaskSessionId(ctx, selectedTask);
    const taskViewContext = captureTaskViewContext(ctx);
    const result = await ctx.appRpc.request('coding_task.rollback', { sessionId, taskId: resolvedTaskId });
    if (result?.rolledBack !== true) {
        ctx.notify(`Rollback failed for ${resolvedTaskId}.`);
        return true;
    }
    if (!isTaskViewContextCurrent(ctx, taskViewContext)) {
        return true;
    }

    const opened = await openCodingTaskReview(ctx, resolvedTaskId, result?.task ?? null, { returnFalseOnStale: true });
    if (!opened || sessionId !== ctx.state.sessionId) {
        return true;
    }
    ctx.notify(`Rolled back ${resolvedTaskId}.`);
    return true;
}

export async function retryFailedCodingTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const fallbackTask = resolveFocusedCodingTask(ctx);
    const explicitTaskId = String(taskId || '').trim();
    let selectedTask = fallbackTask || null;
    let resolvedTaskId = explicitTaskId || String(fallbackTask?.id || '').trim();
    if (!resolvedTaskId || (!explicitTaskId && selectedTask && !canRetryCodingTask(selectedTask))) {
        selectedTask = await selectCodingTask(ctx, {
            title: 'Retry coding tasks',
            unavailableNotice: 'Retry is unavailable without app RPC.',
            emptyNotice: 'No retryable coding tasks available.',
            filter: (task: any) => canRetryCodingTask(task),
            selectedTaskId: String(fallbackTask?.id || '').trim() || undefined
        });
        if (!selectedTask) {
            return true;
        }
        resolvedTaskId = String(selectedTask.id || '').trim();
    }
    if (!resolvedTaskId) {
        ctx.notify('Retry task id is required.');
        return true;
    }
    if (!ctx.appRpc) {
        ctx.notify('Retry is unavailable without app RPC.');
        return true;
    }
    if (selectedTask && selectedTask.id === resolvedTaskId && !canRetryCodingTask(selectedTask)) {
        ctx.notify(`Retry is unavailable for ${resolvedTaskId}.`);
        return true;
    }

    const sessionId = resolveCodingTaskSessionId(ctx, selectedTask);
    const taskViewContext = captureTaskViewContext(ctx);
    const result = await ctx.appRpc.request('coding_task.retry_failed', { sessionId, taskId: resolvedTaskId });
    if (result?.retried !== true || !result?.task?.id) {
        ctx.notify(`Retry failed for ${resolvedTaskId}.`);
        return true;
    }
    if (!isTaskViewContextCurrent(ctx, taskViewContext)) {
        return true;
    }

    const opened = await openCodingTaskReview(ctx, result.task.id, result.task, { returnFalseOnStale: true });
    if (!opened || sessionId !== ctx.state.sessionId) {
        return true;
    }
    ctx.notify(`Retried failed workers from ${resolvedTaskId} as ${result.task.id}.`);
    return true;
}

export async function cancelCodingTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify('Cancel task id is required.');
        return true;
    }
    if (!ctx.appRpc) {
        ctx.notify('Cancel is unavailable without app RPC.');
        return true;
    }
    const targetTask = ctx.state.selectedTask;
    if (targetTask && targetTask.id === resolvedTaskId && !canCancelCodingTask(targetTask)) {
        ctx.notify(`Cancel is unavailable for ${resolvedTaskId}.`);
        return true;
    }

    const sessionId = resolveCodingTaskSessionId(ctx, targetTask);
    const taskViewContext = captureTaskViewContext(ctx);
    const result = await ctx.appRpc.request('coding_task.cancel', { sessionId, taskId: resolvedTaskId });
    if (result?.cancelled !== true) {
        ctx.notify(`Cancel failed for ${resolvedTaskId}.`);
        return true;
    }
    if (!isTaskViewContextCurrent(ctx, taskViewContext)) {
        return true;
    }

    const opened = await openCodingTaskInspector(ctx, resolvedTaskId, { returnFalseOnStale: true });
    if (!opened || sessionId !== ctx.state.sessionId) {
        return true;
    }
    ctx.notify(`Cancelled ${resolvedTaskId}.`);
    return true;
}

// ── Scheduled tasks ─────────────────────────────────────────────────────────

export async function refreshScheduledTasks(ctx: CodingTaskHandlerContext): Promise<void> {
    if (!ctx.scheduler) {
        return;
    }
    ctx.state.setScheduledTasks(ctx.scheduler.getTasks());
    ctx.state.setTasksCount(ctx.scheduler.getTasks().length);
}

export async function openScheduledJobsDashboard(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    if (!ctx.scheduler) {
        ctx.notify('Scheduler is unavailable.');
        return true;
    }
    const tasks = ctx.scheduler.getTasks();
        ctx.state.setScheduledTasks(tasks);
        ctx.state.setSessionsFocused(false);
        ctx.state.setTasksFocused(false);
        ctx.state.setToolsFocused(false);
        ctx.state.setApprovalsFocused(false);
        ctx.state.setMessagesFocused(false);
        ctx.state.closeMessageDetail();
        ctx.state.closeReview();
        ctx.state.closeGitSnapshotDetail();
        ctx.state.setJobsFocused(true);
        if (taskId) {
            ctx.state.setSelectedScheduledTaskId(taskId);
        }
        ctx.state.setNotice('');
        ctx.state.setLastError('');
    return true;
}

export async function toggleScheduledTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedScheduledTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify('Scheduled task id is required.');
        return true;
    }
    const selected = ctx.state.selectedScheduledTask;
    if (!selected || selected.id !== resolvedTaskId) {
        ctx.notify(`Scheduled task "${resolvedTaskId}" was not found.`);
        return true;
    }
    if (selected.paused) {
        return resumeScheduledTask(ctx, resolvedTaskId);
    }
    return pauseScheduledTask(ctx, resolvedTaskId);
}

export async function pauseScheduledTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedScheduledTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify('Scheduled task id is required.');
        return true;
    }
    if (!ctx.scheduler?.pause) {
        ctx.notify('Pause is unavailable on the configured scheduler.');
        return true;
    }
    const task = await ctx.scheduler.pause(resolvedTaskId);
    if (!task) {
        ctx.notify(`Pause failed for ${resolvedTaskId}.`);
        return true;
    }
    await refreshScheduledTasks(ctx);
    ctx.state.setSelectedScheduledTaskId(resolvedTaskId);
    ctx.notify(`Paused ${resolvedTaskId}.`);
    return true;
}

export async function resumeScheduledTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedScheduledTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify('Scheduled task id is required.');
        return true;
    }
    if (!ctx.scheduler?.resume) {
        ctx.notify('Resume is unavailable on the configured scheduler.');
        return true;
    }
    const task = await ctx.scheduler.resume(resolvedTaskId);
    if (!task) {
        ctx.notify(`Resume failed for ${resolvedTaskId}.`);
        return true;
    }
    await refreshScheduledTasks(ctx);
    ctx.state.setSelectedScheduledTaskId(resolvedTaskId);
    ctx.notify(`Resumed ${resolvedTaskId}.`);
    return true;
}

export async function cancelScheduledTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedScheduledTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify('Scheduled task id is required.');
        return true;
    }
    await ctx.scheduler!.cancel(resolvedTaskId);
    await refreshScheduledTasks(ctx);
    ctx.notify(`Cancelled ${resolvedTaskId}.`);
    return true;
}

export async function recoverScheduledTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedScheduledTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify('Scheduled task id is required.');
        return true;
    }
    if (!ctx.scheduler?.recover) {
        ctx.notify('Recover is unavailable on the configured scheduler.');
        return true;
    }
    const task = await ctx.scheduler.recover(resolvedTaskId);
    if (!task) {
        ctx.notify(`Recover failed for ${resolvedTaskId}.`);
        return true;
    }
    await refreshScheduledTasks(ctx);
    ctx.state.setSelectedScheduledTaskId(resolvedTaskId);
    ctx.notify(`Recovered ${resolvedTaskId}.`);
    return true;
}
