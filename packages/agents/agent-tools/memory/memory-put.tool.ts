import { AgentMemoryRecord, AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { randomUUID } from 'crypto';

@Injectable()
export class MemoryPutTool implements AgentTool {
    name = 'memory.put';
    description = 'Store a memory record visible to the current or global scope.';
    inputSchema = {
        type: 'object',
        properties: {
            key: { type: 'string' },
            value: { type: 'string' },
            scope: { type: 'string', enum: ['session', 'global'] },
            namespace: { type: 'string' },
            category: { type: 'string' },
            metadata: { type: 'object' }
        },
        required: ['key', 'value']
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
        const key = this.requireString(input?.key, 'key');
        const value = this.requireString(input?.value, 'value');
        const scope = this.resolveScope(input?.scope);
        const record: AgentMemoryRecord = {
            id: randomUUID(),
            sessionId: scope === 'session' ? context.sessionId : undefined,
            key,
            value,
            scope,
            namespace: this.optionalString(input?.namespace),
            category: this.optionalString(input?.category),
            metadata: this.optionalObject(input?.metadata),
            createdAt: Date.now()
        };
        await context.memory.put(record);
        return {
            stored: true,
            record
        };
    }

    /**
     * Snapshot the existing records for the target key/scope/namespace before
     * the put so compensate() can remove only the records this call added.
     */
    async captureCompensation(input: any, context: AgentToolContext): Promise<unknown> {
        const key = this.requireString(input?.key, 'key');
        const scope = this.resolveScope(input?.scope);
        const namespace = this.optionalString(input?.namespace);
        const existing = (await context.memory.getAll(context.sessionId))
            .filter(record => record.key === key
                && record.scope === scope
                && (namespace === undefined || record.namespace === namespace));
        return {
            key,
            scope,
            namespace,
            existingIds: existing.map(record => record.id)
        };
    }

    /**
     * Delete the memory records this put added, keeping any records that
     * already existed for the key.
     */
    async compensate(captured: unknown, context: AgentToolContext): Promise<void> {
        const snapshot = captured as { key: string; scope: AgentMemoryRecord['scope']; namespace?: string; existingIds: string[] } | undefined;
        if (!snapshot) {
            return;
        }
        const existingIds = new Set(snapshot.existingIds ?? []);
        const added = (await context.memory.getAll(context.sessionId))
            .filter(record => record.key === snapshot.key
                && record.scope === snapshot.scope
                && (snapshot.namespace === undefined || record.namespace === snapshot.namespace)
                && !existingIds.has(record.id));
        for (const record of added) {
            await context.memory.delete(record.id, context.sessionId, record.scope);
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid memory.put input: ${field} must be a non-empty string.`);
        }
        return value.trim();
    }

    private optionalString(value: unknown): string | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid memory.put input: optional string fields must be non-empty strings when provided.');
        }
        return value.trim();
    }

    private optionalObject(value: unknown): Record<string, any> | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Invalid memory.put input: metadata must be an object when provided.');
        }
        return { ...(value as Record<string, any>) };
    }

    private resolveScope(scope: unknown): AgentMemoryRecord['scope'] {
        if (scope == null) {
            return 'session';
        }
        if (scope !== 'session' && scope !== 'global') {
            throw new Error('Invalid memory.put input: scope must be session or global.');
        }
        return scope;
    }
}
