import { Abstract } from '@tsdi/ioc';
import { AgentTool, AgentToolDefinition } from './AgentTool';

@Abstract()
export abstract class ToolRegistry {
    abstract getTools(): AgentTool[];
    abstract getTool(name: string): AgentTool | undefined;
    abstract invoke(name: string, input: any, sessionId: string, principalId?: string, workspace?: string): Promise<any>;

    getToolDefinitions(sessionId?: string): AgentToolDefinition[] {
        return this.getTools().map(tool => this.toDefinition(tool, sessionId));
    }

    getCallableToolDefinitions(sessionId?: string): AgentToolDefinition[] {
        return this.getToolDefinitions(sessionId);
    }

    getToolDefinition(name: string, sessionId?: string): AgentToolDefinition | undefined {
        const tool = this.getTool(name);
        return tool ? this.toDefinition(tool, sessionId) : undefined;
    }

    async activateTool(_sessionId: string, _name: string): Promise<boolean> {
        return false;
    }

    async isToolActive(_sessionId: string, _name: string): Promise<boolean> {
        return false;
    }

    protected toDefinition(tool: AgentTool, _sessionId?: string): AgentToolDefinition {
        return tool.getDefinition?.() ?? {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: (tool as any).outputSchema,
            toolset: tool.toolset,
            source: tool.source,
            execution: tool.execution,
            canonicalName: (tool as any).canonicalName,
            aliases: (tool as any).aliases,
            tags: (tool as any).tags,
            activation: (tool as any).activation,
            provenance: (tool as any).provenance
        };
    }
}
