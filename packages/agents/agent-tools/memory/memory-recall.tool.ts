import { AgentMemoryRecord, AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

const DEFAULT_MEMORY_RECALL_LIMIT = 100;

@Injectable()
export class MemoryRecallTool implements AgentTool {
    name = 'memory.recall';
    description = 'Recall memory records visible to the current session using query or structured filters.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' },
            key: { type: 'string' },
            scope: { type: 'string', enum: ['session', 'global'] },
            namespace: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'number' }
        }
    };
    toolset = 'memory';
    source = 'local';
    execution = { readOnly: true };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const records = input?.query
            ? await context.memory.search(this.requireString(input?.query, 'memory.recall query'), context.sessionId)
            : await context.memory.getAll(context.sessionId);
        return {
            records: this.filterRecords(records, input)
        };
    }

    private filterRecords(records: AgentMemoryRecord[], input: any): AgentMemoryRecord[] {
        const key = this.optionalString(input?.key);
        const namespace = this.optionalString(input?.namespace);
        const category = this.optionalString(input?.category);
        const scope = this.resolveScope(input?.scope);
        const limit = this.resolveLimit(input?.limit);
        return records.filter(record => {
            if (key && record.key !== key) {
                return false;
            }
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
        }).sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id)).slice(0, limit);
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }

    private optionalString(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    private resolveScope(scope: unknown): AgentMemoryRecord['scope'] | undefined {
        if (scope == null) {
            return undefined;
        }
        if (scope !== 'session' && scope !== 'global') {
            throw new Error('Invalid memory.recall input: scope must be session or global.');
        }
        return scope;
    }

    private resolveLimit(value: unknown): number {
        if (value == null) {
            return DEFAULT_MEMORY_RECALL_LIMIT;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
            throw new Error('Invalid memory.recall input: limit must be a positive number when provided.');
        }
        return Math.floor(value);
    }
}
