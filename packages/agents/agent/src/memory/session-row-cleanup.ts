import type { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentMessageEntity, AgentSessionEntity, AgentSessionSnapshotEntity, AgentTurnHistoryEntity } from './entities';

/** Delete every row owned by one session (messages, snapshots, undo history). */
export async function deleteSessionRows(adapter: TypeormAdapter, sessionId: string): Promise<void> {
    await adapter.getRepository(AgentMessageEntity).delete({ sessionId } as any);
    await adapter.getRepository(AgentSessionSnapshotEntity).delete({ sessionId } as any);
    await adapter.getRepository(AgentTurnHistoryEntity).delete({ sessionId } as any);
    await adapter.getRepository(AgentSessionEntity).delete({ sessionId } as any);
}

/** Delete all session rows (tests / explicit database reset). */
export async function clearSessionRows(adapter: TypeormAdapter): Promise<void> {
    await adapter.getRepository(AgentMessageEntity).clear();
    await adapter.getRepository(AgentSessionSnapshotEntity).clear();
    await adapter.getRepository(AgentTurnHistoryEntity).clear();
    await adapter.getRepository(AgentSessionEntity).clear();
}
