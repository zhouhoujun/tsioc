import type { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentMessageEntity } from './entities';

/**
 * Remove every message after the first `keepCount` rows.
 *
 * Turn-level undo records the message count before a prompt; truncating removes
 * exactly the user prompt and everything the turn appended (assistant text and
 * tool messages). Kept out of `TypeOrmSessionStore` so the store stays within
 * the source-size budget.
 */
export async function truncateSessionMessages(
    adapter: TypeormAdapter,
    sessionId: string,
    keepCount: number
): Promise<void> {
    const repository = adapter.getRepository(AgentMessageEntity);
    const rows = await repository.find({ where: { sessionId } as any, order: { sequence: 'ASC' } as any });
    const keep = Math.max(0, Math.min(Math.floor(keepCount) || 0, rows.length));
    for (const row of rows.slice(keep)) {
        await repository.delete({ sessionId, messageId: row.messageId } as any);
    }
}
