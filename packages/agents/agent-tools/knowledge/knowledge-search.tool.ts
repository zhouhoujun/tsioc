import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AGENT_KNOWLEDGE_ADAPTER, KnowledgeAdapter } from './types';

@Injectable()
export class KnowledgeSearchTool implements AgentTool {
    name = 'knowledge_search';
    description = 'Search the knowledge base for relevant entries by query text or tags.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search query text.' },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags.'
            },
            limit: { type: 'number', description: 'Maximum results (default: 10).' }
        },
        required: ['query']
    };
    toolset = 'knowledge';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_KNOWLEDGE_ADAPTER, { defaultValue: null })
        private adapter?: KnowledgeAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const query = this.requireString(input?.query, 'knowledge_search query');
        if (!this.adapter) {
            throw new Error('knowledge_search requires a configured KnowledgeAdapter. Provide one via the AGENT_KNOWLEDGE_ADAPTER token.');
        }
        const result = await this.adapter.search(query, {
            tags: Array.isArray(input?.tags) ? input.tags.filter((t: any) => typeof t === 'string') : undefined,
            limit: typeof input?.limit === 'number' && input.limit > 0 ? input.limit : 10
        });
        return {
            query,
            entries: result.entries.map(e => ({
                id: e.id,
                title: e.title,
                content: e.content,
                tags: e.tags,
                source: e.source
            })),
            total: result.total
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
