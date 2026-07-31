import { ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, OnDestroy, RNode } from '@tsdi/components';
import { FileAdapter } from '@tsdi/common';
import {
    clampConsoleTextCursor,
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceAccessor,
    ConsoleTerminalSurfaceLifecycle,
    TerminalInputSequenceResult
} from '@tsdi/components/console';
import { Inject, Optional } from '@tsdi/ioc';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, AgentConsoleAppRpc, AgentMessage, AgentOptions, AgentRuntime, AgentScheduler, ToolApprovalManager, ToolRegistry, defaultAgentOptions } from '@tsdi/agent';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleInputHistoryStore } from './AgentConsoleInputHistoryStore';
import { AgentConsoleApprovalRequest, AgentConsoleSelectOption, AgentConsoleSessionMeta, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { mergeAgentConsoleTheme } from './AgentConsoleTheme';
import { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import { AgentConsoleWorkspaceMentionsProvider } from './AgentConsoleWorkspaceMentions';
import { AgentConsoleSessionProjectGroup, AgentConsoleSessionService } from './AgentConsoleSessionService';
@Component({
    selector: 'agent-console',
    template: `
    <div class="agent-console">
        <agent-console-brand-panel></agent-console-brand-panel>
        <agent-console-dashboard-panel v-show="showDashboardPanel"></agent-console-dashboard-panel>
        <agent-console-status-panel v-show="showStatusPanel"></agent-console-status-panel>
        <agent-console-sessions-panel v-show="showSessionsPanel"></agent-console-sessions-panel>
        <agent-console-approvals-panel v-show="showApprovalsPanel"></agent-console-approvals-panel>
        <agent-console-messages-panel></agent-console-messages-panel>
        <agent-console-tasks-panel v-show="showTasksPanel"></agent-console-tasks-panel>
        <agent-console-jobs-panel v-show="showJobsPanel"></agent-console-jobs-panel>
        <agent-console-review-panel v-show="showReviewPanel"></agent-console-review-panel>
        <agent-console-activity-panel v-show="showActivityPanel"></agent-console-activity-panel>
        <agent-console-tools-panel v-show="showToolsPanel"></agent-console-tools-panel>
        <agent-console-working-panel v-show="showWorkingPanel"></agent-console-working-panel>
        <agent-console-tool-runs-panel v-show="showToolRunsPanel"></agent-console-tool-runs-panel>
        <agent-console-input-panel></agent-console-input-panel>
        <agent-console-select-panel v-show="showSelectPanel"></agent-console-select-panel>
    </div>
    `
})
export class AgentConsoleComponent implements OnDestroy, ConsoleTerminalInputHandler, ConsoleTerminalSurfaceLifecycle {
    protected static readonly STREAM_MESSAGE_FLUSH_MS = 160;
    protected static readonly STREAM_PENDING_NOTICE_MS = 8000;
    protected multilineMode = false;
    protected draftLines: string[] = [];
    protected destroyed = false;
    protected streamMessageTimer?: ReturnType<typeof setTimeout>;
    protected streamMessageText = '';
    protected streamPendingTimer?: ReturnType<typeof setTimeout>;

    constructor(
        private state: AgentConsoleSessionState,
        private runtime: AgentRuntime,
        private scheduler: AgentScheduler,
        private bridge: AgentConsoleEventBridge,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions,
        @Optional() private toolRegistry?: ToolRegistry | null,
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) private appRpc?: AgentConsoleAppRpc | null,
        @Optional() private sessionService?: AgentConsoleSessionService | null,
        @Optional() private approvalManager?: ToolApprovalManager | null,
        @Optional() private workspaceMentionsProvider?: AgentConsoleWorkspaceMentionsProvider | null,
        @Optional() private inputHistoryStore?: AgentConsoleInputHistoryStore | null,
        @Optional() @Inject(ComponentRef) private componentRef?: ComponentRef<AgentConsoleComponent> | null,
        @Optional() @Inject(ConsoleTerminalSurfaceAccessor) private surfaceAccessor?: ConsoleTerminalSurfaceAccessor | null,
        @Optional() @Inject(ApplicationContext) private app?: ApplicationContext | null
    ) {
        this.state.setTitle(this.options.ui?.title ?? defaultAgentOptions.ui!.title!);
        this.state.setProvider(this.options.model?.provider ?? '');
        this.state.setModel(this.options.model?.model ?? '');
        this.state.setModelProfile(this.resolveInitialModelProfile());
        this.state.setTheme(mergeAgentConsoleTheme(this.options.ui?.theme));
        this.state.setConsoleOptions(this.options.ui?.console);
        this.state.setWorkspaceMentionResolver(this.workspaceMentionsProvider || undefined);
    }

    protected resolveInitialModelProfile(): string {
        const model = this.options.model;
        if (model?.defaultProfile === 'strong') {
            return 'strong';
        }
        if (model?.defaultProfile === 'flash' || model?.defaultProfile === 'fast') {
            return 'flash';
        }
        if (model?.thinkingBudget || model?.reasoning) {
            return 'strong';
        }
        return '';
    }

    protected isCancelPromptValue(value?: string): boolean {
        const normalized = String(value || '').trim().toLowerCase();
        return normalized === 'cancel' || normalized === '/cancel' || normalized === 'q';
    }

    protected isTurnInProgress(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    protected notify(message: string, duration?: number): void {
        void duration;
        this.state.setNotice(message);
    }

    protected notifyBusyState(message = 'Wait for the current turn to finish.'): void {
        this.notify(message);
    }

    protected resolveReviewAnnotationsSessionId(): string {
        return String(
            this.state.reviewTask?.sourceSessionId
            || this.state.reviewTask?.sessionId
            || this.state.sessionId
            || ''
        ).trim();
    }

    protected getReviewAnnotationsCacheKey(): string | undefined {
        const stateCacheKey = String(this.state.selectedReviewTaskCacheKey || '').trim();
        if (stateCacheKey) {
            return stateCacheKey;
        }
        const sessionId = this.resolveReviewAnnotationsSessionId();
        const reviewTaskId = String(this.state.selectedReviewTaskId || this.state.reviewTask?.id || '').trim();
        if (!sessionId || !reviewTaskId) {
            return undefined;
        }
        return `${sessionId}:${reviewTaskId}`;
    }

    protected async refreshSessions(): Promise<void> {
        if (!this.sessionService) {
            return;
        }
        const groups = await this.sessionService.listProjectSessions(this.state.sessionId);
        const groupedSessions = this.flattenProjectSessions(groups);
        if (groupedSessions.length) {
        this.state.setSessions(groupedSessions);
            this.refreshProjectContext();
            this.refreshProjects();
            return;
        }
        const sessions = await this.sessionService.listSessions(this.state.sessionId);
        if (!sessions.length) {
            return;
        }
        this.state.setSessions(sessions.map(item => ({
            id: item.id,
            current: !!item.current,
            workspace: item.workspace,
            updatedAt: item.lastActiveAt,
            messageCount: item.messageCount,
            summary: item.summary,
            projectKey: item.projectKey,
            projectId: item.projectId,
            primaryThreadId: item.primaryThreadId,
            sessionRole: item.sessionRole,
            rootRequest: item.rootRequest,
            focusSummary: item.focusSummary,
            projectLabel: item.projectId || item.focusSummary || item.workspace || item.primaryThreadId || item.rootRequest || item.id
        })));
        this.refreshProjectContext();
        this.refreshProjects();
    }

    protected refreshProjects(): void {
        const seen = new Map<string, { key: string; label: string; lastActive: number; count: number }>();
        for (const s of this.state.sessions) {
            const key = this.resolveSessionProjectKey(s);
            if (!key) continue;
            const existing = seen.get(key);
            if (existing) {
                existing.count += 1;
                if (s.updatedAt && s.updatedAt > existing.lastActive) {
                    existing.lastActive = s.updatedAt;
                }
            } else {
                seen.set(key, {
                    key,
                    label: s.projectLabel || s.projectId || s.focusSummary || s.workspace || s.primaryThreadId || s.rootRequest || key,
                    lastActive: s.updatedAt || 0,
                    count: 1
                });
            }
        }
        this.state.setProjects(Array.from(seen.values()).map(p => ({
            key: p.key,
            label: p.label,
            sessionCount: p.count,
            lastActive: p.lastActive || undefined
        })));
    }

    protected flattenProjectSessions(groups: AgentConsoleSessionProjectGroup[]): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        return groups.flatMap(group => {
            const projectKey = String(group.projectKey || '').trim() || undefined;
            const projectId = String(group.projectId || '').trim() || undefined;
            const projectLabel = String(group.label || group.projectId || group.focusSummary || group.workspace || group.primaryThreadId || group.rootRequest || '').trim()
                || undefined;
            const primaryThreadId = String(group.primaryThreadId || '').trim() || undefined;
            const rootRequest = String(group.rootRequest || '').trim() || undefined;
            const focusSummary = String(group.focusSummary || '').trim() || undefined;
            return group.sessions.map(item => ({
                id: item.id,
                current: !!item.current,
                workspace: item.workspace || group.workspace,
                updatedAt: item.lastActiveAt,
                messageCount: item.messageCount,
                summary: item.summary,
                projectKey,
                projectId,
                primaryThreadId: item.primaryThreadId || primaryThreadId,
                rootRequest: item.rootRequest || rootRequest,
                focusSummary: item.focusSummary || focusSummary,
                projectLabel,
                projectSessionCount: group.sessionCount
            }));
        });
    }

    protected refreshProjectContext(): void {
        const projectSessions = this.resolveCurrentProjectSessions();
        if (!projectSessions.length) {
            this.state.setProjectContext();
            return;
        }
        const anchor = projectSessions.find(item => item.id === this.state.sessionId)
            || projectSessions.find(item => item.current)
            || projectSessions[0];
        const summary = projectSessions
            .slice()
            .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
            .map(item => String(item.summary || '').trim())
            .find(Boolean) || '';
        this.state.setProjectContext({
            projectKey: anchor ? this.resolveSessionProjectKey(anchor) : undefined,
            projectLabel: anchor?.projectLabel || anchor?.projectId || anchor?.focusSummary || anchor?.workspace || anchor?.primaryThreadId || anchor?.rootRequest || anchor?.id,
            projectSummary: summary,
            projectSessionCount: anchor?.projectSessionCount || projectSessions.length
        });
    }

    protected resolveCurrentProjectSessions(): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        const anchor = this.state.sessions.find(item => item.id === this.state.sessionId)
            || this.state.sessions.find(item => item.current)
            || this.state.sessions[0];
        if (!anchor) {
            return [];
        }
        const projectKey = this.resolveSessionProjectKey(anchor);
        if (projectKey) {
            return this.state.sessions.filter(item => this.resolveSessionProjectKey(item) === projectKey);
        }
        const workspace = String(anchor.workspace || '').trim();
        if (workspace) {
            return this.state.sessions.filter(item => String(item.workspace || '').trim() === workspace);
        }
        const primaryThreadId = String(anchor.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return this.state.sessions.filter(item => String(item.primaryThreadId || '').trim() === primaryThreadId);
        }
        return [anchor];
    }

    protected resolveSessionProjectKey(session?: {
        projectKey?: string;
        projectId?: string;
        workspace?: string;
        primaryThreadId?: string;
    } | null): string {
        const projectKey = String(session?.projectKey || '').trim();
        if (projectKey) {
            return projectKey;
        }
        const projectId = String(session?.projectId || '').trim();
        if (projectId) {
            return `project:${projectId}`;
        }
        const workspace = String(session?.workspace || '').trim();
        if (workspace) {
            return `workspace:${workspace}`;
        }
        const primaryThreadId = String(session?.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        return '';
    }

    protected resolveCurrentProjectSessionIds(): string[] {
        const sessions = this.resolveCurrentProjectSessions();
        const ids = sessions.map(item => String(item.id || '').trim()).filter(Boolean);
        return ids.length ? ids : [this.state.sessionId];
    }

    protected resolveCodingTaskSessionId(task?: Record<string, any> | null): string {
        const sessionId = String(task?.sourceSessionId || task?.sessionId || '').trim();
        return sessionId || this.state.sessionId;
    }

    protected resolveFocusedCodingTask(): Record<string, any> | null {
        if (this.state.reviewOpen && this.state.reviewTask) {
            return this.state.reviewTask;
        }
        if (this.state.tasksFocused && this.state.selectedTask) {
            return this.state.selectedTask;
        }
        return null;
    }

    protected async refreshPendingApprovals(): Promise<void> {
        if (!this.approvalManager) {
            this.state.setPendingApprovals([]);
            return;
        }
        const pending = this.approvalManager.getPending().filter((request: any) => request.sessionId === this.state.sessionId);
        this.state.setPendingApprovals(pending as AgentConsoleApprovalRequest[]);
    }

    protected async openSession(sessionId?: string): Promise<void> {
        if (this.isTurnInProgress()) {
            this.notifyBusyState('Wait for the current turn to finish before switching sessions.');
            return;
        }
        if (!this.sessionService) {
            return;
        }
        const target = await this.sessionService.ensureSession(sessionId);
        this.state.batch(() => {
            this.state.configure({ sessionId: target.id });
            this.state.setMessagesFocused(false);
            this.state.setSessionsFocused(false);
            this.state.setToolsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.clearReview();
            this.state.closeMessageDetail();
            this.state.clearActivities();
            this.state.setLastError('');
            this.state.setNotice('');
            this.state.setInput('', 0);
        });
        await this.refreshSessions();
        const [messages] = await Promise.all([
            this.loadSessionMessages(target.id),
            this.refreshTools(),
            this.refreshPendingApprovals(),
            this.refreshTodoPlan(),
            this.loadCodingTasks()
        ]);
        this.state.setMessages(messages);
    }

    protected async selectApprovalRequest(
        requests: AgentConsoleApprovalRequest[],
        selectedIndex = 0
    ): Promise<AgentConsoleApprovalRequest | undefined> {
        if (!requests.length) {
            return undefined;
        }
        if (requests.length === 1) {
            return requests[0];
        }
        const selected = await this.select('Pending approvals', requests.map(request => ({
            label: `${request.toolName} (${request.id.slice(0, 8)})`,
            value: request.id,
            description: request.reason,
            detail: [
                `Tool: ${request.toolName}`,
                `Reason: ${request.reason}`,
                request.inputSummary ? `Input: ${request.inputSummary}` : 'Input: -',
                `Timeout: ${request.timeoutMs}ms`
            ].join('\n')
        })), Math.max(0, Math.min(requests.length - 1, selectedIndex)), this.state.consoleOptions.selectHint);
        return requests.find(request => request.id === selected);
    }

    protected async openApprovalInspector(requests: AgentConsoleApprovalRequest[]): Promise<void> {
        if (!requests.length) {
            this.notify('No pending approvals.');
            return;
        }
        let selectedRequestIndex = 0;
        while (true) {
            const request = await this.selectApprovalRequest(requests, selectedRequestIndex);
            if (!request) {
                return;
            }
            selectedRequestIndex = Math.max(0, requests.findIndex(item => item.id === request.id));
            const detail = [
                `Tool: ${request.toolName}`,
                `Reason: ${request.reason}`,
                request.inputSummary ? `Input: ${request.inputSummary}` : 'Input: -',
                `Timeout: ${request.timeoutMs}ms`
            ].join('\n');
            const action = await this.select(`Approval ${request.id.slice(0, 8)}`, [
                {
                    label: 'Approve',
                    value: 'approve',
                    description: 'Allow this request',
                    detail
                },
                {
                    label: 'Deny',
                    value: 'deny',
                    description: 'Reject this request',
                    detail
                },
                {
                    label: 'Copy input',
                    value: 'copy-input',
                    description: 'Copy request input summary',
                    detail
                }
            ], 0, this.state.consoleOptions.selectHint);
            if (!action) {
                if (requests.length === 1) {
                    return;
                }
                continue;
            }
            if (action === 'approve') {
                const approved = this.approvalManager?.approve(request.id);
                this.notify(approved
                    ? `Approved ${request.toolName} (${request.id.slice(0, 8)}).`
                    : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
                return;
            }
            if (action === 'deny') {
                const denied = this.approvalManager?.reject(request.id);
                this.notify(denied
                    ? `Denied ${request.toolName} (${request.id.slice(0, 8)}).`
                    : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
                return;
            }
            if (action === 'copy-input') {
                await this.copyFocusedTextActionHandler(request.inputSummary || request.summary, 'approval input');
                return;
            }
        }
    }

    get title(): string {
        return this.state.title;
    }

    get showStatusPanel(): boolean {
        return !!this.state.notice || !!this.state.pendingApprovals.length;
    }

    get showDashboardPanel(): boolean {
        return !!this.state.status && (
            this.state.status !== 'idle'
            || !!this.state.notice
            || !!this.state.lastError
            || !!this.state.projectLabel
            || !!this.state.projectSummary
            || !!this.state.contextPreparationSummary
            || !!this.state.pendingApprovals.length
            || !!this.state.scheduledTasks.length
            || !!this.state.planTodos.length
            || !!this.state.reviewTaskChoices.length
            || !!this.state.toolRuns.length
            || !!this.state.activities.length
            || !!this.state.runningTools.length
            || (this.state.tokenUsage.totalTokens || 0) > 0
        );
    }

    get showSessionsPanel(): boolean {
        return this.state.sessionsFocused;
    }

    get showApprovalsPanel(): boolean {
        return this.state.approvalsFocused;
    }

    get showTasksPanel(): boolean {
        return this.state.tasksFocused || this.state.hasActivePlanTodos();
    }

    get showJobsPanel(): boolean {
        return this.state.jobsFocused;
    }

    get showMessageDetailPanel(): boolean {
        return false;
    }

    get showReviewPanel(): boolean {
        return !!this.state.reviewOpen;
    }

    get showActivityPanel(): boolean {
        return false;
    }

    get showToolsPanel(): boolean {
        return this.state.toolsFocused;
    }

    get showWorkingPanel(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    get showToolRunsPanel(): boolean {
        return false;
    }

    get showSelectPanel(): boolean {
        return !!this.state.selectMenu;
    }

    // ---- generic component bindings ----

    get inputShellStyle(): string {
        return this.state.theme?.inputShell || 'background: #1b2128; color: #c9d1d9; padding: 1 1;';
    }

    get inputValue(): string {
        return this.state.input || '';
    }

    get inputCursor(): number {
        return this.state.inputCursor || 0;
    }

    get selectTitle(): string {
        return this.state.selectMenu?.title || '';
    }

    get selectHint(): string {
        return this.state.selectMenu?.hint || this.state.consoleOptions.selectHint;
    }

    get selectOptions(): Array<{ label: string; value: string; description?: string }> {
        return this.state.selectMenu?.options?.map((o: any) => ({
            label: o.label,
            value: o.value,
            description: o.description || ''
        })) || [];
    }

    get selectIndex(): number {
        return this.state.selectMenu?.selectedIndex ?? 0;
    }

    get theme() {
        return this.state.theme;
    }

    get sessionState(): AgentConsoleSessionState {
        return this.state;
    }

    get sessionId(): string {
        return this.state.sessionId;
    }

    get input(): string {
        return this.state.input;
    }

    set input(value: string) {
        this.state.setInput(value, value.length);
    }

    get messages(): AgentMessage[] {
        return this.state.messages;
    }

    get status(): string {
        return this.state.status;
    }

    get provider(): string {
        return this.state.provider;
    }

    get model(): string {
        return this.state.model;
    }

    get workspace(): string {
        return this.state.workspace;
    }

    get tools() {
        return this.state.tools;
    }

    get activities() {
        return this.state.activities;
    }

    get runningTools(): string[] {
        return this.state.runningTools;
    }

    get toolRuns() {
        return this.state.toolRuns;
    }

    get highlightedToolRun() {
        return this.state.highlightedToolRun;
    }

    get tokenUsage() {
        return this.state.tokenUsage;
    }

    get lastError(): string {
        return this.state.lastError;
    }

    get notice(): string {
        return this.state.notice;
    }

    get selectMenu() {
        return this.state.selectMenu;
    }

    get commandHints(): string[] {
        return this.state.commandHints;
    }

    get tasksCount(): number {
        return this.state.tasksCount;
    }

    get submitActionHandler(): () => Promise<void> {
        return async () => {
            await this.submit();
        };
    }

    get selectActionHandler(): (value: string) => Promise<void> {
        return async (value: string) => {
            await this.state.confirmSelectMenu(value);
        };
    }

    get copyFocusedTextActionHandler(): (text: string, label: string) => Promise<void> {
        return async (text: string, label: string) => {
            if (!text) {
                this.notify(`Nothing to copy for ${label}.`);
                return;
            }
            this.notify(text);
        };
    }

    get activateSelectedSessionActionHandler(): (sessionId: string) => Promise<void> {
        return async (sessionId: string) => {
            if (!sessionId) {
                return;
            }
            await this.openSession(sessionId);
            this.state.setSessionsFocused(false);
        };
    }

    get openSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            const taskRecord = this.state.taskRecords.find(task => task?.id === taskId) || null;
            await this.openCodingTaskReview(taskId, taskRecord);
        };
    }

    get cancelSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.cancelCodingTask(taskId);
        };
    }

    get retrySelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.retryFailedCodingTask(taskId);
        };
    }

    get rollbackSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.rollbackCodingTask(taskId);
        };
    }

    get toggleSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.toggleScheduledTask(taskId);
        };
    }

    get cancelSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.cancelScheduledTask(taskId);
        };
    }

    get recoverSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.recoverScheduledTask(taskId);
        };
    }

    get activateSelectedToolActionHandler(): (toolName: string) => Promise<void> {
        return async (toolName: string) => {
            const name = String(toolName || '').trim();
            if (!name) {
                return;
            }
            const selected = this.state.tools.find(item => item.name === name);
            if (selected?.active) {
                this.notify(`Tool ${name} is already active.`);
                return;
            }
            try {
                const activated = await this.activateTool(name);
                await this.refreshTools();
                this.state.setSelectedToolName(name);
                const current = this.state.tools.find(item => item.name === name);
                this.notify(activated || current?.active
                    ? `Activated ${name}.`
                    : `Tool ${name} could not be activated.`);
            } catch (error: any) {
                this.notify(error?.message || `Failed to activate ${name}.`);
            }
        };
    }

    get resolveApprovalActionHandler(): (decision: 'approve' | 'deny', requestId: string) => Promise<void> {
        return async (decision: 'approve' | 'deny', requestId: string) => {
            if (!this.approvalManager || !requestId) {
                return;
            }
            const request = this.approvalManager.getPending().find((item: any) => item.id === requestId)
                || this.state.selectedApproval
                || { id: requestId, toolName: 'request' };
            const applied = decision === 'approve'
                ? this.approvalManager.approve(requestId)
                : this.approvalManager.reject(requestId);
            const pending = this.approvalManager.getPending().filter((item: any) => item.sessionId === this.state.sessionId);
            this.state.setPendingApprovals(pending as AgentConsoleApprovalRequest[]);
            this.notify(applied
                ? `${decision === 'approve' ? 'Approved' : 'Denied'} ${request.toolName} (${requestId.slice(0, 8)}).`
                : `Approval request ${requestId.slice(0, 8)} is no longer pending.`);
        };
    }

    showNotice(message: string): void {
        this.state.setNotice(message);
    }

    clearNotice(): void {
        this.showNotice('');
    }

    async select(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<string | undefined> {
        return new Promise(resolve => {
            const resolveSelection = async (value: string | undefined) => {
                resolve(value);
            };
            this.state.openSelectMenu(title, options, selectedIndex, hint);
            this.state.selectMenuAction = resolveSelection;
        });
    }

    configure(meta: AgentConsoleSessionMeta): this {
        this.state.configure(meta);
        return this;
    }

    async onInit(): Promise<void> {
        this.state.submitAction = this.submitActionHandler;
        this.state.copyFocusedTextAction = this.copyFocusedTextActionHandler;
        this.state.activateSelectedSessionAction = this.activateSelectedSessionActionHandler;
        this.state.openSelectedTaskAction = this.openSelectedTaskActionHandler;
        this.state.cancelSelectedTaskAction = this.cancelSelectedTaskActionHandler;
        this.state.retrySelectedTaskAction = this.retrySelectedTaskActionHandler;
        this.state.rollbackSelectedTaskAction = this.rollbackSelectedTaskActionHandler;
        this.state.toggleSelectedScheduledTaskAction = this.toggleSelectedScheduledTaskActionHandler;
        this.state.cancelSelectedScheduledTaskAction = this.cancelSelectedScheduledTaskActionHandler;
        this.state.recoverSelectedScheduledTaskAction = this.recoverSelectedScheduledTaskActionHandler;
        this.state.activateSelectedToolAction = this.activateSelectedToolActionHandler;
        this.state.resolveApprovalAction = this.resolveApprovalActionHandler;
        this.state.onReviewAnnotationsPersist = (cache) => this.saveReviewAnnotationsCacheToDisk(cache);
        this.restoreReviewAnnotationsCacheFromDisk();
        this.bridge.bindState(this.sessionState);
        this.bridge.subscribe();
        this.ensureWorkspaceMentionResolver();
        await this.bootstrapStateFromAppRpc();
        await this.openSession(this.state.sessionId);
        if (!this.inputHistoryStore) {
            this.inputHistoryStore = new AgentConsoleInputHistoryStore(this.appRpc || null, null);
        }
        await this.restoreInputHistory();
        await this.refreshTools();
        await this.refreshScheduledTasks();
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    onDestroy(): void {
        this.destroyed = true;
        this.clearStreamingMessageState();
        this.state.copyFocusedTextAction = undefined;
        this.state.activateSelectedSessionAction = undefined;
        this.state.openSelectedTaskAction = undefined;
        this.state.cancelSelectedTaskAction = undefined;
        this.state.retrySelectedTaskAction = undefined;
        this.state.rollbackSelectedTaskAction = undefined;
        this.state.toggleSelectedScheduledTaskAction = undefined;
        this.state.cancelSelectedScheduledTaskAction = undefined;
        this.state.recoverSelectedScheduledTaskAction = undefined;
        this.state.activateSelectedToolAction = undefined;
        this.state.resolveApprovalAction = undefined;
        void this.persistInputHistory();
        this.dispose();
    }

    protected async saveReviewAnnotationsCacheToDisk(cache: Record<string, Record<string, any>>): Promise<void> {
        if (!this.appRpc) {
            return;
        }
        const cacheKey = this.getReviewAnnotationsCacheKey();
        const selectedTaskId = String(this.state.selectedReviewTaskId || this.state.reviewTask?.id || '').trim();
        if (!cacheKey) {
            return;
        }
        try {
            const annotations = selectedTaskId || cacheKey
                ? this.extractReviewAnnotations(cache, { cacheKey, selectedTaskId }) || {}
                : {};
            await this.appRpc.request('review_annotations.save', {
                sessionId: this.resolveReviewAnnotationsSessionId(),
                cacheKey,
                cache: annotations
            });
        } catch {
            // annotation persistence is best-effort
        }
    }

    protected async restoreReviewAnnotationsCacheFromDisk(): Promise<void> {
        if (!this.appRpc) {
            return;
        }
        const cacheKey = this.getReviewAnnotationsCacheKey();
        if (!cacheKey) {
            return;
        }
        try {
            const cache = await this.appRpc.request('review_annotations.load', {
                sessionId: this.resolveReviewAnnotationsSessionId(),
                cacheKey
            });
            if (cache) {
                const selectedTaskId = String(this.state.selectedReviewTaskId || '').trim();
                if (selectedTaskId || cacheKey) {
                    const annotations = this.extractReviewAnnotations(cache, { cacheKey, selectedTaskId }) || {};
                    const cacheEntryKey = cacheKey || selectedTaskId;
                    this.state.setAnnotationCache({
                        ...this.state.getAnnotationCache(),
                        ...(cacheEntryKey ? { [cacheEntryKey]: annotations } : {})
                    });
                    this.state.reviewFileAnnotations = { ...annotations };
                    this.state.notify();
                }
            }
        } catch {
            // annotation restore is best-effort
        }
    }

    protected extractReviewAnnotations(
        cache: Record<string, Record<string, any>> | Record<string, any> | null | undefined,
        scope: { cacheKey?: string; selectedTaskId?: string }
    ): Record<string, any> | undefined {
        const cacheKey = String(scope.cacheKey || '').trim();
        const selectedTaskId = String(scope.selectedTaskId || '').trim();
        const direct = cache && typeof cache === 'object' && cacheKey
            ? (cache as Record<string, any>)[cacheKey]
            : undefined;
        if (this.looksLikeReviewAnnotationMap(direct)) {
            return direct;
        }
        const legacy = cache && typeof cache === 'object' && selectedTaskId
            ? (cache as Record<string, any>)[selectedTaskId]
            : undefined;
        if (this.looksLikeReviewAnnotationMap(legacy)) {
            return legacy;
        }
        if (this.looksLikeReviewAnnotationMap(cache)) {
            return cache as Record<string, any>;
        }
        return undefined;
    }

    protected looksLikeReviewAnnotationMap(value: unknown): value is Record<string, any> {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return false;
        }
        const entries = Object.values(value as Record<string, any>);
        return entries.every(entry => !!entry && typeof entry === 'object' && typeof entry.status === 'string');
    }

    protected ensureWorkspaceMentionResolver(): void {
        const injected = this.workspaceMentionsProvider
            || this.app?.get(AgentConsoleWorkspaceMentionsProvider, null) as AgentConsoleWorkspaceMentionsProvider | null
            || undefined;
        const injectedFileAdapter = injected ? ((injected as any).fileAdapter as FileAdapter | undefined) : undefined;
        if (injected && injectedFileAdapter) {
            this.workspaceMentionsProvider = injected;
        } else {
            const fileAdapter = this.app?.get(FileAdapter, null) as FileAdapter | null;
            if (fileAdapter) {
                this.workspaceMentionsProvider = new AgentConsoleWorkspaceMentionsProvider(fileAdapter);
            } else {
                this.workspaceMentionsProvider = injected;
            }
        }
        this.state.setWorkspaceMentionResolver(this.workspaceMentionsProvider || undefined);
    }

    protected parseSlashCommandLine(input: string): { raw: string; command: string; args: string } {
        const raw = String(input || '').trim();
        if (!raw.startsWith('/')) {
            return { raw, command: raw, args: '' };
        }
        const firstSpace = raw.indexOf(' ');
        if (firstSpace < 0) {
            return { raw, command: raw, args: '' };
        }
        return {
            raw,
            command: raw.slice(0, firstSpace),
            args: raw.slice(firstSpace + 1).trim()
        };
    }

    protected resolveUniqueCommandPrefix(input: string): { command: string; matches: string[] } {
        const matches = this.state.commandHints.filter(item => item.startsWith(input));
        return {
            command: matches.length === 1 ? matches[0] : input,
            matches
        };
    }

    protected async enrichPromptWithMentions(input: string): Promise<string> {
        const text = String(input || '');
        const matches = text.match(/(^|\s)@([^\s@]+)/g) || [];
        const mentions = Array.from(new Set(matches.map(item => item.trim())));
        if (!mentions.length) {
            return text;
        }
        const toolMap = new Map((this.state.tools || []).map(tool => [tool.name, tool]));
        const contextLines = (await Promise.all(mentions.map(async mention => {
            const name = mention.slice(1);
            switch (name) {
                case 'workspace':
                    return [`Workspace: ${this.state.workspace}`];
                case 'session':
                    return [`Session: ${this.state.sessionId}`];
                case 'model':
                    return [`Model: ${this.state.provider} / ${this.state.model}`];
                case 'tools':
                    return [`Tools: ${(this.state.tools || []).map(tool => tool.name).join(', ') || '(none)'}`];
                default: {
                    const tool = toolMap.get(name);
                    if (tool) {
                        return [`Tool ${tool.name}: toolset=${tool.toolset || 'default'}, active=${tool.active === false ? 'no' : 'yes'}`];
                    }
                    return await this.workspaceMentionsProvider?.resolveContext(this.state.workspace, name) || [];
                }
            }
        }))).flat();
        if (!contextLines.length) {
            return text;
        }
        return [
            '[Mention Context]',
            ...contextLines,
            '',
            text
        ].join('\n');
    }

    protected async bootstrapStateFromAppRpc(): Promise<void> {
        if (!this.appRpc) {
            return;
        }
        const meta = await this.appRpc.request('app.state');
        if (!meta || typeof meta !== 'object') {
            return;
        }
        if (typeof meta.title === 'string' && meta.title.trim()) {
            this.state.setTitle(meta.title.trim());
        }
        this.state.configure({
            sessionId: typeof meta.sessionId === 'string' ? meta.sessionId : undefined,
            provider: typeof meta.provider === 'string' ? meta.provider : undefined,
            model: typeof meta.model === 'string' ? meta.model : undefined,
            modelProfile: typeof meta.modelProfile === 'string' ? meta.modelProfile : undefined,
            workspace: typeof meta.workspace === 'string' ? meta.workspace : undefined
        });
    }

    protected async restoreInputHistory(): Promise<void> {
        if (!this.inputHistoryStore) {
            return;
        }
        try {
            const workspace = this.resolveHistoryWorkspace();
            const sessionId = this.state.sessionId;
            const entries = await this.inputHistoryStore.load(workspace, sessionId);
            if (entries.length) {
                this.state.setInputHistoryEntries(entries);
            }
        } catch {
        }
    }

    protected async persistInputHistory(): Promise<void> {
        if (!this.inputHistoryStore) {
            return;
        }
        try {
            await this.inputHistoryStore.save(this.state.getInputHistoryEntries(), this.resolveHistoryWorkspace(), this.state.sessionId);
        } catch {
        }
    }

    protected resolveHistoryWorkspace(): string {
        return String(this.state.workspace || (this.options.ui?.console as any)?.workspace || '').trim();
    }

    protected async openCodingTaskReview(taskId: string, taskRecord?: Record<string, any> | null): Promise<boolean> {
        const resolvedTaskId = String(taskId || '').trim();
        if (!resolvedTaskId) {
            this.notify('Review task id is required.');
            return false;
        }
        if (!this.appRpc) {
            this.notify('Review is unavailable without app RPC.');
            return false;
        }

        const resolvedTask = taskRecord ?? this.state.taskRecords.find(task => task?.id === resolvedTaskId) ?? null;
        const sessionId = this.resolveCodingTaskSessionId(resolvedTask);
        const [loadedTask, diffResult] = await Promise.all([
            resolvedTask ? Promise.resolve(resolvedTask) : this.appRpc.request('coding_task.get', { sessionId, taskId: resolvedTaskId }).then(result => result?.task ?? null),
            this.appRpc.request('coding_task.diff', { sessionId, taskId: resolvedTaskId })
        ]);

        if (!loadedTask && !diffResult?.diff && !Array.isArray(diffResult?.workers)) {
            this.notify(`Coding task "${resolvedTaskId}" was not found.`);
            return false;
        }

        this.state.batch(() => {
            this.state.setSessionsFocused(false);
            this.state.setTasksFocused(false);
            this.state.setJobsFocused(false);
            this.state.setToolsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.setMessagesFocused(false);
            this.state.closeMessageDetail();
            this.state.openReview(loadedTask || {
                id: resolvedTaskId,
                title: resolvedTaskId,
                sourceSessionId: sessionId,
                status: 'unknown',
                metadata: {
                    executionMode: diffResult?.executionMode ?? null
                }
            }, {
                diff: diffResult?.diff ?? null,
                workers: Array.isArray(diffResult?.workers) ? diffResult.workers : [],
                executionMode: diffResult?.executionMode ?? null
            });
            this.state.setNotice('');
            this.state.setLastError('');
        });
        await this.restoreReviewAnnotationsCacheFromDisk();
        return true;
    }

    protected describeCodingTaskRollback(task: any): string {
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

    protected describeCodingTaskCheckpointSummary(task: any): string | undefined {
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        if (!checkpoints.length) {
            return undefined;
        }
        const available = checkpoints.filter((entry: any) => entry?.status === 'available').length;
        const applied = checkpoints.filter((entry: any) => entry?.status === 'applied').length;
        const invalidated = checkpoints.filter((entry: any) => entry?.status === 'invalidated').length;
        return `${checkpoints.length} total · ${available} available · ${applied} applied · ${invalidated} invalidated`;
    }

    protected canCancelCodingTask(task: any): boolean {
        const status = String(task?.status || '').trim();
        return status === 'planned' || status === 'running';
    }

    protected canRollbackCodingTask(task: any): boolean {
        if (!task) {
            return false;
        }
        if (task?.result?.rollback?.available === true) {
            return true;
        }
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        return checkpoints.some((entry: any) => entry?.status === 'available');
    }

    protected canRetryCodingTask(task: any): boolean {
        if (!task) {
            return false;
        }
        const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
        if (workers.some((worker: any) => worker?.status === 'failed')) {
            return true;
        }
        return Number(task?.result?.aggregate?.failedWorkers || 0) > 0;
    }

    protected resolveCodingTaskRetrySourceTaskId(task: any): string | undefined {
        const value = task?.retryOfTaskId || task?.metadata?.retrySourceTaskId || task?.metadata?.retryOfTaskId;
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    protected buildCodingTaskLineageMetadata(task: any, tasks: any[]): {
        retryOfTaskId?: string;
        lineageRootTaskId: string;
        retryDepth?: number;
        lineageTaskCount: number;
    } {
        const taskId = String(task?.id || '').trim();
        const retryOfTaskId = this.resolveCodingTaskRetrySourceTaskId(task);
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
            currentRetrySource = nextTask ? this.resolveCodingTaskRetrySourceTaskId(nextTask) : undefined;
        }
        const lineageTaskCount = tasks.filter(item => {
            const itemId = String(item?.id || '').trim();
            if (!itemId) {
                return false;
            }
            if (itemId === lineageRootTaskId) {
                return true;
            }
            const source = this.resolveCodingTaskRetrySourceTaskId(item);
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
                current = nextTask ? this.resolveCodingTaskRetrySourceTaskId(nextTask) : undefined;
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

    protected buildCodingTaskChoice(task: any, tasks: any[] = []) {
        const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
        const rollback = task?.result?.rollback;
        const lineage = this.buildCodingTaskLineageMetadata(task, tasks.length ? tasks : [task]);
        return {
            id: task.id,
            title: String(task.title || task.id),
            sourceSessionId: String(task?.sourceSessionId || task?.sessionId || '').trim() || undefined,
            status: task.status,
            executionMode: task?.result?.executionMode ?? task?.metadata?.executionMode ?? null,
            workerCount: workers.length,
            rollbackAvailable: this.canRollbackCodingTask(task),
            rollbackMode: rollback?.mode,
            checkpointSummary: this.describeCodingTaskCheckpointSummary(task),
            retryOfTaskId: lineage.retryOfTaskId,
            lineageRootTaskId: lineage.lineageRootTaskId,
            retryDepth: lineage.retryDepth,
            lineageTaskCount: lineage.lineageTaskCount,
            updatedAt: task.updatedAt,
            detail: task?.result?.diff?.summary || task?.planning?.summary || task?.goal
        };
    }

    protected orderCodingTasksByLineage(tasks: any[]): any[] {
        const tasksById = new Map<string, any>(tasks
            .filter(task => typeof task?.id === 'string' && task.id.trim())
            .map(task => [String(task.id).trim(), task]));
        const childrenByParent = new Map<string, any[]>();
        const roots: any[] = [];

        for (const task of tasks) {
            const parentId = this.resolveCodingTaskRetrySourceTaskId(task);
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
        const remaining = tasks.filter(task => !visited.has(String(task?.id || '').trim())).sort(compareByUpdatedAt);
        for (const task of remaining) {
            visit(task);
        }
        return ordered;
    }

    protected buildCodingTaskSelectOption(task: any, tasks: any[] = []): AgentConsoleSelectOption {
        const choice = this.buildCodingTaskChoice(task, tasks);
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
                this.describeCodingTaskRollback(task)
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
                `Rollback: ${this.describeCodingTaskRollback(task)}`,
                choice.checkpointSummary ? `Checkpoints: ${choice.checkpointSummary}` : '',
                task?.result?.diff?.summary ? `Diff: ${task.result.diff.summary}` : '',
                task?.planning?.summary ? `Plan: ${task.planning.summary}` : '',
                task?.goal ? `Goal: ${task.goal}` : ''
            ].filter(Boolean).join('\n')
        };
    }

    protected async loadCodingTasks(): Promise<any[]> {
        if (!this.appRpc) {
            return [];
        }
        const sessionIds = this.resolveCurrentProjectSessionIds();
        const responses = await Promise.all(sessionIds.map(async sessionId => {
            const result = await this.appRpc!.request('coding_task.list', { sessionId });
            const tasks = Array.isArray(result?.tasks) ? result.tasks : [];
            return tasks.map((task: any) => ({
                ...task,
                sourceSessionId: sessionId
            }));
        }));
        const tasks = this.orderCodingTasksByLineage(responses.flat().sort((left, right) => {
            const activityDelta = Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return String(left?.id || '').localeCompare(String(right?.id || ''));
        }));
        this.state.batch(() => {
            this.state.setTaskRecords(tasks);
            this.state.setReviewTasks(tasks.map((task: any) => this.buildCodingTaskChoice(task, tasks)));
        });
        return tasks;
    }

    protected async openCodingTaskReviewSelector(): Promise<boolean> {
        const selectedTask = await this.selectCodingTask({
            title: 'Coding tasks',
            unavailableNotice: 'Review is unavailable without app RPC.',
            emptyNotice: 'No coding tasks available.',
            selectedTaskId: String(this.state.reviewTask?.id || this.state.selectedTask?.id || '').trim() || undefined
        });
        if (!selectedTask) {
            return true;
        }
        await this.openCodingTaskReview(selectedTask.id, selectedTask);
        return true;
    }

    protected async selectCodingTask(options: {
        title: string;
        unavailableNotice: string;
        emptyNotice: string;
        filter?: (task: any) => boolean;
        selectedTaskId?: string;
    }): Promise<any | null> {
        if (!this.appRpc) {
            this.notify(options.unavailableNotice);
            return null;
        }
        const tasks = await this.loadCodingTasks();
        const filteredTasks = typeof options.filter === 'function'
            ? tasks.filter(task => options.filter!(task))
            : tasks;
        if (!filteredTasks.length) {
            this.notify(options.emptyNotice);
            return null;
        }
        const selectedIndex = Math.max(0, filteredTasks.findIndex(task => task?.id === options.selectedTaskId));
        const selectedTaskId = await this.select(
            options.title,
            filteredTasks.map((task: any) => this.buildCodingTaskSelectOption(task, filteredTasks)),
            selectedIndex,
            this.state.consoleOptions.selectHint
        );
        if (!selectedTaskId) {
            return null;
        }
        return filteredTasks.find((task: any) => task.id === selectedTaskId) || null;
    }

    protected async openCodingTaskInspector(taskId?: string): Promise<boolean> {
        if (!this.appRpc) {
            this.notify('Task inspector is unavailable without app RPC.');
            return true;
        }
        const tasks = await this.loadCodingTasks();
        if (!tasks.length) {
            this.notify('No coding tasks available.');
            return true;
        }
        const resolvedTaskId = String(taskId || '').trim();
        const preferredTaskId = String(this.state.reviewTask?.id || this.state.selectedTask?.id || '').trim();
        const selectedTaskId = resolvedTaskId && tasks.some((task: any) => task.id === resolvedTaskId)
            ? resolvedTaskId
            : preferredTaskId && tasks.some((task: any) => task.id === preferredTaskId)
                ? preferredTaskId
                : tasks[0].id;
        this.state.batch(() => {
            this.state.setSessionsFocused(false);
            this.state.setToolsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.setJobsFocused(false);
            this.state.setMessagesFocused(false);
            this.state.closeMessageDetail();
            this.state.closeReview();
            this.state.setSelectedReviewTaskId(selectedTaskId);
            this.state.setTasksFocused(true);
            this.state.setNotice('');
            this.state.setLastError('');
        });
        return true;
    }

    protected async rollbackCodingTask(taskId?: string): Promise<boolean> {
        const fallbackTask = this.resolveFocusedCodingTask();
        const explicitTaskId = String(taskId || '').trim();
        let selectedTask = fallbackTask || null;
        let resolvedTaskId = explicitTaskId || String(fallbackTask?.id || '').trim();
        if (!resolvedTaskId || (!explicitTaskId && selectedTask && !this.canRollbackCodingTask(selectedTask))) {
            selectedTask = await this.selectCodingTask({
                title: 'Rollback coding tasks',
                unavailableNotice: 'Rollback is unavailable without app RPC.',
                emptyNotice: 'No rollbackable coding tasks available.',
                filter: (task: any) => this.canRollbackCodingTask(task),
                selectedTaskId: String(fallbackTask?.id || '').trim() || undefined
            });
            if (!selectedTask) {
                return true;
            }
            resolvedTaskId = String(selectedTask.id || '').trim();
        }
        if (!resolvedTaskId) {
            this.notify('Rollback task id is required.');
            return true;
        }
        if (!this.appRpc) {
            this.notify('Rollback is unavailable without app RPC.');
            return true;
        }
        if (selectedTask && selectedTask.id === resolvedTaskId && !this.canRollbackCodingTask(selectedTask)) {
            this.notify(`Rollback is unavailable for ${resolvedTaskId}.`);
            return true;
        }

        const sessionId = this.resolveCodingTaskSessionId(selectedTask);
        const result = await this.appRpc.request('coding_task.rollback', { sessionId, taskId: resolvedTaskId });
        if (result?.rolledBack !== true) {
            this.notify(`Rollback failed for ${resolvedTaskId}.`);
            return true;
        }

        await this.openCodingTaskReview(resolvedTaskId, result?.task ?? null);
        this.notify(`Rolled back ${resolvedTaskId}.`);
        return true;
    }

    protected async retryFailedCodingTask(taskId?: string): Promise<boolean> {
        const fallbackTask = this.resolveFocusedCodingTask();
        const explicitTaskId = String(taskId || '').trim();
        let selectedTask = fallbackTask || null;
        let resolvedTaskId = explicitTaskId || String(fallbackTask?.id || '').trim();
        if (!resolvedTaskId || (!explicitTaskId && selectedTask && !this.canRetryCodingTask(selectedTask))) {
            selectedTask = await this.selectCodingTask({
                title: 'Retry coding tasks',
                unavailableNotice: 'Retry is unavailable without app RPC.',
                emptyNotice: 'No retryable coding tasks available.',
                filter: (task: any) => this.canRetryCodingTask(task),
                selectedTaskId: String(fallbackTask?.id || '').trim() || undefined
            });
            if (!selectedTask) {
                return true;
            }
            resolvedTaskId = String(selectedTask.id || '').trim();
        }
        if (!resolvedTaskId) {
            this.notify('Retry task id is required.');
            return true;
        }
        if (!this.appRpc) {
            this.notify('Retry is unavailable without app RPC.');
            return true;
        }
        if (selectedTask && selectedTask.id === resolvedTaskId && !this.canRetryCodingTask(selectedTask)) {
            this.notify(`Retry is unavailable for ${resolvedTaskId}.`);
            return true;
        }

        const sessionId = this.resolveCodingTaskSessionId(selectedTask);
        const result = await this.appRpc.request('coding_task.retry_failed', { sessionId, taskId: resolvedTaskId });
        if (result?.retried !== true || !result?.task?.id) {
            this.notify(`Retry failed for ${resolvedTaskId}.`);
            return true;
        }

        await this.openCodingTaskReview(result.task.id, result.task);
        this.notify(`Retried failed workers from ${resolvedTaskId} as ${result.task.id}.`);
        return true;
    }

    protected async refreshScheduledTasks(): Promise<void> {
        if (!this.scheduler) {
            return;
        }
        this.state.setScheduledTasks(this.scheduler.getTasks());
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    protected async openScheduledJobsDashboard(taskId?: string): Promise<boolean> {
        if (!this.scheduler) {
            this.notify('Scheduler is unavailable.');
            return true;
        }
        const tasks = this.scheduler.getTasks();
        this.state.batch(() => {
            this.state.setScheduledTasks(tasks);
            this.state.setSessionsFocused(false);
            this.state.setTasksFocused(false);
            this.state.setToolsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.setMessagesFocused(false);
            this.state.closeMessageDetail();
            this.state.closeReview();
            this.state.setJobsFocused(true);
            if (taskId) {
                this.state.setSelectedScheduledTaskId(taskId);
            }
            this.state.setNotice('');
            this.state.setLastError('');
        });
        return true;
    }

    protected async toggleScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        const selected = this.state.selectedScheduledTask;
        if (!selected || selected.id !== resolvedTaskId) {
            this.notify(`Scheduled task "${resolvedTaskId}" was not found.`);
            return true;
        }
        if (selected.paused) {
            return this.resumeScheduledTask(resolvedTaskId);
        }
        return this.pauseScheduledTask(resolvedTaskId);
    }

    protected async pauseScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        if (!this.scheduler.pause) {
            this.notify('Pause is unavailable on the configured scheduler.');
            return true;
        }
        const task = await this.scheduler.pause(resolvedTaskId);
        if (!task) {
            this.notify(`Pause failed for ${resolvedTaskId}.`);
            return true;
        }
        await this.refreshScheduledTasks();
        this.state.setSelectedScheduledTaskId(resolvedTaskId);
        this.notify(`Paused ${resolvedTaskId}.`);
        return true;
    }

    protected async resumeScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        if (!this.scheduler.resume) {
            this.notify('Resume is unavailable on the configured scheduler.');
            return true;
        }
        const task = await this.scheduler.resume(resolvedTaskId);
        if (!task) {
            this.notify(`Resume failed for ${resolvedTaskId}.`);
            return true;
        }
        await this.refreshScheduledTasks();
        this.state.setSelectedScheduledTaskId(resolvedTaskId);
        this.notify(`Resumed ${resolvedTaskId}.`);
        return true;
    }

    protected async cancelScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        await this.scheduler.cancel(resolvedTaskId);
        await this.refreshScheduledTasks();
        this.notify(`Cancelled ${resolvedTaskId}.`);
        return true;
    }

    protected async recoverScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        if (!this.scheduler.recover) {
            this.notify('Recover is unavailable on the configured scheduler.');
            return true;
        }
        const task = await this.scheduler.recover(resolvedTaskId);
        if (!task) {
            this.notify(`Recover failed for ${resolvedTaskId}.`);
            return true;
        }
        await this.refreshScheduledTasks();
        this.state.setSelectedScheduledTaskId(resolvedTaskId);
        this.notify(`Recovered ${resolvedTaskId}.`);
        return true;
    }

    protected async cancelCodingTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Cancel task id is required.');
            return true;
        }
        if (!this.appRpc) {
            this.notify('Cancel is unavailable without app RPC.');
            return true;
        }
        const targetTask = this.state.selectedTask;
        if (targetTask && targetTask.id === resolvedTaskId && !this.canCancelCodingTask(targetTask)) {
            this.notify(`Cancel is unavailable for ${resolvedTaskId}.`);
            return true;
        }

        const sessionId = this.resolveCodingTaskSessionId(targetTask);
        const result = await this.appRpc.request('coding_task.cancel', { sessionId, taskId: resolvedTaskId });
        if (result?.cancelled !== true) {
            this.notify(`Cancel failed for ${resolvedTaskId}.`);
            return true;
        }

        await this.openCodingTaskInspector(resolvedTaskId);
        this.notify(`Cancelled ${resolvedTaskId}.`);
        return true;
    }


    protected async handleCommand(value: string): Promise<boolean> {
        const parsed = this.parseSlashCommandLine(value);
        if (!parsed.command.startsWith('/')) {
            return false;
        }
        const resolved = this.resolveUniqueCommandPrefix(parsed.command);
        if (!this.state.commandHints.includes(resolved.command)) {
            this.notify(resolved.matches.length
                ? `Ambiguous command: ${parsed.command}  (${resolved.matches.join(', ')})`
                : `Unknown command: ${parsed.command}`);
            return true;
        }
        switch (resolved.command) {
            case '/help':
                const helpSelection = await this.select('Help', [
                    { label: '/model', value: '/model', description: 'switch model' },
                    { label: '/sessions', value: '/sessions', description: 'sessions' },
                    { label: '/messages', value: '/messages', description: 'messages' },
                    { label: '/jobs', value: '/jobs', description: 'scheduled jobs' },
                    { label: '/tasks', value: '/tasks', description: 'task inspector' },
                    { label: '/review', value: '/review', description: 'coding task review' },
                    { label: '/retry', value: '/retry', description: 'retry failed workers' },
                    { label: '/rollback', value: '/rollback', description: 'rollback coding task' },
                    { label: '/multiline', value: '/multiline', description: 'multiline' },
                    { label: '/copy', value: '/copy', description: 'copy reply' },
                    { label: '/approvals', value: '/approvals', description: 'approvals' },
                    { label: '@workspace', value: '@workspace', description: 'context' },
                    { label: '/exit', value: '/exit', description: 'exit' }
                ], 0, this.state.consoleOptions.selectHint);
                if (helpSelection) {
                    await this.handleMenuSelection(helpSelection);
                }
                return true;
            case '/model':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (parsed.args) {
                    await this.activateModelProfile(parsed.args);
                    return true;
                }
                await this.openModelSwitcher();
                return true;
            case '/tools':
                if (parsed.args) {
                    await this.activateSelectedToolActionHandler(parsed.args);
                    return true;
                }
                if (!this.state.tools.length) {
                    this.notify('No tools available.');
                    return true;
                }
                this.state.setSessionsFocused(false);
                this.state.setMessagesFocused(false);
                this.state.closeMessageDetail();
                this.state.closeReview();
                this.state.setToolsFocused(true);
                return true;
            case '/jobs':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.openScheduledJobsDashboard(parsed.args);
            case '/tasks':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.openCodingTaskInspector(parsed.args);
            case '/review':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (parsed.args) {
                    const arg = parsed.args.trim();
                    if (arg === 'summary') {
                        const lines = this.state.getReviewAnnotationSummary();
                        for (const line of lines) {
                            this.notify(line);
                        }
                        return true;
                    }
                    if (arg === 'approve-all') {
                        this.state.approveAllReviewFiles();
                        this.notify('All files approved.');
                        return true;
                    }
                    if (arg === 'clear-all') {
                        this.state.clearAllReviewAnnotations();
                        this.notify('All annotations cleared.');
                        return true;
                    }
                    if (arg === 'clear') {
                        this.state.clearReviewFileAnnotation();
                        this.notify('Annotation cleared.');
                        return true;
                    }
                    if (arg === 'export') {
                        const report = this.state.getReviewExportReport();
                        if (!report.length) {
                            this.notify('No review data to export.');
                            return true;
                        }
                        for (const line of report) {
                            this.notify(line);
                        }
                        return true;
                    }
                    if (arg === 'risk') {
                        const sections = this.state.reviewFileSections;
                        if (!sections.length) {
                            this.notify('No review files to analyze.');
                            return true;
                        }
                        for (const section of sections) {
                            const risk = this.state.computeFileRiskScore(section);
                            const annot = this.state.reviewFileAnnotations[section.path];
                            const marker = annot ? (annot.status === 'approved' ? ' ✓' : ' ✗') : '';
                            this.notify(`${String(risk.score).padStart(2, ' ')} ${risk.level.padEnd(8, ' ')} ${section.path} (+${section.additions}/-${section.deletions})${marker}${annot?.comment ? ` - ${annot.comment}` : ''}`);
                        }
                        return true;
                    }
                    if (arg.startsWith('approve')) {
                        const comment = arg.slice(7).trim() || undefined;
                        this.state.setReviewFileAnnotation('approved', comment);
                        this.notify(comment ? `File approved: ${comment}` : 'File approved.');
                        return true;
                    }
                    if (arg.startsWith('reject')) {
                        const comment = arg.slice(6).trim() || undefined;
                        this.state.setReviewFileAnnotation('rejected', comment);
                        this.notify(comment ? `File rejected: ${comment}` : 'File rejected.');
                        return true;
                    }
                    await this.openCodingTaskReview(arg);
                    return true;
                }
                return this.openCodingTaskReviewSelector();
            case '/retry':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.retryFailedCodingTask(parsed.args);
            case '/rollback':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.rollbackCodingTask(parsed.args);
            case '/clear':
                await this.openSession(undefined);
                this.notify('Started a new session.');
                return true;
            case '/approvals': {
                const pending = this.approvalManager
                    ? this.approvalManager.getPending().filter((r: any) => r.sessionId === this.state.sessionId)
                    : [];
                if (!pending.length) {
                    this.notify('No pending approvals.');
                    return true;
                }
                this.state.setPendingApprovals(pending as AgentConsoleApprovalRequest[]);
                this.state.setSessionsFocused(false);
                this.state.setToolsFocused(false);
                this.state.setMessagesFocused(false);
                this.state.closeMessageDetail();
                this.state.closeReview();
                this.state.setApprovalsFocused(true);
                return true;
            }
            case '/copy': {
                if (parsed.args) {
                    switch (parsed.args) {
                        case 'input':
                            await this.copyFocusedTextActionHandler(this.state.input, 'input');
                            return true;
                        case 'workspace':
                            await this.copyFocusedTextActionHandler(this.state.workspace, 'workspace');
                            return true;
                        case 'session':
                            await this.copyFocusedTextActionHandler(this.state.sessionId, 'session');
                            return true;
                        case 'model':
                            await this.copyFocusedTextActionHandler(
                                [this.state.provider, this.state.model].filter(Boolean).join(' / '),
                                'model'
                            );
                            return true;
                        default:
                            this.notify('Nothing to copy.');
                            return true;
                    }
                }
                const msgs = this.state.messages;
                for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i].role === 'assistant' && msgs[i].content) {
                        await this.copyFocusedTextActionHandler(msgs[i].content, 'assistant message');
                        return true;
                    }
                }
                this.notify('Nothing to copy.');
                return true;
            }
            case '/session': {
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (parsed.args) {
                    await this.refreshSessions();
                    await this.openSession(parsed.args);
                    return true;
                }
                if (!this.state.sessions.length) {
                    this.notify('No sessions available.');
                    return true;
                }
                this.state.closeReview();
                this.state.setMessagesFocused(false);
                this.state.setSessionsFocused(true);
                return true;
            }
            case '/new':
                await this.openSession(parsed.args || undefined);
                return true;
            case '/sessions':
                await this.refreshSessions();
                if (!this.state.sessions.length) {
                    this.notify('No sessions available.');
                    return true;
                }
                this.state.closeReview();
                this.state.setMessagesFocused(false);
                this.state.setSessionsFocused(true);
                return true;
            case '/toolruns':
                if (!this.state.toolRuns.length) {
                    this.notify('No tool runs available.');
                    return true;
                }
                this.state.closeReview();
                {
                    const selectedRun = await this.select(
                        'Tool runs',
                        this.state.toolRuns.map((r, i) => ({
                            label: `${r.name} [${r.status}]${r.durationMs != null ? ` ${r.durationMs}ms` : ''}${r.attemptCount && r.attemptCount > 1 ? ` #${r.attemptCount}` : ''}`,
                            value: String(i),
                            detail: r.inputSummary || r.outputSummary || r.error || ''
                        })),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (selectedRun != null) {
                        const idx = parseInt(selectedRun, 10);
                        const run = this.state.toolRuns[idx];
                        if (run) {
                            this.notify(
                                [
                                    `${run.name} [${run.status}]`,
                                    run.durationMs != null ? `${run.durationMs}ms` : '',
                                    run.attemptCount ? `attempt #${run.attemptCount}` : '',
                                    run.error ? `error: ${run.error}` : '',
                                    run.inputSummary ? `in: ${this.state.summarize(run.inputSummary)}` : '',
                                    run.outputSummary ? `out: ${this.state.summarize(run.outputSummary)}` : ''
                                ].filter(Boolean).join(' | ')
                            );
                        }
                    }
                }
                return true;
            case '/search':
                if (!parsed.args || !parsed.args.trim()) {
                    this.notify('Usage: /search <query>');
                    return true;
                }
                {
                    const query = parsed.args.trim().toLowerCase();
                    const matches = this.state.sessions.filter(s => {
                        const id = (s.id || '').toLowerCase();
                        const summary = (s.summary || '').toLowerCase();
                        const ws = (s.workspace || '').toLowerCase();
                        const proj = (s.projectLabel || s.projectKey || s.projectId || '').toLowerCase();
                        return id.includes(query) || summary.includes(query) || ws.includes(query) || proj.includes(query);
                    });
                    if (!matches.length) {
                        this.notify(`No sessions matching "${parsed.args.trim()}".`);
                        return true;
                    }
                    const sessionId = await this.select(
                        `Search: "${parsed.args.trim()}" (${matches.length})`,
                        matches.map(s => ({
                            label: `${s.id}${s.current ? ' [current]' : ''} (${s.messageCount ?? '?'})`,
                            value: s.id,
                            detail: s.summary || s.workspace || ''
                        })),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (sessionId) {
                        await this.openSession(sessionId);
                    }
                }
                return true;
            case '/projects':
                if (!this.state.projects.length) {
                    await this.refreshSessions();
                }
                if (!this.state.projects.length) {
                    this.notify('No projects available.');
                    return true;
                }
                this.state.closeReview();
                {
                    const project = await this.select(
                        'Projects',
                        this.state.projects.map(p => ({
                            label: `${p.label} (${p.sessionCount})`,
                            value: p.key,
                            detail: p.lastActive ? `last active ${new Date(p.lastActive).toLocaleDateString()}` : undefined
                        })),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (!project) return true;
                    const projectSessions = this.state.sessions.filter(
                        s => this.resolveSessionProjectKey(s) === project
                    );
                    if (!projectSessions.length) {
                        this.notify('No sessions in this project.');
                        return true;
                    }
                    const sessionId = await this.select(
                        `Sessions in ${project}`,
                        projectSessions.map(s => ({
                            label: `${s.id}${s.current ? ' [current]' : ''} (${s.messageCount ?? '?'})`,
                            value: s.id,
                            detail: s.summary
                        })),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (!sessionId) return true;
                    await this.openSession(sessionId);
                }
                return true;
            case '/messages':
                this.state.closeReview();
                this.state.setSessionsFocused(false);
                this.state.setMessagesFocused(true);
                return true;
            case '/approve':
            case '/deny': {
                if (!this.approvalManager) { return true; }
                const isApprove = resolved.command === '/approve';
                const pend = this.approvalManager.getPending().filter((r: any) => r.sessionId === this.state.sessionId);
                if (!pend.length) { this.notify('No pending approvals.'); return true; }
                if (parsed.args) {
                    const exact = pend.find((item: any) => item.id === parsed.args);
                    const matches = exact ? [exact] : pend.filter((item: any) => item.id.startsWith(parsed.args));
                    if (matches.length === 1) {
                        const applied = isApprove ? this.approvalManager.approve(matches[0].id) : this.approvalManager.reject(matches[0].id);
                        this.notify(applied
                            ? `${isApprove ? 'Approved' : 'Denied'} ${matches[0].toolName} (${matches[0].id.slice(0, 8)}).`
                            : `Approval request ${matches[0].id.slice(0, 8)} is no longer pending.`);
                    } else {
                        this.notify(matches.length > 1
                            ? `Approval id "${parsed.args}" is ambiguous.`
                            : `Approval id "${parsed.args}" not found.`);
                    }
                    return true;
                }
                const req = pend.length === 1 ? pend[0] : null;
                if (!req) {
                    const sel = await this.select(isApprove ? 'Approve' : 'Deny',
                        pend.map((r: any) => ({ label: r.toolName + ' (' + r.id.slice(0, 8) + ')', value: r.id, description: r.reason })));
                    if (!sel) { return true; }
                    const found = pend.find((r: any) => r.id === sel);
                    if (found) {
                        const applied = isApprove ? this.approvalManager.approve(found.id) : this.approvalManager.reject(found.id);
                        this.notify(applied
                            ? `${isApprove ? 'Approved' : 'Denied'} ${found.toolName} (${found.id.slice(0, 8)}).`
                            : `Approval request ${found.id.slice(0, 8)} is no longer pending.`);
                    }
                    return true;
                }
                if (req) {
                    const applied = isApprove ? this.approvalManager.approve(req.id) : this.approvalManager.reject(req.id);
                    this.notify(applied
                        ? `${isApprove ? 'Approved' : 'Denied'} ${req.toolName} (${req.id.slice(0, 8)}).`
                        : `Approval request ${req.id.slice(0, 8)} is no longer pending.`);
                }
                return true;
            }
            case '/quit':
            case '/exit':
                await this.requestTerminalExit('Closing session...');
                return true;
            case '/multiline':
                this.multilineMode = !this.multilineMode;
                if (!this.multilineMode) { this.draftLines = []; }
                return true;
            case '/cancel':
                this.draftLines = [];
                this.multilineMode = false;
                return true;
            case '/send':
                if (!this.draftLines.length) { return true; }
                await this.submitMultilineDraft();
                return true;
            default:
                return false;
        }
    }

    protected async handleMenuSelection(value: string): Promise<void> {
        const selected = String(value || '').trim();
        if (!selected) {
            return;
        }
        const currentInput = String(this.state.input || '').trim();
        if (currentInput === '/help') {
            this.state.setInput('');
        }
        if (selected.startsWith('/')) {
            await this.handleCommand(selected);
            return;
        }
        if (selected.startsWith('@')) {
            const base = String(this.state.input || '').trim();
            const nextInput = base
                ? `${base} ${selected} `
                : `${selected} `;
            this.state.setInput(nextInput, clampConsoleTextCursor(nextInput, nextInput.length));
            this.state.setInputFocused(true);
        }
    }

    protected async submitMultilineDraft(): Promise<void> {
        if (!this.draftLines.length) { return; }
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return;
        }
        const draft = this.draftLines.join('\n');
        const prompt = await this.enrichPromptWithMentions(draft);
        this.draftLines = [];
        this.multilineMode = false;
        this.state.pushInputHistory(draft);
        await this.persistInputHistory();
        this.clearStreamingMessageState();
        const turnScope = this.state.beginTurnEventScope();
        const userMsg: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            createdAt: Date.now()
        };
        const asstMsg: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
        this.state.batch(() => {
            const baseMessages = this.state.messages.slice();
            this.state.setInput('');
            this.state.setStatus('running');
            this.state.setLastError('');
            this.state.clearActivities();
            this.state.pushActivity('turn', 'User: ' + this.state.summarize(draft));
            this.state.setMessages([...baseMessages, userMsg, asstMsg]);
        });
        try {
            await this.runTurnStream(prompt, asstMsg);
            this.clearStreamingMessageState();
            this.ensureMessageAtTail(asstMsg.id);
            this.state.batch(() => {
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                }
            });
        } catch (error: any) {
            this.clearStreamingMessageState();
            this.state.batch(() => {
                this.state.setStatus('error');
                this.state.setLastError(error.message || 'Unknown');
                this.state.pushActivity('error', error.message || 'Unknown');
                this.state.appendAssistantErrorMessage(error.message || 'Unknown');
            });
        } finally {
            this.state.clearTurnEventScope(turnScope);
        }
    }
    async submit(): Promise<void> {
        const value = this.state.input.trim();
        if (!value) { return; }
        if (value.startsWith('/')) {
            this.state.pushInputHistory(value);
            const persistHistory = this.persistInputHistory();
            this.state.setInput('');
            if (await this.handleCommand(value)) {
                await persistHistory;
                return;
            }
            await persistHistory;
            this.state.setInput(value, value.length);
        }
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return;
        }
        this.state.pushInputHistory(value);
        await this.persistInputHistory();
        if (this.multilineMode) {
            this.draftLines.push(value);
            return;
        }
        const prompt = await this.enrichPromptWithMentions(value);
        this.clearStreamingMessageState();
        const turnScope = this.state.beginTurnEventScope();
        const userMessage: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            createdAt: Date.now()
        };
        const assistantMessage: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
        this.state.batch(() => {
            const baseMessages = this.state.messages.slice();
            this.state.setInput('');
            this.state.setStatus('running');
            this.state.setLastError('');
            this.state.clearActivities();
            this.state.pushActivity('turn', `User: ${this.state.summarize(value)}`);
            this.state.setMessages([...baseMessages, userMessage, assistantMessage]);
        });

        try {
            await this.runTurnStream(prompt, assistantMessage);
        } catch (error: any) {
            const message = error?.message || String(error || 'Unknown error');
            this.state.batch(() => {
                this.state.setStatus('error');
                this.state.setLastError(message);
                this.state.pushActivity('error', message);
                this.state.appendAssistantErrorMessage(message);
            });
        } finally {
            this.ensureMessageAtTail(assistantMessage.id);
            this.state.batch(() => {
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                }
                this.state.setTasksCount(this.scheduler.getTasks().length);
            });
            void this.refreshTurnArtifacts();
            this.state.clearTurnEventScope(turnScope);
        }
    }

    protected async runTurnStream(prompt: string, assistantMessage: AgentMessage): Promise<void> {
        this.scheduleStreamingPendingNotice();
        const stream = this.appRpc?.stream?.('run.turn_stream', { sessionId: this.state.sessionId, input: prompt });
        if (stream) {
            try {
                for await (const chunk of stream) {
                    this.consumeStreamChunk(chunk, assistantMessage);
                }
            } finally {
                this.clearStreamingMessageState();
            }
            assistantMessage.metadata = {
                ...(assistantMessage.metadata || {}),
                streaming: false
            };
            this.replaceStreamingAssistantMessage(assistantMessage);
            return;
        }

        const runtime: any = this.runtime;
        if (typeof runtime?.runStreamingTurn === 'function') {
            for await (const chunk of runtime.runStreamingTurn(this.state.sessionId, prompt)) {
                this.consumeStreamChunk(chunk, assistantMessage);
            }
            assistantMessage.metadata = {
                ...(assistantMessage.metadata || {}),
                streaming: false
            };
            this.replaceStreamingAssistantMessage(assistantMessage);
            return;
        }

        const result = await this.executeTurn(prompt);
        if (result && 'message' in result) {
            assistantMessage.content = result.message.content;
            this.state.batch(() => {
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                }
            });
        }
    }

    protected consumeStreamChunk(chunk: any, assistantMessage: AgentMessage): void {
        this.state.batch(() => {
            if (chunk?.usage) {
                this.state.setTokenUsage(chunk.usage);
            }
            if (chunk?.type === 'event') {
                this.consumeStreamEventChunk(chunk);
                return;
            }
            if (chunk?.type === 'text' && chunk.content) {
                this.clearStreamingPendingNotice();
                assistantMessage.content += chunk.content;
                this.scheduleStreamingAssistantMessageFlush(assistantMessage);
                return;
            }
            if (chunk?.type === 'reasoning' && chunk.content) {
                this.clearStreamingPendingNotice();
                this.state.setStatus('reasoning');
                this.state.pushActivity('model', `Reasoning: ${this.state.summarize(chunk.content)}`);
                this.state.upsertUiEventMessage(this.state.qualifyUiEventKey('reasoning'), 'Reasoning about implementation', {
                    eventType: 'reasoning',
                    label: 'think',
                    status: 'running'
                });
                return;
            }
            if (chunk?.type === 'tool_call') {
                this.clearStreamingPendingNotice();
                const content = this.describePendingToolCall(chunk.content);
                const eventKey = this.qualifyTurnUiEventKey(this.resolveToolEventKey('tool_call', chunk));
                this.state.pushActivity('tool', `Tool call: ${this.state.summarize(String(content || chunk.content || ''))}`);
                if (eventKey) {
                    this.state.upsertUiEventMessage(eventKey, content, {
                        eventType: 'tool_call',
                        label: 'tool',
                        status: 'running'
                    });
                } else {
                    this.state.appendUiEventMessage(content, {
                        eventType: 'tool_call',
                        label: 'tool',
                        status: 'running'
                    });
                }
                if (String(chunk.content || '').includes('todo')) {
                    void this.refreshTodoPlan();
                }
                return;
            }
            if (chunk?.type === 'done' && chunk.message) {
                this.clearStreamingPendingNotice();
                assistantMessage.content = chunk.message.content || assistantMessage.content;
                assistantMessage.metadata = {
                    ...(chunk.message.metadata || {}),
                    streaming: false
                };
                this.replaceStreamingAssistantMessage(assistantMessage);
                this.state.setTokenUsage(chunk.message.metadata?.usage);
            }
        });
    }

    protected consumeStreamEventChunk(chunk: any): void {
        const content = String(chunk?.content || '').trim();
        if (!content) {
            return;
        }
        const eventType = String(chunk?.eventType || 'state').trim() || 'state';
        const label = String(chunk?.label || this.resolveStreamEventLabel(eventType)).trim() || 'state';
        const status = this.normalizeUiEventStatus(chunk?.status);
        const eventKey = this.qualifyTurnUiEventKey(this.resolveToolEventKey(eventType, chunk))
            || (eventType === 'turn_started'
                ? this.state.qualifyUiEventKey('turn-start')
                : eventType === 'reasoning'
                    ? this.state.qualifyUiEventKey('reasoning')
                    : undefined);
        this.state.batch(() => {
            if (eventKey) {
                this.state.upsertUiEventMessage(eventKey, content, {
                    eventType,
                    label,
                    status
                });
                return;
            }
            this.state.appendUiEventMessage(content, {
                eventType,
                label,
                status
            });
        });
    }

    protected resolveToolEventKey(eventType: string, chunk: any): string | undefined {
        switch (eventType) {
            case 'tool_call':
            case 'tool_invoked':
            case 'tool_completed':
            case 'tool_failed':
            case 'tool_skipped': {
                const toolCallId = String(chunk?.toolCallId || '').trim();
                if (toolCallId) {
                    return `tool:${toolCallId}`;
                }
                const toolName = this.resolveToolEventName(chunk);
                return toolName ? `tool:${toolName}` : undefined;
            }
            default:
                return undefined;
        }
    }

    protected qualifyTurnUiEventKey(key: string | undefined): string | undefined {
        const resolvedKey = String(key || '').trim();
        return resolvedKey ? this.state.qualifyUiEventKey(resolvedKey) : undefined;
    }

    protected resolveToolEventName(chunk: any): string {
        const explicit = String(chunk?.toolName || '').trim();
        if (explicit) {
            return explicit;
        }
        const content = String(chunk?.content || '').trim();
        if (!content) {
            return '';
        }
        return content
            .split(/[·:(]/, 1)[0]
            .replace(/\s+(completed|failed|skipped)$/i, '')
            .trim();
    }

    protected describePendingToolCall(content: unknown): string {
        const text = String(content || '').trim();
        if (!text) {
            return 'tool';
        }
        const toolName = this.resolveToolEventName({ content: text });
        return toolName || text;
    }

    async schedulePrompt(prompt: string, delayMs: number): Promise<void> {
        await this.scheduler.schedule({
            id: `task-${Date.now()}`,
            sessionId: this.state.sessionId,
            prompt,
            runAt: Date.now() + delayMs,
            scheduleType: 'once'
        });
        await this.refreshScheduledTasks();
    }

    dispose(): void {
        this.clearStreamingMessageState();
        this.bridge.dispose();
    }

    getTerminalRoot(): RNode | RNode[] | undefined {
        const rootNodes = this.componentRef?.hostView?.rootNodes;
        if (rootNodes?.length) {
            return rootNodes;
        }
        return undefined;
    }

    shouldPlaceTerminalCursor(): boolean {
        return this.state.shouldRenderTerminalCursor();
    }

    resolveTerminalCursorMode(): 'prompt' | 'bottom' {
        return this.state.resolveTerminalCursorMode();
    }

    getTerminalRenderedLines(): string[] {
        return this.surfaceAccessor?.getLastRenderedLines() || [];
    }

    getTerminalRenderedText(stripAnsi: (value: string) => string): string {
        return this.surfaceAccessor?.getLastRenderedText(stripAnsi) || '';
    }

    protected scheduleStreamingAssistantMessageFlush(message: AgentMessage): void {
        const shouldFlushImmediately = !this.streamMessageText;
        this.streamMessageText = message.content || '';
        if (shouldFlushImmediately) {
            this.flushStreamingAssistantMessage(message);
            return;
        }
        if (this.streamMessageTimer || this.destroyed) {
            return;
        }
        this.streamMessageTimer = setTimeout(() => {
            this.streamMessageTimer = undefined;
            this.flushStreamingAssistantMessage(message);
        }, AgentConsoleComponent.STREAM_MESSAGE_FLUSH_MS);
    }

    protected flushStreamingAssistantMessage(message?: AgentMessage): void {
        if (this.streamMessageTimer) {
            clearTimeout(this.streamMessageTimer);
            this.streamMessageTimer = undefined;
        }
        if (this.destroyed) {
            this.streamMessageText = '';
            return;
        }
        const current = this.state.messages.slice();
        const targetIndex = this.findStreamingAssistantMessageIndex(current, message);
        if (targetIndex >= 0) {
            const currentMessage = current[targetIndex];
            if (String(currentMessage.content || '') === this.streamMessageText
                && currentMessage.metadata?.streaming === true) {
                return;
            }
            current[targetIndex] = {
                ...(message || currentMessage),
                content: this.streamMessageText,
                metadata: {
                    ...(message?.metadata || currentMessage.metadata || {}),
                    streaming: true
                }
            };
            this.state.setMessages(current);
        }
    }

    protected replaceStreamingAssistantMessage(message: AgentMessage): void {
        if (this.destroyed) {
            return;
        }
        const current = this.state.messages.slice();
        const targetIndex = this.findStreamingAssistantMessageIndex(current, message);
        if (targetIndex < 0) {
            return;
        }
        const currentMessage = current[targetIndex];
        const replacement = {
            ...currentMessage,
            ...message,
            metadata: {
                ...(currentMessage.metadata || {}),
                ...(message.metadata || {})
            }
        };
        if (String(currentMessage.content || '') === String(replacement.content || '')
            && currentMessage.metadata?.streaming === replacement.metadata?.streaming) {
            return;
        }
        current[targetIndex] = replacement;
        if (replacement.metadata?.streaming !== true && targetIndex !== current.length - 1) {
            current.splice(targetIndex, 1);
            current.push(replacement);
        }
        this.state.setMessages(current);
    }

    protected clearStreamingMessageState(): void {
        if (this.streamMessageTimer) {
            clearTimeout(this.streamMessageTimer);
            this.streamMessageTimer = undefined;
        }
        this.streamMessageText = '';
        this.clearStreamingPendingNotice();
    }

    protected scheduleStreamingPendingNotice(): void {
        this.clearStreamingPendingNotice();
        this.streamPendingTimer = setTimeout(() => {
            this.streamPendingTimer = undefined;
            if (this.destroyed || !this.isTurnInProgress()) {
                return;
            }
            const provider = this.state.provider || this.options.model?.provider || 'model';
            const model = this.state.model || this.options.model?.model || 'unknown';
            this.state.upsertUiEventMessage(
                'turn-pending',
                `Waiting for ${provider} / ${model} to return the first response chunk`,
                {
                    eventType: 'model_wait',
                    label: 'net',
                    status: 'running'
                }
            );
        }, AgentConsoleComponent.STREAM_PENDING_NOTICE_MS);
    }

    protected clearStreamingPendingNotice(): void {
        if (this.streamPendingTimer) {
            clearTimeout(this.streamPendingTimer);
            this.streamPendingTimer = undefined;
        }
    }

    protected ensureMessageAtTail(messageId: string): void {
        const resolvedId = String(messageId || '').trim();
        if (!resolvedId) {
            return;
        }
        const current = this.state.messages.slice();
        const index = current.findIndex(item => item.id === resolvedId);
        if (index < 0 || index === current.length - 1) {
            return;
        }
        const [message] = current.splice(index, 1);
        if (!message) {
            return;
        }
        current.push(message);
        this.state.setMessages(current);
    }

    protected async loadSessionMessages(sessionId = this.state.sessionId): Promise<AgentMessage[]> {
        const messages = await (this.sessionService?.loadMessages(sessionId) || this.runtime.getMessages(sessionId));
        return this.normalizeLoadedMessages(messages);
    }

    protected normalizeLoadedMessages(messages: AgentMessage[] = []): AgentMessage[] {
        const normalized: AgentMessage[] = [];
        for (const message of messages) {
            if (!message) {
                continue;
            }
            if (message.role === 'assistant' && !String(message.content || '').trim()) {
                continue;
            }
            const previous = normalized[normalized.length - 1];
            if (message.role === 'assistant'
                && message.metadata?.error
                && previous?.role === 'assistant'
                && previous?.metadata?.error
                && String(previous.content || '').trim() === String(message.content || '').trim()) {
                continue;
            }
            normalized.push(message);
        }
        return normalized;
    }

    protected async refreshTurnArtifacts(): Promise<void> {
        await Promise.allSettled([
            this.refreshTools(),
            this.refreshScheduledTasks(),
            this.refreshTodoPlan(),
            this.loadCodingTasks()
        ]);
    }

    protected async refreshTodoPlan(): Promise<void> {
        if (!this.appRpc) {
            return;
        }
        const sessions = this.resolveCurrentProjectSessions()
            .slice()
            .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
        const results = await Promise.all(sessions.map(async session => ({
            sessionId: session.id,
            updatedAt: session.updatedAt || 0,
            result: await this.appRpc!.request('todo.get', { sessionId: session.id })
        })));
        const merged = new Map<string, { id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }>();
        let sourceSessionId: string | undefined;
        for (const entry of results) {
            const todos = Array.isArray(entry.result?.todos)
                ? entry.result.todos.map((item: any) => ({
                    id: String(item?.id || '').trim(),
                    content: String(item?.content || '').trim(),
                    status: this.normalizeTodoStatus(item?.status)
                })).filter((item: any) => !!item.id && !!item.content)
                : [];
            if (!todos.length) {
                continue;
            }
            sourceSessionId ||= entry.sessionId;
            for (const todo of todos) {
                if (!merged.has(todo.id)) {
                    merged.set(todo.id, todo);
                }
            }
        }
        const activeTodos = Array.from(merged.values()).filter(todo => todo.status === 'pending' || todo.status === 'in_progress');
        const nextTodos = activeTodos.length ? activeTodos : Array.from(merged.values());
        this.state.setPlanTodos(nextTodos, sourceSessionId || this.state.sessionId);
    }

    protected normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
        switch (String(status || '').trim()) {
            case 'in_progress':
            case 'completed':
            case 'cancelled':
                return status as 'in_progress' | 'completed' | 'cancelled';
            default:
                return 'pending';
        }
    }

    protected normalizeUiEventStatus(status: unknown): 'running' | 'success' | 'failed' | 'error' {
        switch (String(status || '').trim()) {
            case 'success':
            case 'failed':
            case 'error':
                return status as 'success' | 'failed' | 'error';
            default:
                return 'running';
        }
    }

    protected resolveStreamEventLabel(eventType: string): string {
        switch (eventType) {
            case 'reasoning':
                return 'think';
            case 'tool_invoked':
            case 'tool_completed':
            case 'tool_failed':
            case 'tool_skipped':
                return 'tool';
            case 'error':
                return 'error';
            default:
                return 'state';
        }
    }

    protected findStreamingAssistantMessageIndex(messages: AgentMessage[], message?: AgentMessage): number {
        const messageId = String(message?.id || '').trim();
        if (messageId) {
            const explicitIndex = messages.findIndex(item => item.id === messageId);
            if (explicitIndex >= 0) {
                return explicitIndex;
            }
        }
        for (let index = messages.length - 1; index >= 0; index--) {
            const current = messages[index];
            if (current?.role === 'assistant' && current?.metadata?.streaming) {
                return index;
            }
        }
        return -1;
    }

    async handleTerminalInput(
        decoded: TerminalInputSequenceResult,
        chunk: Buffer | string
    ): Promise<void> {
        const rawChunk = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
        const submitOnEnter = /[\r\n]/.test(rawChunk);
        const outcome = await this.state.processDecodedInput(decoded, chunk, {
            isClosed: this.destroyed,
            onExit: (message: string) => {
                void this.requestTerminalExit(message);
            },
            hasActiveTextPrompt: false,
            lastRenderedLines: this.getTerminalRenderedLines()
        });
        if (!outcome.handled && decoded.text) {
            await this.state.processRawChunk(decoded.text, {
                submitOnEnter,
                hasSelectMenu: !!this.state.selectMenu
            });
            return;
        }
        switch (outcome.action) {
            case 'submit':
                await this.submit();
                return;
            case 'textInput':
                await this.state.processRawChunk(rawChunk, {
                    submitOnEnter,
                    hasSelectMenu: !!this.state.selectMenu
                });
                return;
            case 'draftNavigation':
                switch (outcome.value) {
                    case 'left':
                        this.state.moveInputCursor(-1);
                        return;
                    case 'right':
                        this.state.moveInputCursor(1);
                        return;
                    case 'home':
                        this.state.moveInputCursorToEdge('start');
                        return;
                    case 'end':
                        this.state.moveInputCursorToEdge('end');
                        return;
                    default:
                        return;
                }
            case 'altNewline':
                await this.state.processRawChunk('\n', {
                    submitOnEnter: false,
                    altKey: true,
                    hasSelectMenu: !!this.state.selectMenu
                });
                return;
            default:
                return;
        }
    }

    protected async requestTerminalExit(message?: string): Promise<void> {
        const exitMessage = String(message || '').trim();
        if (!this.app) {
            if (exitMessage) {
                this.notify(exitMessage);
            }
            return;
        }
        await this.app.close();
        if (exitMessage && typeof process !== 'undefined' && process.stdout?.write) {
            process.stdout.write(`${exitMessage}\n`);
        }
    }

    protected async executeTurn(input: string): Promise<import('@tsdi/agent').AgentTurnResult | void> {
        if (this.appRpc) {
            await this.appRpc.request('run.turn', { sessionId: this.state.sessionId, input });
            return;
        }
        return this.runtime.runTurn(this.state.sessionId, input);
    }

    protected async loadTools(): Promise<any[]> {
        if (this.appRpc) {
            const tools = await this.appRpc.request('tools.list', { sessionId: this.state.sessionId });
            return Array.isArray(tools) ? tools : [];
        }
        if (!this.toolRegistry) {
            return [];
        }
        return this.toolRegistry.getToolDefinitions(this.state.sessionId) as any[];
    }

    protected getModelProfileOptions(): AgentConsoleSelectOption[] {
        const model = this.options.model as AgentUiResolvedModelProfile | undefined;
        const profiles = model?.profiles || {};
        const entries = Object.entries(profiles).filter(([, profile]) => !!profile);
        if (!entries.length) {
            return [];
        }
        const currentProfile = String(model?.defaultProfile || this.state.modelProfile || '').trim();
        return entries.map(([name, profile]) => {
            const merged = this.resolveModelProfileConfig(name);
            const selected = currentProfile === name;
            return {
                label: selected ? `${name} [current]` : name,
                value: name,
                description: [merged.provider, merged.model].filter(Boolean).join(' / '),
                detail: [
                    `Profile: ${name}`,
                    `Provider: ${merged.provider || '-'}`,
                    `Model: ${merged.model || '-'}`,
                    merged.baseUrl ? `Base URL: ${merged.baseUrl}` : '',
                    profile?.reasoning != null ? `Reasoning: ${profile.reasoning ? 'on' : 'off'}` : '',
                    profile?.thinkingBudget != null ? `Thinking budget: ${profile.thinkingBudget}` : ''
                ].filter(Boolean).join('\n')
            };
        });
    }

    protected async loadModelProfileOptions(): Promise<AgentConsoleSelectOption[]> {
        if (this.appRpc) {
            const profiles = await this.appRpc.request('model.list');
            return Array.isArray(profiles)
                ? profiles.map((profile: any) => ({
                    label: profile?.selected ? `${profile.name} [current]` : String(profile?.name || ''),
                    value: String(profile?.name || ''),
                    description: [profile?.provider, profile?.model].filter(Boolean).join(' / '),
                    detail: [
                        `Profile: ${profile?.name || '-'}`,
                        `Provider: ${profile?.provider || '-'}`,
                        `Model: ${profile?.model || '-'}`,
                        profile?.baseUrl ? `Base URL: ${profile.baseUrl}` : '',
                        profile?.reasoning != null ? `Reasoning: ${profile.reasoning ? 'on' : 'off'}` : '',
                        profile?.thinkingBudget != null ? `Thinking budget: ${profile.thinkingBudget}` : ''
                    ].filter(Boolean).join('\n')
                })).filter((item: AgentConsoleSelectOption) => !!item.value)
                : [];
        }
        return this.getModelProfileOptions();
    }

    protected resolveModelProfileConfig(profileName: string): AgentUiResolvedModelProfile {
        const model = (this.options.model || {}) as AgentUiResolvedModelProfile;
        const baseHeaders = model.headers ? { ...model.headers } : undefined;
        const profile = model.profiles?.[profileName] || {} as AgentUiResolvedModelProfile;
        return {
            ...model,
            ...profile,
            headers: {
                ...(baseHeaders || {}),
                ...(profile.headers || {})
            }
        };
    }

    protected async openModelSwitcher(): Promise<void> {
        const options = await this.loadModelProfileOptions();
        if (!options.length) {
            this.notify('No model profiles configured.');
            return;
        }
        const currentProfile = String(
            this.appRpc ? this.state.modelProfile : (this.options.model?.defaultProfile || this.state.modelProfile || '')
        ).trim();
        const selected = await this.select(
            'Model profiles',
            options,
            Math.max(0, options.findIndex(item => item.value === currentProfile || item.label.startsWith(`${currentProfile} [`)))
        );
        if (selected) {
            await this.activateModelProfile(selected);
        }
    }

    protected async activateModelProfile(profileName: string): Promise<void> {
        const name = String(profileName || '').trim();
        if (!name) {
            return;
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('model.activate', { sessionId: this.state.sessionId, name });
            this.state.batch(() => {
                this.state.setModelProfile(String(result?.modelProfile || name));
                if (result?.provider) {
                    this.state.setProvider(String(result.provider));
                }
                if (result?.model) {
                    this.state.setModel(String(result.model));
                }
            });
            this.notify(`Switched model profile to ${name}.`);
            return;
        }
        const profiles = this.options.model?.profiles || {};
        if (!profiles[name]) {
            this.notify(`Unknown model profile: ${name}`);
            return;
        }
        this.options.model = this.options.model || {};
        this.options.model.defaultProfile = name;
        const resolved = this.resolveModelProfileConfig(name);
        this.state.batch(() => {
            this.state.setModelProfile(name);
            if (resolved.provider) {
                this.state.setProvider(resolved.provider);
            }
            if (resolved.model) {
                this.state.setModel(resolved.model);
            }
        });
        this.notify(`Switched model profile to ${name}.`);
    }

    protected async activateTool(name: string): Promise<boolean> {
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.activate', { sessionId: this.state.sessionId, name });
            return result?.activated !== false;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.activateTool !== 'function') {
            return false;
        }
        return !!(await this.toolRegistry.activateTool(this.state.sessionId, name));
    }

    protected async refreshTools(): Promise<void> {
        const definitions = await this.loadTools();
        if (!definitions.length) {
            this.state.setTools([]);
            return;
        }
        const tools = await Promise.all(definitions.map(async def => {
            const active = this.appRpc
                ? def.activation?.activated ?? true
                : this.toolRegistry && typeof this.toolRegistry.isToolActive === 'function'
                ? await this.toolRegistry.isToolActive(this.state.sessionId, def.name)
                : def.activation?.activated ?? true;
            return this.state.toToolItem(def, active);
        }));
        tools.sort((a, b) => a.name.localeCompare(b.name));
        this.state.setTools(tools);
    }

}
