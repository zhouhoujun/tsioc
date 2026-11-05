import type { BackgroundTaskRecord } from '@tsdi/agent-tools';
import type { HarnessProjection, ScheduledAgentTask } from '@tsdi/agent';
import type {
    AgentConsoleProjectItem,
    AgentConsoleSessionItem,
    AgentConsoleThreadItem
} from './AgentConsoleStateTypes';
import { AgentConsoleSessionSelectionHost } from './AgentConsoleSessionSelectionHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import {
    buildSelectedSessionCopyText as buildSelectedSessionCopyTextInState,
    clampSessionSelectionToFilter as clampSessionSelectionToFilterInState,
    formatSessionWorkspaceLabel as formatSessionWorkspaceLabelInState,
    moveScheduledTaskSelection as moveScheduledTaskSelectionInState,
    moveScheduledTaskSelectionPage as moveScheduledTaskSelectionPageInState,
    moveSessionSelection as moveSessionSelectionInState,
    moveSessionSelectionPage as moveSessionSelectionPageInState,
    persistSessionsViewState as persistSessionsViewStateInState,
    resolveNavFilteredSessions,
    resolveSelectedScheduledTask,
    resolveSelectedSession,
    restoreSessionsViewState as restoreSessionsViewStateInState,
    selectFirstScheduledTask as selectFirstScheduledTaskInState,
    selectFirstSession as selectFirstSessionInState,
    selectLastScheduledTask as selectLastScheduledTaskInState,
    selectLastSession as selectLastSessionInState,
    setJobsFocused as setJobsFocusedInState,
    setProjectsFocused as setProjectsFocusedInState,
    setScheduledTasks as setScheduledTasksInState,
    setSelectedScheduledTaskId as setSelectedScheduledTaskIdInState,
    setSelectedSessionId as setSelectedSessionIdInState,
    setSessionsFocused as setSessionsFocusedInState,
    setThreadsFocused as setThreadsFocusedInState,
    setToolRunsFocused as setToolRunsFocusedInState
} from './AgentConsoleSessionNavigation';

/** Session list, tabs, projects/threads and background task facade. */
export abstract class AgentConsoleSessionListHost extends AgentConsoleSessionSelectionHost {
    protected abstract self(): AgentConsoleSessionState;

    setSessions(sessions: AgentConsoleSessionItem[]): void { this.sessions = sessions.slice(); this.clampSessionSelectionToFilter(); }

    setOpenSessionIds(ids: string[]): void { const seen = new Set<string>(); this.openSessionIds = (ids || []).map(id => String(id || '').trim()).filter(id => id && !seen.has(id) && !!seen.add(id)); }

    setProjects(projects: AgentConsoleProjectItem[]): void {
        this.projects = projects.slice();
    }

    setThreads(threads: AgentConsoleThreadItem[]): void {
        this.threads = threads.slice();
    }

    get navFilteredSessions(): AgentConsoleSessionItem[] {
        return resolveNavFilteredSessions(this.self());
    }

    clampSessionSelectionToFilter(): void {
        clampSessionSelectionToFilterInState(this.self());
    }

    setSessionsFocused(focused: boolean): void {
        setSessionsFocusedInState(this.self(), focused);
    }

    restoreSessionsViewState(): void {
        restoreSessionsViewStateInState(this.self());
    }

    persistSessionsViewState(): void {
        persistSessionsViewStateInState(this.self());
    }

    setProjectsFocused(focused: boolean): void {
        setProjectsFocusedInState(this.self(), focused);
    }

    setThreadsFocused(focused: boolean): void {
        setThreadsFocusedInState(this.self(), focused);
    }

    setToolRunsFocused(focused: boolean): void {
        setToolRunsFocusedInState(this.self(), focused);
    }

    setSelectedSessionId(sessionId: string): void {
        setSelectedSessionIdInState(this.self(), sessionId);
    }

    moveSessionSelection(delta: number): void {
        moveSessionSelectionInState(this.self(), delta);
    }

    moveSessionSelectionPage(delta: number, pageSize?: number): void {
        moveSessionSelectionPageInState(this.self(), delta, pageSize);
    }

    selectFirstSession(): void {
        selectFirstSessionInState(this.self());
    }

    selectLastSession(): void {
        selectLastSessionInState(this.self());
    }

    get selectedSession(): AgentConsoleSessionItem | undefined {
        return resolveSelectedSession(this.self());
    }

    formatSessionWorkspaceLabel(workspace?: string): string {
        return formatSessionWorkspaceLabelInState(workspace);
    }

    buildSelectedSessionCopyText(): string {
        return buildSelectedSessionCopyTextInState(this.self());
    }

    buildSelectedToolRunCopyText(): string {
        const selected = this.selectedToolRun;
        if (!selected) {
            return '';
        }
        return [
            `${selected.name} [${selected.status}]`,
            selected.durationMs != null ? `duration=${selected.durationMs}ms` : '',
            selected.attemptCount && selected.attemptCount > 1 ? `attempt=#${selected.attemptCount}` : '',
            selected.executionMode ? `mode=${selected.executionMode}` : '',
            selected.inputSummary ? `in=${selected.inputSummary}` : '',
            selected.outputSummary ? `out=${selected.outputSummary}` : '',
            selected.error ? `error=${selected.error}` : ''
        ].filter(Boolean).join('\n');
    }

    setScheduledTasks(tasks: ScheduledAgentTask[]): void {
        setScheduledTasksInState(this.self(), tasks);
    }

    setJobsFocused(focused: boolean): void {
        setJobsFocusedInState(this.self(), focused);
    }

    setSelectedScheduledTaskId(taskId: string): void {
        setSelectedScheduledTaskIdInState(this.self(), taskId);
    }

    moveScheduledTaskSelection(delta: number): void {
        moveScheduledTaskSelectionInState(this.self(), delta);
    }

    moveScheduledTaskSelectionPage(delta: number, pageSize?: number): void {
        moveScheduledTaskSelectionPageInState(this.self(), delta, pageSize);
    }

    selectFirstScheduledTask(): void {
        selectFirstScheduledTaskInState(this.self());
    }

    selectLastScheduledTask(): void {
        selectLastScheduledTaskInState(this.self());
    }

    get selectedScheduledTask(): ScheduledAgentTask | undefined {
        return resolveSelectedScheduledTask(this.self());
    }

    setTaskRecords(tasks: Record<string, any>[]): void {
        this.taskRecords = tasks.slice();
    }

    setBackgroundTaskFeed(tasks: BackgroundTaskRecord[]): void {
        this.backgroundTaskFeed = tasks.slice().sort((a, b) => b.startedAt - a.startedAt);
    }

    setHarnessState(projection: HarnessProjection | null): void {
        this.harnessState = projection;
    }

    upsertBackgroundTask(record: BackgroundTaskRecord): void {
        const index = this.backgroundTaskFeed.findIndex(item => item.id === record.id);
        const next = this.backgroundTaskFeed.slice();
        if (index >= 0) next[index] = { ...next[index], ...record };
        else next.push(record);
        this.setBackgroundTaskFeed(next);
    }

    get filteredBackgroundTasks(): BackgroundTaskRecord[] {
        const query = this.backgroundTaskQuery.trim().toLowerCase();
        return this.backgroundTaskFeed.filter(task =>
            (this.backgroundTaskFilter === 'all' || task.status === this.backgroundTaskFilter)
            && (!query || `${task.id} ${task.sessionId} ${task.goal}`.toLowerCase().includes(query))
        );
    }
}
