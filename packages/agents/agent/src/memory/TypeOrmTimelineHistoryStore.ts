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

    /** Per-session next-seq counter (process-local, seeded from the DB on first access). */
    private readonly seqCounters = new Map<string, number>();
    /** Serializes appends so per-session seq assignment is monotonic under concurrent/fire-and-forget calls. */
    private pending: Promise<unknown> = Promise.resolve();

    async append(event: Omit<TimelineEventRecord, 'seq'>): Promise<TimelineEventRecord> {
        await this.adapter.ready();
        // Caller may fire-and-forget, so overlapping appends must not race on
        // count()+save() (duplicate seqs → nondeterministic replay). Serialize
        // via a private promise chain; seed each session's counter from MAX(seq).
        const run = this.pending.then(async () => {
            let next = this.seqCounters.get(event.sessionId);
            if (next === undefined) {
                const existing = await this.get(event.sessionId);
                next = existing.reduce((max, e) => Math.max(max, e.seq), -1) + 1;
                this.seqCounters.set(event.sessionId, next);
            }
            const seq = next;
            this.seqCounters.set(event.sessionId, seq + 1);
            await this.repo.save(this.repo.create({
                sessionId: event.sessionId,
                eventId: event.id,
                seq,
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
            return { ...event, seq } as TimelineEventRecord;
        });
        this.pending = run.catch(() => undefined);
        return run;
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
