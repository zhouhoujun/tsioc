import { AgentTool, AgentToolContext, AGENT_SESSION_STORE, SessionStore } from '@tsdi/agent';
import { Inject, Injectable } from '@tsdi/ioc';

@Injectable()
export class SessionsCurrentTool implements AgentTool {
    name = 'sessions_current';
    description = 'Return metadata and optional recent history for the current session.';
    inputSchema = {
        type: 'object',
        properties: {
            limit: { type: 'number' }
        }
    };
    toolset = 'sessions';
    source = 'local';
    execution = { readOnly: true };

    constructor(@Inject(AGENT_SESSION_STORE) private sessions: SessionStore) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const limit = this.resolveLimit(input?.limit);
        const exists = await this.sessions.has(context.sessionId);
        if (!exists) {
            return {
                exists: false,
                session: {
                    sessionId: context.sessionId,
                    messageCount: 0,
                    messages: []
                }
            };
        }
        const state = await this.sessions.get(context.sessionId);
        return {
            exists: true,
            session: {
                sessionId: state.sessionId,
                summary: state.summary,
                ownerPrincipalId: state.ownerPrincipalId,
                createdAt: state.createdAt,
                updatedAt: state.updatedAt,
                messageCount: state.messages.length,
                messages: state.messages.slice(Math.max(0, state.messages.length - limit))
            }
        };
    }

    private resolveLimit(value: unknown): number {
        if (value == null) {
            return 10;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
            throw new Error('Invalid sessions_current input: limit must be a positive number when provided.');
        }
        return Math.floor(value);
    }
}
