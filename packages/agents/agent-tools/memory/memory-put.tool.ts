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
