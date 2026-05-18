import { AgentTool, AgentToolContext, ToolRegistry } from '@tsdi/agent';
import { ApplicationContext } from '@tsdi/core';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

@Injectable()
export class ToolInspectTool implements AgentTool {
    name = 'tool_inspect';
    description = 'Inspect the registered definition for a named tool.';
    inputSchema = {
        type: 'object',
        properties: {
            name: { type: 'string' }
        },
        required: ['name']
    };
    toolset = 'registry';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(ApplicationContext, { defaultValue: null })
        private app?: ApplicationContext | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const name = this.requireName(input?.name);
        const registry = this.resolveRegistry();
        const tool = registry.getToolDefinitions().find(definition => definition.name === name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found.`);
        }
        const activated = await registry.activateTool(context.sessionId, name);
        return {
            tool: registry.getToolDefinition(name, context.sessionId) ?? tool,
            activated
        };
    }

    private resolveRegistry(): Pick<ToolRegistry, 'getToolDefinitions' | 'getToolDefinition' | 'activateTool'> {
        const registry = this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(ToolRegistry, null) as ToolRegistry | null
            : null;
        if (!registry) {
            throw new Error('tool_inspect requires a tool registry.');
        }
        return registry;
    }

    private requireName(name: unknown): string {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Invalid tool_inspect input: name must be a non-empty string.');
        }
        return name.trim();
    }
}
