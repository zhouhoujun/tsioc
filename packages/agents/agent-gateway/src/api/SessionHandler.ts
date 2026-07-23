import * as http from 'http';
import { Injectable } from '@tsdi/ioc';
import { AgentRuntime, SessionStore, AgentTurnStartedEvent, AgentTurnCompletedEvent, AgentStreamChunkEvent } from '@tsdi/agent';
import { EventHandler } from '@tsdi/core';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { SessionInfo, SessionProjectGroup } from '../contracts/SessionInfo';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

/**
 * Session management API — GET /api/sessions, GET /api/sessions/projects, GET /api/sessions/:id/messages, DELETE /api/sessions/:id.
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
            const infos = await this.listSessionInfos(getRequestPrincipalId(req));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(infos));
        };

        const listProjects: RouteHandler = async (req, res) => {
            const groups = this.groupSessionInfos(await this.listSessionInfos(getRequestPrincipalId(req)));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(groups));
        };

        const getMessages: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
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
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            await this.owners.unbind(sessionId);
            await this.sessions.delete(sessionId);
            this.sessionIds.delete(sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ status: 'deleted' }));
        };

        const runningSessions: RouteHandler = async (req, res) => {
            const principalId = getRequestPrincipalId(req);
            const running: string[] = [];
            const ids = Array.from(new Set([...(await this.sessions.listSessionIds()), ...this.sessionIds]));
            for (const id of await this.owners.listOwned(ids, principalId)) {
                const state = await this.sessions.get(id);
                if (state.messages.length > 0) {
                    running.push(id);
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(running));
        };

        return [
            { method: 'GET', path: '/api/sessions', handler: listSessions },
            { method: 'GET', path: '/api/sessions/projects', handler: listProjects },
            { method: 'GET', path: '/api/sessions/running', handler: runningSessions },
            { method: 'GET', path: '/api/sessions/:id/messages', handler: getMessages },
            { method: 'DELETE', path: '/api/sessions/:id', handler: deleteSession }
        ];
    }

    async listSessionInfos(principalId?: string): Promise<SessionInfo[]> {
        const infos: SessionInfo[] = [];
        const ids = Array.from(new Set([...(await this.sessions.listSessionIds()), ...this.sessionIds]));
        for (const id of await this.owners.listOwned(ids, principalId)) {
            const state = await this.sessions.get(id);
            infos.push({
                id,
                createdAt: state.createdAt ?? 0,
                lastActiveAt: state.updatedAt ?? state.createdAt ?? 0,
                messageCount: state.messages.length,
                summary: state.summary,
                workspace: state.workspace
            });
        }
        return infos.sort((left, right) => {
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
    }

    groupSessionInfos(infos: SessionInfo[]): SessionProjectGroup[] {
        const buckets = new Map<string, SessionInfo[]>();
        for (const info of infos) {
            const workspace = String(info.workspace || '').trim();
            const bucket = buckets.get(workspace) ?? [];
            bucket.push(info);
            buckets.set(workspace, bucket);
        }

        return Array.from(buckets.entries())
            .map(([workspace, sessions]) => ({
                workspace,
                sessions: sessions.slice().sort((left, right) => {
                    const activityDelta = (right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0);
                    if (activityDelta !== 0) {
                        return activityDelta;
                    }
                    return left.id.localeCompare(right.id);
                }),
                sessionCount: sessions.length,
                lastActiveAt: Math.max(...sessions.map(session => session.lastActiveAt ?? 0), 0)
            }))
            .sort((left, right) => {
                if (left.workspace !== right.workspace) {
                    return left.workspace.localeCompare(right.workspace);
                }
                const activityDelta = right.lastActiveAt - left.lastActiveAt;
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return left.workspace.localeCompare(right.workspace);
            });
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
