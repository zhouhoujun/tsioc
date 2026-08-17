import * as http from 'http';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentRuntime, MemoryStore, SessionStore, AgentTurnStartedEvent, AgentTurnCompletedEvent, AgentStreamChunkEvent, AgentErrorEvent, AgentTurnCancelledEvent } from '@tsdi/agent';
import { EventHandler } from '@tsdi/core';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { SessionInfo, SessionProjectGroup, SessionThreadGroup, AgentSessionSectionInfo } from '../contracts/SessionInfo';
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
            const includeAutomation = new URL(req.url || '/', 'http://gateway.local').searchParams.get('includeAutomation') === 'true';
            const infos = await this.listSessionInfos(getRequestPrincipalId(req), false, includeAutomation);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(infos));
        };

        const listProjects: RouteHandler = async (req, res) => {
            const includeAutomation = new URL(req.url || '/', 'http://gateway.local').searchParams.get('includeAutomation') === 'true';
            const groups = this.groupSessionInfos(await this.listSessionInfos(getRequestPrincipalId(req), false, includeAutomation));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(groups));
        };

        const listThreads: RouteHandler = async (req, res) => {
            const includeAutomation = new URL(req.url || '/', 'http://gateway.local').searchParams.get('includeAutomation') === 'true';
            const groups = this.groupThreadInfos(await this.listSessionInfos(getRequestPrincipalId(req), false, includeAutomation));
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

        const exportSession: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? `/api/sessions/${sessionId}/export`, `http://${host}`);
            const format = url.searchParams.get('format')?.trim().toLowerCase() === 'jsonl'
                ? 'jsonl'
                : 'json';
            try {
                const state = await this.sessions.get(sessionId);
                const messages = await this.runtime.getMessages(sessionId);
                const toolCalls = this.collectExportToolCalls(messages);
                const exportedAt = Date.now();
                const session = {
                    id: sessionId,
                    createdAt: state.createdAt ?? null,
                    updatedAt: state.updatedAt ?? null,
                    summary: state.summary ?? null,
                    workspace: state.workspace ?? null,
                    projectId: state.projectId ?? null,
                    primaryThreadId: state.primaryThreadId ?? null,
                    originThreadId: state.originThreadId ?? null,
                    sessionRole: state.sessionRole ?? null,
                    rootRequest: state.rootRequest ?? null,
                    focusSummary: state.focusSummary ?? null,
                    threadStatus: state.threadStatus ?? null,
                    messageCount: messages.length,
                    toolCallCount: toolCalls.length
                };
                res.writeHead(200, {
                    'Content-Type': format === 'jsonl'
                        ? 'application/x-ndjson; charset=utf-8'
                        : 'application/json; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${this.buildExportFileName(sessionId, exportedAt, format)}"`
                }).end(this.serializeSessionExport(format, exportedAt, session, messages, toolCalls));
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

        const setTitle: RouteHandler = async (req, res, params, body) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const title = typeof body?.title === 'string' ? body.title : undefined;
            await this.sessions.setTitle(sessionId, title);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ status: 'updated', title }));
        };

        const setPinned: RouteHandler = async (req, res, params, body) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const pinned = !!body?.pinned;
            await this.sessions.setPinned(sessionId, pinned);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ status: 'updated', pinned }));
        };

        const createSnapshot: RouteHandler = async (req, res, params, body) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            try {
                const label = typeof body?.label === 'string' ? body.label : undefined;
                const snapshotId = await this.sessions.snapshot(sessionId, label);
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ snapshotId }));
            } catch (err: any) {
                res.writeHead(500).end(JSON.stringify({ error: err?.message ?? 'snapshot failed' }));
            }
        };

        const listSnapshots: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const snapshots = await this.sessions.listSnapshots(sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(snapshots));
        };

        const restoreSnapshot: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            const snapshotId = params['snapshotId'];
            if (!sessionId || !snapshotId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id and snapshot id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            try {
                await this.sessions.restoreSnapshot(sessionId, snapshotId);
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ status: 'restored' }));
            } catch (err: any) {
                res.writeHead(404).end(JSON.stringify({ error: err?.message ?? 'snapshot not found' }));
            }
        };

        const deleteSnapshot: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            const snapshotId = params['snapshotId'];
            if (!sessionId || !snapshotId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id and snapshot id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            await this.sessions.deleteSnapshot(sessionId, snapshotId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ status: 'deleted' }));
        };

        const listGitStepSnapshots: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const snapshots = this.runtime.listGitStepSnapshots(sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(snapshots));
        };

        const createGitStepSnapshot: RouteHandler = async (req, res, params, body) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            try {
                const state = await this.sessions.get(sessionId);
                const workspace = String(state.workspace || '').trim();
                if (!workspace) {
                    res.writeHead(400).end(JSON.stringify({ error: 'session has no workspace configured' }));
                    return;
                }
                const messageId = typeof body?.messageId === 'string' ? body.messageId.trim() : '';
                const snapshot = this.runtime.captureGitStepSnapshot(sessionId, workspace, messageId);
                if (!snapshot) {
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                        .end(JSON.stringify({ captured: false, reason: 'workspace is not a git repo or has no tracked changes' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ captured: true, snapshot }));
            } catch (err: any) {
                res.writeHead(500).end(JSON.stringify({ error: err?.message ?? 'git snapshot failed' }));
            }
        };

        const diffGitStepSnapshot: RouteHandler = async (req, res, params, body) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const ref = String(body?.ref || body?.snapshotId || body?.messageId || '').trim();
            if (!ref) {
                res.writeHead(400).end(JSON.stringify({ error: 'ref (messageId or snapshotId) required' }));
                return;
            }
            const diff = this.runtime.diffGitStepSnapshot(sessionId, ref);
            if (!diff) {
                res.writeHead(404).end(JSON.stringify({ error: `no git step snapshot found for ${ref}` }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(diff));
        };

        const revertGitStepSnapshot: RouteHandler = async (req, res, params, body) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const messageId = String(body?.messageId || body?.ref || '').trim();
            if (!messageId) {
                res.writeHead(400).end(JSON.stringify({ error: 'messageId required' }));
                return;
            }
            try {
                const result = await this.runtime.revertGitStepSnapshot(sessionId, messageId);
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify(result));
            } catch (err: any) {
                res.writeHead(500).end(JSON.stringify({ error: err?.message ?? 'revert failed' }));
            }
        };

        const unrevertGitStepSnapshot: RouteHandler = async (req, res, params) => {
            const sessionId = params['id'];
            if (!sessionId) {
                res.writeHead(400).end(JSON.stringify({ error: 'session id required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            try {
                const result = await this.runtime.unrevertGitStepSnapshot(sessionId);
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify(result));
            } catch (err: any) {
                res.writeHead(500).end(JSON.stringify({ error: err?.message ?? 'unrevert failed' }));
            }
        };

        return [
            { method: 'GET', path: '/api/sessions', handler: listSessions },
            { method: 'GET', path: '/api/sessions/projects', handler: listProjects },
            { method: 'GET', path: '/api/sessions/threads', handler: listThreads },
            { method: 'GET', path: '/api/sessions/running', handler: runningSessions },
            { method: 'GET', path: '/api/sessions/:id/messages', handler: getMessages },
            { method: 'GET', path: '/api/sessions/:id/export', handler: exportSession },
            { method: 'PUT', path: '/api/sessions/:id/title', handler: setTitle },
            { method: 'PUT', path: '/api/sessions/:id/pinned', handler: setPinned },
            { method: 'GET', path: '/api/sessions/:id/snapshots', handler: listSnapshots },
            { method: 'POST', path: '/api/sessions/:id/snapshots', handler: createSnapshot },
            { method: 'POST', path: '/api/sessions/:id/snapshots/:snapshotId/restore', handler: restoreSnapshot },
            { method: 'DELETE', path: '/api/sessions/:id/snapshots/:snapshotId', handler: deleteSnapshot },
            { method: 'GET', path: '/api/sessions/:id/git-snapshots', handler: listGitStepSnapshots },
            { method: 'POST', path: '/api/sessions/:id/git-snapshots', handler: createGitStepSnapshot },
            { method: 'POST', path: '/api/sessions/:id/git-snapshots/diff', handler: diffGitStepSnapshot },
            { method: 'POST', path: '/api/sessions/:id/git-snapshots/revert', handler: revertGitStepSnapshot },
            { method: 'POST', path: '/api/sessions/:id/git-snapshots/unrevert', handler: unrevertGitStepSnapshot },
            { method: 'DELETE', path: '/api/sessions/:id', handler: deleteSession }
        ];
    }

    async listSessionInfos(principalId?: string, includeArchived = false, includeAutomation = false): Promise<SessionInfo[]> {
        const infos: SessionInfo[] = [];
        const ids = Array.from(new Set([...(await this.sessions.listSessionIds()), ...this.sessionIds]));
        for (const id of await this.owners.listOwned(ids, principalId)) {
            const state = await this.sessions.get(id);
            if (!includeAutomation && state.sessionRole === 'automation') {
                continue;
            }
            if (state.archived && !includeArchived) {
                continue;
            }
            const projectKey = this.resolveProjectKey(state);
            infos.push({
                id,
                sessionId: id,
                createdAt: state.createdAt ?? 0,
                lastActiveAt: state.updatedAt ?? state.createdAt ?? 0,
                messageCount: state.messages.length,
                summary: state.summary,
                title: state.title,
                pinned: !!state.pinned,
                archived: !!state.archived,
                workspace: state.workspace,
                projectKey,
                projectId: state.projectId ?? undefined,
                primaryThreadId: state.primaryThreadId ?? undefined,
                originThreadId: state.originThreadId ?? undefined,
                sessionRole: state.sessionRole ?? undefined,
                rootRequest: state.rootRequest ?? undefined,
                focusSummary: state.focusSummary ?? undefined,
                threadStatus: state.threadStatus ?? undefined,
                sections: this.deriveSectionInfos(state)
            });
        }
        return infos.sort((left, right) => {
            const pinnedDelta = Number(!!right.pinned) - Number(!!left.pinned);
            if (pinnedDelta !== 0) {
                return pinnedDelta;
            }
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
                    const pinnedDelta = Number(!!right.pinned) - Number(!!left.pinned);
                    if (pinnedDelta !== 0) {
                        return pinnedDelta;
                    }
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
                    const pinnedDelta = Number(!!right.pinned) - Number(!!left.pinned);
                    if (pinnedDelta !== 0) {
                        return pinnedDelta;
                    }
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
                    status: representative?.threadStatus ?? (role === 'review' ? 'completed' : 'active'),
                    stage: role === 'review' ? 'review'
                        : role === 'worker' ? 'implementation'
                        : role === 'branch' ? 'discovery' : undefined,
                    originThreadId: String(representative?.originThreadId || '').trim() || undefined,
                    currentSessionId: representative?.id,
                    sections: representative?.sections,
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

    private deriveSectionInfos(state: { sections?: Array<{ id: string; label: string }>; messages?: Array<{ sectionId?: string }> }): AgentSessionSectionInfo[] | undefined {
        const sections = Array.isArray(state.sections) ? state.sections.filter(section => section && String(section.id || '').trim()) : [];
        if (!sections.length) {
            return undefined;
        }
        const counts = new Map<string, number>();
        for (const message of state.messages ?? []) {
            const sectionId = String(message.sectionId || '').trim();
            if (sectionId) {
                counts.set(sectionId, (counts.get(sectionId) ?? 0) + 1);
            }
        }
        return sections.map(section => ({
            id: section.id,
            label: section.label,
            messageCount: counts.get(section.id) ?? 0
        }));
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

    private buildExportFileName(sessionId: string, exportedAt: number, format: 'json' | 'jsonl'): string {
        const ext = format === 'jsonl' ? 'jsonl' : 'json';
        const stamp = new Date(exportedAt).toISOString().replace(/[:.]/g, '-');
        const safeSessionId = String(sessionId || 'session').replace(/[^a-zA-Z0-9._-]+/g, '-');
        return `agent-session-${safeSessionId}-${stamp}.${ext}`;
    }

    private serializeSessionExport(
        format: 'json' | 'jsonl',
        exportedAt: number,
        session: Record<string, any>,
        messages: Array<Record<string, any>>,
        toolCalls: Array<Record<string, any>>
    ): string {
        if (format === 'jsonl') {
            const lines = [
                JSON.stringify({ type: 'session', exportedAt, session }),
                ...messages.map(message => JSON.stringify({ type: 'message', message })),
                ...toolCalls.map(toolCall => JSON.stringify({ type: 'tool_call', toolCall }))
            ];
            return `${lines.join('\n')}\n`;
        }
        return JSON.stringify({
            type: 'session_export',
            format,
            exportedAt,
            session,
            messages,
            toolCalls
        }, null, 2);
    }

    private collectExportToolCalls(messages: Array<Record<string, any>>): Array<Record<string, any>> {
        const records: Array<Record<string, any>> = [];
        for (const message of messages || []) {
            const toolCalls = Array.isArray(message?.metadata?.toolCalls)
                ? message.metadata.toolCalls
                : [];
            for (const toolCall of toolCalls) {
                if (!toolCall || typeof toolCall !== 'object') {
                    continue;
                }
                const id = typeof toolCall.id === 'string' ? toolCall.id : '';
                const name = typeof toolCall.name === 'string' ? toolCall.name : '';
                if (!id && !name) {
                    continue;
                }
                records.push({
                    id: id || null,
                    name: name || null,
                    input: toolCall.input ?? null,
                    messageId: message.id,
                    createdAt: message.createdAt
                });
            }
        }
        return records;
    }
}
