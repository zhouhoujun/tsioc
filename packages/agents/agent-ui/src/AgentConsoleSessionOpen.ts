import type { AgentMessage, AgentOptions, AgentSessionSection } from '@tsdi/agent';
import type { AgentConsoleSessionService } from './AgentConsoleSessionService';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentUiTranslator, formatAgentUiNotice } from './agent-ui.i18n';

export interface AgentConsoleSessionOpenHost {
    sessionService?: AgentConsoleSessionService | null;
    startupWorkspace?: string | null;
    options: AgentOptions;
    state: AgentConsoleSessionState;
    translator?: AgentUiTranslator | null;
    transcriptNavigationController: { setFocused(focused: boolean): void };
    queuedPrompts: Map<string, any[]>;
    openSessionRequestId: number;
    freshSessionScoped: boolean;
    openReviewRequestId: number;
    taskViewContextVersion: number;
    editTargetMessageId: string;
    editDraftBefore: string;
    editAttachmentsBefore: any[];
    lastEditSessionMessageId: string;
    editDismissedAt: number;
    lastEscapeAt: number;
    isTurnInProgress(): boolean;
    persistInputHistory(): Promise<void>;
    notifyBusyState(message: string): void;
    updateTerminalTitle(): void;
    refreshSessions(currentId?: string): Promise<void>;
    resolveProjectSessionsFor(sessionId: string): any[];
    resolveProjectSessionIdsFor(sessionId: string): string[];
    loadSessionPage(sessionId: string): Promise<{ messages: AgentMessage[]; sections: AgentSessionSection[]; goalSummary?: any }>;
    refreshTools(sessionId?: string): Promise<void>;
    refreshPendingApprovals(sessionId?: string): Promise<void>;
    refreshTodoPlan(sessionId?: string, projectSessions?: any[]): Promise<void>;
    loadCodingTasks(sessionId?: string, projectSessionIds?: string[]): Promise<any>;
    restoreInputHistory(): Promise<void>;
    restoreSessionModes(sessionId: string): Promise<void>;
}

/**
 * Existence probe that runs before anything can create the session. Uses the
 * same RPC the service wraps; service internals stay private.
 */
async function sessionExists(service: AgentConsoleSessionService, sessionId: string): Promise<boolean | undefined> {
    const internals = service as unknown as {
        appRpc?: { request(method: string, params?: any): Promise<any> } | null;
        sessionStore?: { has?(id: string): Promise<boolean> } | null;
    };
    if (internals.appRpc && typeof internals.appRpc.request === 'function') {
        const result = await internals.appRpc.request('session.exists', { sessionId }).catch(() => null);
        return typeof result?.exists === 'boolean' ? result.exists : undefined;
    }
    return internals.sessionStore?.has ? internals.sessionStore.has(sessionId) : undefined;
}

/**
 * Report an unknown `--session` id before any call that may create it (the
 * `app.state` bootstrap used to materialize the requested id, so the later
 * create was indistinguishable from a resume).
 */
export async function applyMissingSessionNotice(host: AgentConsoleSessionOpenHost, sessionId?: string): Promise<boolean> {
    const id = String(sessionId || '').trim();
    if (!id || !host.sessionService) {
        return false;
    }
    if ((await sessionExists(host.sessionService, id)) !== false) {
        return false;
    }
    host.state.setNotice(formatAgentUiNotice(host.translator, 'sessionNotFound', { id }));
    return true;
}

export async function openSession(
    host: AgentConsoleSessionOpenHost,
    sessionId?: string,
    options?: { persistCurrentHistory?: boolean; fresh?: boolean; missing?: boolean; scoped?: boolean }
): Promise<void> {
    if (host.isTurnInProgress()) {
        host.notifyBusyState(formatAgentUiNotice(host.translator, 'sessionSwitchBusy'));
        return;
    }
    if (!host.sessionService) {
        return;
    }
    const requestId = ++host.openSessionRequestId;
    if (options?.persistCurrentHistory !== false) {
        await host.persistInputHistory();
        if (requestId !== host.openSessionRequestId) {
            return;
        }
    }
    const requestedId = String(sessionId || '').trim();
    const target = await host.sessionService.ensureSession(sessionId);
    if (requestId !== host.openSessionRequestId) {
        return;
    }
    if (target.archived) {
        await host.sessionService.setSessionArchived(target.id, false);
        target.archived = false;
    }
    const openSessionIds = host.state.openSessionIds || [];
    if (!openSessionIds.includes(target.id)) {
        host.state.setOpenSessionIds([...openSessionIds, target.id]);
    }
    // A new session (no requested id / an explicit /new target) must not
    // inherit a sibling session's project plan; only an explicit resume/switch
    // aggregates project todos.
    const freshScope = options?.fresh === true
        || options?.missing === true
        || options?.scoped === true
        || !requestedId;
    host.freshSessionScoped = freshScope;
    const configuredWorkspace = String(host.startupWorkspace || host.state.workspace || (host.options.ui?.console as any)?.workspace || '').trim();
    const nextWorkspace = requestId === 1 && configuredWorkspace
        ? configuredWorkspace
        : String(target.workspace || '').trim() || configuredWorkspace;
    host.openReviewRequestId++;
    host.taskViewContextVersion++;
    host.state.configure({
        sessionId: target.id,
        workspace: nextWorkspace
    });
    if (nextWorkspace) {
        host.state.setWorkspace(nextWorkspace);
    }
    host.state.setQueuedPromptCount((host.queuedPrompts.get(target.id) || []).length);
    host.transcriptNavigationController.setFocused(false);
    host.state.setSessionsFocused(false);
    host.state.setProjectsFocused(false);
    host.state.setToolsFocused(false);
    host.state.setToolRunsFocused(false);
    host.state.setApprovalsFocused(false);
    host.state.setTasksFocused(false);
    host.state.setJobsFocused(false);
    host.state.setPendingApprovals([]);
    host.state.clearReview();
    host.state.clearPlanTodos();
    host.state.setPendingQuestion(null);
    host.state.clearToolActivity();
    host.state.setContextPreparation(null);
    host.state.closeMessageDetail();
    host.state.clearActivities();
    host.state.setLastError('');
    host.updateTerminalTitle();
    host.state.setNotice(options?.missing === true
        ? formatAgentUiNotice(host.translator, 'sessionNotFound', { id: target.id })
        : '');
    host.state.setInput('', 0);
    host.editTargetMessageId = '';
    host.editDraftBefore = '';
    host.editAttachmentsBefore = [];
    host.lastEditSessionMessageId = '';
    host.editDismissedAt = 0;
    host.lastEscapeAt = 0;
    await host.refreshSessions(target.id);
    if (requestId !== host.openSessionRequestId || host.state.sessionId !== target.id) {
        return;
    }
    // A plain startup owns a new session. Project aggregation is useful
    // after an explicit resume/switch, but on a fresh launch it would pull
    // old plans and task summaries from sibling sessions into the empty UI.
    const projectSessions = freshScope
        ? [{ ...target, current: true, updatedAt: target.lastActiveAt }]
        : host.resolveProjectSessionsFor(target.id);
    const projectSessionIds = freshScope ? [target.id] : host.resolveProjectSessionIdsFor(target.id);
    const [page] = await Promise.all([
        host.loadSessionPage(target.id),
        host.refreshTools(target.id),
        host.refreshPendingApprovals(target.id),
        host.refreshTodoPlan(target.id, projectSessions),
        host.loadCodingTasks(target.id, projectSessionIds),
        host.restoreInputHistory()
    ]);
    if (requestId !== host.openSessionRequestId || host.state.sessionId !== target.id) {
        return;
    }
    // A fresh startup must never render a transcript returned by stale
    // host/app state. Explicit resume and interactive session switching
    // continue to load their persisted page normally.
    host.state.setMessages(options?.fresh ? [] : page.messages);
    host.state.setSections(options?.fresh ? [] : page.sections);
    host.state.setGoalSummary(options?.fresh ? null : (page.goalSummary || null));
    await host.restoreSessionModes(target.id);
}
