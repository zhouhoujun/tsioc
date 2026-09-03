import { Inject, Injectable } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentTimelineEventEntity } from './entities';
import {
    TimelineEventRecord, TimelineEventType, TimelineHistoryStore,
    TimelineNoncePage, TimelinePageOptions, compareTimelineEventsAsc,
    pageTimelineEntries, reduceTimelineEvents, sortTimelineEntries
} from './timeline-projection';

@Injectable()
export class TypeOrmTimelineHistoryStore extends TimelineHistoryStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    private get repo() {
        return this.adapter.getRepository(AgentTimelineEventEntity);
    }

    async append(event: Omit<TimelineEventRecord, 'seq'>): Promise<TimelineEventRecord> {
        await this.adapter.ready();
        const nextSeq = await this.repo.count({ where: { sessionId: event.sessionId } as any });
        await this.repo.save(this.repo.create({
            sessionId: event.sessionId,
            eventId: event.id,
            seq: nextSeq,
            type: event.type,
            timestamp: event.timestamp,
            turnId: event.turnId ?? null,
            planId: event.planId ?? null,
            stepId: event.stepId ?? null,
            toolCallId: event.toolCallId ?? null,
            receiptId: event.receiptId ?? null,
            attempt: event.attempt ?? null,
            toolName: event.toolName ?? null,
            status: event.status ?? null,
            sequence: event.sequence ?? null,
            summary: event.summary ?? null,
            detail: event.detail ?? null,
            durationMs: event.durationMs ?? null
        }));
        return { ...event, seq: nextSeq };
    }

    async get(sessionId: string): Promise<TimelineEventRecord[]> {
        await this.adapter.ready();
        const rows = await this.repo.find({ where: { sessionId } as any, order: { seq: 'ASC' } as any });
        return rows.map(row => toTimelineRecord(row)).sort(compareTimelineEventsAsc);
    }

    async replay(sessionId: string, sinceSeq?: number): Promise<TimelineEventRecord[]> {
        await this.adapter.ready();
        const from = typeof sinceSeq === 'number' && Number.isFinite(sinceSeq) ? sinceSeq + 1 : 0;
        const rows = await this.repo.find({ where: { sessionId } as any, order: { seq: 'ASC' } as any });
        return rows.filter(row => row.seq >= from).map(row => toTimelineRecord(row)).sort(compareTimelineEventsAsc);
    }

    async query(sessionId: string, options?: TimelinePageOptions): Promise<TimelineNoncePage> {
        await this.adapter.ready();
        const raw = await this.get(sessionId);
        return pageTimelineEntries(sortTimelineEntries(reduceTimelineEvents(raw).values()), options);
    }
}

function toTimelineRecord(row: AgentTimelineEventEntity): TimelineEventRecord {
    return {
        seq: Number(row.seq),
        id: row.eventId,
        type: row.type as TimelineEventType,
        sessionId: row.sessionId,
        timestamp: Number(row.timestamp),
        turnId: row.turnId ?? undefined,
        planId: row.planId ?? undefined,
        stepId: row.stepId ?? undefined,
        toolCallId: row.toolCallId ?? undefined,
        receiptId: row.receiptId ?? undefined,
        attempt: row.attempt ?? undefined,
        toolName: row.toolName ?? undefined,
        status: row.status ?? undefined,
        sequence: row.sequence ?? undefined,
        summary: row.summary ?? undefined,
        detail: row.detail ?? undefined,
        durationMs: row.durationMs != null ? Number(row.durationMs) : undefined
    };
}
