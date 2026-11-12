import { LessThan, MoreThan } from 'typeorm';
import type { TypeormAdapter } from '@tsdi/typeorm-adapter';
import type { AgentMessage } from '../runtime/AgentMessage';
import { normalizeAgentMessageParts } from '../runtime/AgentMessage';
import { AgentMessageEntity } from './entities';
import {
    DEFAULT_SESSION_MESSAGE_PAGE_SIZE,
    SESSION_MESSAGE_PAGE_SIZE_LIMIT,
    SessionMessageInvalidCursor,
    SessionMessagePage,
    SessionMessagePageOptions
} from './session-message-paging';

/**
 * Map one persisted row to the runtime message shape. Exported so the store's
 * full read and the paged read share one conversion.
 */
export function toAgentMessageRow(message: AgentMessageEntity): AgentMessage {
    return {
        id: message.messageId,
        role: message.role as AgentMessage['role'],
        content: message.content,
        parts: normalizeAgentMessageParts(message.parts),
        name: message.name,
        toolCallId: message.toolCallId,
        sectionId: message.sectionId ?? undefined,
        createdAt: Number(message.createdAt),
        metadata: message.metadata ?? undefined
    };
}

/**
 * Targeted transcript page query for the TypeORM store. Kept beside the store
 * (not inside it) so the store stays within its size budget, and so opening a
 * long session never deserializes the whole message table.
 */
export async function readSessionMessagePage(
    adapter: TypeormAdapter,
    sessionId: string,
    options?: SessionMessagePageOptions,
    invalidCursor?: SessionMessageInvalidCursor
): Promise<SessionMessagePage> {
    await adapter.ready();
    const requestedLimit = typeof options?.limit === 'number' && options.limit > 0
        ? Math.floor(options.limit)
        : undefined;
    const limit = Math.min(Math.max(requestedLimit ?? DEFAULT_SESSION_MESSAGE_PAGE_SIZE, 1), SESSION_MESSAGE_PAGE_SIZE_LIMIT);
    const cursor = typeof options?.cursor === 'string' && options.cursor.trim() ? options.cursor.trim() : '';
    const repo = adapter.getRepository(AgentMessageEntity);
    let rows: AgentMessageEntity[];
    if (!cursor) {
        rows = await repo.find({
            where: { sessionId } as any,
            order: { sequence: 'DESC' } as any,
            take: limit + 1
        });
    } else {
        const cursorRow = await repo.findOne({ where: { sessionId, messageId: cursor } as any });
        if (!cursorRow) {
            throw invalidCursor?.(cursor) ?? new Error(`cursor message '${cursor}' not found`);
        }
        rows = options?.before
            ? await repo.find({
                where: { sessionId, sequence: LessThan(cursorRow.sequence) } as any,
                order: { sequence: 'DESC' } as any,
                take: limit + 1
            })
            : await repo.find({
                where: { sessionId, sequence: MoreThan(cursorRow.sequence) } as any,
                order: { sequence: 'ASC' } as any,
                take: limit + 1
            });
    }
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    if (!cursor || options?.before) {
        pageRows.reverse();
    }
    const messages = pageRows.map(message => toAgentMessageRow(message));
    return {
        messages,
        hasMore,
        nextCursor: messages[messages.length - 1]?.id ?? (cursor || undefined)
    };
}
