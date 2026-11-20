import type { AgentRuntime } from '@tsdi/agent';
import { requireSessionId, requireString } from './request-helpers';

/** `session.side_question`: ask without appending the exchange to the session. */
export async function answerSideQuestion(
    host: { runtime: AgentRuntime; ensureSessionAccess(sessionId: string, context: any): Promise<void> },
    params: any,
    context: any
): Promise<{ answer: string }> {
    const sessionId = requireSessionId(params);
    await host.ensureSessionAccess(sessionId, context);
    const question = requireString(params?.question, 'session.side_question question');
    return { answer: await host.runtime.askSideQuestion(sessionId, question) };
}
