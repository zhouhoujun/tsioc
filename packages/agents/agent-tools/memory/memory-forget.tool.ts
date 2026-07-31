import { AgentMemoryRecord, AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class MemoryForgetTool implements AgentTool {
    name = 'memory.forget';
    description = 'Forget visible memory records by id or structured filters.';
    inputSchema = {
        type: 'object',
        properties: {
            id: { type: 'string' },
            key: { type: 'string' },
            scope: { type: 'string', enum: ['session', 'global'] },
            namespace: { type: 'string' },
            category: { type: 'string' }
        }
    };
    toolset = 'memory';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const records = await context.memory.getAll(context.sessionId);
        const visible = this.filterRecords(records, input);
        if (!visible.length) {
            return { deleted: false, count: 0, ids: [] };
        }
        const deletedIds: string[] = [];
        for (const record of visible) {
            const count = await context.memory.delete(record.id, context.sessionId, record.scope);
            if (count > 0) {
                deletedIds.push(record.id);
            }
        }
        return {
            deleted: deletedIds.length > 0,
            count: deletedIds.length,
            ids: deletedIds
        };
    }

    /**
     * Snapshot the records matching the filters before deletion so
     * compensate() can restore them exactly.
     */
    async captureCompensation(input: any, context: AgentToolContext): Promise<unknown> {
        const records = await context.memory.getAll(context.sessionId);
        return this.filterRecords(records, input);
    }

    /**
     * Re-insert the records captured before deletion.
     */
    async compensate(captured: unknown, context: AgentToolContext): Promise<void> {
        const records = captured as AgentMemoryRecord[] | undefined;
        if (!Array.isArray(records)) {
            return;
        }
        for (const record of records) {
            await context.memory.put({ ...record });
        }
    }

    private filterRecords(records: AgentMemoryRecord[], input: any): AgentMemoryRecord[] {
        const id = this.optionalString(input?.id);
        const key = this.optionalString(input?.key);
        const namespace = this.optionalString(input?.namespace);
        const category = this.optionalString(input?.category);
        const scope = this.resolveScope(input?.scope);
        if (!id && !key && !namespace && !category && !scope) {
            throw new Error('Invalid memory.forget input: provide at least one selector.');
        }
        return records.filter(record => {
            if (!scope && record.scope === 'global') {
                return false;
            }
            if (id && record.id !== id) {
                return false;
            }
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
        });
    }

    private optionalString(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    private resolveScope(scope: unknown): AgentMemoryRecord['scope'] | undefined {
        if (scope == null) {
            return undefined;
        }
        if (scope !== 'session' && scope !== 'global') {
            throw new Error('Invalid memory.forget input: scope must be session or global.');
        }
        return scope;
    }
}
