import { AgentTool, AgentToolContext, AGENT_SESSION_STORE, SessionStore } from '@tsdi/agent';
import { Inject, Injectable } from '@tsdi/ioc';

@Injectable()
export class SessionsListTool implements AgentTool {
    name = 'sessions_list';
    description = 'List visible sessions with summary metadata and last message details.';
    inputSchema = {
        type: 'object',
        properties: {
            limit: { type: 'number' },
            offset: { type: 'number' }
        }
    };
    toolset = 'sessions';
    source = 'local';
    execution = { readOnly: true };

    constructor(@Inject(AGENT_SESSION_STORE) private sessions: SessionStore) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const limit = this.resolveLimit(input?.limit, 100);
        const offset = this.resolveOffset(input?.offset);
        const ids = await this.sessions.listSessionIds();
        const selected = ids.slice(offset, offset + limit);
        const sessions = await Promise.all(selected.map(async sessionId => {
            const state = await this.sessions.get(sessionId);
            const lastMessage = state.messages[state.messages.length - 1];
            return {
                sessionId: state.sessionId,
                summary: state.summary,
                ownerPrincipalId: state.ownerPrincipalId,
                createdAt: state.createdAt,
                updatedAt: state.updatedAt,
                messageCount: state.messages.length,
                lastMessage: lastMessage ? {
                    id: lastMessage.id,
                    role: lastMessage.role,
                    content: lastMessage.content,
                    name: lastMessage.name,
                    toolCallId: lastMessage.toolCallId,
                    createdAt: lastMessage.createdAt
                } : undefined
            };
        }));
        return {
            total: ids.length,
            offset,
            limit,
            sessions
        };
    }

    private resolveLimit(value: unknown, fallback: number): number {
        if (value == null) {
            return fallback;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
            throw new Error('Invalid sessions_list input: limit must be a positive number when provided.');
        }
        return Math.floor(value);
    }

    private resolveOffset(value: unknown): number {
        if (value == null) {
            return 0;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
            throw new Error('Invalid sessions_list input: offset must be a non-negative number when provided.');
        }
        return Math.floor(value);
    }
}
