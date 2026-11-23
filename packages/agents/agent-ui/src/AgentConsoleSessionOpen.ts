import type { AgentMessage, AgentOptions, AgentSessionSection } from '@tsdi/agent';
import type { AgentConsoleSessionService } from './AgentConsoleSessionService';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleSessionPage } from './AgentConsoleSessionContentLoader';
import { resetSessionMessagePager } from './AgentConsoleSessionHistoryPaging';
import type { AgentConsoleSessionUiSnapshot } from './AgentConsoleSessionUiState';
import { mergeAgentConsoleMessages } from './AgentConsoleMessageEquality';
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
    resolveProjectSessionIdsFor(sessionId: string): string[];
    loadSessionPage(sessionId: string): Promise<AgentConsoleSessionPage>;
    refreshTools(sessionId?: string): Promise<void>;
    refreshPendingApprovals(sessionId?: string): Promise<void>;
    refreshTodoPlan(sessionId?: string): Promise<void>;
    loadCodingTasks(sessionId?: string, projectSessionIds?: string[]): Promise<any>;
    restoreInputHistory(): Promise<void>;
    restoreStreamingTurn?(sessionId: string): void;
    isSessionTurnRunning?(sessionId: string): boolean;
    restoreSessionModes(sessionId: string): Promise<void>;
    /** Re-apply the tab's `/permissions session` override (or workspace default). */
    restoreSessionSecurityLevel?(sessionId: string): Promise<void>;
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
    options?: { persistCurrentHistory?: boolean; fresh?: boolean; missing?: boolean; scoped?: boolean; cached?: AgentConsoleSessionUiSnapshot; background?: boolean }
): Promise<void> {
    // Tabs are independent sessions: switching must never wait for another
    // tab's turn. A background turn keeps streaming into its own state.
    if (!host.sessionService) {
        return;
    }
    const requestId = ++host.openSessionRequestId;
    const requestedId = String(sessionId || '').trim();
    const cachedView = options?.cached?.messages && !options?.fresh ? options.cached : undefined;
    const fastCached = !!cachedView && !!requestedId;
    if (!fastCached && options?.persistCurrentHistory !== false) {
        await host.persistInputHistory();
        if (requestId !== host.openSessionRequestId) {
            return;
        }
    }
    // A cached tab paints from its snapshot immediately; session metadata is
    // already in the snapshot, so no ensure/metadata round-trip is needed.
    const target = fastCached
        ? {
            id: requestedId,
            archived: false,
            workspace: cachedView!.workspace,
            lastActiveAt: 0
        } as any
        : await host.sessionService.ensureSession(sessionId);
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
    if (fastCached && cachedView && host.state.sessionId === target.id) {
        // The cached view has already been applied by the tab transaction.
        // Touch only fields that actually changed: every proxy write triggers
        // the whole console's bindings, which made a switch O(number of
        // resets) on long transcripts.
        const sessionRunning = host.isSessionTurnRunning?.(target.id)
          ?? (host.state.activeTurnSessionId === target.id);
        const nextStatus = sessionRunning ? 'running' : 'idle';
        if (host.state.status !== nextStatus) {
            host.state.setStatus(nextStatus);
        }
        host.restoreStreamingTurn?.(target.id);
        // The cached frame is painted, but per-session modes still belong to
        // this tab: plan/archetype and the `/permissions session` override are
        // runtime state, not transcript rows. Restoring them before the
        // deferred refresh keeps approvals/sandbox consistent with the tab.
        await host.restoreSessionModes(target.id);
        await host.restoreSessionSecurityLevel?.(target.id);
        const projectSessionIds = freshScope ? [target.id] : host.resolveProjectSessionIdsFor(target.id);
        if (options?.background) {
            scheduleOpenedSessionRefresh(host, target.id, requestId, options, cachedView, projectSessionIds, 120);
            return;
        }
        return scheduleOpenedSessionRefresh(host, target.id, requestId, options, cachedView, projectSessionIds);
    }
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
    // Tab isolation: the incoming tab owns the transcript. A first visit drops
    // the outgoing session's rows before any awaited reload, so a slow page
    // load can never render session A under session B's tab. Revisiting a tab
    // already shows its cached view (hide/show); the background refresh below
    // only replaces rows that actually changed.
    if (!cachedView) {
        host.state.setMessages([]);
        host.state.setSections([]);
        host.state.setGoalSummary(null);
        host.state.messagesPageCursor = '';
        host.state.messagesHasMore = false;
    }
    host.state.messagesPageLoading = false;
    resetSessionMessagePager(host.state);
    host.state.messagesNewCount = cachedView ? host.state.messagesNewCount : 0;
    if (!host.queuedPrompts.has(target.id) && host.sessionService?.loadInbox) {
        const loaded = await host.sessionService.loadInbox(target.id, (host as any).rpcRequestContext?.());
        const items = Array.isArray(loaded) ? loaded : [];
        const queue = items
            .map(item => ({
                itemId: String(item?.itemId || ''),
                input: String(item?.payload?.input || ''),
                attachments: Array.isArray(item?.payload?.attachments) ? item.payload.attachments : [],
                command: item?.payload?.command === true
            }))
            .filter(item => item.input.length > 0);
        if (queue.length) {
            host.queuedPrompts.set(target.id, queue);
        }
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
    if (!cachedView) {
        host.state.setPendingApprovals([]);
        host.state.clearPlanTodos();
    }
    host.state.clearReview();
    host.state.setPendingQuestion(null);
    host.state.clearToolActivity();
    host.state.setContextPreparation(null);
    host.state.closeMessageDetail();
    host.state.clearActivities();
    host.state.setLastError('');
    const sessionRunning = host.isSessionTurnRunning?.(target.id)
      ?? (host.state.activeTurnSessionId === target.id);
    host.state.setStatus(sessionRunning ? 'running' : 'idle');
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
    // A plain startup owns a new session, so it must not inherit sibling
    // sessions' coding tasks and task summaries. Explicit resume/switch
    // aggregates those project artifacts; Todos stay per session.
    const projectSessionIds = freshScope ? [target.id] : host.resolveProjectSessionIdsFor(target.id);
    const [page] = await Promise.all([
        host.loadSessionPage(target.id),
        host.refreshTools(target.id),
        host.refreshPendingApprovals(target.id),
        host.refreshTodoPlan(target.id),
        host.loadCodingTasks(target.id, projectSessionIds),
        host.restoreInputHistory()
    ]);
    if (requestId !== host.openSessionRequestId || host.state.sessionId !== target.id) {
        return;
    }
    // A fresh startup must never render a transcript returned by stale
    // host/app state. Explicit resume and interactive session switching
    // continue to load their persisted page normally.
    applyOpenedSessionPage(host, page, options, cachedView);
    // Reattach the live partial answer when returning to a still-running turn.
    host.restoreStreamingTurn?.(target.id);
    await host.restoreSessionModes(target.id);
    await host.restoreSessionSecurityLevel?.(target.id);
}

/**
 * Merge a loaded page into the live transcript. A cached tab may have older
 * pages prepended by scrolling up, so replace/append only changed rows and keep
 * the existing older-page cursor instead of dropping history.
 */
function applyOpenedSessionPage(
    host: AgentConsoleSessionOpenHost,
    page: AgentConsoleSessionPage,
    options: { fresh?: boolean } | undefined,
    cachedView: AgentConsoleSessionUiSnapshot | undefined
): void {
    const cachedHadOlderPages = !!cachedView && !options?.fresh
        && host.state.messages.length > page.messages.length;
    if (cachedView && !options?.fresh) {
        const merged = mergeAgentConsoleMessages(host.state.messages, page.messages);
        if (merged !== host.state.messages) {
            host.state.setMessages(merged);
        }
        if (JSON.stringify(host.state.sections || []) !== JSON.stringify(page.sections || [])) {
            host.state.setSections(page.sections);
        }
        if (JSON.stringify(host.state.goalSummary || null) !== JSON.stringify(page.goalSummary || null)) {
            host.state.setGoalSummary(page.goalSummary || null);
        }
    } else {
        host.state.setMessages(options?.fresh ? [] : page.messages);
        host.state.setSections(options?.fresh ? [] : page.sections);
        host.state.setGoalSummary(options?.fresh ? null : (page.goalSummary || null));
    }
    const nextCursor = options?.fresh
        ? ''
        : (cachedHadOlderPages ? host.state.messagesPageCursor : (page.nextCursor || ''));
    const nextHasMore = options?.fresh
        ? false
        : (cachedHadOlderPages ? host.state.messagesHasMore : page.hasMore === true);
    if (host.state.messagesPageCursor !== nextCursor) {
        host.state.messagesPageCursor = nextCursor;
    }
    if (host.state.messagesHasMore !== nextHasMore) {
        host.state.messagesHasMore = nextHasMore;
    }
}

/**
 * Defer the expensive part of opening a cached tab: session list refresh,
 * tools/approvals/plan/coding-task reads and the transcript page. The cached
 * frame is already painted, so these updates must not block the switch.
 */
function scheduleOpenedSessionRefresh(
    host: AgentConsoleSessionOpenHost,
    sessionId: string,
    requestId: number,
    options: { fresh?: boolean } | undefined,
    cachedView: AgentConsoleSessionUiSnapshot,
    projectSessionIds: string[],
    delayMs = 0
): Promise<void> {
    const stale = (): boolean => requestId !== host.openSessionRequestId || host.state.sessionId !== sessionId;
    const run = async (): Promise<void> => {
        try {
            if (stale()) {
                return;
            }
            await host.refreshSessions(sessionId);
            if (stale()) {
                return;
            }
            const [page] = await Promise.all([
                host.loadSessionPage(sessionId),
                host.refreshTools(sessionId),
                host.refreshPendingApprovals(sessionId),
                host.refreshTodoPlan(sessionId),
                host.loadCodingTasks(sessionId, projectSessionIds),
                host.restoreInputHistory()
            ]);
            if (stale()) {
                return;
            }
            applyOpenedSessionPage(host, page, options, cachedView);
            host.restoreStreamingTurn?.(sessionId);
            await host.restoreSessionModes(sessionId);
            await host.restoreSessionSecurityLevel?.(sessionId);
        } catch {
            // best effort: the cached frame is already usable
        }
    };
    if (delayMs > 0 && typeof setTimeout === 'function') {
        setTimeout(() => { void run(); }, delayMs).unref?.();
        return Promise.resolve();
    }
    // Start on the next microtask: the cached frame's render microtasks are
    // already queued, so the switch paints first; waiting for a macrotask would
    // also delay callers that legitimately await the refresh.
    return Promise.resolve().then(() => run());
}

/** Restore per-session plan mode from the runtime/app RPC (best effort). */
export async function restoreSessionModes(
    host: {
        appRpc?: { request(method: string, params?: any, context?: any): Promise<any> } | null;
        runtime: {
            isPlanMode(sessionId: string): boolean;
            getSessionArchetype?(sessionId: string): string;
        };
        state: AgentConsoleSessionState;
        rpcRequestContext?(): any;
    },
    sessionId: string
): Promise<void> {
    try {
        let planMode = false;
        if (host.appRpc) {
            const result = await host.appRpc.request(
                'session.plan_mode.get',
                { sessionId },
                host.rpcRequestContext?.()
            ).catch(() => null);
            planMode = result?.enabled === true;
        } else {
            planMode = host.runtime.isPlanMode(sessionId);
        }
        host.state.setPlanMode(planMode);
        let archetype = host.runtime.getSessionArchetype?.(sessionId) || 'build';
        if (host.appRpc) {
            const result = await host.appRpc.request(
                'session.archetype.get',
                { sessionId },
                host.rpcRequestContext?.()
            ).catch(() => null);
            if (result?.archetype) {
                archetype = String(result.archetype);
            }
        }
        host.state.setActiveArchetype(archetype);
    } catch {
        // runtime may not support plan mode queries — leave current value
    }
}
