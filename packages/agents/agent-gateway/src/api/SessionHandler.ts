import * as http from 'http';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentRuntime, MemoryStore, SessionStore, AgentTurnStartedEvent, AgentTurnCompletedEvent, AgentStreamChunkEvent, AgentErrorEvent, AgentTurnCancelledEvent } from '@tsdi/agent';
import { EventHandler } from '@tsdi/core';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { SessionInfo, SessionProjectGroup, SessionThreadGroup } from '../contracts/SessionInfo';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

/**
 * Session management API — GET /api/sessions, GET /api/sessions/projects, GET /api/sessions/:id/messages, DELETE /api/sessions/:id.
 * Mirrors zeroclaw-gateway's session management endpoints.
 */
@Injectable()
export class SessionHandler {
    private sessionIds = new Set<string>();
    private activeSessionIds = new Set<string>();

    constructor(
        private runtime: AgentRuntime,
        private sessions: SessionStore,
        private owners: SessionOwnerStore,
        @Optional() private memory?: MemoryStore | null
    ) {
    }

    /** Track a session ID (called when a new session is created) */
    track(sessionId: string): void {
        this.sessionIds.add(sessionId);
    }

    @EventHandler(AgentTurnStartedEvent)
    onTurnStarted(event: AgentTurnStartedEvent): void {
        this.track(event.sessionId);
        this.activeSessionIds.add(event.sessionId);
    }

    @EventHandler(AgentTurnCompletedEvent)
    onTurnCompleted(event: AgentTurnCompletedEvent): void {
        this.track(event.sessionId);
        this.activeSessionIds.delete(event.sessionId);
    }

    @EventHandler(AgentStreamChunkEvent)
    onStreamChunk(event: AgentStreamChunkEvent): void {
        this.track(event.sessionId);
    }

    @EventHandler(AgentErrorEvent)
    onError(event: AgentErrorEvent): void {
        this.track(event.sessionId);
        this.activeSessionIds.delete(event.sessionId);
    }

    @EventHandler(AgentTurnCancelledEvent)
    onTurnCancelled(event: AgentTurnCancelledEvent): void {
        this.track(event.sessionId);
        this.activeSessionIds.delete(event.sessionId);
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

        const listThreads: RouteHandler = async (req, res) => {
            const groups = this.groupThreadInfos(await this.listSessionInfos(getRequestPrincipalId(req)));
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
            if (this.memory) {
                await this.memory.deleteBySession(sessionId);
            }
            this.sessionIds.delete(sessionId);
            this.activeSessionIds.delete(sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ status: 'deleted' }));
        };

        const runningSessions: RouteHandler = async (req, res) => {
            const principalId = getRequestPrincipalId(req);
            const running = await this.owners.listOwned(this.activeSessionIds, principalId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(running));
        };

        return [
            { method: 'GET', path: '/api/sessions', handler: listSessions },
            { method: 'GET', path: '/api/sessions/projects', handler: listProjects },
            { method: 'GET', path: '/api/sessions/threads', handler: listThreads },
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
            const projectKey = this.resolveProjectKey(state);
            infos.push({
                id,
                sessionId: id,
                createdAt: state.createdAt ?? 0,
                lastActiveAt: state.updatedAt ?? state.createdAt ?? 0,
                messageCount: state.messages.length,
                summary: state.summary,
                workspace: state.workspace,
                projectKey,
                projectId: state.projectId ?? undefined,
                primaryThreadId: state.primaryThreadId ?? undefined,
                originThreadId: state.originThreadId ?? undefined,
                sessionRole: state.sessionRole ?? undefined,
                rootRequest: state.rootRequest ?? undefined,
                focusSummary: state.focusSummary ?? undefined
            });
        }
        return infos.sort((left, right) => {
            const leftProjectKey = String(left.projectKey || '').trim();
            const rightProjectKey = String(right.projectKey || '').trim();
            if (leftProjectKey !== rightProjectKey) {
                return leftProjectKey.localeCompare(rightProjectKey);
            }
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
            const projectKey = this.resolveProjectKey(info);
            const bucket = buckets.get(projectKey) ?? [];
            bucket.push(info);
            buckets.set(projectKey, bucket);
        }

        return Array.from(buckets.entries())
            .map(([projectKey, sessions]) => {
                const orderedSessions = sessions.slice().sort((left, right) => {
                    const activityDelta = (right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0);
                    if (activityDelta !== 0) {
                        return activityDelta;
                    }
                    return left.id.localeCompare(right.id);
                });
                const representative = orderedSessions[0];
                const workspace = String(representative?.workspace || '').trim();
                const projectId = String(representative?.projectId || '').trim() || undefined;
                const primaryThreadId = String(representative?.primaryThreadId || '').trim() || undefined;
                const sessionRole = String(representative?.sessionRole || '').trim() || undefined;
                const rootRequest = String(representative?.rootRequest || '').trim() || undefined;
                const focusSummary = String(representative?.focusSummary || '').trim() || undefined;
                return {
                    projectKey,
                    projectId,
                    workspace,
                    primaryThreadId,
                    sessionRole,
                    rootRequest,
                    focusSummary,
                    label: this.resolveProjectLabel(representative),
                    sessions: orderedSessions,
                    sessionCount: sessions.length,
                    lastActiveAt: Math.max(...sessions.map(session => session.lastActiveAt ?? 0), 0)
                };
            })
            .sort((left, right) => {
                const leftLabel = String(left.label || left.projectId || left.workspace || '').trim();
                const rightLabel = String(right.label || right.projectId || right.workspace || '').trim();
                if (leftLabel !== rightLabel) {
                    return leftLabel.localeCompare(rightLabel);
                }
                const leftProjectKey = String(left.projectKey || '').trim();
                const rightProjectKey = String(right.projectKey || '').trim();
                if (leftProjectKey !== rightProjectKey) {
                    return leftProjectKey.localeCompare(rightProjectKey);
                }
                const activityDelta = right.lastActiveAt - left.lastActiveAt;
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return left.workspace.localeCompare(right.workspace);
            });
    }

    groupThreadInfos(infos: SessionInfo[]): SessionThreadGroup[] {
        const buckets = new Map<string, SessionInfo[]>();
        for (const info of infos) {
            const threadId = this.resolveThreadId(info);
            const bucket = buckets.get(threadId) ?? [];
            bucket.push(info);
            buckets.set(threadId, bucket);
        }

        return Array.from(buckets.entries())
            .map(([threadId, sessions]) => {
                const orderedSessions = sessions.slice().sort((left, right) => {
                    const activityDelta = (right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0);
                    if (activityDelta !== 0) {
                        return activityDelta;
                    }
                    return left.id.localeCompare(right.id);
                });
                const representative = orderedSessions[0];
                const role = String(representative?.sessionRole || '').trim() || undefined;
                return {
                    threadId,
                    projectId: String(representative?.projectId || '').trim() || undefined,
                    workspace: String(representative?.workspace || '').trim(),
                    title: String(representative?.focusSummary || representative?.rootRequest || '').trim() || undefined,
                    rootRequest: String(representative?.rootRequest || '').trim() || undefined,
                    status: role === 'review' ? 'completed' : 'active',
                    stage: role === 'review' ? 'review'
                        : role === 'worker' ? 'implementation'
                        : role === 'branch' ? 'discovery' : undefined,
                    originThreadId: String(representative?.originThreadId || '').trim() || undefined,
                    currentSessionId: representative?.id,
                    sessionCount: sessions.length,
                    createdAt: Math.min(...sessions.map(session => session.createdAt ?? 0), 0) || undefined,
                    updatedAt: Math.max(...sessions.map(session => session.lastActiveAt ?? 0), 0) || undefined,
                    lastActiveAt: Math.max(...sessions.map(session => session.lastActiveAt ?? 0), 0),
                    sessions: orderedSessions
                };
            })
            .sort((left, right) => {
                const activityDelta = right.lastActiveAt - left.lastActiveAt;
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return left.threadId.localeCompare(right.threadId);
            });
    }

    private resolveThreadId(state: { sessionId?: string; id?: string; primaryThreadId?: string | null }): string {
        const primaryThreadId = String(state.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return primaryThreadId;
        }
        return `session:${String(state.sessionId || state.id || '').trim()}`;
    }

    private resolveProjectKey(state: { sessionId?: string; id?: string; projectId?: string | null; workspace?: string | null; primaryThreadId?: string | null }): string {
        const projectId = String(state.projectId || '').trim();
        if (projectId) {
            return `project:${projectId}`;
        }
        const primaryThreadId = String(state.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        const workspace = String(state.workspace || '').trim();
        if (workspace) {
            return `workspace:${workspace}`;
        }
        return `session:${String(state.sessionId || state.id || '').trim()}`;
    }

    private resolveProjectLabel(state?: { projectId?: string | null; workspace?: string | null; primaryThreadId?: string | null; rootRequest?: string | null; focusSummary?: string | null; sessionId?: string; id?: string }): string {
        if (!state) {
            return 'session';
        }
        const projectId = String(state.projectId || '').trim();
        if (projectId) {
            return projectId;
        }
        const focusSummary = String(state.focusSummary || '').trim();
        if (focusSummary) {
            return focusSummary;
        }
        const workspace = String(state.workspace || '').trim();
        if (workspace) {
            return workspace;
        }
        const primaryThreadId = String(state.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return primaryThreadId;
        }
        const rootRequest = String(state.rootRequest || '').trim();
        if (rootRequest) {
            return rootRequest;
        }
        return state.sessionId || state.id || 'session';
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
