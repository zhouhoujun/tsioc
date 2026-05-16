import * as http from 'http';
import { Injectable } from '@tsdi/ioc';
import { AgentRuntime, SessionStore, AgentTurnStartedEvent, AgentTurnCompletedEvent, AgentStreamChunkEvent } from '@tsdi/agent';
import { EventHandler } from '@tsdi/core';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { SessionInfo } from '../contracts/SessionInfo';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

/**
 * Session management API — GET /api/sessions, GET /api/sessions/:id/messages, DELETE /api/sessions/:id.
 * Mirrors zeroclaw-gateway's session management endpoints.
 */
@Injectable()
export class SessionHandler {
    private sessionIds = new Set<string>();

    constructor(
        private runtime: AgentRuntime,
        private sessions: SessionStore,
        private owners: SessionOwnerStore
    ) {
    }

    /** Track a session ID (called when a new session is created) */
    track(sessionId: string): void {
        this.sessionIds.add(sessionId);
    }

    @EventHandler(AgentTurnStartedEvent)
    onTurnStarted(event: AgentTurnStartedEvent): void {
        this.track(event.sessionId);
    }

    @EventHandler(AgentTurnCompletedEvent)
    onTurnCompleted(event: AgentTurnCompletedEvent): void {
        this.track(event.sessionId);
    }

    @EventHandler(AgentStreamChunkEvent)
    onStreamChunk(event: AgentStreamChunkEvent): void {
        this.track(event.sessionId);
    }

    getRoutes(): GatewayRoute[] {
        const listSessions: RouteHandler = async (req, res) => {
            const principalId = getRequestPrincipalId(req);
            const infos: SessionInfo[] = [];
            for (const id of this.owners.listOwned(this.sessionIds, principalId)) {
                try {
                    const state = await this.sessions.get(id);
                    infos.push({
                        id,
                        createdAt: state.createdAt ?? 0,
                        lastActiveAt: state.updatedAt ?? state.createdAt ?? 0,
                        messageCount: state.messages.length,
                        summary: state.summary
                    });
                } catch {
                    this.sessionIds.delete(id);
                    this.owners.unbind(id);
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(infos));
        };

        const getMessages: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!this.ensureAccess(req, res, sessionId)) {
                return;
            }
            try {
                const messages = await this.runtime.getMessages(sessionId);
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify(messages));
            } catch {
                res.writeHead(404).end(JSON.stringify({ error: 'session not found' }));
            }
        };

        const deleteSession: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!this.ensureAccess(req, res, sessionId)) {
                return;
            }
            await this.sessions.delete(sessionId);
            this.sessionIds.delete(sessionId);
            this.owners.unbind(sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ status: 'deleted' }));
        };

        const runningSessions: RouteHandler = async (req, res) => {
            const principalId = getRequestPrincipalId(req);
            const running: string[] = [];
            for (const id of this.owners.listOwned(this.sessionIds, principalId)) {
                try {
                    const state = await this.sessions.get(id);
                    if (state.messages.length > 0) running.push(id);
                } catch {
                    this.sessionIds.delete(id);
                    this.owners.unbind(id);
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(running));
        };

        return [
            { method: 'GET', path: '/api/sessions', handler: listSessions },
            { method: 'GET', path: '/api/sessions/running', handler: runningSessions },
            { method: 'GET', path: '/api/sessions/:id/messages', handler: getMessages },
            { method: 'DELETE', path: '/api/sessions/:id', handler: deleteSession }
        ];
    }

    private ensureAccess(req: http.IncomingMessage, res: http.ServerResponse, sessionId: string): boolean {
        const principalId = getRequestPrincipalId(req);
        if (this.owners.isOwner(sessionId, principalId)) {
            return true;
        }
        res.writeHead(403, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'forbidden' }));
        return false;
    }
}
