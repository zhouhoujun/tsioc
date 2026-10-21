import { In } from 'typeorm';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentSessionFact } from './SessionStore';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentUsageRecord, collectMessageUsageRecords } from '../runtime/UsageSummary';
import { AgentMessageEntity, AgentSessionEntity } from './entities';

/**
 * Metadata-only reads for the session store.
 *
 * The TUI startup path lists sessions, authorizes RPCs and builds a global
 * usage digest. Doing that through `SessionStore.get()` deserializes every
 * stored transcript (parts/metadata JSON included), which made startup — and
 * every authorized RPC — grow with total history. These queries read just the
 * columns the callers need.
 */

/** Session rows plus per-section message counts (never message bodies). */
export async function readSessionFacts(
    adapter: TypeormAdapter,
    sessionIds?: readonly string[]
): Promise<AgentSessionFact[]> {
    const repository = adapter.getRepository(AgentSessionEntity);
    const ids = sessionIds ? [...sessionIds] : undefined;
    if (ids && !ids.length) {
        return [];
    }
    const sessions = ids
        ? await repository.find({ where: { sessionId: In(ids) } as any })
        : await repository.find();
    if (!sessions.length) {
        return [];
    }
    const countQuery = adapter.getRepository(AgentMessageEntity)
        .createQueryBuilder('message')
        .select('message.sessionId', 'sessionId')
        .addSelect('message.sectionId', 'sectionId')
        .addSelect('COUNT(*)', 'total')
        .groupBy('message.sessionId')
        .addGroupBy('message.sectionId');
    if (ids) {
        countQuery.where('message.sessionId IN (:...ids)', { ids });
    }
    const counts = await countQuery.getRawMany();
    const totals = new Map<string, number>();
    const sectionTotals = new Map<string, Record<string, number>>();
    for (const row of counts) {
        const sessionId = String(row.sessionId || '');
        if (!sessionId) {
            continue;
        }
        const total = Number(row.total ?? 0);
        totals.set(sessionId, (totals.get(sessionId) ?? 0) + total);
        const sectionId = String(row.sectionId || '').trim();
        if (sectionId) {
            const scoped = sectionTotals.get(sessionId) ?? {};
            scoped[sectionId] = (scoped[sectionId] ?? 0) + total;
            sectionTotals.set(sessionId, scoped);
        }
    }
    return sessions.map(session => ({
        sessionId: session.sessionId,
        messageCount: totals.get(session.sessionId) ?? 0,
        sectionMessageCounts: sectionTotals.get(session.sessionId) ?? {},
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
        sessionRole: (session.sessionRole ?? undefined) as AgentSessionFact['sessionRole'],
        rootRequest: session.rootRequest ?? undefined,
        focusSummary: session.focusSummary ?? undefined,
        threadStatus: (session.threadStatus ?? undefined) as AgentSessionFact['threadStatus'],
        createdAt: Number(session.createdAt),
        updatedAt: Number(session.updatedAt)
    }));
}

/** Usage records recorded on assistant messages (metadata column only). */
export async function readMessageUsageRecords(
    adapter: TypeormAdapter,
    sessionIds?: readonly string[]
): Promise<AgentUsageRecord[]> {
    const ids = sessionIds ? [...sessionIds] : undefined;
    if (ids && !ids.length) {
        return [];
    }
    const query = adapter.getRepository(AgentMessageEntity)
        .createQueryBuilder('message')
        .select('message.sessionId', 'sessionId')
        .addSelect('message.createdAt', 'createdAt')
        .addSelect('message.metadata', 'metadata')
        .where('message.role = :role', { role: 'assistant' })
        .andWhere('message.metadata IS NOT NULL');
    if (ids) {
        query.andWhere('message.sessionId IN (:...ids)', { ids });
    }
    const rows = await query.getRawMany();
    const records: AgentUsageRecord[] = [];
    for (const row of rows) {
        let metadata: any = row.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch {
                metadata = undefined;
            }
        }
        if (!metadata?.usage) {
            continue;
        }
        records.push(...collectMessageUsageRecords(String(row.sessionId || ''), [{
            id: '',
            role: 'assistant',
            content: '',
            createdAt: Number(row.createdAt),
            metadata
        } as AgentMessage]));
    }
    return records;
}

/** Owner metadata only — authorization must not load the transcript. */
export async function readOwnerPrincipalId(
    adapter: TypeormAdapter,
    sessionId: string
): Promise<string | undefined> {
    const row = await adapter.getRepository(AgentSessionEntity).findOne({
        where: { sessionId } as any,
        select: ['ownerPrincipalId'] as any
    });
    return row?.ownerPrincipalId ?? undefined;
}
