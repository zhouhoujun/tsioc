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

import type { CodingTaskHandlerContext } from './AgentConsoleCodingTaskHandlers';
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

export function describeCodingTaskRollback(task: any, translator?: AgentUiTranslator | null): string {
    const rollback = task?.result?.rollback;
    if (rollback?.available === true) {
        return rollback.mode
            ? panelLabel(translator, 'tasks', 'rollbackReadyMode', 'rollback ready ({mode})', { mode: rollback.mode })
            : panelLabel(translator, 'tasks', 'rollbackReady', 'rollback ready');
    }
    if (rollback?.rolledBackAt) {
        return rollback.mode
            ? panelLabel(translator, 'tasks', 'rolledBackMode', 'rolled back ({mode})', { mode: rollback.mode })
            : panelLabel(translator, 'tasks', 'rolledBack', 'rolled back');
    }
    const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
    const availableCheckpoint = checkpoints.find((entry: any) => entry?.status === 'available');
    if (availableCheckpoint) {
        return availableCheckpoint.mode
            ? panelLabel(translator, 'tasks', 'rollbackReadyMode', 'rollback ready ({mode})', { mode: availableCheckpoint.mode })
            : panelLabel(translator, 'tasks', 'rollbackReady', 'rollback ready');
    }
    return panelLabel(translator, 'tasks', 'rollbackUnavailable', 'rollback unavailable');
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

export function buildCodingTaskSelectOption(task: any, tasks: any[] = [], translator?: AgentUiTranslator | null): AgentConsoleSelectOption {
    const choice = buildCodingTaskChoice(task, tasks);
    const lineageSegments = choice.retryOfTaskId
        ? [
            panelLabel(translator, 'tasks', 'retryMeta', 'retry {depth}', { depth: typeof choice.retryDepth === 'number' ? choice.retryDepth : 1 }),
            panelLabel(translator, 'tasks', 'from', 'from {id}', { id: choice.retryOfTaskId })
        ]
        : [panelLabel(translator, 'tasks', 'root', 'root')];
    if (typeof choice.lineageTaskCount === 'number') {
        lineageSegments.push(panelLabel(translator, 'tasks', 'lineageMeta', 'lineage {count}', { count: choice.lineageTaskCount }));
    }
    return {
        label: `${choice.id} · ${choice.title}`,
        value: choice.id,
        description: [
            ...lineageSegments,
            choice.sourceSessionId ? panelLabel(translator, 'tasks', 'optionSession', 'session {id}', { id: choice.sourceSessionId }) : '',
            choice.status,
            choice.executionMode,
            choice.workerCount === 1 ? panelLabel(translator, 'tasks', 'optionWorkersOne', '{count} worker', { count: choice.workerCount }) : panelLabel(translator, 'tasks', 'optionWorkers', '{count} workers', { count: choice.workerCount || 0 }),
            describeCodingTaskRollback(task, translator)
        ].filter(Boolean).join(' · ') || panelLabel(translator, 'tasks', 'optionFallback', 'review'),
        detail: [
            panelLabel(translator, 'tasks', 'optionTask', 'Task: {id}', { id: choice.id }),
            panelLabel(translator, 'tasks', 'optionTitle', 'Title: {title}', { title: choice.title }),
            choice.sourceSessionId ? panelLabel(translator, 'tasks', 'optionSessionDetail', 'Session: {id}', { id: choice.sourceSessionId }) : '',
            choice.status ? panelLabel(translator, 'tasks', 'optionStatus', 'Status: {status}', { status: choice.status }) : '',
            choice.executionMode ? panelLabel(translator, 'tasks', 'optionMode', 'Mode: {mode}', { mode: choice.executionMode }) : '',
            choice.retryOfTaskId ? panelLabel(translator, 'tasks', 'optionRetryOf', 'Retry Of: {id}', { id: choice.retryOfTaskId }) : '',
            choice.lineageRootTaskId ? panelLabel(translator, 'tasks', 'optionLineageRoot', 'Lineage Root: {id}', { id: choice.lineageRootTaskId }) : '',
            typeof choice.retryDepth === 'number' ? panelLabel(translator, 'tasks', 'optionRetryDepth', 'Retry Depth: {depth}', { depth: choice.retryDepth }) : '',
            typeof choice.lineageTaskCount === 'number' && choice.lineageTaskCount > 1 ? panelLabel(translator, 'tasks', 'optionLineageTasks', 'Lineage Tasks: {count}', { count: choice.lineageTaskCount }) : '',
            panelLabel(translator, 'tasks', 'optionWorkersDetail', 'Workers: {count}', { count: choice.workerCount || 0 }),
            panelLabel(translator, 'tasks', 'optionRollback', 'Rollback: {value}', { value: describeCodingTaskRollback(task, translator) }),
            choice.checkpointSummary ? panelLabel(translator, 'tasks', 'optionCheckpoints', 'Checkpoints: {summary}', { summary: choice.checkpointSummary }) : '',
            task?.result?.diff?.summary ? panelLabel(translator, 'tasks', 'optionDiff', 'Diff: {summary}', { summary: task.result.diff.summary }) : '',
            task?.planning?.summary ? panelLabel(translator, 'tasks', 'optionPlan', 'Plan: {summary}', { summary: task.planning.summary }) : '',
            task?.goal ? panelLabel(translator, 'tasks', 'optionGoal', 'Goal: {goal}', { goal: task.goal }) : ''
        ].filter(Boolean).join('\n')
    };
}

// ── Async operations ────────────────────────────────────────────────────────

