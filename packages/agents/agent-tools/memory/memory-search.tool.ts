import { AgentMemoryRecord, AgentMemoryRetriever, AgentTool, AgentToolContext, MemorySearchMode } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

@Injectable()
export class MemorySearchTool implements AgentTool {
    name = 'memory.search';
    description = 'Search memory records visible to the current session.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' },
            mode: { type: 'string', enum: ['keyword', 'semantic', 'hybrid'] },
            minScore: { type: 'number' },
            limit: { type: 'number' },
            scope: { type: 'string', enum: ['session', 'global'] },
            namespace: { type: 'string' },
            category: { type: 'string' }
        },
        required: ['query']
    };
    toolset = 'memory';
    source = 'local';
    execution = { readOnly: true };

    constructor(@Optional() @Inject(AgentMemoryRetriever) private retriever?: AgentMemoryRetriever | null) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const query = this.requireQuery(input?.query);
        const limit = this.resolveLimit(input?.limit);
        const mode = this.resolveMode(input?.mode);
        const minScore = this.resolveMinScore(input?.minScore);
        const records = this.retriever
            ? await this.retriever.retrieve({ sessionId: context.sessionId, query, mode, limit, minScore })
            : await context.memory.search(query, context.sessionId);
        return {
            records: this.filterRecords(records, input).slice(0, limit)
        };
    }

    private requireQuery(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid memory.search input: query must be a non-empty string.');
        }
        return value.trim();
    }

    private resolveLimit(value: unknown): number {
        if (value == null) {
            return Number.MAX_SAFE_INTEGER;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
            throw new Error('Invalid memory.search input: limit must be a positive number when provided.');
        }
        return Math.floor(value);
    }

    private resolveMode(value: unknown): MemorySearchMode | undefined {
        if (value == null) {
            return undefined;
        }
        if (value !== 'keyword' && value !== 'semantic' && value !== 'hybrid') {
            throw new Error('Invalid memory.search input: mode must be keyword, semantic or hybrid.');
        }
        return value;
    }

    private resolveMinScore(value: unknown): number | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
            throw new Error('Invalid memory.search input: minScore must be a number between 0 and 1.');
        }
        return value;
    }

    private filterRecords(records: AgentMemoryRecord[], input: any): AgentMemoryRecord[] {
        const scope = typeof input?.scope === 'string' ? input.scope : undefined;
        const namespace = typeof input?.namespace === 'string' ? input.namespace : undefined;
        const category = typeof input?.category === 'string' ? input.category : undefined;
        return records.filter(record => {
            if (scope && record.scope !== scope) {
                return false;
            }
            if (namespace && record.namespace !== namespace) {
                return false;
            }
            if (category && record.category !== category) {
                return false;
            }
            return true;
        });
    }
}
