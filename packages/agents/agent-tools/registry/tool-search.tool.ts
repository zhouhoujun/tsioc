import { AgentTool, AgentToolContext, ToolRegistry } from '@tsdi/agent';
import { ApplicationContext } from '@tsdi/core';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

@Injectable()
export class ToolSearchTool implements AgentTool {
    name = 'tool_search';
    description = 'Search registered tools by name, description, or toolset.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' },
            limit: { type: 'number' }
        }
    };
    toolset = 'registry';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(ApplicationContext, { defaultValue: null })
        private app?: ApplicationContext | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const query = typeof input?.query === 'string' ? input.query.trim().toLowerCase() : '';
        const limit = typeof input?.limit === 'number' && input.limit > 0 ? Math.floor(input.limit) : 20;
        const tools = this.resolveRegistry().getToolDefinitions()
            .filter(tool => {
                if (!query) {
                    return true;
                }
                return tool.name.toLowerCase().includes(query)
                    || tool.description.toLowerCase().includes(query)
                    || String(tool.toolset ?? '').toLowerCase().includes(query);
            })
            .slice(0, limit);
        return { tools };
    }

    private resolveRegistry(): Pick<ToolRegistry, 'getToolDefinitions'> {
        const registry = this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(ToolRegistry, null) as ToolRegistry | null
            : null;
        if (!registry) {
            throw new Error('tool_search requires a tool registry.');
        }
        return registry;
    }
}
