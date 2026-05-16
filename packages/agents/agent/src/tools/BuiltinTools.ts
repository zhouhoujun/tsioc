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
