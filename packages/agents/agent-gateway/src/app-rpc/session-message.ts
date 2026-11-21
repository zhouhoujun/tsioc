import type { AgentRuntime, SessionStore } from '@tsdi/agent';
import type { UuidGenerator } from '@tsdi/core';
import type { AppRpcRequestContext } from '../contracts/AppRpc';
import { AppRpcError } from '../contracts/AppRpc';

export interface SessionMessageRpcOptions {
    params: any;
    context: AppRpcRequestContext;
    runtime: Pick<AgentRuntime, 'runTurn' | 'getMessages'>;
    sessions: Pick<SessionStore, 'appendRaw' | 'get'>;
    uuid: UuidGenerator;
    authorize(sessionId: string): Promise<void>;
    track(sessionId: string): void;
    setWorkspace(sessionId: string): Promise<void>;
}

const MAX_TEXT = 20_000;

/**
 * `session.message.send` — deliver a message to another session (agent teams).
 *
 * Default is append-only: the target sees the message as a user turn on its
 * next run. `wake: true` starts a turn immediately (explicit opt-in; the caller
 * must own the target session).
 */
export async function sendSessionMessageFromRpc(options: SessionMessageRpcOptions): Promise<{
    sessionId: string;
    messageId: string;
    woken: boolean;
}> {
    const sessionId = typeof options.params?.sessionId === 'string' ? options.params.sessionId.trim() : '';
    if (!sessionId) {
        throw new AppRpcError(-32602, 'sessionId is required');
    }
    const text = typeof options.params?.text === 'string' ? options.params.text.trim() : '';
    if (!text) {
        throw new AppRpcError(-32602, 'text is required');
    }
    if (text.length > MAX_TEXT) {
        throw new AppRpcError(-32602, `text is too long (max ${MAX_TEXT} characters)`);
    }
    await options.authorize(sessionId);
    options.track(sessionId);
    await options.setWorkspace(sessionId);
    const fromSessionId = typeof options.params?.fromSessionId === 'string' && options.params.fromSessionId.trim()
        ? options.params.fromSessionId.trim()
        : undefined;
    const metadata = {
        kind: 'cross-session',
        ...(fromSessionId ? { fromSessionId } : {})
    };
    if (options.params?.wake === true) {
        await options.runtime.runTurn(sessionId, text, options.context.principalId, { metadata } as any);
        const messages = await options.runtime.getMessages(sessionId);
        const last = messages[messages.length - 1];
        return { sessionId, messageId: String((last as any)?.id || ''), woken: true };
    }
    const messageId = `msg_${options.uuid.generate().replace(/-/g, '')}`;
    await options.sessions.appendRaw(sessionId, {
        id: messageId,
        role: 'user',
        content: text,
        createdAt: Date.now(),
        metadata
    } as any);
    return { sessionId, messageId, woken: false };
}
