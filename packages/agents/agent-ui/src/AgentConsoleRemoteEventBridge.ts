import { AgentConsoleAppRpc } from '@tsdi/agent';
import {
    AgentConsoleApprovalRequest,
    AgentConsolePendingQuestion,
    AgentConsoleSessionState,
    AgentConsoleToolRun
} from './AgentConsoleSessionState';

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
}

interface SseFrame {
    event?: string;
    data?: string;
}

function resolveFetch(options: AgentConsoleRemoteEventBridgeOptions): typeof fetch {
    return options.fetchImpl
        ?? ((globalThis as { fetch?: typeof fetch }).fetch as typeof fetch | undefined)
        ?? (() => {
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
    switch (event.type) {
        case 'turn_started':
            state.setStatus('running');
            state.setPendingQuestion(null);
            state.pushActivity('turn', 'Understanding the request');
            break;
        case 'stream_chunk':
            if (data.usage) {
                state.setTokenUsage(data.usage);
            }
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
            break;
        case 'tool_completed':
            state.clearRunningTool(String(data.toolName || ''));
            if (data.toolName === 'todo' && data.output?.todos) {
                state.setPlanTodos(normalizePlanTodos(data.output.todos));
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
        question,
        options: Array.isArray(output?.options) ? output.options.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
        context: typeof output?.context === 'string' && output.context.trim() ? output.context.trim() : undefined,
        severity: ['low', 'medium', 'high'].includes(output?.severity) ? output.severity : 'medium',
        updatedAt: Date.now()
    };
}

function describeToolInvoked(toolName: string): string {
    return `Running ${toolName.replace(/[._-]+/g, ' ')}`;
}

function describeToolCompleted(toolName: string): string {
    return `${toolName.replace(/[._-]+/g, ' ')} completed`;
}

function truncateText(value: string): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

export class AgentConsoleRemoteEventBridge {
    protected parserBuffer = '';
    protected active = false;
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
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            this.parserBuffer += decoder.decode(value, { stream: true });
            const { frames, rest } = parseSseFrames(this.parserBuffer);
            this.parserBuffer = rest;
            for (const frame of frames) {
                const event = decodeSseFrame(frame);
                if (!event || !event.sessionId || event.sessionId !== this.sessionId) {
                    continue;
                }
                applyRemoteEvent(this.state, event);
                if (event.type === 'tool_completed') {
                    await this.refreshTools();
                }
            }
        }
        this.scheduleReconnect();
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
        if (!this.rpc) {
            return;
        }
        try {
            const definitions = await this.rpc.request('tools.list', { sessionId: this.sessionId });
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
