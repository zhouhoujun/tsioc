import type { SessionStore } from '../memory/SessionStore';
import type { AgentMessage } from './AgentMessage';

/**
 * Consume queued steer prompts at a step boundary and append them as user
 * messages, so the next model request sees the steer in the same turn.
 * Returns the number of prompts promoted.
 */
export async function promoteInboxSteers(
    sessions: SessionStore,
    sessionId: string,
    createMessage: (role: 'user', content: string, metadata?: Record<string, any>) => AgentMessage,
    limit = 5
): Promise<number> {
    let promoted = 0;
    while (promoted < limit) {
        const item = await sessions.takeInboxItem?.(sessionId, 'steer');
        const text = String(item?.payload?.input || '').trim();
        if (!item || !text) {
            break;
        }
        await sessions.append(sessionId, createMessage('user', text, { steer: true }));
        promoted += 1;
    }
    return promoted;
}
