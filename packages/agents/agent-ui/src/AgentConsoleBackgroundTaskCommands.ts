import type { BackgroundTaskManager, BackgroundTaskRecord, BackgroundTaskCancelOutcome, BackgroundTaskRestoreOutcome } from '@tsdi/agent-tools';
import { formatBackgroundTaskDetail } from './AgentConsoleBackgroundTaskFormat';
import { formatAgentPanelLabel as panelLabel, formatAgentPanelStatusLabel, formatAgentUiNotice, formatAgentUiTime, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * Host surface required by the `/ps` background task command.
 * The component satisfies this interface structurally when delegating.
 */
export interface BackgroundTaskCommandHost {
    translator?: AgentUiTranslator | null;
    backgroundTasks: BackgroundTaskManager | null;
    state: {
        sessionId: string;
        backgroundTaskFeed: BackgroundTaskRecord[];
    };
    notify(message: string): void;
    pushCommandOutput(command: string, text: string): void;
}

function findBackgroundTask(host: BackgroundTaskCommandHost, taskId: string): BackgroundTaskRecord | undefined {
    const manager = host.backgroundTasks as BackgroundTaskManager & { listAll?: () => BackgroundTaskRecord[] };
    // The manager is authoritative once hydrated (history + live); the feed is
    // a fallback for hosts that only stream events.
    const records = typeof manager?.listAll === 'function' ? manager.listAll() : [];
    if (records.length) {
        return records.find(task => task.id === taskId);
    }
    return host.state.backgroundTaskFeed.find(task => task.id === taskId);
}

function describeRestoreFailure(translator: AgentUiTranslator | null | undefined, reason?: 'not-found' | 'not-cancelled' | 'already-finished'): string {
    if (reason === 'not-found') {
        return formatAgentUiNotice(translator, 'psRestoreReasonNotFound');
    }
    if (reason === 'not-cancelled') {
        return formatAgentUiNotice(translator, 'psRestoreReasonNotCancelled');
    }
    return formatAgentUiNotice(translator, 'psRestoreReasonFinished');
}

/** Localized label for a `/ps` filter id, keeping the id when unknown. */
function filterLabel(translator: AgentUiTranslator | null | undefined, filter: string): string {
    const key = `filter${filter.charAt(0).toUpperCase()}${filter.slice(1)}`;
    return panelLabel(translator, 'ps', key, filter);
}

/**
 * Handles `/ps [all|running|completed|failed|cancelled]`, `/ps show <taskId>`,
 * `/ps stop <taskId> [...]` and `/ps undo [...]`, rendering background task
 * status, cancellation and restore outcomes through the command output sink.
 */
export async function runBackgroundTasksCommandView(host: BackgroundTaskCommandHost, args?: string): Promise<boolean> {
    const parsed = String(args || '').trim();
    const parts = parsed.split(/\s+/).filter(Boolean);
    if (!host.backgroundTasks) {
        host.notify(formatAgentUiNotice(host.translator, 'backgroundTaskManager'));
        return true;
    }
    // `persist()` recorded every task, but nothing read history back: after a
    // restart `/ps all|completed|failed` saw only current-process tasks.
    const hydrator = host.backgroundTasks as BackgroundTaskManager & { hydrate?: (sessionId?: string) => Promise<void> };
    if (typeof hydrator.hydrate === 'function') {
        await hydrator.hydrate();
    }
    const sub = (parts[0] || '').toLowerCase();
    if (sub === 'show') {
        const taskId = parts[1];
        if (!taskId) {
            host.notify(formatAgentUiNotice(host.translator, 'psShowUsage'));
            return true;
        }
        const task = findBackgroundTask(host, taskId);
        if (!task) {
            host.notify(formatAgentUiNotice(host.translator, 'backgroundTask', { taskId: taskId }));
            return true;
        }
        host.pushCommandOutput(`/ps show ${taskId}`, formatBackgroundTaskDetail(task, host.translator));
        return true;
    }
    if (sub === 'stop') {
        const taskIds = parts.slice(1);
        if (!taskIds.length) {
            host.notify(formatAgentUiNotice(host.translator, 'psStopUsage'));
            return true;
        }
        const manager = host.backgroundTasks as BackgroundTaskManager & { cancelBatch?: (ids: string[]) => BackgroundTaskCancelOutcome[] };
        const outcomes = typeof manager.cancelBatch === 'function'
            ? manager.cancelBatch(taskIds)
            : taskIds.map(id => {
                  const ok = manager.cancel(id);
                  return { id, cancelled: ok, reason: ok ? undefined : ('not-running' as const) };
              });
        const cancelled = outcomes.filter(o => o.cancelled);
        const lines = [formatAgentUiNotice(host.translator, 'psStopSummary', { cancelled: cancelled.length, total: outcomes.length })];
        for (const o of outcomes) {
            lines.push(
                o.cancelled
                    ? `  \u2713 ${o.id}`
                    : `  \u2717 ${o.id} - ${formatAgentUiNotice(host.translator, o.reason === 'not-found' ? 'psStopReasonNotFound' : 'psStopReasonNotRunning')}`
            );
        }
        if (cancelled.length) {
            lines.push(formatAgentUiNotice(host.translator, 'psUndoHint'));
        }
        host.pushCommandOutput('/ps stop', lines.join('\n'));
        return true;
    }
    if (sub === 'undo') {
        const taskIds = parts.slice(1);
        const manager = host.backgroundTasks as BackgroundTaskManager & { restoreBatch?: (ids: string[]) => BackgroundTaskRestoreOutcome[] };
        if (typeof manager.restoreBatch !== 'function') {
            host.notify(formatAgentUiNotice(host.translator, 'undoNotSupported'));
            return true;
        }
        const outcomes = manager.restoreBatch(taskIds);
        const restored = outcomes.filter(o => o.restored);
        const lines = [formatAgentUiNotice(host.translator, 'psRestoreSummary', { restored: restored.length, total: outcomes.length })];
        for (const o of outcomes) {
            lines.push(
                o.restored
                    ? `  \u2713 ${o.id}`
                    : `  \u2717 ${o.id} - ${describeRestoreFailure(host.translator, o.reason)}`
            );
        }
        host.pushCommandOutput('/ps undo', lines.join('\n'));
        return true;
    }
    const filter = (parts[0] || 'current').toLowerCase();
    const allowed = new Set(['current', 'all', 'running', 'completed', 'failed', 'cancelled']);
    if (!allowed.has(filter)) {
        host.notify(formatAgentUiNotice(host.translator, 'psUsage'));
        return true;
    }
    const manager = host.backgroundTasks as BackgroundTaskManager & { listAll?: () => BackgroundTaskRecord[] };
    const allTasks = typeof manager.listAll === 'function'
        ? manager.listAll()
        : host.state.backgroundTaskFeed.length
            ? host.state.backgroundTaskFeed
            : manager.list(host.state.sessionId);
    const tasks = allTasks.filter(task =>
        (filter === 'all' || filter === 'current' ? filter === 'all' || task.sessionId === host.state.sessionId : true)
        && (['running', 'completed', 'failed', 'cancelled'].includes(filter) ? task.status === filter : true)
    );
    const localizedFilter = filterLabel(host.translator, filter);
    if (!tasks.length) {
        host.notify(filter === 'all'
            ? formatAgentUiNotice(host.translator, 'noBackgroundTasks')
            : formatAgentUiNotice(host.translator, 'noBackgroundTasksFiltered', { filter: localizedFilter }));
        return true;
    }
    const lines = tasks.map(task => {
        const status = formatAgentPanelStatusLabel(host.translator, 'toolRuns', String(task.status));
        const meta = task.finishedAt ? ` (${formatAgentUiTime(task.finishedAt, host.translator)})` : '';
        return formatAgentUiNotice(host.translator, 'backgroundTaskLine', { status: status, meta: meta, id: task.id, sessionId: task.sessionId, goal: task.goal });
    });
    host.pushCommandOutput(`/ps ${filter}`, `${formatAgentUiNotice(host.translator, 'backgroundTasksTitle', { filter: localizedFilter })}\n${lines.join('\n')}`);
    return true;
}