import { AgentMemoryRecord, AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class MemorySearchTool implements AgentTool {
    name = 'memory.search';
    description = 'Search memory records visible to the current session.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' },
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

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const query = this.requireQuery(input?.query);
        const limit = this.resolveLimit(input?.limit);
        const records = await context.memory.search(query, context.sessionId);
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
