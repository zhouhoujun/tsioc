import { AgentTool, AgentToolContext, SessionStore } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

/**
 * Session metadata management for the agent itself. Mirrors opencode's
 * `session.rename` Code Mode namespace and adds pin/archive so an agent can
 * keep its own workspace organized without asking the user to type commands.
 */
@Injectable()
export class SessionAdminTool implements AgentTool {
    name = 'session_admin';
    description = 'Rename, pin/unpin, or archive/unarchive a session. Defaults to the current session; pass sessionId to manage another owned session.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['rename', 'pin', 'unpin', 'archive', 'unarchive'],
                description: 'Metadata operation to perform.'
            },
            sessionId: {
                type: 'string',
                description: 'Target session id (defaults to the current session).'
            },
            title: {
                type: 'string',
                description: 'New title for the rename action.'
            }
        },
        required: ['action']
    };
    toolset = 'sessions';
    source = 'local';
    execution = { sideEffect: true, requiresSequential: true };

    constructor(private sessions: SessionStore) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const action = String(input?.action || '').trim();
        const sessionId = String(input?.sessionId || context.sessionId || '').trim();
        if (!sessionId) {
            throw new Error('session_admin requires a session id.');
        }
        const state = await this.sessions.get(sessionId);
        if (!state) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        if (context.principalId && state.ownerPrincipalId && state.ownerPrincipalId !== context.principalId) {
            throw new Error(`Session ${sessionId} is owned by another principal.`);
        }
        switch (action) {
            case 'rename': {
                const title = String(input?.title || '').replace(/\s+/g, ' ').trim();
                if (!title) {
                    throw new Error('session_admin rename requires a non-empty title.');
                }
                await this.sessions.setTitle(sessionId, title);
                return { updated: true, sessionId, action, title };
            }
            case 'pin':
            case 'unpin': {
                const pinned = action === 'pin';
                await this.sessions.setPinned(sessionId, pinned);
                return { updated: true, sessionId, action, pinned };
            }
            case 'archive':
            case 'unarchive': {
                const archived = action === 'archive';
                await this.sessions.setArchived(sessionId, archived);
                return { updated: true, sessionId, action, archived };
            }
            default:
                throw new Error(`Unsupported session_admin action: ${action || '(empty)'}`);
        }
    }
}
