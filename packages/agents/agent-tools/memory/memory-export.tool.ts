import { AgentMemoryRecord, AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

const DEFAULT_MEMORY_EXPORT_LIMIT = 100;

@Injectable()
export class MemoryExportTool implements AgentTool {
    name = 'memory.export';
    description = 'Export visible memory records in a deterministic text or json format.';
    inputSchema = {
        type: 'object',
        properties: {
            scope: { type: 'string', enum: ['session', 'global'] },
            namespace: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'number' },
            format: { type: 'string', enum: ['json', 'text'] }
        }
    };
    toolset = 'memory';
    source = 'local';
    execution = { readOnly: true };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const records = this.filterRecords(await context.memory.getAll(context.sessionId), input);
        const format = this.resolveFormat(input?.format);
        return {
            format,
            count: records.length,
            records,
            content: format === 'json' ? this.toJson(records) : this.toText(records)
        };
    }

    private filterRecords(records: AgentMemoryRecord[], input: any): AgentMemoryRecord[] {
        const scope = this.resolveScope(input?.scope);
        const namespace = this.optionalString(input?.namespace);
        const category = this.optionalString(input?.category);
        const limit = this.resolveLimit(input?.limit);
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
        }).sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id)).slice(0, limit);
    }

    private toJson(records: AgentMemoryRecord[]): string {
        return JSON.stringify(records, null, 2);
    }

    private toText(records: AgentMemoryRecord[]): string {
        return records.map(record => {
            const parts = [record.id, record.scope, record.key, record.value];
            if (record.namespace) {
                parts.push(record.namespace);
            }
            if (record.category) {
                parts.push(String(record.category));
            }
            return parts.join(' | ');
        }).join('\n');
    }

    private optionalString(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    private resolveScope(scope: unknown): AgentMemoryRecord['scope'] | undefined {
        if (scope == null) {
            return undefined;
        }
        if (scope !== 'session' && scope !== 'global') {
            throw new Error('Invalid memory.export input: scope must be session or global.');
        }
        return scope;
    }

    private resolveFormat(format: unknown): 'json' | 'text' {
        if (format == null) {
            return 'json';
        }
        if (format !== 'json' && format !== 'text') {
            throw new Error('Invalid memory.export input: format must be json or text.');
        }
        return format;
    }

    private resolveLimit(value: unknown): number {
        if (value == null) {
            return DEFAULT_MEMORY_EXPORT_LIMIT;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
            throw new Error('Invalid memory.export input: limit must be a positive number when provided.');
        }
        return Math.floor(value);
    }
}
