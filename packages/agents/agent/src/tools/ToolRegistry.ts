import { Abstract } from '@tsdi/ioc';
import { AgentTool, AgentToolDefinition } from './AgentTool';

@Abstract()
export abstract class ToolRegistry {
    abstract getTools(): AgentTool[];
    abstract getTool(name: string): AgentTool | undefined;
    abstract invoke(name: string, input: any, sessionId: string): Promise<any>;

    getToolDefinitions(): AgentToolDefinition[] {
        return this.getTools().map(tool => this.toDefinition(tool));
    }

    protected toDefinition(tool: AgentTool): AgentToolDefinition {
        return tool.getDefinition?.() ?? {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            toolset: tool.toolset,
            source: tool.source,
            execution: tool.execution
        };
    }
}
