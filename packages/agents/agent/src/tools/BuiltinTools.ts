import { Injectable } from '@tsdi/ioc';
import { AgentTool, AgentToolContext } from './AgentTool';

@Injectable()
export class EchoTool implements AgentTool {
    name = 'echo';
    description = 'Return the provided input as-is.';
    toolset = 'builtin';
    source = 'local';
    execution = { readOnly: true };

    async invoke(input: any): Promise<any> {
        return input;
    }
}

@Injectable()
export class TimeTool implements AgentTool {
    name = 'time';
    description = 'Return the current timestamp.';
    toolset = 'builtin';
    source = 'local';
    execution = { readOnly: true };

    async invoke(): Promise<any> {
        return { now: Date.now() };
    }
}

@Injectable()
export class MemoryPutTool implements AgentTool {
    name = 'memory.put';
    description = 'Store a memory record for the current session.';
    toolset = 'memory';
    source = 'local';
    execution = { sideEffect: true, requiresSequential: true };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const key = input?.key ?? 'note';
        const value = input?.value ?? '';
        await context.memory.put({
            id: `${Date.now()}-${Math.random()}`,
            sessionId: context.sessionId,
            key,
            value,
            scope: input?.scope ?? 'session',
            createdAt: Date.now()
        });
        return { stored: true, key, value };
    }

    /**
     * Snapshot the existing record ids for the target key before the put so
     * compensate() can remove only the records this call added.
     */
    async captureCompensation(input: any, context: AgentToolContext): Promise<unknown> {
        const key = input?.key ?? 'note';
        const scope = input?.scope ?? 'session';
        const existing = (await context.memory.getAll(context.sessionId))
            .filter(record => record.key === key && record.scope === scope);
        return { key, scope, existingIds: existing.map(record => record.id) };
    }

    /**
     * Delete the memory records this put added, keeping any records that
     * already existed for the key.
     */
    async compensate(captured: unknown, context: AgentToolContext): Promise<void> {
        const snapshot = captured as { key: string; scope: string; existingIds: string[] } | undefined;
        if (!snapshot) {
            return;
        }
        const existingIds = new Set(snapshot.existingIds ?? []);
        const added = (await context.memory.getAll(context.sessionId))
            .filter(record => record.key === snapshot.key && record.scope === snapshot.scope && !existingIds.has(record.id));
        for (const record of added) {
            await context.memory.delete(record.id, context.sessionId, record.scope);
        }
    }
}

@Injectable()
export class MemorySearchTool implements AgentTool {
    name = 'memory.search';
    description = 'Search memory records by key or value.';
    toolset = 'memory';
    source = 'local';
    execution = { readOnly: true };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const query = String(input?.query ?? '');
        return context.memory.search(query, context.sessionId);
    }
}

@Injectable()
export class ExperienceSynthesizeTool implements AgentTool {
    name = 'experience.synthesize';
    description = 'Analyse past sessions and return reusable knowledge patterns, including workflow habits. Use this periodically to surface patterns across sessions.';
    toolset = 'memory';
    source = 'local';
    execution = { readOnly: true };
    inputSchema = {
        type: 'object',
        properties: {
            sessionIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional session IDs to restrict the analysis to (default: all compacted sessions)'
            },
            query: {
                type: 'string',
                description: 'Optional search query to filter the returned patterns by content'
            }
        }
    };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const query = String(input?.query ?? '').trim();
        const records = await context.memory.search('experience:', context.sessionId);
        if (!records || records.length === 0) {
            return { patterns: [], message: 'No experience patterns available yet. Patterns are generated automatically after session compaction.' };
        }
        let patterns = records.map(r => ({
            content: r.value,
            key: r.key,
            scope: r.scope,
            createdAt: r.createdAt
        }));
        if (query) {
            const ql = query.toLowerCase();
            patterns = patterns.filter(p =>
                p.content.toLowerCase().includes(ql) ||
                p.key.toLowerCase().includes(ql)
            );
        }
        return { patterns, total: patterns.length };
    }
}
