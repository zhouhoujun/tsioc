import { Inject, Injectable } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentTurnHistoryEntity } from '../memory/entities';
import { TurnHistoryRecord, TurnHistoryStore } from './TurnHistoryStore';

@Injectable()
export class TypeOrmTurnHistoryStore extends TurnHistoryStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async load(sessionId: string): Promise<TurnHistoryRecord | null> {
        const repo = this.adapter.getRepository(AgentTurnHistoryEntity);
        const row: any = await repo.findOne({ where: { sessionId } as any });
        if (!row) {
            return null;
        }
        return {
            turnUndo: Array.isArray(row.turnUndo) ? row.turnUndo : [],
            turnRedo: Array.isArray(row.turnRedo) ? row.turnRedo : [],
            fileUndo: Array.isArray(row.fileUndo) ? row.fileUndo : [],
            fileRedo: Array.isArray(row.fileRedo) ? row.fileRedo : []
        };
    }

    async save(sessionId: string, record: TurnHistoryRecord): Promise<void> {
        const repo = this.adapter.getRepository(AgentTurnHistoryEntity);
        const existing: any = await repo.findOne({ where: { sessionId } as any });
        const row: any = existing ?? repo.create({ sessionId } as any);
        row.sessionId = sessionId;
        row.turnUndo = record.turnUndo ?? [];
        row.turnRedo = record.turnRedo ?? [];
        row.fileUndo = record.fileUndo ?? [];
        row.fileRedo = record.fileRedo ?? [];
        row.updatedAt = Date.now();
        await repo.save(row as any);
    }

    async delete(sessionId: string): Promise<void> {
        await this.adapter.getRepository(AgentTurnHistoryEntity).delete({ sessionId } as any);
    }
}
