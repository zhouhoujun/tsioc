import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { KnowledgeAdapter } from './types';

@Injectable()
export class KnowledgeStoreTool implements AgentTool {
    name = 'knowledge_store';
    description = 'Store a new entry in the knowledge base with title, content, and optional tags.';
    inputSchema = {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Entry title.' },
            content: { type: 'string', description: 'Entry content.' },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags for categorization.'
            },
            source: { type: 'string', description: 'Optional source identifier.' }
        },
        required: ['title', 'content']
    };
    toolset = 'knowledge';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(KnowledgeAdapter)
        private adapter?: KnowledgeAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const title = this.requireString(input?.title, 'knowledge_store title');
        const content = this.requireString(input?.content, 'knowledge_store content');
        if (!this.adapter) {
            throw new Error('knowledge_store requires a configured KnowledgeAdapter. Provide one via the AGENT_KNOWLEDGE_ADAPTER token.');
        }
        const entry = await this.adapter.store({
            title,
            content,
            tags: Array.isArray(input?.tags) ? input.tags.filter((t: any) => typeof t === 'string') : undefined,
            source: typeof input?.source === 'string' ? input.source : undefined
        });
        return {
            id: entry.id,
            title: entry.title,
            tags: entry.tags,
            createdAt: entry.createdAt
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
