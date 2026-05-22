import { AgentMessage, AgentTool, AgentToolContext, SessionStore } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class SessionsHistoryTool implements AgentTool {
    name = 'sessions_history';
    description = 'Return message history for a session without creating missing sessions.';
    inputSchema = {
        type: 'object',
        properties: {
            sessionId: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' }
        }
    };
    toolset = 'sessions';
    source = 'local';
    execution = { readOnly: true };

    constructor(private sessions: SessionStore) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const sessionId = this.resolveSessionId(input?.sessionId, context.sessionId);
        const limit = this.resolveLimit(input?.limit, 100);
        const offset = this.resolveOffset(input?.offset);
        const exists = await this.sessions.has(sessionId);
        if (!exists) {
            return {
                exists: false,
                sessionId,
                total: 0,
                offset,
                limit,
                messages: []
            };
        }
        const state = await this.sessions.get(sessionId);
        return {
            exists: true,
            sessionId,
            total: state.messages.length,
            offset,
            limit,
            messages: state.messages.slice(offset, offset + limit).map(message => this.toMessage(message))
        };
    }

    private toMessage(message: AgentMessage): any {
        return {
            id: message.id,
            role: message.role,
            content: message.content,
            name: message.name,
            toolCallId: message.toolCallId,
            createdAt: message.createdAt,
            metadata: message.metadata
        };
    }

    private resolveSessionId(value: unknown, fallback: string): string {
        if (value == null) {
            return fallback;
        }
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid sessions_history input: sessionId must be a non-empty string when provided.');
        }
        return value.trim();
    }

    private resolveLimit(value: unknown, fallback: number): number {
        if (value == null) {
            return fallback;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
            throw new Error('Invalid sessions_history input: limit must be a positive number when provided.');
        }
        return Math.floor(value);
    }

    private resolveOffset(value: unknown): number {
        if (value == null) {
            return 0;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
            throw new Error('Invalid sessions_history input: offset must be a non-negative number when provided.');
        }
        return Math.floor(value);
    }
}
