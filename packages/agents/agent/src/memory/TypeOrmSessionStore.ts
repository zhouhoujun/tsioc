import { Inject, Injectable } from '@tsdi/ioc';
import { In } from 'typeorm';
import { AgentSessionProjectIndex, AgentSessionProjectMetadata, SessionSearchMatch, SessionSearchOptions, SessionStore } from './SessionStore';
import { AgentState } from '../runtime/AgentState';
import { AgentMessage } from '../runtime/AgentMessage';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentMessageEntity, AgentSessionEntity } from './entities';

@Injectable()
export class TypeOrmSessionStore extends SessionStore {
    protected static readonly SEARCH_SCAN_LIMIT = 2000;

    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async get(sessionId: string): Promise<AgentState> {
        let session = await this.adapter.getRepository(AgentSessionEntity).findOne({ where: { sessionId } as any });
        if (!session) {
            const now = Date.now();
            session = this.adapter.getRepository(AgentSessionEntity).create({ sessionId, createdAt: now, updatedAt: now });
            session = await this.adapter.getRepository(AgentSessionEntity).save(session);
        }
        const messages = await this.adapter.getRepository(AgentMessageEntity).find({ where: { sessionId } as any, order: { sequence: 'ASC' } as any });
        return {
            sessionId,
            summary: session.summary,
            ownerPrincipalId: session.ownerPrincipalId ?? undefined,
            workspace: session.workspace ?? undefined,
            projectId: session.projectId ?? undefined,
            primaryThreadId: session.primaryThreadId ?? undefined,
            sessionRole: session.sessionRole ?? undefined,
            rootRequest: session.rootRequest ?? undefined,
            focusSummary: session.focusSummary ?? undefined,
            createdAt: Number(session.createdAt),
            updatedAt: Number(session.updatedAt),
            messages: messages.map(message => ({
                id: message.messageId,
                role: message.role as AgentMessage['role'],
                content: message.content,
                name: message.name,
                toolCallId: message.toolCallId,
                createdAt: Number(message.createdAt),
                metadata: message.metadata ?? undefined
            }))
        };
    }

    async has(sessionId: string): Promise<boolean> {
        return !!(await this.adapter.getRepository(AgentSessionEntity).findOne({ where: { sessionId } as any }));
    }

    async listSessionIds(): Promise<string[]> {
        const sessions = await this.adapter.getRepository(AgentSessionEntity).find({ order: { createdAt: 'ASC' } as any });
        return sessions.map(session => session.sessionId);
    }

    async listProjects(): Promise<AgentSessionProjectIndex[]> {
        const sessions = await this.adapter.getRepository(AgentSessionEntity).find();
        const buckets = new Map<string, AgentSessionProjectIndex & {
            representativeLastActiveAt: number;
            representativeSessionId: string;
            sessionEntries: Array<{ id: string; lastActiveAt: number }>;
        }>();
        for (const session of sessions) {
            const projectKey = this.resolveProjectKey(session);
            const lastActiveAt = Number(session.updatedAt || session.createdAt || 0);
            const existing = buckets.get(projectKey) ?? {
                projectKey,
                projectId: undefined,
                workspace: undefined,
                primaryThreadId: undefined,
                sessionRole: undefined,
                rootRequest: undefined,
                focusSummary: undefined,
                sessionIds: [],
                lastActiveAt: 0,
                representativeLastActiveAt: -1,
                representativeSessionId: '',
                sessionEntries: []
            };
            existing.sessionIds.push(session.sessionId);
            existing.sessionEntries.push({ id: session.sessionId, lastActiveAt });
            existing.lastActiveAt = Math.max(existing.lastActiveAt || 0, lastActiveAt);
            if (lastActiveAt > existing.representativeLastActiveAt
                || (lastActiveAt === existing.representativeLastActiveAt
                    && (!existing.representativeSessionId || session.sessionId.localeCompare(existing.representativeSessionId) < 0))) {
                existing.projectId = session.projectId ?? undefined;
                existing.workspace = session.workspace ?? undefined;
                existing.primaryThreadId = session.primaryThreadId ?? undefined;
                existing.sessionRole = session.sessionRole ?? undefined;
                existing.rootRequest = session.rootRequest ?? undefined;
                existing.focusSummary = session.focusSummary ?? undefined;
                existing.representativeLastActiveAt = lastActiveAt;
                existing.representativeSessionId = session.sessionId;
            }
            buckets.set(projectKey, existing);
        }
        return Array.from(buckets.values()).map(({
            representativeLastActiveAt: _representativeLastActiveAt,
            representativeSessionId: _representativeSessionId,
            sessionEntries,
            ...project
        }) => ({
            ...project,
            sessionIds: sessionEntries
                .slice()
                .sort((left, right) => {
                    const activityDelta = right.lastActiveAt - left.lastActiveAt;
                    if (activityDelta !== 0) {
                        return activityDelta;
                    }
                    return left.id.localeCompare(right.id);
                })
                .map(entry => entry.id)
        })).sort((left, right) => {
            const activityDelta = (right.lastActiveAt || 0) - (left.lastActiveAt || 0);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return left.projectKey.localeCompare(right.projectKey);
        });
    }

    async append(sessionId: string, message: AgentMessage): Promise<AgentState> {
        const sessionRepo = this.adapter.getRepository(AgentSessionEntity);
        const messageRepo = this.adapter.getRepository(AgentMessageEntity);
        let session = await sessionRepo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            session = sessionRepo.create({ sessionId, createdAt: now, updatedAt: now });
        } else {
            session.updatedAt = now;
        }
        await sessionRepo.save(session);
        const sequence = await messageRepo.count({ where: { sessionId } as any }) + 1;
        await messageRepo.save(messageRepo.create({
            sessionId,
            messageId: message.id,
            sequence,
            role: message.role,
            content: message.content,
            name: message.name,
            toolCallId: message.toolCallId,
            createdAt: message.createdAt,
            metadata: message.metadata
        }));
        return this.get(sessionId);
    }

    async setSummary(sessionId: string, summary: string): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            session = repo.create({ sessionId, summary, createdAt: now, updatedAt: now });
        } else {
            session.summary = summary;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            if (ownerPrincipalId == null) {
                return;
            }
            session = repo.create({ sessionId, ownerPrincipalId, createdAt: now, updatedAt: now });
        } else {
            session.ownerPrincipalId = ownerPrincipalId ?? null;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async setWorkspace(sessionId: string, workspace?: string): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        const normalizedWorkspace = String(workspace || '').trim() || null;
        if (!session) {
            session = repo.create({ sessionId, workspace: normalizedWorkspace, createdAt: now, updatedAt: now });
        } else {
            session.workspace = normalizedWorkspace;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async setProjectMetadata(sessionId: string, metadata: AgentSessionProjectMetadata): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        const normalizedProjectId = String(metadata.projectId || '').trim() || null;
        const normalizedPrimaryThreadId = String(metadata.primaryThreadId || '').trim() || null;
        const normalizedSessionRole = String(metadata.sessionRole || '').trim() || null;
        const normalizedRootRequest = String(metadata.rootRequest || '').trim() || null;
        const normalizedFocusSummary = String(metadata.focusSummary || '').trim() || null;
        if (!session) {
            session = repo.create({
                sessionId,
                projectId: normalizedProjectId,
                primaryThreadId: normalizedPrimaryThreadId,
                sessionRole: normalizedSessionRole,
                rootRequest: normalizedRootRequest,
                focusSummary: normalizedFocusSummary,
                createdAt: now,
                updatedAt: now
            });
        } else {
            session.projectId = normalizedProjectId;
            session.primaryThreadId = normalizedPrimaryThreadId;
            session.sessionRole = normalizedSessionRole;
            session.rootRequest = normalizedRootRequest;
            session.focusSummary = normalizedFocusSummary;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async delete(sessionId: string): Promise<void> {
        await this.adapter.getRepository(AgentMessageEntity).delete({ sessionId } as any);
        await this.adapter.getRepository(AgentSessionEntity).delete({ sessionId } as any);
    }

    async clear(): Promise<void> {
        await this.adapter.getRepository(AgentMessageEntity).clear();
        await this.adapter.getRepository(AgentSessionEntity).clear();
    }

    async search(query: string, options: SessionSearchOptions = {}): Promise<SessionSearchMatch[]> {
        const normalizedQuery = String(query || '').toLowerCase().trim();
        if (!normalizedQuery) {
            return [];
        }
        const limit = options.limit ?? 50;
        const maxSessions = options.maxSessions ?? 200;

        // Scan the most recently active sessions first, capped by maxSessions,
        // matching the abstract contract (session-level activity ordering + cap).
        const sessionRows = await this.adapter.getRepository(AgentSessionEntity).find({
            order: { updatedAt: 'DESC' as any },
            take: maxSessions
        });
        const sessionByKey = new Map(sessionRows.map(row => [row.sessionId, row]));

        const messageRows = await this.adapter.getRepository(AgentMessageEntity).find({
            where: sessionRows.length ? { sessionId: In(sessionRows.map(row => row.sessionId)) } as any : { sessionId: '__no-sessions__' } as any,
            order: { createdAt: 'DESC' as any },
            take: TypeOrmSessionStore.SEARCH_SCAN_LIMIT
        });

        const buckets = new Map<string, SessionSearchMatch & { count: number }>();
        for (const row of messageRows) {
            if (!String(row.content || '').toLowerCase().includes(normalizedQuery)) {
                continue;
            }
            const existing = buckets.get(row.sessionId);
            const session = sessionByKey.get(row.sessionId);
            const updatedAt = Number(session?.updatedAt || session?.createdAt || row.createdAt || 0);
            if (existing) {
                existing.count++;
                if (updatedAt > (existing.updatedAt ?? 0)) {
                    existing.updatedAt = updatedAt;
                }
                continue;
            }
            buckets.set(row.sessionId, {
                sessionId: row.sessionId,
                count: 1,
                snippet: `[${row.role}] ${String(row.content || '')}`,
                updatedAt,
                summary: session?.summary ?? undefined,
                workspace: session?.workspace ?? undefined
            });
        }
        const results = Array.from(buckets.values());
        results.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
        return results.slice(0, limit);
    }

    protected resolveProjectKey(state: { sessionId: string; projectId?: string | null; workspace?: string | null }): string {
        const projectId = String(state.projectId || '').trim();
        if (projectId) {
            return `project:${projectId}`;
        }
        const primaryThreadId = String((state as any).primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        const workspace = String(state.workspace || '').trim();
        if (workspace) {
            return `workspace:${workspace}`;
        }
        return `session:${state.sessionId}`;
    }
}
