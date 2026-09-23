import { AgentConsoleAppRpc, TimelineEntry, TimelineEventRecord, CommandExchangeRecord, reduceTimelineEvents, threadItemKey } from '@tsdi/agent';
import {
    AgentConsoleApprovalRequest,
    AgentConsolePendingQuestion,
    AgentConsoleSessionState,
    AgentConsoleToolRun
} from './AgentConsoleSessionState';
import { formatTimelineEventLine, presentTimelineToolEvent, resolveTimelineToolCategory } from './AgentConsoleTimelineEventPresenter';

export interface RemoteAgentConsoleEvent {
    type: string;
    sessionId?: string;
    data?: any;
}

export interface AgentConsoleRemoteEventBridgeOptions {
    baseUrl: string;
    token?: string;
    fetchImpl?: typeof fetch;
    rpc?: AgentConsoleAppRpc | null;
    reconnectDelayMs?: number;
    onReconnected?: () => void;
}

interface SseFrame {
    event?: string;
    data?: string;
}

function resolveFetch(options: AgentConsoleRemoteEventBridgeOptions): typeof fetch {
    const custom = options.fetchImpl;
    if (custom) {
        return custom;
    }
    const globalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    if (globalFetch) {
        // Browsers throw "Illegal invocation" when extracted window.fetch is called
        // with a detached receiver; bind it to the global object.
        return globalFetch.bind(globalThis) as typeof fetch;
    }
    return (() => {
        throw new Error('fetch is not available; provide fetchImpl in AgentConsoleRemoteEventBridgeOptions');
    }) as unknown as typeof fetch;
}

export function parseSseFrames(input: string): { frames: SseFrame[]; rest: string } {
    const frames: SseFrame[] = [];
    let buffer = input;
    let delimiterIndex: number;
    while ((delimiterIndex = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, delimiterIndex);
        buffer = buffer.slice(delimiterIndex + 2);
        const frame = parseSseBlock(block);
        if (frame) {
            frames.push(frame);
        }
    }
    return { frames, rest: buffer };
}

function parseSseBlock(block: string): SseFrame | undefined {
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const rawLine of block.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) {
            continue;
        }
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
            continue;
        }
        if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
            continue;
        }
    }
    if (!dataLines.length) {
        return undefined;
    }
    return { event, data: dataLines.join('\n') };
}

export function decodeSseFrame(frame: SseFrame): RemoteAgentConsoleEvent | undefined {
    if (!frame.data) {
        return undefined;
    }
    let payload: any;
    try {
        payload = JSON.parse(frame.data);
    } catch {
        return undefined;
    }
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }
    return {
        type: frame.event || payload.type || 'message',
        sessionId: payload.sessionId,
        data: payload
    };
}

export function applyRemoteEvent(state: AgentConsoleSessionState, event: RemoteAgentConsoleEvent): void {
    const data = event.data && typeof event.data === 'object' ? event.data : {};
    // Providers expose usage at different event depths. Fold any factual
    // snapshot into the shared state before projecting the event itself.
    state.setTokenUsage(data);
    switch (event.type) {
        case 'turn_started':
            state.setStatus('running');
            state.setPendingQuestion(null);
            state.pushActivity('turn', 'Understanding the request');
            break;
        case 'stream_chunk':
            break;
        case 'turn_completed':
            state.setStatus('idle');
            break;
        case 'turn_cancelled':
            state.setStatus('cancelled');
            state.clearToolActivity();
            state.pushActivity('turn', 'Turn cancelled');
            break;
        case 'compensation':
            if (Number(data.compensated || 0) > 0) {
                state.pushActivity('rollback', `Rolled back ${data.compensated} side-effecting tool call${data.compensated === 1 ? '' : 's'}`);
            }
            break;
        case 'context_prepared':
            state.setContextPreparation(data.report ?? null);
            if (Number.isFinite(Number(data.report?.afterTokens))) {
                state.setTokenUsage({ promptTokens: Number(data.report.afterTokens) });
            }
            state.pushActivity('model', `Context ${data.report?.strategy || 'prepared'}: ${data.report?.beforeTokens ?? '?'}→${data.report?.afterTokens ?? '?'}`);
            break;
        case 'tool_invoked':
            state.setRunningTool(String(data.toolName || ''));
            state.upsertToolRun(buildToolRun('running', data, {
                message: 'Running',
                inputSummary: data.inputSummary,
                updatedAt: Date.now()
            }));
            state.pushActivity('tool', describeToolInvoked(String(data.toolName || '')));
            projectRemoteToolTimeline(state, data, 'tool_invoked', 'running', formatTimelineEventLine(presentTimelineToolEvent({
                toolName: String(data.toolName || ''),
                eventType: 'tool_invoked',
                inputSummary: String(data.inputSummary || data.receipt?.inputSummary || ''),
                status: 'running'
            })));
            break;
        case 'tool_completed':
            state.clearRunningTool(String(data.toolName || ''));
            if (data.toolName === 'todo' && data.output?.todos) {
                state.setPlanTodos(normalizePlanTodos(data.output.todos), undefined, undefined, undefined, Number(data.output.revision), String(data.output.planId || ''));
            }
            if (data.toolName === 'ask_user' && data.output?.kind === 'ask_user') {
                state.setPendingQuestion(normalizePendingQuestion(data.output));
            }
            state.upsertToolRun(buildToolRun('success', data, {
                durationMs: data.receipt?.durationMs,
                message: data.receipt?.durationMs != null
                    ? `Completed in ${data.receipt.durationMs}ms`
                    : 'Completed',
                inputSummary: data.receipt?.inputSummary,
                outputSummary: data.receipt?.outputSummary,
                updatedAt: Date.now()
            }));
            state.pushActivity('tool', describeToolCompleted(String(data.toolName || '')));
            projectRemoteToolTimeline(state, data, 'tool_completed', 'success', formatTimelineEventLine(presentTimelineToolEvent({
                toolName: String(data.toolName || ''),
                eventType: 'tool_completed',
                inputSummary: String(data.receipt?.inputSummary || data.inputSummary || ''),
                outputSummary: String(data.receipt?.outputSummary || ''),
                status: 'success'
            })));
            break;
        case 'tool_failed':
            state.clearRunningTool(String(data.toolName || ''));
            state.setLastError(String(data.error || ''));
            state.upsertToolRun(buildToolRun('error', data, {
                message: String(data.error || ''),
                error: data.receipt?.error || String(data.error || ''),
                inputSummary: data.receipt?.inputSummary,
                outputSummary: data.receipt?.outputSummary,
                updatedAt: Date.now()
            }));
            state.pushActivity('error', `${data.toolName || 'tool'} failed: ${data.error || 'unknown error'}`);
            projectRemoteToolTimeline(state, data, 'tool_failed', 'error', formatTimelineEventLine(presentTimelineToolEvent({
                toolName: String(data.toolName || 'tool'),
                eventType: 'tool_failed',
                inputSummary: String(data.receipt?.inputSummary || data.inputSummary || ''),
                outputSummary: String(data.receipt?.outputSummary || ''),
                error: String(data.error || ''),
                status: 'error'
            })));
            break;
        case 'approval_requested': {
            const request = data.request && typeof data.request === 'object' ? data.request : {};
            const timeoutMs = Number(request.timeoutMs || 0);
            state.upsertPendingApproval({
                id: String(request.id || ''),
                toolName: String(request.toolName || ''),
                sessionId: String(request.sessionId || event.sessionId || ''),
                reason: String(request.reason || ''),
                summary: String(request.summary || ''),
                hasInput: request.hasInput === true,
                inputSummary: request.inputSummary,
                createdAt: Number(request.createdAt || Date.now()),
                timeoutMs: timeoutMs > 0 ? timeoutMs : 0,
                expiresAt: timeoutMs > 0 ? Date.now() + timeoutMs : 0
            });
            state.requestApprovalAttention();
            state.pushActivity('tool', `Approval required for ${request.toolName || 'tool'}`);
            break;
        }
        case 'approval_completed': {
            const request = data.request && typeof data.request === 'object' ? data.request : {};
            state.removePendingApproval(String(request.id || ''));
            state.pushActivity('tool', `${data.approved === true ? 'Approved' : 'Denied'} ${request.toolName || 'tool'}`);
            break;
        }
        case 'approval_failed': {
            const request = data.request && typeof data.request === 'object' ? data.request : {};
            state.removePendingApproval(String(request.id || ''));
            state.setLastError(String(data.error || ''));
            state.pushActivity('error', `${request.toolName || 'tool'}: ${data.error || 'approval failed'}`);
            break;
        }
        case 'background_task_started':
            state.pushActivity('tool', `Background task ${data.taskId || '?'} started: ${truncateText(String(data.goal || ''))}`);
            break;
        case 'background_task_completed':
            state.pushActivity('tool', `Background task ${data.taskId || '?'} completed${data.summary ? `: ${truncateText(String(data.summary))}` : ''}`);
            break;
        case 'background_task_failed':
            state.setLastError(String(data.error || ''));
            state.pushActivity('error', `Background task ${data.taskId || '?'} failed: ${data.error || 'unknown error'}`);
            break;
        case 'plan_created': {
            const steps = Array.isArray(data.steps) ? data.steps : [];
            const normalized = normalizePlanTodos(steps);
            const seq = Number(data.sequence) || 0;
            state.setPlanTodos(normalized, undefined, undefined, seq, Number(data.revision) || undefined, String(data.planId || ''));
            state.pushActivity('plan', `Plan created: ${normalized.length} step${normalized.length === 1 ? '' : 's'}`);
            projectRemotePlanTimeline(state, data, 'plan_created', 'success', `Plan created (${normalized.length} steps)`);
            break;
        }
        case 'plan_step_started': {
            const stepId = String(data.stepId || '');
            const owner = data.owner ? ` → ${data.owner}` : '';
            state.pushActivity('plan', `Step started: ${stepId}${owner}`);
            projectRemotePlanTimeline(state, data, 'plan_step_started', 'running', `Step started: ${stepId}`);
            break;
        }
        case 'plan_step_blocked': {
            const blockedId = String(data.stepId || '');
            const reason = String(data.reason || 'dependencies not met');
            state.pushActivity('plan', `Step blocked: ${blockedId} (${reason})`);
            projectRemotePlanTimeline(state, data, 'plan_step_blocked', 'running', `Step blocked: ${blockedId} (${reason})`);
            break;
        }
        case 'plan_step_completed': {
            const completedId = String(data.stepId || '');
            const stepStatus = String(data.status || 'completed');
            state.pushActivity('plan', `Step ${stepStatus}: ${completedId}`);
            projectRemotePlanTimeline(state, data, 'plan_step_completed', stepStatus === 'failed' ? 'error' : 'success', `Step ${stepStatus}: ${completedId}`);
            break;
        }
        case 'plan_completed': {
            const summary = data.summary && typeof data.summary === 'object' ? data.summary : {};
            state.pushActivity('plan', `Plan completed: ${summary.completed ?? '?'} done, ${summary.failed ?? 0} failed`);
            projectRemotePlanTimeline(state, data, 'plan_completed', 'success', 'Plan completed');
            break;
        }
        case 'error':
            state.setStatus('error');
            state.setLastError(String(data.error || ''));
            state.pushActivity('error', String(data.error || ''));
            state.appendAssistantErrorMessage(String(data.error || ''));
            break;
        default:
            break;
    }
}

function buildToolRun(
    status: AgentConsoleToolRun['status'],
    data: any,
    extra: Partial<AgentConsoleToolRun>
): AgentConsoleToolRun {
    return {
        name: String(data.toolName || ''),
        status,
        message: String(extra.message || ''),
        inputSummary: extra.inputSummary,
        outputSummary: extra.outputSummary,
        error: extra.error,
        durationMs: extra.durationMs,
        attemptCount: data.receipt?.attemptCount,
        executionMode: data.receipt?.executionMode,
        receiptId: data.receipt?.receiptId,
        toolCallId: data.receipt?.toolCallId,
        updatedAt: Number(extra.updatedAt || Date.now())
    };
}

function normalizePlanTodos(todos: any): Array<{ id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }> {
    return (Array.isArray(todos) ? todos : [])
        .map((item: any) => ({
            id: String(item?.id || '').trim(),
            content: String(item?.content || '').trim(),
            status: normalizeTodoStatus(item?.status)
        }))
        .filter(item => !!item.id && !!item.content);
}

function normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
    switch (String(status || '').trim()) {
        case 'in_progress':
        case 'completed':
        case 'cancelled':
            return status as 'pending' | 'in_progress' | 'completed' | 'cancelled';
        default:
            return 'pending';
    }
}

function normalizePendingQuestion(output: any): AgentConsolePendingQuestion | null {
    const question = String(output?.question || '').trim();
    if (!question) {
        return null;
    }
    return {
        questionId: String(output?.questionId || '').trim() || `legacy-question-${String(output?.sessionId || '')}-${question}`,
        sessionId: String(output?.sessionId || '').trim() || undefined as any,
        question,
        options: Array.isArray(output?.options) ? output.options.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
        context: typeof output?.context === 'string' && output.context.trim() ? output.context.trim() : undefined,
        severity: ['low', 'medium', 'high'].includes(output?.severity) ? output.severity : 'medium',
        createdAt: Number(output?.createdAt) || Date.now(),
        updatedAt: Number(output?.updatedAt) || Date.now(),
        expiresAt: Number(output?.expiresAt) || undefined,
        status: 'pending'
    };
}

function describeToolInvoked(toolName: string): string {
    return `Running ${toolName.replace(/[._-]+/g, ' ')}`;
}

function describeToolCompleted(toolName: string): string {
    return `${toolName.replace(/[._-]+/g, ' ')} completed`;
}

function projectRemoteToolTimeline(
    state: AgentConsoleSessionState,
    data: any,
    eventType: string,
    status: 'running' | 'success' | 'error',
    content: string
): void {
    const toolName = String(data?.toolName || '').trim() || 'tool';
    const toolCallId = String(data?.toolCallId || data?.receipt?.toolCallId || '').trim();
    const receiptId = String(data?.receiptId || data?.receipt?.receiptId || '').trim();
    state.projectThreadItem({
        kind: 'tool',
        key: threadItemKey('tool', toolCallId || receiptId || toolName),
        sessionId: state.sessionId,
        content,
        status,
        toolCallId: toolCallId || undefined,
        receiptId: receiptId || undefined,
        attempt: Number(data?.receipt?.attemptCount) || undefined,
        source: 'remote',
        sequence: Number(data?.sequence) || undefined,
        durationMs: Number(data?.durationMs ?? data?.receipt?.durationMs) || undefined,
        category: toolName === 'tool' ? undefined : resolveTimelineToolCategory(toolName)
    });
}

function projectRemotePlanTimeline(
    state: AgentConsoleSessionState,
    data: any,
    eventType: string,
    status: 'running' | 'success' | 'error',
    content: string
): void {
    const planId = String(data?.planId || '').trim() || 'plan';
    const stepId = String(data?.stepId || '').trim();
    state.projectThreadItem({
        kind: 'plan',
        key: threadItemKey('plan', `${planId}${stepId ? `:${stepId}` : ''}`),
        sessionId: state.sessionId,
        content,
        status,
        source: 'remote',
        sequence: Number(data?.sequence) || undefined
    });
}

function truncateText(value: string): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

export class AgentConsoleRemoteEventBridge {
    protected parserBuffer = '';
    protected active = false;
    protected hasConnected = false;
    protected reconnectTimer?: ReturnType<typeof setTimeout>;
    protected sessionId = '';
    protected fetchImpl: typeof fetch;
    protected rpc?: AgentConsoleAppRpc | null;
    protected options: AgentConsoleRemoteEventBridgeOptions;

    constructor(
        protected state: AgentConsoleSessionState,
        options: AgentConsoleRemoteEventBridgeOptions
    ) {
        this.options = options;
        this.fetchImpl = resolveFetch(options);
        this.rpc = options.rpc ?? null;
    }

    protected isDriftedFromActiveSession(): boolean {
        return Boolean(this.state.sessionId) && this.state.sessionId !== this.sessionId;
    }

    get connected(): boolean {
        return this.active;
    }

    async subscribe(sessionId: string): Promise<() => void> {
        this.sessionId = sessionId;
        this.active = true;
        await this.connectOnce();
        return () => this.dispose();
    }

    async connectOnce(): Promise<void> {
        if (!this.active) {
            return;
        }
        // A UI session switch does not re-subscribe this bridge. Re-anchor to
        // the active session before (re)connecting; each sessionId change bumps
        // the remote epoch, so the session-level match is the replay rejection.
        if (this.state.sessionId && this.state.sessionId !== this.sessionId) {
            this.sessionId = this.state.sessionId;
            this.parserBuffer = '';
        }
        if (this.hasConnected) {
            this.state.markTimelineReconnecting(true);
        }
        if (!this.hasConnected) {
            await this.seedFromTimeline();
            await this.seedFromCommandExchange();
            await this.seedFromNav();
            await this.seedFromQuestions();
        } else {
            // P271: replay raw events missed while SSE was down; idempotent via stable-key upsert (P235).
            await this.replayFromTimeline();
            // P284: durable command-exchange replay so disconnects lose nothing and duplicate nothing.
            await this.replayFromCommandExchange();
        }
        const base = String(this.options.baseUrl || '').replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (this.options.token) {
            headers.Authorization = `Bearer ${this.options.token}`;
        }
        const response = await this.fetchImpl(
            `${base}/api/events?sessionId=${encodeURIComponent(this.sessionId)}`,
            { headers }
        );
        if (!response.ok) {
            throw new Error(`SSE connection failed: HTTP ${response.status}`);
        }
        const body = response.body as ReadableStream<Uint8Array> | null;
        if (!body) {
            throw new Error('SSE response has no body');
        }
        const reader = body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
            // A UI session switch does not re-subscribe this bridge; when the
            // stream is bound to a session the UI has left, drop it so the
            // reconnect re-anchors to the active session.
            if (this.state.sessionId && this.state.sessionId !== this.sessionId) {
                break;
            }
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            this.parserBuffer += decoder.decode(value, { stream: true });
            const { frames, rest } = parseSseFrames(this.parserBuffer);
            this.parserBuffer = rest;
            for (const frame of frames) {
                const event = decodeSseFrame(frame);
                if (!event || !event.sessionId || event.sessionId !== this.state.sessionId) {
                    continue;
                }
                applyRemoteEvent(this.state, event);
                if (event.type === 'tool_completed') {
                    await this.refreshTools();
                }
            }
        }
        if (this.hasConnected) {
            this.options.onReconnected?.();
        }
        this.hasConnected = true;
        this.state.markTimelineReconnecting(false);
        this.scheduleReconnect();
    }

    protected async seedFromTimeline(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const all: TimelineEntry[] = [];
            let cursor: string | undefined;
            for (let page = 0; page < 20; page += 1) {
                const params: Record<string, unknown> = { sessionId: requestedSessionId, limit: 500 };
                if (cursor) {
                    params.cursor = cursor;
                }
                const result = await this.rpc.request('timeline.query', params);
                if (this.isDriftedFromActiveSession()) {
                    return;
                }
                const entries = Array.isArray(result?.entries) ? result.entries : [];
                all.push(...entries);
                if (!result?.hasMore || !result?.nextCursor) {
                    break;
                }
                cursor = result.nextCursor;
            }
            if (all.length) {
                this.state.seedTimeline(all);
            }
        } catch {
            return;
        }
    }

    protected async replayFromTimeline(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const result = await this.rpc.request('timeline.replay', {
                sessionId: requestedSessionId,
                sinceSeq: this.state.timelineTailSeq
            });
            if (this.isDriftedFromActiveSession()) {
                return;
            }
            const rawEvents = Array.isArray(result?.events) ? result.events : [];
            if (!rawEvents.length) {
                return;
            }
            if (rawEvents.some((event: TimelineEventRecord) => event.sessionId && event.sessionId !== this.state.sessionId)) {
                return;
            }
            const entries = [...reduceTimelineEvents(rawEvents).values()];
            if (entries.length) {
                this.state.seedTimeline(entries);
            }
        } catch {
            return;
        }
    }

    protected async seedFromCommandExchange(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const all: CommandExchangeRecord[] = [];
            let cursor: string | undefined;
            for (let page = 0; page < 20; page += 1) {
                const params: Record<string, unknown> = { sessionId: requestedSessionId, limit: 500 };
                if (cursor) {
                    params.cursor = cursor;
                }
                const result = await this.rpc.request('command_exchange.query', params);
                if (this.isDriftedFromActiveSession()) {
                    return;
                }
                const records = Array.isArray(result?.records) ? result.records : [];
                all.push(...records);
                if (!result?.hasMore || !result?.nextCursor) {
                    break;
                }
                cursor = result.nextCursor;
            }
            if (all.length) {
                this.state.seedCommandExchange(all);
            }
        } catch {
            return;
        }
    }

    protected async replayFromCommandExchange(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const result = await this.rpc.request('command_exchange.replay', {
                sessionId: requestedSessionId,
                sinceSeq: this.state.commandExchangeTailSeq
            });
            if (this.isDriftedFromActiveSession()) {
                return;
            }
            const records = Array.isArray(result?.records) ? result.records : [];
            if (!records.length) {
                return;
            }
            if (records.some((record: CommandExchangeRecord) => record.sessionId && record.sessionId !== this.state.sessionId)) {
                return;
            }
            this.state.seedCommandExchange(records);
        } catch {
            return;
        }
    }

    protected async seedFromNav(): Promise<void> {
        if (!this.rpc) {
            return;
        }
        try {
            const tree = await this.rpc.request('nav.query', {});
            if (tree && Array.isArray(tree.sessions)) {
                this.state.seedNavTree(tree);
            }
        } catch {
            return;
        }
    }

    protected async seedFromQuestions(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const result = await this.rpc.request('question.list', { sessionId: requestedSessionId });
            if (this.isDriftedFromActiveSession()) {
                return;
            }
            const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
            const now = Date.now();
            const pending = items.filter((item: any) =>
                (item?.status === 'pending' || item?.status == null) &&
                !(Number(item?.expiresAt) && now > Number(item?.expiresAt))
            );
            if (!pending.length) {
                return;
            }
            for (const item of pending) {
                const question = normalizePendingQuestion({
                    ...(item || {}),
                    sessionId: item?.sessionId || requestedSessionId,
                    questionId: item?.questionId,
                    status: 'pending'
                });
                if (question) {
                    this.state.setPendingQuestion(question);
                }
            }
        } catch {
            return;
        }
    }

    protected scheduleReconnect(): void {
        if (!this.active) {
            return;
        }
        const delay = Number(this.options.reconnectDelayMs || 3000);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            if (this.active) {
                void this.connectOnce().catch(() => this.scheduleReconnect());
            }
        }, delay);
    }

    protected async refreshTools(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        try {
            const definitions = await this.rpc.request('tools.list', { sessionId: this.sessionId });
            if (this.isDriftedFromActiveSession()) {
                return;
            }
            const tools = Array.isArray(definitions)
                ? definitions.map((def: any) => this.state.toToolItem(def, def?.activation?.activated ?? true))
                : [];
            tools.sort((a, b) => a.name.localeCompare(b.name));
            this.state.setTools(tools);
        } catch {
            return;
        }
    }

    dispose(): void {
        this.active = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        this.parserBuffer = '';
    }
}

export function createRemoteAgentConsoleEventBridge(
    state: AgentConsoleSessionState,
    options: AgentConsoleRemoteEventBridgeOptions
): AgentConsoleRemoteEventBridge {
    return new AgentConsoleRemoteEventBridge(state, options);
}
