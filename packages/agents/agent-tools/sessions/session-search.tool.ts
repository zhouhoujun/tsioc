import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { SessionStore } from '@tsdi/agent';

@Injectable()
export class SessionSearchTool implements AgentTool {
    name = 'session_search';
    description = 'Search across past session transcripts using full-text search. Supports filtering by session ID, sorting, and context windows around matching messages.';
    inputSchema = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Full-text search query.'
            },
            limit: {
                type: 'number',
                description: 'Maximum results (default: 5, max: 20).'
            },
            sort: {
                type: 'string',
                enum: ['newest', 'oldest'],
                description: 'Sort order (default: newest).'
            },
            sessionId: {
                type: 'string',
                description: 'Restrict search to a specific session ID.'
            }
        },
        required: ['query']
    };
    toolset = 'sessions';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(SessionStore)
        private sessionStore?: SessionStore | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const query = this.requireString(input?.query, 'session_search query');
        if (!this.sessionStore) {
            throw new Error('session_search requires a SessionStore. Ensure SessionStore is provided.');
        }

        const limit = typeof input?.limit === 'number' ? Math.min(Math.max(1, input.limit), 20) : 5;
        const sort = input?.sort === 'oldest' ? 'oldest' : 'newest';

        const sessionIds = await this.sessionStore.listSessionIds();
        const filteredIds = typeof input?.sessionId === 'string'
            ? sessionIds.filter(id => id === input.sessionId)
            : sessionIds;

        interface MatchResult {
            sessionId: string;
            messageId: string;
            role: string;
            content: string;
            score: number;
            createdAt: number;
        }

        const results: MatchResult[] = [];
        const queryLower = query.toLowerCase();

        for (const sid of filteredIds) {
            try {
                const state = await this.sessionStore.get(sid);
                if (!state?.messages) {
                    continue;
                }
                for (const msg of state.messages) {
                    if (msg.content && msg.content.toLowerCase().includes(queryLower)) {
                        const contextStart = Math.max(0, msg.content.toLowerCase().indexOf(queryLower) - 60);
                        const contextEnd = Math.min(msg.content.length, contextStart + 150);
                        let snippet = msg.content.slice(contextStart, contextEnd);
                        if (contextStart > 0) {
                            snippet = '...' + snippet;
                        }
                        if (contextEnd < msg.content.length) {
                            snippet += '...';
                        }
                        results.push({
                            sessionId: sid,
                            messageId: msg.id,
                            role: msg.role,
                            content: snippet,
                            score: 1,
                            createdAt: msg.createdAt
                        });
                    }
                }
            } catch {
                continue;
            }
        }

        results.sort((a, b) => sort === 'newest'
            ? b.createdAt - a.createdAt
            : a.createdAt - b.createdAt
        );

        return {
            query,
            total: results.length,
            results: results.slice(0, limit).map(r => ({
                sessionId: r.sessionId,
                role: r.role,
                snippet: r.content,
                timestamp: new Date(r.createdAt).toISOString()
            }))
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
