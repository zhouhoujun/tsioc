import type { SessionStore } from '@tsdi/agent';

export interface CrossSessionMessageListOptions {
    sessions: Pick<SessionStore, 'listSessionIds' | 'get'>;
    listOwned(sessionIds: string[], principalId?: string): Promise<string[]>;
    principalId?: string;
    limit?: number;
}

export interface CrossSessionMessageRow {
    messageId: string;
    sessionId: string;
    fromSessionId?: string;
    content: string;
    createdAt: number;
}

const MAX_LIMIT = 200;
const MAX_SCANNED_SESSIONS = 60;

/**
 * `session.message.list` — recent cross-session messages across the caller's
 * sessions. Read-only projection bounded to the newest sessions so the panel
 * stays fast on large workspaces.
 */
export async function listCrossSessionMessages(options: CrossSessionMessageListOptions): Promise<{
    messages: CrossSessionMessageRow[];
    scannedSessions: number;
}> {
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(options.limit) || 50));
    const ids = (await options.sessions.listSessionIds())
        .slice(-MAX_SCANNED_SESSIONS)
        .reverse();
    const owned = new Set(await options.listOwned(ids, options.principalId));
    const rows: CrossSessionMessageRow[] = [];
    for (const sessionId of ids) {
        if (!owned.has(sessionId)) {
            continue;
        }
        const state = await options.sessions.get(sessionId);
        for (const message of state.messages || []) {
            const metadata = (message as any)?.metadata;
            if (String(metadata?.kind || '') !== 'cross-session') {
                continue;
            }
            rows.push({
                messageId: String((message as any)?.id || ''),
                sessionId,
                fromSessionId: typeof metadata?.fromSessionId === 'string' && metadata.fromSessionId.trim()
                    ? metadata.fromSessionId.trim()
                    : undefined,
                content: String((message as any)?.content || ''),
                createdAt: Number((message as any)?.createdAt) || 0
            });
        }
    }
    rows.sort((left, right) => right.createdAt - left.createdAt);
    return { messages: rows.slice(0, limit), scannedSessions: ids.length };
}
