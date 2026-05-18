import * as http from 'http';
import { Injectable } from '@tsdi/ioc';
import { EventHandler as OnEvent } from '@tsdi/core';
import { AgentErrorEvent, AgentStreamChunkEvent, AgentToolCompletedEvent, AgentToolFailedEvent, AgentToolInvokedEvent, AgentToolSkippedEvent, AgentTurnCompletedEvent, AgentTurnStartedEvent } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

/**
 * SSE (Server-Sent Events) endpoint — GET /api/events.
 * Mirrors zeroclaw-gateway's SSE event stream.
 */
interface GatewayEventRecord {
    id: string;
    type: string;
    sessionId?: string;
    timestamp: number;
    data: any;
}

const MAX_EVENT_HISTORY = 200;

@Injectable()
export class EventHandler {
    private clients = new Map<string, Set<http.ServerResponse>>();
    private history: GatewayEventRecord[] = [];

    constructor(private owners: SessionOwnerStore) {
    }

    private sseHandler: RouteHandler = async (req, res) => {
        const host = req.headers?.host ?? 'localhost';
        const url = new URL(req.url ?? '/api/events', `http://${host}`);
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'sessionId required' }));
            return;
        }
        if (!await this.ensureAccess(req, res, sessionId)) {
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        });
        res.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);

        const clients = this.clients.get(sessionId) ?? new Set<http.ServerResponse>();
        clients.add(res);
        this.clients.set(sessionId, clients);
        res.on('close', () => {
            clients.delete(res);
            if (!clients.size) {
                this.clients.delete(sessionId);
            }
        });
    };

    @OnEvent(AgentTurnStartedEvent)
    onTurnStarted(event: AgentTurnStartedEvent): void {
        this.publish('turn_started', { sessionId: event.sessionId, input: event.input });
    }

    @OnEvent(AgentStreamChunkEvent)
    onStreamChunk(event: AgentStreamChunkEvent): void {
        this.publish('stream_chunk', {
            sessionId: event.sessionId,
            chunkType: event.type,
            content: event.content,
            toolCalls: event.toolCalls,
            usage: event.usage
        });
    }

    @OnEvent(AgentToolInvokedEvent)
    onToolInvoked(event: AgentToolInvokedEvent): void {
        this.publish('tool_invoked', {
            sessionId: event.sessionId,
            toolName: event.toolName,
            hasInput: event.hasInput,
            inputSummary: event.inputSummary
        });
    }

    @OnEvent(AgentToolCompletedEvent)
    onToolCompleted(event: AgentToolCompletedEvent): void {
        this.publish('tool_completed', {
            sessionId: event.sessionId,
            toolName: event.toolName,
            output: this.summarizeValue(event.output),
            receipt: event.receipt
        });
    }

    @OnEvent(AgentToolFailedEvent)
    onToolFailed(event: AgentToolFailedEvent): void {
        this.publish('tool_failed', {
            sessionId: event.sessionId,
            toolName: event.toolName,
            error: event.error.message,
            receipt: event.receipt
        });
    }

    @OnEvent(AgentToolSkippedEvent)
    onToolSkipped(event: AgentToolSkippedEvent): void {
        this.publish('tool_skipped', {
            sessionId: event.sessionId,
            toolName: event.toolName,
            reason: event.reason,
            receipt: event.receipt
        });
    }

    @OnEvent(AgentTurnCompletedEvent)
    onTurnCompleted(event: AgentTurnCompletedEvent): void {
        this.publish('turn_completed', {
            sessionId: event.sessionId,
            message: event.message
        });
    }

    @OnEvent(AgentErrorEvent)
    onError(event: AgentErrorEvent): void {
        this.publish('error', {
            sessionId: event.sessionId,
            error: event.error.message
        });
    }

    /** Broadcast an event to connected SSE clients for one session */
    broadcast(sessionId: string, event: string, data: any): void {
        const payload = `event: ${event}\ndata: ${this.safeStringify(data)}\n\n`;
        const clients = this.clients.get(sessionId);
        if (!clients?.size) {
            return;
        }
        const dead: http.ServerResponse[] = [];
        for (const client of clients) {
            try {
                client.write(payload);
            } catch {
                dead.push(client);
            }
        }
        dead.forEach(client => clients.delete(client));
        if (!clients.size) {
            this.clients.delete(sessionId);
        }
    }

    private publish(type: string, data: any): void {
        const record: GatewayEventRecord = {
            id: `${Date.now()}-${Math.random()}`,
            type,
            sessionId: data?.sessionId,
            timestamp: Date.now(),
            data: this.normalizeValue(data)
        };
        this.history.push(record);
        if (this.history.length > MAX_EVENT_HISTORY) {
            this.history = this.history.slice(-MAX_EVENT_HISTORY);
        }
        if (record.sessionId) {
            this.broadcast(record.sessionId, type, record);
        }
    }

    private summarizeValue(value: any): any {
        if (value == null) {
            return value;
        }
        if (typeof value === 'string') {
            return value.length > 200 ? value.slice(0, 200) + '...[truncated]' : value;
        }
        if (Array.isArray(value)) {
            return { type: 'array', length: value.length };
        }
        if (typeof value === 'object') {
            return { type: 'object', keys: Object.keys(value).slice(0, 10) };
        }
        return value;
    }

    private normalizeValue(value: any): any {
        try {
            return JSON.parse(this.safeStringify(value));
        } catch {
            return { value: '[unserializable]' };
        }
    }

    private safeStringify(value: any): string {
        const seen = new WeakSet<object>();
        return JSON.stringify(value, (_key, current) => {
            if (typeof current === 'bigint') {
                return current.toString();
            }
            if (current && typeof current === 'object') {
                if (seen.has(current)) {
                    return '[circular]';
                }
                seen.add(current);
            }
            return current;
        });
    }

    getRoutes(): GatewayRoute[] {
        const historyHandler: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/events/history', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId');
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const events = this.history.filter(event => event.sessionId === sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ events }));
        };

        return [
            { method: 'GET', path: '/api/events', handler: this.sseHandler },
            { method: 'GET', path: '/api/events/history', handler: historyHandler }
        ];
    }

    private async ensureAccess(req: http.IncomingMessage, res: http.ServerResponse, sessionId: string): Promise<boolean> {
        const principalId = getRequestPrincipalId(req);
        if (await this.owners.isOwner(sessionId, principalId)) {
            return true;
        }
        res.writeHead(403, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'forbidden' }));
        return false;
    }
}
