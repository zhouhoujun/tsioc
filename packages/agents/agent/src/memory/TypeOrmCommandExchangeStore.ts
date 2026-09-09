import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentCommandExchangeEntity } from './entities';
import {
    CommandExchangeRecord, CommandExchangeStore,
    CommandExchangeNoncePage, CommandExchangePageOptions,
    CommandExchangeStaleError,
    compareCommandExchangeAsc, pageCommandExchangeRecords
} from './timeline-projection';
import { ExchangeMetrics } from './ExchangeMetrics';

@Injectable()
export class TypeOrmCommandExchangeStore extends CommandExchangeStore {
    constructor(
        @Inject(TypeormAdapter) private adapter: TypeormAdapter,
        @Optional() @Inject(ExchangeMetrics) private metrics?: ExchangeMetrics | null
    ) {
        super();
    }

    private get repo() {
        return this.adapter.getRepository(AgentCommandExchangeEntity);
    }

    private readonly seqCounters = new Map<string, number>();
    /** Stored record by id per session, for idempotent append (dedup by record id). */
    private readonly byId = new Map<string, Map<string, CommandExchangeRecord>>();
    /** Highest sessionEpoch appended per session, for stale-epoch rejection. */
    private readonly maxEpochs = new Map<string, number>();
    private pending: Promise<unknown> = Promise.resolve();

    async append(record: Omit<CommandExchangeRecord, 'seq'>): Promise<CommandExchangeRecord> {
        await this.adapter.ready();
        const run = this.pending.then(async () => {
            let ids = this.byId.get(record.sessionId);
            if (ids === undefined) {
                const existing = await this.get(record.sessionId);
                ids = new Map(existing.map(r => [r.id, r]));
                this.byId.set(record.sessionId, ids);
                this.seqCounters.set(record.sessionId, existing.reduce((max, r) => Math.max(max, r.seq), -1) + 1);
                this.maxEpochs.set(record.sessionId, existing.reduce((max, r) => Math.max(max, r.sessionEpoch), 0));
            }
            const duplicate = ids.get(record.id);
            if (duplicate) {
                this.metrics?.record('duplicate');
                return duplicate;
            }
            const maxEpoch = this.maxEpochs.get(record.sessionId) ?? 0;
            if (record.sessionEpoch < maxEpoch) {
                this.metrics?.record('stale');
                throw new CommandExchangeStaleError(record.sessionId, record.sessionEpoch, maxEpoch);
            }
            const seq = this.seqCounters.get(record.sessionId)!;
            this.seqCounters.set(record.sessionId, seq + 1);
            await this.repo.save(this.repo.create({
                sessionId: record.sessionId,
                eventId: record.id,
                seq,
                sessionEpoch: record.sessionEpoch,
                kind: record.kind,
                exchangeKey: record.key,
                content: record.content,
                agentSequence: record.sequence,
                attempt: record.attempt ?? null,
                receipt: record.receipt ?? null,
                requestId: record.requestId ?? null,
                status: record.status ?? null,
                durationMs: record.durationMs ?? null,
                toolCallId: record.toolCallId ?? null,
                command: record.command ?? null,
                args: record.args ?? null,
                outputIds: record.outputIds ?? null,
                error: record.error ?? null,
                retryable: record.retryable ?? null,
                source: record.source ?? null,
                timestamp: record.timestamp
            }));
            const saved = { ...record, seq } as CommandExchangeRecord;
            ids.set(record.id, saved);
            this.maxEpochs.set(record.sessionId, Math.max(maxEpoch, record.sessionEpoch));
            return saved;
        });
        this.pending = run.catch(() => undefined);
        return run;
    }

    async get(sessionId: string): Promise<CommandExchangeRecord[]> {
        await this.adapter.ready();
        const rows = await this.repo.find({ where: { sessionId } as any, order: { seq: 'ASC' } as any });
        return rows.map(toCommandExchangeRecord).sort(compareCommandExchangeAsc);
    }

    async replay(sessionId: string, sinceSeq?: number): Promise<CommandExchangeRecord[]> {
        await this.adapter.ready();
        const all = await this.get(sessionId);
        if (typeof sinceSeq !== 'number' || !Number.isFinite(sinceSeq)) return all;
        const from = sinceSeq + 1;
        return all.filter(r => r.seq >= from);
    }

    async query(sessionId: string, options?: CommandExchangePageOptions): Promise<CommandExchangeNoncePage> {
        const all = await this.get(sessionId);
        return pageCommandExchangeRecords(all, options);
    }

    async cleanup(sessionId: string, beforeSeq: number): Promise<number> {
        await this.adapter.ready();
        const rows = await this.repo.find({ where: { sessionId } as any } as any);
        const toDelete = rows.filter(row => row.seq <= beforeSeq);
        if (!toDelete.length) return 0;
        await this.repo.remove(toDelete);
        this.seqCounters.delete(sessionId);
        this.byId.delete(sessionId);
        this.maxEpochs.delete(sessionId);
        return toDelete.length;
    }
}

function toCommandExchangeRecord(row: AgentCommandExchangeEntity): CommandExchangeRecord {
    return {
        seq: Number(row.seq),
        id: row.eventId,
        sessionId: row.sessionId,
        sessionEpoch: Number(row.sessionEpoch),
        kind: row.kind,
        key: row.exchangeKey,
        content: row.content,
        sequence: Number(row.agentSequence),
        attempt: row.attempt ?? undefined,
        receipt: row.receipt ?? undefined,
        requestId: row.requestId ?? undefined,
        status: row.status ?? undefined,
        durationMs: row.durationMs != null ? Number(row.durationMs) : undefined,
        toolCallId: row.toolCallId ?? undefined,
        command: row.command ?? undefined,
        args: row.args ?? undefined,
        outputIds: row.outputIds ?? undefined,
        error: row.error ?? undefined,
        retryable: row.retryable ?? undefined,
        source: row.source ?? undefined,
        timestamp: Number(row.timestamp)
    };
}
