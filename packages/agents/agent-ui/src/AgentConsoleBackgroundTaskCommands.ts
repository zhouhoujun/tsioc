import type { BackgroundTaskManager, BackgroundTaskRecord, BackgroundTaskCancelOutcome, BackgroundTaskRestoreOutcome } from '@tsdi/agent-tools';
import { formatBackgroundTaskDetail } from './AgentConsoleBackgroundTaskFormat';

/**
 * Host surface required by the `/ps` background task command.
 * The component satisfies this interface structurally when delegating.
 */
export interface BackgroundTaskCommandHost {
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
    if (host.state.backgroundTaskFeed.length) {
        return host.state.backgroundTaskFeed.find(task => task.id === taskId);
    }
    const records = typeof manager.listAll === 'function' ? manager.listAll() : [];
    return records.find(task => task.id === taskId);
}

function describeRestoreFailure(reason?: 'not-found' | 'not-cancelled' | 'already-finished'): string {
    if (reason === 'not-found') {
        return 'not found';
    }
    if (reason === 'not-cancelled') {
        return 'not cancelled';
    }
    return 'run already finished';
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
        host.notify('Background task manager not available in this environment.');
        return true;
    }
    const sub = (parts[0] || '').toLowerCase();
    if (sub === 'show') {
        const taskId = parts[1];
        if (!taskId) {
            host.notify('Usage: /ps show <taskId>');
            return true;
        }
        const task = findBackgroundTask(host, taskId);
        if (!task) {
            host.notify(`No background task ${taskId}.`);
            return true;
        }
        host.pushCommandOutput(`/ps show ${taskId}`, formatBackgroundTaskDetail(task));
        return true;
    }
    if (sub === 'stop') {
        const taskIds = parts.slice(1);
        if (!taskIds.length) {
            host.notify('Usage: /ps stop <taskId> [<taskId> ...]');
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
        const lines = [`Cancelled ${cancelled.length}/${outcomes.length} background task(s).`];
        for (const o of outcomes) {
            lines.push(
                o.cancelled
                    ? `  \u2713 ${o.id}`
                    : `  \u2717 ${o.id} - ${o.reason === 'not-found' ? 'not found' : 'not running'}`
            );
        }
        if (cancelled.length) {
            lines.push('Undo: /ps undo');
        }
        host.pushCommandOutput('/ps stop', lines.join('\n'));
        return true;
    }
    if (sub === 'undo') {
        const taskIds = parts.slice(1);
        const manager = host.backgroundTasks as BackgroundTaskManager & { restoreBatch?: (ids: string[]) => BackgroundTaskRestoreOutcome[] };
        if (typeof manager.restoreBatch !== 'function') {
            host.notify('Undo is not supported by this background task manager.');
            return true;
        }
        const outcomes = manager.restoreBatch(taskIds);
        const restored = outcomes.filter(o => o.restored);
        const lines = [`Restored ${restored.length}/${outcomes.length} background task(s).`];
        for (const o of outcomes) {
            lines.push(
                o.restored
                    ? `  \u2713 ${o.id}`
                    : `  \u2717 ${o.id} - ${describeRestoreFailure(o.reason)}`
            );
        }
        host.pushCommandOutput('/ps undo', lines.join('\n'));
        return true;
    }
    const filter = (parts[0] || 'current').toLowerCase();
    const allowed = new Set(['current', 'all', 'running', 'completed', 'failed', 'cancelled']);
    if (!allowed.has(filter)) {
        host.notify('Usage: /ps [all|running|completed|failed|cancelled] | /ps show <taskId> | /ps stop <taskId> [...] | /ps undo [...]');
        return true;
    }
    const manager = host.backgroundTasks as BackgroundTaskManager & { listAll?: () => BackgroundTaskRecord[] };
    const allTasks = host.state.backgroundTaskFeed.length
        ? host.state.backgroundTaskFeed
        : typeof manager.listAll === 'function'
            ? manager.listAll()
            : manager.list(host.state.sessionId);
    const tasks = allTasks.filter(task =>
        (filter === 'all' || filter === 'current' ? filter === 'all' || task.sessionId === host.state.sessionId : true)
        && (['running', 'completed', 'failed', 'cancelled'].includes(filter) ? task.status === filter : true)
    );
    if (!tasks.length) {
        host.notify(`No ${filter === 'all' ? '' : filter + ' '}background tasks.`);
        return true;
    }
    const lines = tasks.map(task => {
        const status = String(task.status).toUpperCase();
        const meta = task.finishedAt ? ` (${new Date(task.finishedAt).toLocaleTimeString()})` : '';
        return `${status}${meta} ${task.id} [session ${task.sessionId}] - ${task.goal}`;
    });
    host.pushCommandOutput(`/ps ${filter}`, `Background tasks (${filter}):\n${lines.join('\n')}`);
    return true;
}