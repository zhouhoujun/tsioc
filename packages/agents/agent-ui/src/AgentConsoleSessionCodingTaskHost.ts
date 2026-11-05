import type {
    AgentConsoleApprovalRequest,
    AgentConsoleReviewDiffSection,
    AgentConsoleReviewGroup,
    AgentConsoleReviewTaskItem
} from './AgentConsoleSessionState';
import { formatReviewGroupMeta } from './AgentConsoleReviewPanelFormat';
import {
    getCurrentReviewAnnotationCacheKey as getCurrentReviewAnnotationCacheKeyInState,
    syncCurrentReviewAnnotationCache as syncCurrentReviewAnnotationCacheInState
} from './AgentConsoleReviewAnnotations';
import { resolveTaskLineageRootId as resolveTaskLineageRootIdFn } from './AgentConsoleReviewTaskState';
import { AgentConsoleSessionOverlayHost } from './AgentConsoleSessionOverlayHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

/** Review task copy, lineage and focused coding-task facade. */
export abstract class AgentConsoleSessionCodingTaskHost extends AgentConsoleSessionOverlayHost {
    protected abstract self(): AgentConsoleSessionState;
    abstract translateLabel(key: string, params: Record<string, any> | undefined, fallback: string): string;

    buildSelectedApprovalCopyText(): string {
        const selected = this.selectedApproval;
        if (!selected) {
            return '';
        }
        return [
            `${selected.toolName} (${selected.id})`,
            selected.reason,
            selected.inputSummary || selected.summary
        ].filter(Boolean).join('\n');
    }

    buildSelectedReviewCopyText(): string {
        const header = [
            this.reviewTask?.title || this.selectedReviewTaskId || 'review',
            this.reviewTask?.id ? `(${this.reviewTask.id})` : '',
            this.reviewTask?.status ? `status=${this.reviewTask.status}` : '',
            this.reviewExecutionMode ? `mode=${this.reviewExecutionMode}` : '',
            this.selectedReviewGroup ? `group=${this.selectedReviewGroup.label}` : '',
            this.selectedReviewPatchFilter !== 'all' ? `patch=${this.selectedReviewPatchFilter}` : '',
            this.selectedReviewFileSection?.path ? `file=${this.selectedReviewFileSection.path}` : ''
        ].filter(Boolean).join(' ');
        return [header, ...this.reviewDetailLines].filter(Boolean).join('\n');
    }

    resetReviewDetailViewport(): void {
        this.reviewDetailScroll = 0;
        this.reviewDetailColumnScroll = 0;
    }

    buildSelectedReviewGroupMetaLines(group: AgentConsoleReviewGroup): string[] {
        const lines = [
            this.selectedReviewPatchFilter !== 'all' ? this.translateLabel('agent.menu.panel.review.patchFilter', { filter: this.selectedReviewPatchFilter }, `Patch Filter: ${this.selectedReviewPatchFilter}`) : '',
            group.kind === 'worker' && group.status ? this.translateLabel('agent.menu.panel.review.workerStatus', { status: group.status }, `Worker Status: ${group.status}`) : '',
            group.kind === 'worker' && group.branch ? this.translateLabel('agent.menu.panel.review.workerBranch', { branch: group.branch }, `Worker Branch: ${group.branch}`) : '',
            group.kind === 'worker' && group.worktreePath ? this.translateLabel('agent.menu.panel.review.workerWorktree', { path: group.worktreePath }, `Worker Worktree: ${group.worktreePath}`) : '',
            group.kind === 'worker' && group.actionIds?.length ? this.translateLabel('agent.menu.panel.review.workerActions', { ids: group.actionIds.join(', ') }, `Worker Actions: ${group.actionIds.join(', ')}`) : '',
            group.kind === 'worker' && group.error ? this.translateLabel('agent.menu.panel.review.workerError', { error: group.error }, `Worker Error: ${group.error}`) : ''
        ].filter(Boolean);
        return [
            ...lines
        ].filter(Boolean);
    }

    describeReviewGroup(group: AgentConsoleReviewGroup): string {
        const meta = { label: group.label, kind: group.kind, status: group.status, fileCount: group.sections.length, hasError: !!group.error };
        return formatReviewGroupMeta(meta, (key, fallback, params) => this.translateLabel(`agent.menu.panel.review.${key}`, params, fallback));
    }

    syncCurrentReviewAnnotationCache(): void {
        syncCurrentReviewAnnotationCacheInState(this.self());
    }

    protected getCurrentReviewAnnotationCacheKey(): string {
        return getCurrentReviewAnnotationCacheKeyInState(this.self());
    }

    resolveReviewAnnotationCacheKey(task?: {
        id?: string;
        cacheKey?: string;
        sourceSessionId?: string;
        sessionId?: string;
    } | null): string {
        const explicit = String(task?.cacheKey || '').trim();
        if (explicit) {
            return explicit;
        }
        const taskId = String(task?.id || '').trim();
        if (!taskId) {
            return '';
        }
        const sourceSessionId = String(task?.sourceSessionId || task?.sessionId || '').trim();
        return sourceSessionId ? `${sourceSessionId}:${taskId}` : taskId;
    }

    buildSelectedTaskCopyText(): string {
        const selected = this.selectedTask;
        if (!selected) {
            return '';
        }
        const workerCount = Array.isArray(selected?.result?.workers) ? selected.result.workers.length : 0;
        return [
            `${selected.title || selected.id} (${selected.id})`,
            selected.status ? `status=${selected.status}` : '',
            selected?.result?.executionMode || selected?.metadata?.executionMode ? `mode=${selected?.result?.executionMode || selected?.metadata?.executionMode}` : '',
            `workers=${workerCount}`,
            typeof selected?.planning?.summary === 'string' ? selected.planning.summary : '',
            typeof selected?.goal === 'string' ? selected.goal : ''
        ].filter(Boolean).join('\n');
    }

    canCancelFocusedCodingTask(): boolean {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        const status = String(task?.status || '').trim();
        return !!task?.id && (status === 'planned' || status === 'running');
    }

    canRetryFocusedCodingTask(): boolean {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        if (!task?.id) {
            return false;
        }
        const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
        if (workers.some((worker: any) => worker?.status === 'failed')) {
            return true;
        }
        return Number(task?.result?.aggregate?.failedWorkers || 0) > 0;
    }

    async cancelFocusedCodingTask(): Promise<void> {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        if (task?.id) {
            await this.cancelSelectedTaskAction?.(task.id);
        }
    }

    async retryFocusedCodingTask(): Promise<void> {
        const task = this.reviewOpen ? (this.reviewTask || this.selectedTask) : this.selectedTask;
        if (task?.id) {
            await this.retrySelectedTaskAction?.(task.id);
        }
    }

    get currentReviewLineageTasks(): AgentConsoleReviewTaskItem[] {
        const currentTask = this.reviewTask || this.selectedTask;
        const lineageRootId = this.resolveTaskLineageRootId(currentTask);
        if (!lineageRootId) {
            return [];
        }
        return this.reviewTaskChoices.filter(item => this.resolveTaskLineageRootId(item) === lineageRootId);
    }

    async navigateReviewLineage(delta: number): Promise<boolean> {
        const lineageTasks = this.currentReviewLineageTasks;
        if (lineageTasks.length < 2) {
            return false;
        }
        const selectedTaskId = String(this.reviewTask?.id || this.selectedReviewTaskId || '').trim();
        const currentIndex = lineageTasks.findIndex(item => item.id === selectedTaskId);
        if (currentIndex < 0) {
            return false;
        }
        const nextIndex = currentIndex + delta;
        if (nextIndex < 0 || nextIndex >= lineageTasks.length) {
            return false;
        }
        const nextTask = lineageTasks[nextIndex];
        if (!nextTask?.id) {
            return false;
        }
        await this.openSelectedTaskAction?.(nextTask.id);
        return true;
    }

    resolveTaskLineageRootId(task: Record<string, any> | undefined | null): string {
        return resolveTaskLineageRootIdFn(task);
    }
}
