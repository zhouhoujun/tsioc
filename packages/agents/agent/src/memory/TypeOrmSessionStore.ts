import { Inject, Injectable } from '@tsdi/ioc';
import { In } from 'typeorm';
import { AgentSessionProjectIndex, AgentSessionProjectMetadata, AgentSessionSection, AgentSessionSnapshotInfo, AgentThreadIndex, SessionSearchMatch, SessionSearchOptions, SessionStore, deriveThreadIndexes } from './SessionStore';
import { AgentState } from '../runtime/AgentState';
import { AgentMessage, normalizeAgentMessageParts } from '../runtime/AgentMessage';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentMessageEntity, AgentSessionEntity, AgentSessionSnapshotEntity } from './entities';
import { normalizeAgentWorkspaceIdentity } from '../AgentWorkspacePath';

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
            sections: Array.isArray(session.sections) ? session.sections.map(section => ({ ...section })) : undefined,
            summary: session.summary ?? undefined,
            title: session.title ?? undefined,
            pinned: !!session.pinned,
            archived: !!session.archived,
            ownerPrincipalId: session.ownerPrincipalId ?? undefined,
            workspace: session.workspace ?? undefined,
            projectId: session.projectId ?? undefined,
            primaryThreadId: session.primaryThreadId ?? undefined,
            originThreadId: session.originThreadId ?? undefined,
            sessionRole: session.sessionRole ?? undefined,
            rootRequest: session.rootRequest ?? undefined,
            focusSummary: session.focusSummary ?? undefined,
            threadStatus: session.threadStatus ?? undefined,
            createdAt: Number(session.createdAt),
            updatedAt: Number(session.updatedAt),
            messages: messages.map(message => ({
                id: message.messageId,
                role: message.role as AgentMessage['role'],
                content: message.content,
                parts: normalizeAgentMessageParts(message.parts),
                name: message.name,
                toolCallId: message.toolCallId,
                sectionId: message.sectionId ?? undefined,
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

    async listThreads(): Promise<AgentThreadIndex[]> {
        const sessions = await this.adapter.getRepository(AgentSessionEntity).find();
        return deriveThreadIndexes(sessions);
    }

    async appendRaw(sessionId: string, message: AgentMessage): Promise<AgentState> {
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
            parts: normalizeAgentMessageParts(message.parts) ?? null,
            name: message.name,
            toolCallId: message.toolCallId,
            sectionId: message.sectionId ?? null,
            createdAt: message.createdAt,
            metadata: message.metadata
        }));
        return this.get(sessionId);
    }

    async listSections(sessionId: string): Promise<AgentSessionSection[]> {
        const session = await this.adapter.getRepository(AgentSessionEntity).findOne({ where: { sessionId } as any });
        return Array.isArray(session?.sections) ? session.sections.map(section => ({ ...section })) : [];
    }

    async addSection(sessionId: string, label: string, beforeId?: string, sectionId?: string): Promise<AgentSessionSection> {
        const normalizedLabel = String(label || '').trim();
        if (!normalizedLabel) {
            throw new Error('section label required');
        }
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            session = repo.create({ sessionId, createdAt: now, updatedAt: now });
        }
        const sections = Array.isArray(session.sections) ? session.sections.map(section => ({ ...section })) : [];
        const id = String(sectionId || '').trim() || `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        if (sections.some(section => section.id === id)) {
            throw new Error(`section '${id}' already exists`);
        }
        const section: AgentSessionSection = { id, label: normalizedLabel, createdAt: now };
        const insertAt = String(beforeId || '').trim()
            ? sections.findIndex(existing => existing.id === beforeId)
            : -1;
        if (insertAt >= 0) {
            sections.splice(insertAt, 0, section);
        } else {
            sections.push(section);
        }
        session.sections = sections;
        session.updatedAt = now;
        await repo.save(session);
        return { ...section };
    }

    async renameSection(sessionId: string, sectionId: string, label: string): Promise<void> {
        const normalizedLabel = String(label || '').trim();
        if (!normalizedLabel) {
            throw new Error('section label required');
        }
        const repo = this.adapter.getRepository(AgentSessionEntity);
        const session = await repo.findOne({ where: { sessionId } as any });
        const sections = Array.isArray(session?.sections) ? session.sections.map(section => ({ ...section })) : [];
        const section = sections.find(existing => existing.id === sectionId);
        if (!section) {
            throw new Error(`section '${sectionId}' not found`);
        }
        section.label = normalizedLabel;
        section.updatedAt = Date.now();
        if (session) {
            session.sections = sections;
            session.updatedAt = Date.now();
            await repo.save(session);
        }
    }

    async moveSection(sessionId: string, sectionId: string, beforeId?: string): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        const session = await repo.findOne({ where: { sessionId } as any });
        const sections = Array.isArray(session?.sections) ? session.sections.map(section => ({ ...section })) : [];
        const index = sections.findIndex(existing => existing.id === sectionId);
        if (index < 0) {
            throw new Error(`section '${sectionId}' not found`);
        }
        const [section] = sections.splice(index, 1);
        const target = String(beforeId || '').trim()
            ? sections.findIndex(existing => existing.id === beforeId)
            : -1;
        if (target >= 0) {
            sections.splice(target, 0, section);
        } else {
            sections.push(section);
        }
        if (session) {
            session.sections = sections;
            session.updatedAt = Date.now();
            await repo.save(session);
        }
    }

    async deleteSection(sessionId: string, sectionId: string): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        const session = await repo.findOne({ where: { sessionId } as any });
        if (!session || !Array.isArray(session.sections) || !session.sections.some(section => section.id === sectionId)) {
            return;
        }
        session.sections = session.sections.filter(section => section.id !== sectionId);
        session.updatedAt = Date.now();
        await repo.save(session);
        const messageRepo = this.adapter.getRepository(AgentMessageEntity);
        const rows = await messageRepo.find({ where: { sessionId } as any });
        for (const row of rows) {
            if (row.sectionId === sectionId) {
                row.sectionId = null;
                await messageRepo.save(row);
            }
        }
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

    async setTitle(sessionId: string, title?: string): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        const normalizedTitle = String(title || '').trim() || null;
        if (!session) {
            session = repo.create({ sessionId, title: normalizedTitle, createdAt: now, updatedAt: now });
        } else {
            session.title = normalizedTitle;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async setPinned(sessionId: string, pinned: boolean): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            session = repo.create({ sessionId, pinned: !!pinned, createdAt: now, updatedAt: now });
        } else {
            session.pinned = !!pinned;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async setArchived(sessionId: string, archived: boolean): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            session = repo.create({ sessionId, archived: !!archived, createdAt: now, updatedAt: now });
        } else {
            session.archived = !!archived;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async snapshot(sessionId: string, label?: string): Promise<string> {
        const repo = this.adapter.getRepository(AgentSessionSnapshotEntity);
        const state = await this.get(sessionId);
        const snapshotId = `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        await repo.save(repo.create({
            sessionId,
            snapshotId,
            label: String(label || '').trim() || null,
            summary: state.summary ?? null,
            messageCount: state.messages.length,
            messages: state.messages as Array<Record<string, any>>,
            createdAt: Date.now()
        }));
        return snapshotId;
    }

    async listSnapshots(sessionId: string): Promise<AgentSessionSnapshotInfo[]> {
        const rows = await this.adapter.getRepository(AgentSessionSnapshotEntity).find({
            where: { sessionId } as any,
            order: { createdAt: 'DESC' as any }
        });
        return rows.map(row => ({
            snapshotId: row.snapshotId,
            label: row.label ?? undefined,
            messageCount: row.messageCount,
            summary: row.summary ?? undefined,
            createdAt: Number(row.createdAt)
        }));
    }

    async restoreSnapshot(sessionId: string, snapshotId: string): Promise<void> {
        const row = await this.adapter.getRepository(AgentSessionSnapshotEntity).findOne({ where: { sessionId, snapshotId } as any });
        if (!row) {
            throw new Error(`snapshot not found: ${snapshotId}`);
        }
        const sessionRepo = this.adapter.getRepository(AgentSessionEntity);
        const messageRepo = this.adapter.getRepository(AgentMessageEntity);
        let session = await sessionRepo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            session = sessionRepo.create({ sessionId, createdAt: now, updatedAt: now });
        } else {
            session.updatedAt = now;
        }
        session.summary = row.summary ?? null;
        await sessionRepo.save(session);

        await messageRepo.delete({ sessionId } as any);
        const restored = (row.messages || []) as Array<Record<string, any>>;
        for (let index = 0; index < restored.length; index++) {
            const message = restored[index];
            await messageRepo.save(messageRepo.create({
                sessionId,
                messageId: String(message.id || `msg_${Date.now()}_${index}`),
                sequence: index + 1,
                role: String(message.role || 'user'),
                content: String(message.content || ''),
                parts: normalizeAgentMessageParts(message.parts as any) ?? null,
                name: message.name,
                toolCallId: message.toolCallId,
                sectionId: String(message.sectionId || '').trim() || null,
                createdAt: Number(message.createdAt || now),
                metadata: message.metadata ?? null
            }));
        }
    }

    async deleteSnapshot(sessionId: string, snapshotId: string): Promise<void> {
        await this.adapter.getRepository(AgentSessionSnapshotEntity).delete({ sessionId, snapshotId } as any);
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
        const normalizedOriginThreadId = String(metadata.originThreadId || '').trim() || null;
        const normalizedSessionRole = String(metadata.sessionRole || '').trim() || null;
        const normalizedRootRequest = String(metadata.rootRequest || '').trim() || null;
        const normalizedFocusSummary = String(metadata.focusSummary || '').trim() || null;
        const normalizedThreadStatus = String(metadata.threadStatus || '').trim() || null;
        if (!session) {
            session = repo.create({
                sessionId,
                projectId: normalizedProjectId,
                primaryThreadId: normalizedPrimaryThreadId,
                originThreadId: normalizedOriginThreadId,
                sessionRole: normalizedSessionRole,
                rootRequest: normalizedRootRequest,
                focusSummary: normalizedFocusSummary,
                threadStatus: normalizedThreadStatus,
                createdAt: now,
                updatedAt: now
            });
        } else {
            session.projectId = normalizedProjectId;
            session.primaryThreadId = normalizedPrimaryThreadId;
            session.originThreadId = normalizedOriginThreadId;
            session.sessionRole = normalizedSessionRole;
            session.rootRequest = normalizedRootRequest;
            session.focusSummary = normalizedFocusSummary;
            session.threadStatus = normalizedThreadStatus;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async delete(sessionId: string): Promise<void> {
        await this.adapter.getRepository(AgentMessageEntity).delete({ sessionId } as any);
        await this.adapter.getRepository(AgentSessionSnapshotEntity).delete({ sessionId } as any);
        await this.adapter.getRepository(AgentSessionEntity).delete({ sessionId } as any);
    }

    async clear(): Promise<void> {
        await this.adapter.getRepository(AgentMessageEntity).clear();
        await this.adapter.getRepository(AgentSessionSnapshotEntity).clear();
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
        const workspaceKey = normalizeAgentWorkspaceIdentity(workspace);
        if (workspaceKey) {
            return `workspace:${workspaceKey}`;
        }
        return `session:${state.sessionId}`;
    }
}
