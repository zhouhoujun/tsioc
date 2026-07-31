import { AgentMemoryRecord, AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class MemoryDeleteTool implements AgentTool {
    name = 'memory.delete';
    description = 'Delete a memory record visible to the current session.';
    inputSchema = {
        type: 'object',
        properties: {
            id: { type: 'string' },
            scope: { type: 'string', enum: ['session', 'global'] }
        },
        required: ['id']
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
        const id = this.requireId(input?.id);
        const scope = this.resolveScope(input?.scope);
        const count = await context.memory.delete(id, context.sessionId, scope);
        return {
            id,
            deleted: count > 0,
            count
        };
    }

    /**
     * Snapshot the full record(s) about to be deleted so compensate() can
     * restore them exactly (same id, scope, and content).
     */
    async captureCompensation(input: any, context: AgentToolContext): Promise<unknown> {
        const id = this.requireId(input?.id);
        const scope = this.resolveScope(input?.scope);
        const records = await context.memory.getAll(context.sessionId);
        return records.filter(record => record.id === id && (scope === undefined || record.scope === scope));
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

    private requireId(id: unknown): string {
        if (typeof id !== 'string' || !id.trim()) {
            throw new Error('Invalid memory.delete input: id must be a non-empty string.');
        }
        return id.trim();
    }

    private resolveScope(scope: unknown): AgentMemoryRecord['scope'] | undefined {
        if (scope === undefined) {
            return undefined;
        }
        if (scope !== 'session' && scope !== 'global') {
            throw new Error('Invalid memory.delete input: scope must be session or global.');
        }
        return scope;
    }
}
