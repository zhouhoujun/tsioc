import { randomUUID } from 'crypto';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AGENT_OPTIONS, AgentOptions, AgentRuntime, AuditSink, defaultAgentOptions, MemoryStore, SessionStore, ToolRegistry } from '@tsdi/agent';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { SessionHandler } from '../api/SessionHandler';
import { EventHandler } from '../api/EventHandler';
import { AppRpcError, AppRpcRequest, AppRpcRequestContext, AppRpcResponse, AppRpcTransportMessage } from '../contracts/AppRpc';

@Injectable()
export class AppRpcServer {
    protected static readonly CONSOLE_INPUT_HISTORY_KEY = 'agent-ui.console.input-history';

    constructor(
        private runtime: AgentRuntime,
        private sessions: SessionStore,
        private memory: MemoryStore,
        private tools: ToolRegistry,
        private owners: SessionOwnerStore,
        private sessionHandler: SessionHandler,
        private events: EventHandler,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions = defaultAgentOptions,
        @Optional() private audit?: AuditSink | null
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
                        'session.messages',
                        'session.delete',
                        'run.turn',
                        'run.turn_stream',
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
                        'coding_task.list',
                        'coding_task.get',
                        'coding_task.diff',
                        'coding_task.cancel',
                        'coding_task.rollback'
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
            case 'session.messages':
                return this.getSessionMessages(this.requireSessionId(params), context);
            case 'session.delete':
                return this.deleteSession(this.requireSessionId(params), context);
            case 'run.turn':
                return this.runTurn(params, context);
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
            case 'coding_task.list':
                return this.listCodingTasks(params, context);
            case 'coding_task.get':
                return this.getCodingTask(params, context);
            case 'coding_task.diff':
                return this.getCodingTaskDiff(params, context);
            case 'coding_task.cancel':
                return this.cancelCodingTask(params, context);
            case 'coding_task.rollback':
                return this.rollbackCodingTask(params, context);
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
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : this.options.bootstrapTurn?.sessionId || 'default';
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        await this.setSessionWorkspace(sessionId);
        const state = await this.sessions.get(sessionId);

        return {
            sessionId,
            workspace: String(uiConsole?.workspace || ''),
            title: this.options.ui?.title || defaultAgentOptions.ui?.title || '',
            provider: this.options.model?.provider || '',
            model: this.options.model?.model || '',
            modelProfile: this.resolveModelProfile(),
            createdAt: state.createdAt,
            updatedAt: state.updatedAt
        };
    }

    private async getInputHistory(params: any, context: AppRpcRequestContext): Promise<string[]> {
        const workspace = this.requireString(params?.workspace, 'app.inputHistory.get workspace');
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
            this.sessionHandler.track(sessionId);
        }
        const principalId = this.resolveHistoryPrincipalId(context);
        const record = this.findConsoleInputHistoryRecord(await this.memory.getAll(sessionId), workspace, principalId);
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
        const existing = this.findConsoleInputHistoryRecord(await this.memory.getAll(sessionId), workspace, principalId);
        const id = this.createConsoleInputHistoryRecordId(workspace, principalId);
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
                kind: 'console-input-history'
            },
            createdAt: existing?.createdAt || Date.now(),
            updatedAt: Date.now()
        });
        return { workspace, entries };
    }

    private async listSessions(context: AppRpcRequestContext): Promise<any[]> {
        const allIds = await this.sessions.listSessionIds();
        const ids = context.principalId
            ? await this.owners.listOwned(allIds, context.principalId)
            : allIds;
        const items = await Promise.all(ids.map(async sessionId => {
            const state = await this.sessions.get(sessionId);
            return {
                id: sessionId,
                createdAt: state.createdAt ?? 0,
                lastActiveAt: state.updatedAt ?? state.createdAt ?? 0,
                messageCount: state.messages.length,
                summary: state.summary,
                workspace: state.workspace
            };
        }));
        items.sort((left, right) => {
            const leftWorkspace = String(left.workspace || '').trim();
            const rightWorkspace = String(right.workspace || '').trim();
            if (leftWorkspace !== rightWorkspace) {
                return leftWorkspace.localeCompare(rightWorkspace);
            }
            const activityDelta = (right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return left.id.localeCompare(right.id);
        });
        return items;
    }

    private async getSessionMessages(sessionId: string, context: AppRpcRequestContext): Promise<any> {
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.getMessages(sessionId);
    }

    private async deleteSession(sessionId: string, context: AppRpcRequestContext): Promise<any> {
        await this.ensureSessionAccess(sessionId, context);
        await this.owners.unbind(sessionId);
        await this.sessions.delete(sessionId);
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

    private async *streamTurn(request: AppRpcRequest, context: AppRpcRequestContext): AsyncGenerator<AppRpcTransportMessage, void, void> {
        const params = request.params ?? {};
        const input = this.requireString(params?.input, 'run.turn_stream input');
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : `rpc-${randomUUID()}`;
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        await this.setSessionWorkspace(sessionId);

        for await (const chunk of this.runtime.runStreamingTurn(sessionId, input, context.principalId)) {
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
                    ...(chunk.usage !== undefined ? { usage: chunk.usage } : {})
                }
            };
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

    private async listCodingTasks(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
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

    private createConsoleInputHistoryRecordId(workspace: string, principalId: string): string {
        return `agent-ui:console-input-history:${encodeURIComponent(principalId)}:${encodeURIComponent(workspace)}`;
    }

    private findConsoleInputHistoryRecord(records: any[], workspace: string, principalId: string): any | undefined {
        return (records || [])
            .filter(record => record?.scope === 'global'
                && record?.key === AppRpcServer.CONSOLE_INPUT_HISTORY_KEY
                && record?.metadata?.workspace === workspace
                && String(record?.metadata?.principalId || '').trim() === principalId)
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
