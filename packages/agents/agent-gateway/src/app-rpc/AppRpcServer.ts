import { randomUUID } from 'crypto';
import { Injectable } from '@tsdi/ioc';
import { AgentRuntime, MemoryStore, SessionStore, ToolRegistry } from '@tsdi/agent';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { SessionHandler } from '../api/SessionHandler';
import { EventHandler } from '../api/EventHandler';
import { AppRpcError, AppRpcRequest, AppRpcRequestContext, AppRpcResponse, AppRpcTransportMessage } from '../contracts/AppRpc';

@Injectable()
export class AppRpcServer {
    constructor(
        private runtime: AgentRuntime,
        private sessions: SessionStore,
        private memory: MemoryStore,
        private tools: ToolRegistry,
        private owners: SessionOwnerStore,
        private sessionHandler: SessionHandler,
        private events: EventHandler
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
                        'session.create',
                        'session.list',
                        'session.messages',
                        'session.delete',
                        'run.turn',
                        'run.turn_stream',
                        'tools.list',
                        'tools.activate',
                        'tools.invoke',
                        'memory.list',
                        'memory.put',
                        'memory.search',
                        'events.history'
                    ],
                    streamingMethods: ['run.turn_stream']
                };
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
            case 'memory.list':
                return this.listMemory(params, context);
            case 'memory.put':
                return this.putMemory(params, context);
            case 'memory.search':
                return this.searchMemory(params, context);
            case 'events.history':
                return this.getEventHistory(this.requireSessionId(params), context);
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
        const state = await this.sessions.get(requested);
        return {
            sessionId: requested,
            createdAt: state.createdAt,
            updatedAt: state.updatedAt
        };
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
                summary: state.summary
            };
        }));
        items.sort((left, right) => (right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0));
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

        for await (const chunk of this.runtime.runStreamingTurn(sessionId, input)) {
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
