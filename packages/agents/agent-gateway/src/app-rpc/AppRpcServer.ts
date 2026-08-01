import { randomUUID } from 'crypto';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AGENT_OPTIONS, AgentOptions, AgentRuntime, AgentTurnCancelledError, AuditSink, buildCompactionHistoryTrend, buildSummaryQualityTrend, CompactionHistoryStore, defaultAgentOptions, MemoryStore, SessionStore, SummaryQualityStore, ToolApprovalManager, ToolRegistry } from '@tsdi/agent';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { SessionHandler } from '../api/SessionHandler';
import { EventHandler, GatewayEventRecord } from '../api/EventHandler';
import { AppRpcError, AppRpcRequest, AppRpcRequestContext, AppRpcResponse, AppRpcTransportMessage } from '../contracts/AppRpc';

@Injectable()
export class AppRpcServer {
    protected static readonly CONSOLE_INPUT_HISTORY_KEY = 'agent-ui.console.input-history';
    protected static readonly REVIEW_ANNOTATIONS_CACHE_KEY = 'agent-ui.review.annotations-cache';

    constructor(
        private runtime: AgentRuntime,
        private sessions: SessionStore,
        private memory: MemoryStore,
        private tools: ToolRegistry,
        private owners: SessionOwnerStore,
        private sessionHandler: SessionHandler,
        private events: EventHandler,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions = defaultAgentOptions,
        @Optional() private audit?: AuditSink | null,
        @Optional() private approvalManager?: ToolApprovalManager | null,
        @Optional() private summaryQuality?: SummaryQualityStore | null,
        @Optional() private compactionHistory?: CompactionHistoryStore | null
    ) {
    }

    async handlePayload(payload: AppRpcRequest | AppRpcRequest[], context: AppRpcRequestContext = {}): Promise<AppRpcResponse | AppRpcResponse[] | null> {
        if (Array.isArray(payload)) {
            if (!payload.length) {
                return {
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32600,
                        message: 'Invalid Request'
                    }
                };
            }
            const responses: AppRpcResponse[] = [];
            for (const request of payload) {
                const response = await this.handle(request, context);
                if (response) {
                    responses.push(response);
                }
            }
            return responses.length ? responses : null;
        }
        return this.handle(payload, context);
    }

    async handle(request: AppRpcRequest, context: AppRpcRequestContext = {}): Promise<AppRpcResponse | null> {
        if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string' || !request.method.trim()) {
            throw new AppRpcError(-32600, 'Invalid Request');
        }

        const id = request.id ?? null;
        const method = request.method.trim();

        try {
            const result = await this.dispatch(method, request.params ?? {}, context);
            if (request.id === undefined) {
                return null;
            }
            return {
                jsonrpc: '2.0',
                id,
                result
            };
        } catch (error: any) {
            const rpcError = error instanceof AppRpcError
                ? error
                : new AppRpcError(-32603, error?.message ?? 'Internal error');
            if (request.id === undefined) {
                return null;
            }
            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: rpcError.code,
                    message: rpcError.message,
                    data: rpcError.data
                }
            };
        }
    }

    async *streamPayload(payload: AppRpcRequest, context: AppRpcRequestContext = {}): AsyncGenerator<AppRpcTransportMessage, void, void> {
        const request = payload;
        if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string' || !request.method.trim()) {
            yield this.createErrorResponse(request?.id, new AppRpcError(-32600, 'Invalid Request'));
            return;
        }
        if (request.method.trim() !== 'run.turn_stream') {
            const response = await this.handle(request, context);
            if (response) {
                yield response;
            }
            return;
        }

        try {
            yield* this.streamTurn(request, context);
        } catch (error: any) {
            if (request.id === undefined) {
                return;
            }
            yield this.createErrorResponse(request.id, error instanceof AppRpcError
                ? error
                : new AppRpcError(-32603, error?.message ?? 'Internal error'));
        }
    }

    private async dispatch(method: string, params: any, context: AppRpcRequestContext): Promise<any> {
        switch (method) {
            case 'app.ping':
                return {
                    ok: true,
                    transport: 'json-rpc',
                    timestamp: Date.now()
                };
            case 'app.capabilities':
                return {
                    protocol: 'json-rpc-2.0',
                    transports: ['http', 'stdio', 'ws'],
                    methods: [
                        'app.ping',
                        'app.capabilities',
                        'app.state',
                        'app.inputHistory.get',
                        'app.inputHistory.put',
                        'session.create',
                        'session.list',
                        'session.list_projects',
                        'session.messages',
                        'session.search',
                        'session.delete',
                        'run.turn',
                        'run.turn_stream',
                        'run.cancel',
                        'approval.list',
                        'approval.approve',
                        'approval.reject',
                        'tools.list',
                        'tools.activate',
                        'tools.invoke',
                        'model.list',
                        'model.activate',
                        'memory.list',
                        'memory.put',
                        'memory.search',
                        'events.history',
                        'audit.list',
                        'todo.get',
                        'coding_task.list',
                        'coding_task.get',
                        'coding_task.diff',
                        'coding_task.cancel',
                        'coding_task.retry_failed',
                        'coding_task.rollback',
                        'review_annotations.save',
                        'review_annotations.load',
                        'summary_quality.list',
                        'summary_quality.stats',
                        'summary_quality.trend',
                        'compaction_history.list',
                        'compaction_history.stats',
                        'compaction_history.trend'
                    ],
                    streamingMethods: ['run.turn_stream']
                };
            case 'app.state':
                return this.getAppState(params, context);
            case 'app.inputHistory.get':
                return this.getInputHistory(params, context);
            case 'app.inputHistory.put':
                return this.putInputHistory(params, context);
            case 'session.create':
                return this.createSession(params, context);
            case 'session.list':
                return this.listSessions(context);
            case 'session.list_projects':
                return this.listSessionProjects(context);
            case 'session.messages':
                return this.getSessionMessages(this.requireSessionId(params), context);
            case 'session.search':
                return this.searchSessions(params, context);
            case 'session.delete':
                return this.deleteSession(this.requireSessionId(params), context);
            case 'run.turn':
                return this.runTurn(params, context);
            case 'run.cancel':
                return this.cancelTurn(params, context);
            case 'approval.list':
                return this.listApprovals(params, context);
            case 'approval.approve':
                return this.decideApproval(params, context, true);
            case 'approval.reject':
                return this.decideApproval(params, context, false);
            case 'tools.list':
                return this.tools.getToolDefinitions(this.optionalSessionId(params));
            case 'tools.activate':
                return this.activateTool(params, context);
            case 'tools.invoke':
                return this.invokeTool(params, context);
            case 'model.list':
                return this.listModelProfiles();
            case 'model.activate':
                return this.activateModelProfile(params, context);
            case 'memory.list':
                return this.listMemory(params, context);
            case 'memory.put':
                return this.putMemory(params, context);
            case 'memory.search':
                return this.searchMemory(params, context);
            case 'events.history':
                return this.getEventHistory(this.requireSessionId(params), context);
            case 'audit.list':
                return this.listAudit(params, context);
            case 'todo.get':
                return this.getTodoPlan(params, context);
            case 'coding_task.list':
                return this.listCodingTasks(params, context);
            case 'coding_task.get':
                return this.getCodingTask(params, context);
            case 'coding_task.diff':
                return this.getCodingTaskDiff(params, context);
            case 'coding_task.cancel':
                return this.cancelCodingTask(params, context);
            case 'coding_task.retry_failed':
                return this.retryFailedCodingTask(params, context);
            case 'coding_task.rollback':
                return this.rollbackCodingTask(params, context);
            case 'review_annotations.save':
                return this.saveReviewAnnotations(params, context);
            case 'review_annotations.load':
                return this.loadReviewAnnotations(params, context);
            case 'summary_quality.list':
                return this.listSummaryQuality(params, context);
            case 'summary_quality.stats':
                return this.getSummaryQualityStats(params, context);
            case 'summary_quality.trend':
                return this.getSummaryQualityTrend(params, context);
            case 'compaction_history.list':
                return this.listCompactionHistory(params, context);
            case 'compaction_history.stats':
                return this.getCompactionHistoryStats(params, context);
            case 'compaction_history.trend':
                return this.getCompactionHistoryTrend(params, context);
            default:
                throw new AppRpcError(-32601, `Method '${method}' not found`);
        }
    }

    private async createSession(params: any, context: AppRpcRequestContext): Promise<any> {
        const requested = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : `rpc-${randomUUID()}`;
        await this.ensureSessionAccess(requested, context, { createIfMissing: true });
        this.sessionHandler.track(requested);
        await this.setSessionWorkspace(requested);
        const state = await this.sessions.get(requested);
        return {
            sessionId: requested,
            createdAt: state.createdAt,
            updatedAt: state.updatedAt,
            workspace: state.workspace
        };
    }

    private async getAppState(params: any, context: AppRpcRequestContext): Promise<any> {
        const uiConsole = this.options.ui?.console as Record<string, any> | undefined;
        const workspace = String(uiConsole?.workspace || '');
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : await this.resolveAppStateSessionId(workspace, context);
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        await this.setSessionWorkspace(sessionId);
        const state = await this.sessions.get(sessionId);

        return {
            sessionId,
            workspace,
            title: this.options.ui?.title || defaultAgentOptions.ui?.title || '',
            provider: this.options.model?.provider || '',
            model: this.options.model?.model || '',
            modelProfile: this.resolveModelProfile(),
            createdAt: state.createdAt,
            updatedAt: state.updatedAt
        };
    }

    private async resolveAppStateSessionId(workspace: string, context: AppRpcRequestContext): Promise<string> {
        const workspaceSessions = await this.findWorkspaceSessions(workspace, context.principalId);
        if (workspaceSessions.length) {
            return workspaceSessions[0].id;
        }
        const bootstrapSessionId = String(this.options.bootstrapTurn?.sessionId || '').trim();
        if (bootstrapSessionId) {
            return bootstrapSessionId;
        }
        return `chat-${randomUUID()}`;
    }

    private async findWorkspaceSessions(workspace: string, principalId?: string): Promise<Array<{ id: string; lastActiveAt?: number }>> {
        const normalizedWorkspace = String(workspace || '').trim();
        const infos = await this.sessionHandler.listSessionInfos(principalId);
        const filtered = normalizedWorkspace
            ? infos.filter(info => String(info.workspace || '').trim() === normalizedWorkspace)
            : infos;
        return filtered
            .slice()
            .sort((left, right) => {
                const activityDelta = (right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0);
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return left.id.localeCompare(right.id);
            })
            .map(info => ({
                id: info.id,
                lastActiveAt: info.lastActiveAt
            }));
    }

    private async getInputHistory(params: any, context: AppRpcRequestContext): Promise<string[]> {
        const workspace = this.requireString(params?.workspace, 'app.inputHistory.get workspace');
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
            this.sessionHandler.track(sessionId);
        }
        const principalId = this.resolveHistoryPrincipalId(context);
        const record = this.findConsoleInputHistoryRecord(await this.memory.getAll(sessionId), workspace, principalId, sessionId);
        return record ? this.normalizeInputHistoryEntries(this.parseInputHistoryEntries(record.value)) : [];
    }

    private async putInputHistory(params: any, context: AppRpcRequestContext): Promise<{ workspace: string; entries: string[] }> {
        const workspace = this.requireString(params?.workspace, 'app.inputHistory.put workspace');
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
            this.sessionHandler.track(sessionId);
        }
        const principalId = this.resolveHistoryPrincipalId(context);
        const entries = this.normalizeInputHistoryEntries(params?.entries);
        const existing = this.findConsoleInputHistoryRecord(await this.memory.getAll(sessionId), workspace, principalId, sessionId);
        const id = this.createConsoleInputHistoryRecordId(workspace, principalId, sessionId);
        await this.memory.delete(id, undefined, 'global');
        await this.memory.put({
            id,
            key: AppRpcServer.CONSOLE_INPUT_HISTORY_KEY,
            value: JSON.stringify(entries),
            scope: 'global',
            namespace: 'agent-ui',
            category: 'workspace',
            metadata: {
                workspace,
                principalId,
                sessionId: sessionId || '',
                kind: 'console-input-history'
            },
            createdAt: existing?.createdAt || Date.now(),
            updatedAt: Date.now()
        });
        return { workspace, entries };
    }

    private async listSessions(context: AppRpcRequestContext): Promise<any[]> {
        return this.sessionHandler.listSessionInfos(context.principalId);
    }

    private async listSessionProjects(context: AppRpcRequestContext): Promise<any[]> {
        return this.sessionHandler.groupSessionInfos(await this.sessionHandler.listSessionInfos(context.principalId));
    }

    private async getSessionMessages(sessionId: string, context: AppRpcRequestContext): Promise<any> {
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.getMessages(sessionId);
    }

    private async searchSessions(params: any, context: AppRpcRequestContext): Promise<any> {
        const query = this.requireString(params?.query, 'session.search query');
        const requestedLimit = typeof params?.limit === 'number' && params.limit > 0 ? Math.floor(params.limit) : undefined;
        const limit = requestedLimit ? Math.min(requestedLimit, 100) : undefined;
        const results = await this.runtime.searchSessions(query, { limit });
        if (!context.principalId) {
            return results;
        }
        const ownedIds = await this.owners.listOwned(results.map(result => result.sessionId), context.principalId);
        const owned = new Set(ownedIds);
        return results.filter(result => owned.has(result.sessionId));
    }

    private async deleteSession(sessionId: string, context: AppRpcRequestContext): Promise<any> {
        await this.ensureSessionAccess(sessionId, context);
        await this.owners.unbind(sessionId);
        await this.sessions.delete(sessionId);
        await this.memory.deleteBySession(sessionId);
        return { deleted: true, sessionId };
    }

    private async runTurn(params: any, context: AppRpcRequestContext): Promise<any> {
        const input = this.requireString(params?.input, 'run.turn input');
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : `rpc-${randomUUID()}`;
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        await this.setSessionWorkspace(sessionId);
        const turn = await this.runtime.runTurn(sessionId, input, context.principalId);
        const messages = await this.runtime.getMessages(sessionId);
        return {
            sessionId,
            turn,
            message: messages[messages.length - 1] ?? null
        };
    }

    private async cancelTurn(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        if (!await this.sessions.has(sessionId)) {
            // Idempotent cancel: there is nothing to cancel for an unknown session.
            return { sessionId, cancelled: false, compensated: 0, toolCallIds: [] };
        }
        await this.ensureSessionAccess(sessionId, context);
        const result = await this.runtime.cancelTurn(sessionId);
        return {
            sessionId,
            cancelled: result.cancelled,
            compensated: result.compensated,
            toolCallIds: result.toolCallIds
        };
    }

    private async listApprovals(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.approvalManager) {
            return { sessionId: null, requests: [] };
        }
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const requests = this.approvalManager.getPending();
        const scoped = sessionId
            ? requests.filter(request => request.sessionId === sessionId)
            : requests;
        if (!context.principalId) {
            return { sessionId: sessionId ?? null, requests: scoped };
        }
        const sessionIds = Array.from(new Set(scoped.map(request => request.sessionId)));
        const ownedIds = await this.owners.listOwned(sessionIds, context.principalId);
        const owned = new Set(ownedIds);
        return {
            sessionId: sessionId ?? null,
            requests: scoped.filter(request => owned.has(request.sessionId))
        };
    }

    private async decideApproval(params: any, context: AppRpcRequestContext, approve: boolean): Promise<any> {
        const requestId = this.requireString(params?.requestId ?? params?.id, 'requestId');
        if (!this.approvalManager) {
            throw new AppRpcError(-32004, 'Approval is not configured');
        }
        const pending = this.approvalManager.getPending().find(request => request.id === requestId);
        if (!pending) {
            return { requestId, applied: false };
        }
        await this.ensureSessionAccess(pending.sessionId, context);
        const applied = approve
            ? this.approvalManager.approve(requestId)
            : this.approvalManager.reject(requestId);
        return {
            requestId,
            sessionId: pending.sessionId,
            applied,
            decision: approve ? 'approved' : 'denied'
        };
    }

    private async *streamTurn(request: AppRpcRequest, context: AppRpcRequestContext): AsyncGenerator<AppRpcTransportMessage, void, void> {        const params = request.params ?? {};
        const input = this.requireString(params?.input, 'run.turn_stream input');
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : `rpc-${randomUUID()}`;
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        await this.setSessionWorkspace(sessionId);
        yield {
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: request.id ?? null,
                sessionId,
                chunkType: 'event',
                eventType: 'turn_started',
                label: 'state',
                status: 'running',
                content: 'Analyzing request'
            }
        };

        const pendingEvents: GatewayEventRecord[] = [];
        const unsubscribe = this.events.subscribe(sessionId, record => {
            if (record.type !== 'turn_started') {
                pendingEvents.push(record);
            }
        });

        try {
            for await (const chunk of this.runtime.runStreamingTurn(sessionId, input, context.principalId)) {
                yield* this.flushPendingStreamEvents(request.id ?? null, sessionId, pendingEvents);
                if (chunk.type === 'done') {
                    continue;
                }
                yield {
                    jsonrpc: '2.0',
                    method: 'run.turn_stream.chunk',
                    params: {
                        requestId: request.id ?? null,
                        sessionId,
                        chunkType: chunk.type,
                        content: chunk.content,
                        ...(chunk.toolCalls !== undefined ? { toolCalls: chunk.toolCalls } : {}),
                        ...(chunk.usage !== undefined ? { usage: chunk.usage } : {})
                    }
                };
            }
            yield* this.flushPendingStreamEvents(request.id ?? null, sessionId, pendingEvents);
        } catch (error) {
            if (error instanceof AgentTurnCancelledError) {
                yield* this.flushPendingStreamEvents(request.id ?? null, sessionId, pendingEvents);
                if (request.id !== undefined) {
                    yield {
                        jsonrpc: '2.0',
                        id: request.id,
                        result: {
                            sessionId,
                            cancelled: true
                        }
                    };
                }
                return;
            }
            throw error;
        } finally {
            unsubscribe();
        }

        if (request.id === undefined) {
            return;
        }
        const messages = await this.runtime.getMessages(sessionId);
        yield {
            jsonrpc: '2.0',
            id: request.id ?? null,
            result: {
                sessionId,
                message: messages[messages.length - 1] ?? null
            }
        };
    }

    private async *flushPendingStreamEvents(
        requestId: string | number | null,
        sessionId: string,
        pendingEvents: GatewayEventRecord[]
    ): AsyncGenerator<AppRpcTransportMessage, void, void> {
        while (pendingEvents.length) {
            const record = pendingEvents.shift();
            if (!record) {
                continue;
            }
            const payload = this.toStreamEventChunk(requestId, sessionId, record);
            if (payload) {
                yield payload;
            }
        }
    }

    private toStreamEventChunk(
        requestId: string | number | null,
        sessionId: string,
        record: GatewayEventRecord
    ): AppRpcTransportMessage | null {
        const event = this.describeStreamEvent(record);
        if (!event) {
            return null;
        }
        const data = record.data || {};
        return {
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId,
                sessionId,
                chunkType: 'event',
                eventType: event.eventType,
                label: event.label,
                status: event.status,
                content: event.content,
                ...(event.toolName ? { toolName: event.toolName } : {}),
                ...(event.toolCallId ? { toolCallId: event.toolCallId } : {}),
                ...(event.approvalId ? { approvalId: event.approvalId } : {}),
                ...(data.report ? { report: data.report } : {}),
                ...(data.diagnostics ? { diagnostics: data.diagnostics } : {}),
                ...(data.compensated ? { compensated: data.compensated } : {})
            }
        };
    }

    private describeStreamEvent(record: GatewayEventRecord): {
        eventType: string;
        label: string;
        status: 'running' | 'success' | 'failed' | 'error';
        content: string;
        toolName?: string;
        toolCallId?: string;
        approvalId?: string;
    } | null {
        const data = record.data || {};
        switch (record.type) {
            case 'turn_started':
                return {
                    eventType: 'turn_started',
                    label: 'state',
                    status: 'running',
                    content: 'Analyzing request'
                };
            case 'tool_invoked':
                return {
                    eventType: 'tool_invoked',
                    label: 'tool',
                    status: 'running',
                    toolName: String(data.toolName || ''),
                    toolCallId: String(data?.receipt?.toolCallId || ''),
                    content: this.describeToolInvocationEvent(data)
                };
            case 'tool_completed':
                return {
                    eventType: 'tool_completed',
                    label: 'tool',
                    status: 'success',
                    toolName: String(data.toolName || ''),
                    toolCallId: String(data?.receipt?.toolCallId || ''),
                    content: this.describeToolCompletedEvent(data)
                };
            case 'tool_failed':
                return {
                    eventType: 'tool_failed',
                    label: 'tool',
                    status: 'error',
                    toolName: String(data.toolName || ''),
                    toolCallId: String(data?.receipt?.toolCallId || ''),
                    content: `${data.toolName || 'tool'} failed${data.error ? `: ${data.error}` : ''}`
                };
            case 'tool_skipped':
                return {
                    eventType: 'tool_skipped',
                    label: 'tool',
                    status: 'failed',
                    toolName: String(data.toolName || ''),
                    toolCallId: String(data?.receipt?.toolCallId || ''),
                    content: `${data.toolName || 'tool'} skipped${data.reason ? `: ${data.reason}` : ''}`
                };
            case 'error':
                return {
                    eventType: 'error',
                    label: 'error',
                    status: 'error',
                    content: String(data.error || 'Unknown error')
                };
            case 'turn_cancelled':
                return {
                    eventType: 'turn_cancelled',
                    label: 'state',
                    status: 'failed',
                    content: 'Turn cancelled'
                };
            case 'approval_requested':
                return {
                    eventType: 'approval_requested',
                    label: 'approval',
                    status: 'running',
                    toolName: String(data?.request?.toolName || ''),
                    approvalId: String(data?.request?.id || ''),
                    content: data?.request?.summary
                        ? `Approval required for ${data.request.toolName}: ${data.request.summary}`
                        : `Approval required for ${data?.request?.toolName || 'tool'}`
                };
            case 'approval_completed':
                return {
                    eventType: 'approval_completed',
                    label: 'approval',
                    status: data?.approved === true ? 'success' : 'failed',
                    toolName: String(data?.request?.toolName || ''),
                    content: `${data?.request?.toolName || 'tool'} ${data?.approved === true ? 'approved' : 'denied'}`
                };
            case 'approval_failed':
                return {
                    eventType: 'approval_failed',
                    label: 'approval',
                    status: 'error',
                    toolName: String(data?.request?.toolName || ''),
                    content: `${data?.request?.toolName || 'tool'} approval failed: ${data?.error || 'unknown error'}`
                };
            case 'compensation':
                return {
                    eventType: 'compensation',
                    label: 'rollback',
                    status: 'success',
                    content: `Rolled back ${Number(data?.compensated || 0)} side-effecting tool call${Number(data?.compensated || 0) === 1 ? '' : 's'}`
                };
            case 'context_prepared':
                return {
                    eventType: 'context_prepared',
                    label: 'model',
                    status: 'success',
                    content: this.describeContextPreparedEvent(data)
                };
            case 'turn_diagnostics':
                return {
                    eventType: 'turn_diagnostics',
                    label: 'state',
                    status: 'success',
                    content: this.describeTurnDiagnosticsEvent(data)
                };
            default:
                return null;
        }
    }

    private describeContextPreparedEvent(data: any): string {
        const report = data?.report || {};
        const strategy = String(report.strategy || 'unchanged');
        const before = Number(report.beforeTokens ?? 0);
        const after = Number(report.afterTokens ?? 0);
        const savings = Number(report.compressionRatio ?? 0);
        if (strategy === 'unchanged' && !before && !after) {
            return 'Context unchanged';
        }
        if (strategy === 'unchanged') {
            return `Context unchanged (${before} tokens)`;
        }
        return `Context ${strategy}: ${before}→${after} tokens (${savings}% saved)`;
    }

    private describeTurnDiagnosticsEvent(data: any): string {
        const diagnostics = data?.diagnostics || {};
        const compactionCount = Number(diagnostics.compactionCount ?? 0);
        const totalSavings = Number(diagnostics.totalTokenSavings ?? 0);
        const parts: string[] = [];
        if (compactionCount || totalSavings) {
            parts.push(`${compactionCount} compaction${compactionCount === 1 ? '' : 's'}, ${totalSavings} tokens saved`);
        }
        const promptCache = diagnostics.promptCache;
        if (promptCache) {
            const support = String(promptCache.supported || 'none');
            const applied = promptCache.applied ? 'applied' : 'not applied';
            const cachedTokens = promptCache.observedCachedPromptTokens ?? 0;
            parts.push(`prompt cache ${support} (${applied}${cachedTokens ? `, ${cachedTokens} cached tokens` : ''})`);
        }
        if (!parts.length) {
            return 'Turn diagnostics: no compaction or prompt cache activity';
        }
        return `Turn diagnostics: ${parts.join('; ')}`;
    }

    private describeToolInvocationEvent(data: any): string {
        const toolName = String(data?.toolName || 'tool');
        const summary = this.summarizeToolEventDetail(toolName, data?.receipt?.inputSummary ?? data?.inputSummary, 'input');
        return summary ? `${toolName} · ${summary}` : toolName;
    }

    private describeToolCompletedEvent(data: any): string {
        const toolName = String(data?.toolName || 'tool');
        const outputSummary = this.summarizeToolEventDetail(toolName, data?.receipt?.outputSummary, 'output');
        return outputSummary ? `${toolName} · ${outputSummary}` : `${toolName} completed`;
    }

    private summarizeToolEventDetail(toolName: string, summary: unknown, phase: 'input' | 'output'): string {
        const text = String(summary || '').trim();
        if (!text || text === '{}' || text === '[]') {
            return '';
        }
        const payload = this.parseToolSummary(text);
        if (!payload) {
            return text;
        }

        const pathSummary = this.pickPathSummary(payload);
        if (pathSummary) {
            if (toolName === 'read_file' && phase === 'output' && payload.truncated === true) {
                return `${pathSummary} (truncated)`;
            }
            return pathSummary;
        }

        if (toolName === 'location') {
            const label = this.pickString(payload.label)
                || [this.pickString(payload.city), this.pickString(payload.region), this.pickString(payload.countryCode) || this.pickString(payload.country)]
                    .filter(Boolean)
                    .join(', ');
            return label || '';
        }

        if (toolName === 'weather') {
            const location = this.pickString(payload.location) || this.pickString(payload.label);
            const temperature = typeof payload.temperature === 'number' ? payload.temperature : undefined;
            const description = this.pickString(payload.description);
            const unit = payload.units === 'imperial' ? 'F' : 'C';
            return [location, temperature !== undefined ? `${temperature}°${unit}` : '', description].filter(Boolean).join(' ');
        }

        const url = this.pickString(payload.url) || this.pickString(payload.href);
        if (url) {
            return url;
        }

        const location = this.pickString(payload.location) || this.pickString(payload.label) || this.pickString(payload.name);
        if (location) {
            return location;
        }

        return text;
    }

    private parseToolSummary(text: string): Record<string, any> | undefined {
        try {
            const payload = JSON.parse(text);
            return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : undefined;
        } catch {
            return undefined;
        }
    }

    private pickPathSummary(payload: Record<string, any>): string {
        const single = this.pickString(payload.path)
            || this.pickString(payload.file)
            || this.pickString(payload.filePath)
            || this.pickString(payload.dir)
            || this.pickString(payload.directory)
            || this.pickString(payload.from)
            || this.pickString(payload.to);
        if (single) {
            return single;
        }
        if (Array.isArray(payload.paths)) {
            const values = payload.paths.map((value: unknown) => this.pickString(value)).filter(Boolean);
            if (values.length) {
                return values.join(', ');
            }
        }
        return '';
    }

    private pickString(value: unknown): string {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    private async activateTool(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const name = this.requireString(params?.name, 'tools.activate name');
        await this.ensureSessionAccess(sessionId, context);
        const activated = await this.tools.activateTool(sessionId, name);
        return { sessionId, name, activated };
    }

    private async invokeTool(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const name = this.requireString(params?.name, 'tools.invoke name');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.tools.invoke(name, params?.input, sessionId, context.principalId);
        return { sessionId, name, output };
    }

    private listModelProfiles(): any[] {
        const profiles = this.options.model?.profiles || {};
        const current = String(this.options.model?.defaultProfile || '').trim();
        return Object.entries(profiles)
            .filter(([, profile]) => !!profile)
            .map(([name, profile]) => ({
                name,
                selected: current === name,
                provider: profile?.provider || this.options.model?.provider || '',
                model: profile?.model || this.options.model?.model || '',
                baseUrl: profile?.baseUrl || this.options.model?.baseUrl || '',
                reasoning: profile?.reasoning,
                thinkingBudget: profile?.thinkingBudget
            }))
            .sort((left, right) => left.name.localeCompare(right.name));
    }

    private async activateModelProfile(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
            this.sessionHandler.track(sessionId);
        }
        const name = this.requireString(params?.name, 'model.activate name');
        const profiles = this.options.model?.profiles || {};
        const profile = profiles[name];
        if (!profile) {
            throw new AppRpcError(-32602, `Invalid params: unknown model profile '${name}'`);
        }
        this.options.model = this.options.model || {};
        this.options.model.defaultProfile = name;
        return {
            sessionId: sessionId || null,
            modelProfile: name,
            provider: profile.provider || this.options.model.provider || '',
            model: profile.model || this.options.model.model || ''
        };
    }

    private async listMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
            return this.memory.getAll(sessionId);
        }
        const allIds = await this.sessions.listSessionIds();
        const ids = context.principalId
            ? await this.owners.listOwned(allIds, context.principalId)
            : allIds;
        const records = await Promise.all(ids.map(id => this.memory.getAll(id)));
        return records.flat();
    }

    private async putMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const key = this.requireString(params?.key, 'memory.put key');
        const value = this.requireString(params?.value, 'memory.put value');
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        return this.runtime.putMemory(sessionId, key, value, 'session');
    }

    private async searchMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const query = this.requireString(params?.query, 'memory.search query');
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.searchMemory(sessionId, query);
    }

    private async getEventHistory(sessionId: string, context: AppRpcRequestContext): Promise<any> {
        await this.ensureSessionAccess(sessionId, context);
        return this.events.getHistory(sessionId);
    }

    private async listAudit(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const toolName = typeof params?.toolName === 'string' && params.toolName.trim() ? params.toolName.trim() : undefined;
        const status = typeof params?.status === 'string' && params.status.trim() ? params.status.trim() : undefined;
        const records = await this.audit?.list(sessionId) ?? [];
        return {
            sessionId,
            records: records.filter(record => {
                if (toolName && record.toolName !== toolName) {
                    return false;
                }
                if (status && record.status !== status) {
                    return false;
                }
                return true;
            }).map(record => ({
                id: record.id,
                sessionId: record.sessionId,
                toolName: record.toolName,
                toolCallId: record.toolCallId,
                status: record.status,
                inputSummary: record.inputSummary ?? null,
                outputSummary: record.outputSummary ?? null,
                error: record.error ?? null,
                durationMs: record.durationMs ?? null,
                attemptCount: record.attemptCount ?? null,
                principalId: record.principalId ?? null,
                createdAt: record.createdAt,
                metadata: record.metadata ?? null
            }))
        };
    }

    private async listSummaryQuality(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.summaryQuality) {
            return { records: [] };
        }
        const provider = typeof params?.provider === 'string' && params.provider.trim()
            ? params.provider.trim()
            : undefined;
        const model = typeof params?.model === 'string' && params.model.trim()
            ? params.model.trim()
            : undefined;
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(0, Math.floor(limitRaw)), 200) : 200;
        const records = await this.summaryQuality.list({ provider, model, limit });
        return {
            records: records.map(record => ({
                id: record.id,
                provider: record.provider,
                model: record.model ?? null,
                total: record.total,
                fieldCompleteness: record.fieldCompleteness,
                annotationQuality: record.annotationQuality,
                lengthBalance: record.lengthBalance,
                truncationScore: record.truncationScore,
                fallbackUsed: record.fallbackUsed,
                summaryLength: record.summaryLength,
                createdAt: record.createdAt
            }))
        };
    }

    private async getSummaryQualityStats(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.summaryQuality) {
            return { aggregates: [] };
        }
        const provider = typeof params?.provider === 'string' && params.provider.trim()
            ? params.provider.trim()
            : undefined;
        const model = typeof params?.model === 'string' && params.model.trim()
            ? params.model.trim()
            : undefined;
        const aggregates = await this.summaryQuality.aggregate(provider, model);
        return { aggregates };
    }

    private async getSummaryQualityTrend(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.summaryQuality) {
            return { trend: [] };
        }
        const provider = typeof params?.provider === 'string' && params.provider.trim()
            ? params.provider.trim()
            : undefined;
        const model = typeof params?.model === 'string' && params.model.trim()
            ? params.model.trim()
            : undefined;
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(0, Math.floor(limitRaw)), 500) : 500;
        const bucketSizeRaw = Number(params?.bucketSize);
        const bucketSize = Number.isFinite(bucketSizeRaw) && bucketSizeRaw > 0 ? bucketSizeRaw : undefined;
        const maxBucketsRaw = Number(params?.maxBuckets);
        const maxBuckets = Number.isFinite(maxBucketsRaw) ? Math.min(Math.max(1, Math.floor(maxBucketsRaw)), 90) : undefined;
        const records = await this.summaryQuality.list({ provider, model, limit });
        const trend = buildSummaryQualityTrend(records, { provider, model, bucketSize, maxBuckets });
        return {
            trend: trend.map(point => ({
                provider: point.provider,
                bucketStart: point.bucketStart,
                recordCount: point.recordCount,
                avgTotal: point.avgTotal,
                minTotal: point.minTotal,
                maxTotal: point.maxTotal,
                avgFieldCompleteness: point.avgFieldCompleteness,
                avgAnnotationQuality: point.avgAnnotationQuality,
                avgLengthBalance: point.avgLengthBalance,
                avgTruncationScore: point.avgTruncationScore,
                fallbackRate: point.fallbackRate
            }))
        };
    }

    private async listCompactionHistory(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.compactionHistory) {
            return { records: [] };
        }
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const levelRaw = typeof params?.level === 'string' && params.level.trim()
            ? params.level.trim()
            : undefined;
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(0, Math.floor(limitRaw)), 200) : 200;
        const records = await this.compactionHistory.list(sessionId, { limit });
        return {
            records: records
                .filter(record => !levelRaw || record.level === levelRaw)
                .map(record => ({
                    id: record.id,
                    sessionId: record.sessionId,
                    strategy: record.strategy,
                    compactionTriggered: record.compactionTriggered,
                    level: record.level,
                    summaryInserted: record.summaryInserted,
                    beforeMessageCount: record.beforeMessageCount,
                    afterMessageCount: record.afterMessageCount,
                    beforeTokens: record.beforeTokens,
                    afterTokens: record.afterTokens,
                    compactedMessageCount: record.compactedMessageCount,
                    preservedAnchorCount: record.preservedAnchorCount,
                    recentMessageCount: record.recentMessageCount,
                    prunedMessageCount: record.prunedMessageCount,
                    toolMessagesCompacted: record.toolMessagesCompacted,
                    compressionRatio: record.compressionRatio,
                    cumulativeTokenSavings: record.cumulativeTokenSavings,
                    createdAt: record.createdAt,
                    metadata: record.metadata ?? null
                }))
        };
    }

    private async getCompactionHistoryStats(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.compactionHistory) {
            return { aggregates: [] };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const aggregates = await this.compactionHistory.aggregate(sessionId);
        return {
            aggregates: aggregates.map(aggregate => ({
                sessionId: aggregate.sessionId,
                recordCount: aggregate.recordCount,
                compactedCount: aggregate.compactedCount,
                prunedCount: aggregate.prunedCount,
                avgCompressionRatio: aggregate.avgCompressionRatio,
                totalTokensBefore: aggregate.totalTokensBefore,
                totalTokensAfter: aggregate.totalTokensAfter,
                totalTokensSaved: aggregate.totalTokensSaved,
                timeRange: aggregate.timeRange ?? null
            }))
        };
    }

    private async getCompactionHistoryTrend(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.compactionHistory) {
            return { trend: [] };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const bucketSizeRaw = Number(params?.bucketSize);
        const bucketSize = Number.isFinite(bucketSizeRaw) && bucketSizeRaw > 0 ? bucketSizeRaw : undefined;
        const maxBucketsRaw = Number(params?.maxBuckets);
        const maxBuckets = Number.isFinite(maxBucketsRaw) ? Math.min(Math.max(1, Math.floor(maxBucketsRaw)), 90) : undefined;
        const trend = await this.compactionHistory.trend(sessionId, { bucketSize, maxBuckets });
        return {
            trend: trend.map(point => ({
                sessionId: point.sessionId,
                bucketStart: point.bucketStart,
                recordCount: point.recordCount,
                compactedCount: point.compactedCount,
                prunedCount: point.prunedCount,
                avgCompressionRatio: point.avgCompressionRatio,
                totalTokensBefore: point.totalTokensBefore,
                totalTokensAfter: point.totalTokensAfter,
                totalTokensSaved: point.totalTokensSaved
            }))
        };
    }

    private async listCodingTasks(params: any, context: AppRpcRequestContext): Promise<any> {        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'list' }, context);
        return {
            sessionId,
            tasks: Array.isArray(output?.tasks) ? output.tasks : [],
            total: typeof output?.total === 'number' ? output.total : 0
        };
    }

    private async getCodingTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'get', task_id: taskId }, context);
        return {
            sessionId,
            task: output?.task ?? null
        };
    }

    private async getCodingTaskDiff(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'get', task_id: taskId }, context);
        const task = output?.task;
        return {
            sessionId,
            taskId,
            executionMode: task?.result?.executionMode ?? task?.metadata?.executionMode ?? null,
            diff: task?.result?.diff ?? null,
            workers: Array.isArray(task?.result?.workers) ? task.result.workers : []
        };
    }

    private async getTodoPlan(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.tools.invoke('todo', undefined, sessionId, context.principalId);
        return {
            sessionId,
            todos: Array.isArray(output?.todos) ? output.todos : [],
            summary: output?.summary ?? {
                total: 0,
                pending: 0,
                in_progress: 0,
                completed: 0,
                cancelled: 0
            }
        };
    }

    private async rollbackCodingTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'rollback', task_id: taskId }, context);
        return {
            sessionId,
            taskId,
            task: output?.task ?? null,
            rolledBack: output?.rolledBack === true
        };
    }

    private async cancelCodingTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'cancel', task_id: taskId }, context);
        return {
            sessionId,
            taskId,
            task: output?.task ?? null,
            cancelled: output?.cancelled === true
        };
    }

    private async retryFailedCodingTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'retry_failed', task_id: taskId }, context);
        return {
            sessionId,
            taskId,
            task: output?.task ?? null,
            retried: output?.ran === true
        };
    }

    private async invokeCodingTask(sessionId: string, input: Record<string, any>, context: AppRpcRequestContext): Promise<any> {
        const definition = this.tools.getToolDefinition('coding_task', sessionId);
        if (!definition) {
            throw new AppRpcError(-32004, 'coding_task tool is not available');
        }
        if (definition.activation?.kind === 'deferred' && definition.activation?.scope === 'session') {
            await this.tools.activateTool(sessionId, 'coding_task');
        }
        return this.tools.invoke('coding_task', input, sessionId, context.principalId);
    }

    private async ensureSessionAccess(
        sessionId: string,
        context: AppRpcRequestContext,
        options?: { createIfMissing?: boolean; }
    ): Promise<void> {
        const exists = await this.sessions.has(sessionId);
        if (!exists && options?.createIfMissing) {
            await this.owners.create(sessionId, context.principalId);
            return;
        }
        if (!exists) {
            throw new AppRpcError(-32004, `Session '${sessionId}' not found`);
        }
        if (!context.principalId) {
            return;
        }
        const owner = await this.owners.getOwner(sessionId);
        if (!owner) {
            await this.owners.create(sessionId, context.principalId);
            return;
        }
        if (owner !== context.principalId) {
            throw new AppRpcError(-32003, 'Forbidden', { sessionId });
        }
    }

    private async setSessionWorkspace(sessionId: string): Promise<void> {
        const workspace = this.resolveWorkspace();
        if (!workspace) {
            return;
        }
        const state = await this.sessions.get(sessionId);
        if (state.workspace === workspace) {
            return;
        }
        await this.sessions.setWorkspace(sessionId, workspace);
    }

    private resolveWorkspace(): string | undefined {
        const uiConsole = this.options.ui?.console as Record<string, any> | undefined;
        const workspace = String(uiConsole?.workspace || '').trim();
        return workspace || undefined;
    }

    private async saveReviewAnnotations(params: any, context: AppRpcRequestContext): Promise<{ ok: boolean }> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const cache = params?.cache;
        if (cache === undefined || cache === null) {
            throw new AppRpcError(-32602, 'Invalid params: cache is required');
        }
        const cacheKey = this.resolveReviewAnnotationsCacheKey(params) || sessionId;
        const serialized = JSON.stringify(cache);
        await this.runtime.putMemory(sessionId, this.reviewAnnotationsMemoryKey(cacheKey), serialized, 'session');
        return { ok: true };
    }

    private async loadReviewAnnotations(params: any, context: AppRpcRequestContext): Promise<Record<string, Record<string, any>> | null> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const records = await this.memory.getAll(sessionId);
        const cacheKey = this.resolveReviewAnnotationsCacheKey(params) || sessionId;
        const record = (records || []).find(r => r.key === this.reviewAnnotationsMemoryKey(cacheKey))
            || (records || []).find(r => r.key === AppRpcServer.REVIEW_ANNOTATIONS_CACHE_KEY);
        if (!record) {
            return null;
        }
        try {
            const parsed = JSON.parse(record.value);
            return parsed || null;
        } catch {
            return null;
        }
    }

    private resolveReviewAnnotationsCacheKey(params: any): string | undefined {
        const cacheKey = typeof params?.cacheKey === 'string' && params.cacheKey.trim()
            ? params.cacheKey.trim()
            : '';
        if (cacheKey) {
            return cacheKey;
        }
        const reviewTaskId = typeof params?.reviewTaskId === 'string' && params.reviewTaskId.trim()
            ? params.reviewTaskId.trim()
            : '';
        if (!reviewTaskId) {
            return undefined;
        }
        const sourceSessionId = typeof params?.sourceSessionId === 'string' && params.sourceSessionId.trim()
            ? params.sourceSessionId.trim()
            : '';
        return sourceSessionId ? `${sourceSessionId}:${reviewTaskId}` : reviewTaskId;
    }

    private reviewAnnotationsMemoryKey(cacheKey: string): string {
        return `${AppRpcServer.REVIEW_ANNOTATIONS_CACHE_KEY}:${cacheKey}`;
    }

    private requireSessionId(params: any): string {
        return this.requireString(params?.sessionId, 'sessionId');
    }

    private optionalSessionId(params: any): string | undefined {
        return typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new AppRpcError(-32602, `Invalid params: ${field} must be a non-empty string`);
        }
        return value.trim();
    }

    private resolveModelProfile(): string {
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

    private resolveHistoryPrincipalId(context: AppRpcRequestContext): string {
        return String(context?.principalId || '').trim() || 'anonymous';
    }

    private createConsoleInputHistoryRecordId(workspace: string, principalId: string, sessionId?: string): string {
        return `agent-ui:console-input-history:${encodeURIComponent(principalId)}:${encodeURIComponent(workspace)}:${encodeURIComponent(String(sessionId || '').trim() || 'default')}`;
    }

    private findConsoleInputHistoryRecord(records: any[], workspace: string, principalId: string, sessionId?: string): any | undefined {
        const resolvedSessionId = String(sessionId || '').trim();
        return (records || [])
            .filter(record => record?.scope === 'global'
                && record?.key === AppRpcServer.CONSOLE_INPUT_HISTORY_KEY
                && record?.metadata?.workspace === workspace
                && String(record?.metadata?.principalId || '').trim() === principalId
                && String(record?.metadata?.sessionId || '').trim() === resolvedSessionId)
            .sort((left, right) => (right?.updatedAt || right?.createdAt || 0) - (left?.updatedAt || left?.createdAt || 0))[0];
    }

    private parseInputHistoryEntries(value: unknown): any[] {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value !== 'string') {
            return Array.isArray((value as any)?.entries) ? (value as any).entries : [];
        }
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.entries)
                    ? parsed.entries
                    : [];
        } catch {
            return [];
        }
    }

    private normalizeInputHistoryEntries(value: unknown): string[] {
        const entries: any[] = Array.isArray(value)
            ? value
            : Array.isArray((value as any)?.entries)
                ? (value as any).entries
                : [];
        return Array.from(new Set(entries
            .map((entry: any) => String(entry || '').trim())
            .filter(Boolean)))
            .slice(0, 200);
    }

    private createErrorResponse(id: string | number | null | undefined, error: AppRpcError): AppRpcResponse {
        return {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
                code: error.code,
                message: error.message,
                data: error.data
            }
        };
    }
}
