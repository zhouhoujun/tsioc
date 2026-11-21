import type { SessionStore } from '@tsdi/agent';
import type { UuidGenerator } from '@tsdi/core';
import type { AppRpcRequestContext } from '../contracts/AppRpc';
import { AppRpcError } from '../contracts/AppRpc';

export interface SessionImportRpcOptions {
    params: any;
    context: AppRpcRequestContext;
    sessions: SessionStore;
    uuid: UuidGenerator;
    authorize(sessionId: string): Promise<void>;
    createOwner(sessionId: string, principalId?: string): Promise<void>;
    track(sessionId: string): void;
    setWorkspace(sessionId: string): Promise<void>;
}

const MAX_MESSAGES = 2000;
const MAX_CONTENT = 200_000;
const ROLES = new Set(['user', 'assistant', 'system', 'tool']);

/**
 * `session.import` implementation (kept out of AppRpcServer so the dispatcher
 * stays inside its source-size budget).
 *
 * Imported message ids are always regenerated: a transcript from another
 * machine must never collide with an existing row, and the caller owns the
 * newly created session.
 */
export async function importSessionFromRpc(options: SessionImportRpcOptions): Promise<{
    sessionId: string;
    messageCount: number;
    importedCount: number;
    title?: string;
}> {
    const rawMessages = Array.isArray(options.params?.messages) ? options.params.messages : [];
    if (!rawMessages.length) {
        throw new AppRpcError(-32602, 'messages are required');
    }
    if (rawMessages.length > MAX_MESSAGES) {
        throw new AppRpcError(-32602, `too many messages (max ${MAX_MESSAGES})`);
    }
    const sessionId = typeof options.params?.sessionId === 'string' && options.params.sessionId.trim()
        ? options.params.sessionId.trim()
        : `chat${options.uuid.generate().replace(/-/g, '')}`;
    await options.authorize(sessionId);
    await options.createOwner(sessionId, options.context.principalId);
    options.track(sessionId);
    await options.setWorkspace(sessionId);
    let imported = 0;
    for (const raw of rawMessages) {
        if (!raw || typeof raw !== 'object') {
            continue;
        }
        const role = String((raw as any).role || '').toLowerCase();
        if (!ROLES.has(role)) {
            continue;
        }
        const content = String((raw as any).content || '').slice(0, MAX_CONTENT);
        const parts = Array.isArray((raw as any).parts) ? (raw as any).parts : undefined;
        if (!content && !parts?.length) {
            continue;
        }
        await options.sessions.appendRaw(sessionId, {
            id: `import_${options.uuid.generate().replace(/-/g, '')}`,
            role: role as any,
            content,
            createdAt: Number((raw as any).createdAt) || Date.now(),
            ...(parts ? { parts } : {}),
            ...((raw as any).metadata && typeof (raw as any).metadata === 'object'
                ? { metadata: (raw as any).metadata }
                : {})
        } as any);
        imported += 1;
    }
    const title = typeof options.params?.title === 'string' && options.params.title.trim()
        ? options.params.title.trim().slice(0, 200)
        : '';
    const summary = typeof options.params?.summary === 'string' && options.params.summary.trim()
        ? options.params.summary.trim().slice(0, 4000)
        : '';
    if (title) {
        await options.sessions.setTitle(sessionId, title);
    }
    if (summary) {
        await options.sessions.setSummary(sessionId, summary);
    }
    const state = await options.sessions.get(sessionId);
    return {
        sessionId,
        messageCount: state.messages.length,
        importedCount: imported,
        title: state.title || title || undefined
    };
}
