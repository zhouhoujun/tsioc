import type { CodingTaskHandlerContext } from './AgentConsoleCodingTaskHandlers';
import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';
import { formatScheduledTaskDetailLines } from './AgentConsoleScheduledTaskFormat';

export async function refreshScheduledTasks(ctx: CodingTaskHandlerContext): Promise<void> {
    if (!ctx.scheduler) {
        return;
    }
    ctx.state.setScheduledTasks(ctx.scheduler.getTasks());
    ctx.state.setTasksCount(ctx.scheduler.getTasks().length);
}

export async function openScheduledJobsDashboard(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    if (!ctx.scheduler) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'schedulerUnavailable'));
        return true;
    }
    const tasks = ctx.scheduler.getTasks();
        ctx.state.setScheduledTasks(tasks);
        ctx.state.setSessionsFocused(false);
        ctx.state.setTasksFocused(false);
        ctx.state.setToolsFocused(false);
        ctx.state.setApprovalsFocused(false);
        ctx.transcriptNavigationController.setFocused(false);
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
        ctx.notify(formatAgentUiNotice(ctx.translator, 'scheduledTaskId'));
        return true;
    }
    const selected = ctx.state.selectedScheduledTask;
    if (!selected || selected.id !== resolvedTaskId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'scheduledTaskNotFound', { taskId: resolvedTaskId }));
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
        ctx.notify(formatAgentUiNotice(ctx.translator, 'scheduledTaskId'));
        return true;
    }
    if (!ctx.scheduler?.pause) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'pauseUnavailableConfigured'));
        return true;
    }
    const task = await ctx.scheduler.pause(resolvedTaskId);
    if (!task) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'pauseFailed', { resolvedTaskId: resolvedTaskId }));
        return true;
    }
    await refreshScheduledTasks(ctx);
    ctx.state.setSelectedScheduledTaskId(resolvedTaskId);
    ctx.notify(formatAgentUiNotice(ctx.translator, 'pausedTask', { resolvedTaskId: resolvedTaskId }));
    return true;
}

export async function resumeScheduledTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedScheduledTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'scheduledTaskId'));
        return true;
    }
    if (!ctx.scheduler?.resume) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'resumeUnavailableConfigured'));
        return true;
    }
    const task = await ctx.scheduler.resume(resolvedTaskId);
    if (!task) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'resumeFailed', { resolvedTaskId: resolvedTaskId }));
        return true;
    }
    await refreshScheduledTasks(ctx);
    ctx.state.setSelectedScheduledTaskId(resolvedTaskId);
    ctx.notify(formatAgentUiNotice(ctx.translator, 'resumedTask', { resolvedTaskId: resolvedTaskId }));
    return true;
}

export async function cancelScheduledTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedScheduledTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'scheduledTaskId'));
        return true;
    }
    await ctx.scheduler!.cancel(resolvedTaskId);
    await refreshScheduledTasks(ctx);
    ctx.notify(formatAgentUiNotice(ctx.translator, 'cancelledTask', { resolvedTaskId: resolvedTaskId }));
    return true;
}

export async function recoverScheduledTask(ctx: CodingTaskHandlerContext, taskId?: string): Promise<boolean> {
    const resolvedTaskId = String(taskId || ctx.state.selectedScheduledTask?.id || '').trim();
    if (!resolvedTaskId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'scheduledTaskId'));
        return true;
    }
    if (!ctx.scheduler?.recover) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'recoverUnavailableConfigured'));
        return true;
    }
    const task = await ctx.scheduler.recover(resolvedTaskId);
    if (!task) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'recoverFailed', { resolvedTaskId: resolvedTaskId }));
        return true;
    }
    await refreshScheduledTasks(ctx);
    ctx.state.setSelectedScheduledTaskId(resolvedTaskId);
    ctx.notify(formatAgentUiNotice(ctx.translator, 'recoveredTask', { resolvedTaskId: resolvedTaskId }));
    return true;
}
