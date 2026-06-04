import { Inject, Injectable } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentAuditRecord, AuditSink } from './AuditSink';
import { AgentAuditLogEntity } from '../memory/entities';

@Injectable()
export class TypeOrmAuditSink extends AuditSink {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async append(record: AgentAuditRecord): Promise<void> {
        const repo = this.adapter.getRepository(AgentAuditLogEntity);
        await repo.save(repo.create({
            id: record.id,
            sessionId: record.sessionId,
            toolName: record.toolName,
            toolCallId: record.toolCallId,
            status: record.status,
            inputSummary: record.inputSummary,
            outputSummary: record.outputSummary,
            error: record.error,
            durationMs: record.durationMs,
            attemptCount: record.attemptCount,
            principalId: record.principalId,
            createdAt: record.createdAt,
            metadata: record.metadata
        }));
    }

    async list(sessionId?: string): Promise<AgentAuditRecord[]> {
        const repo = this.adapter.getRepository(AgentAuditLogEntity);
        const records = await repo.find({
            where: sessionId ? ({ sessionId } as any) : undefined,
            order: { createdAt: 'ASC', id: 'ASC' } as any
        });
        return records.map(record => ({
            id: record.id,
            sessionId: record.sessionId,
            toolName: record.toolName,
            toolCallId: record.toolCallId,
            status: record.status as AgentAuditRecord['status'],
            inputSummary: record.inputSummary ?? undefined,
            outputSummary: record.outputSummary ?? undefined,
            error: record.error ?? undefined,
            durationMs: record.durationMs == null ? undefined : Number(record.durationMs),
            attemptCount: record.attemptCount == null ? undefined : Number(record.attemptCount),
            principalId: record.principalId ?? undefined,
            createdAt: Number(record.createdAt),
            metadata: record.metadata ?? undefined
        }));
    }
}
